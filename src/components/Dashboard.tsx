"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COMPANIES } from "@/lib/companies";
import { TIERS, type Job, type MatchResult, type SourceResponse } from "@/lib/types";
import { applyFilters, cityKey, countBy, DEFAULT_FILTERS, normalizeFilters, splitCityKey, type Filters, type Status } from "@/lib/filter";
import type { Option } from "./MultiSelect";
import { buildCorpus, buildResumeProfile, scoreJob } from "@/lib/scoring";
import { usePersistentState } from "@/lib/storage";
import { jobsToCsv } from "@/lib/csv";
import { isRecent } from "@/lib/format";
import { pool } from "@/lib/pool";
import { sanitizeJobs } from "@/lib/sanitize";
import ErrorBoundary from "./ErrorBoundary";
import FilterPanel from "./FilterPanel";
import ResumePanel from "./ResumePanel";
import SourceStatus from "./SourceStatus";
import JobCard from "./JobCard";

export interface SourceState {
  state: "loading" | "ok" | "error";
  count?: number;
  error?: string;
  fetchedAt?: string;
}

const PAGE = 40;
const tierOf = new Map(COMPANIES.map((c) => [c.id, c.tier]));

export default function Dashboard() {
  const [storedFilters, setFilters] = usePersistentState<Filters>("pmradar:filters:v2", DEFAULT_FILTERS);
  // saved filters are coerced so a stale or corrupt localStorage value can never break rendering
  const filters = useMemo(() => normalizeFilters(storedFilters), [storedFilters]);
  const [statuses, setStatuses] = usePersistentState<Record<string, Status | undefined>>("pmradar:status:v1", {});
  const [remember, setRemember] = usePersistentState<{ on: boolean }>("pmradar:remember:v1", { on: true });
  const [resume, setResume] = usePersistentState<{ text: string; name: string }>("pmradar:resume:v1", { text: "", name: "" }, remember.on);

  const [sources, setSources] = useState<Record<string, SourceState | undefined>>({});
  const [jobsBySource, setJobsBySource] = useState<Record<string, Job[] | undefined>>({});
  const [scores, setScores] = useState<Record<string, MatchResult | undefined>>({});
  const [scoring, setScoring] = useState({ done: 0, total: 0 });
  const [limit, setLimit] = useState(PAGE);
  const abortRef = useRef<AbortController | null>(null);

  /* ---------------- loading jobs ---------------- */

  const loadSource = useCallback(async (id: string, opts: { signal?: AbortSignal; fresh?: boolean } = {}) => {
    setSources((s) => ({ ...s, [id]: { state: "loading" } }));
    try {
      const res = await fetch(`/api/source?id=${encodeURIComponent(id)}`, { signal: opts.signal, cache: opts.fresh ? "no-cache" : "default" });
      const data = (await res.json().catch(() => ({ id, error: `Unexpected response (HTTP ${res.status})` }))) as SourceResponse;
      if (!res.ok || data.error || !Array.isArray(data.jobs)) throw new Error(data.error ?? `HTTP ${res.status}`);
      const jobs = sanitizeJobs(data.jobs);
      setJobsBySource((j) => ({ ...j, [id]: jobs }));
      setSources((s) => ({ ...s, [id]: { state: "ok", count: jobs.length, fetchedAt: typeof data.fetchedAt === "string" ? data.fetchedAt : undefined } }));
    } catch (e) {
      if (opts.signal?.aborted) return;
      setSources((s) => ({ ...s, [id]: { state: "error", error: e instanceof Error ? e.message : "Failed to load" } }));
    }
  }, []);

  const loadAll = useCallback(
    (fresh: boolean) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const ordered = [...COMPANIES].sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier));
      void pool(ordered, 6, (c) => loadSource(c.id, { signal: ctrl.signal, fresh }));
    },
    [loadSource]
  );

  useEffect(() => {
    loadAll(false);
    return () => abortRef.current?.abort();
  }, [loadAll]);

  const allJobs = useMemo(() => {
    const seen = new Set<string>();
    const out: Job[] = [];
    for (const c of COMPANIES)
      for (const j of jobsBySource[c.id] ?? []) {
        if (!seen.has(j.id)) {
          seen.add(j.id);
          out.push(j);
        }
      }
    return out;
  }, [jobsBySource]);

  const jobCounts = useMemo(() => Object.fromEntries(Object.entries(jobsBySource).map(([k, v]) => [k, v?.length ?? 0])), [jobsBySource]);

  /* ---------------- resume scoring ---------------- */

  const profile = useMemo(() => (resume.text.length >= 80 ? buildResumeProfile(resume.text) : null), [resume.text]);

  useEffect(() => {
    setScores({});
    setScoring({ done: 0, total: 0 });
  }, [profile]);

  useEffect(() => {
    if (!profile || !allJobs.length) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const corpus = buildCorpus(allJobs);
      let i = 0;
      const step = () => {
        if (cancelled) return;
        const end = Math.min(i + 40, allJobs.length);
        const chunk: Record<string, MatchResult> = {};
        for (; i < end; i++) chunk[allJobs[i].id] = scoreJob(profile, allJobs[i], corpus);
        setScores((prev) => ({ ...prev, ...chunk }));
        setScoring({ done: i, total: allJobs.length });
        if (i < allJobs.length) setTimeout(step, 0);
      };
      step();
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [profile, allJobs]);

  /* ---------------- filtering ---------------- */

  const setFilter = useCallback((patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch })), [setFilters]);
  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [setFilters]);

  // Switch to "best match" ordering the first time a resume appears.
  const sortedForResume = useRef(false);
  useEffect(() => {
    if (profile && !sortedForResume.current) {
      sortedForResume.current = true;
      setFilters((f) => (f.sort === "newest" ? { ...f, sort: "match" } : f));
    }
  }, [profile, setFilters]);

  const filtered = useMemo(() => applyFilters(allJobs, filters, statuses, scores), [allJobs, filters, statuses, scores]);

  useEffect(() => setLimit(PAGE), [filters]);

  const countries = useMemo<Option[]>(
    () => countBy(allJobs, (j) => j.locations.map((l) => l.country).filter(Boolean) as string[]).map(([value, count]) => ({ value, label: value, count })),
    [allJobs]
  );
  const cities = useMemo<Option[]>(() => {
    // offer only cities inside the selected countries (all cities when none are selected)
    const entries = countBy(allJobs, (j) =>
      j.locations
        .filter((l) => l.city && (!filters.countries.length || (l.country && filters.countries.includes(l.country))))
        .map((l) => cityKey(l.city!, l.country))
    );
    return entries.slice(0, 400).map(([value, count]) => {
      const { city, country } = splitCityKey(value);
      return { value, label: city, hint: country || undefined, count };
    });
  }, [allJobs, filters.countries]);

  const onStatus = useCallback(
    (id: string, s: Status | undefined) =>
      setStatuses((prev) => {
        const next = { ...prev };
        if (s) next[id] = s;
        else delete next[id];
        return next;
      }),
    [setStatuses]
  );

  /* ---------------- stats ---------------- */

  const loadedCount = Object.values(sources).filter((s) => s?.state === "ok").length;
  const settled = Object.values(sources).filter((s) => s && s.state !== "loading").length;
  const loadingAny = settled < COMPANIES.length;
  const companiesWithRoles = new Set(filtered.map((j) => j.companyId)).size;
  const newThisWeek = filtered.filter((j) => isRecent(j.postedAt, 7)).length;
  const scored = filtered.map((j) => scores[j.id]?.score).filter((s): s is number => typeof s === "number");
  const bestMatch = scored.length ? Math.max(...scored) : null;
  const strong = scored.filter((s) => s >= 75).length;
  const lastFetched = Object.values(sources)
    .map((s) => s?.fetchedAt)
    .filter(Boolean)
    .sort()
    .pop();

  function exportCsv() {
    const blob = new Blob([jobsToCsv(filtered, scores, statuses)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pm-roles-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const locationForLinks = (filters.cities[0] && splitCityKey(filters.cities[0]).city) || filters.countries[0] || undefined;
  const placeSummary = (() => {
    const names = filters.cities.length ? filters.cities.map((k) => splitCityKey(k).city) : filters.countries;
    return names.length > 3 ? `${names.slice(0, 3).join(", ")} +${names.length - 3}` : names.join(", ");
  })();
  const hasResume = !!profile;

  return (
    <div className="shell">
      <header className="top">
        <div>
          <h1>PM Job Radar</h1>
          <p>
            Open product-management roles pulled from {COMPANIES.length} company career sites
            {lastFetched ? ` · refreshed ${new Date(lastFetched).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
        </div>
        <div className="top-actions">
          <button className="btn" onClick={() => loadAll(true)} disabled={loadingAny}>
            ↻ Refresh
          </button>
          <button className="btn" onClick={exportCsv} disabled={!filtered.length}>
            ⇩ Export CSV
          </button>
        </div>
      </header>

      <section className="stats" aria-live="polite">
        <div className="stat">
          <b>{filtered.length.toLocaleString()}</b>
          <span>
            roles match{allJobs.length !== filtered.length ? ` (of ${allJobs.length.toLocaleString()})` : ""}
          </span>
        </div>
        <div className="stat">
          <b>{companiesWithRoles}</b>
          <span>companies hiring</span>
        </div>
        <div className="stat">
          <b>{newThisWeek}</b>
          <span>new in 7 days</span>
        </div>
        <div className="stat">
          <b>{hasResume ? (bestMatch ?? "…") : "—"}</b>
          <span>{hasResume ? `best match · ${strong} strong` : "add a resume to rank"}</span>
        </div>
      </section>

      {loadingAny && (
        <div className="progress load" role="status">
          <div style={{ width: `${(settled / COMPANIES.length) * 100}%` }} />
          <small>
            Fetching career sites… {settled}/{COMPANIES.length}
          </small>
        </div>
      )}

      <div className="layout">
        <aside className="side">
          <ResumePanel
            name={resume.name}
            profile={profile}
            remember={remember.on}
            setRemember={(on) => setRemember({ on })}
            scoring={scoring}
            onResume={(text, name) => setResume({ text, name })}
            onClear={() => {
              setResume({ text: "", name: "" });
              setFilters((f) => ({ ...f, minScore: 0, sort: f.sort === "match" ? "newest" : f.sort }));
              sortedForResume.current = false;
            }}
          />
          <FilterPanel filters={filters} set={setFilter} reset={resetFilters} countries={countries} cities={cities} jobCounts={jobCounts} sources={sources} hasResume={hasResume} />
        </aside>

        <main className="main">
          <div className="row-between results-head">
            <h2>
              {filtered.length.toLocaleString()} {filtered.length === 1 ? "role" : "roles"}
              {placeSummary ? <span className="muted"> · {placeSummary}</span> : null}
            </h2>
            <label className="inline">
              <span>Sort</span>
              <select value={filters.sort} onChange={(e) => setFilter({ sort: e.target.value as Filters["sort"] })}>
                <option value="match" disabled={!hasResume}>
                  Best match{hasResume ? "" : " (add resume)"}
                </option>
                <option value="newest">Newest</option>
                <option value="company">Company A–Z</option>
              </select>
            </label>
          </div>

          <SourceStatus sources={sources} jobCounts={jobCounts} retry={(id) => void loadSource(id)} location={locationForLinks} />

          {filtered.slice(0, limit).map((j) => (
            <ErrorBoundary key={j.id} fallback={<article className="card">Couldn&apos;t display this posting: {j.title} at {j.company}. <a href={j.url} target="_blank" rel="noopener noreferrer">Open it directly ↗</a></article>}>
              <JobCard job={j} tier={tierOf.get(j.companyId) ?? "High-growth"} match={scores[j.id]} status={statuses[j.id]} hasResume={hasResume} onStatus={onStatus} />
            </ErrorBoundary>
          ))}

          {filtered.length > limit && (
            <button className="btn more" onClick={() => setLimit((l) => l + PAGE)}>
              Show {Math.min(PAGE, filtered.length - limit)} more ({filtered.length - limit} left)
            </button>
          )}

          {!filtered.length && !loadingAny && (
            <div className="empty">
              {loadedCount === 0 ? (
                <>
                  <h3>No career sites could be reached</h3>
                  <p>Open the Sources panel above to see why each one failed, then hit Retry. If you&apos;re running this locally, check your internet connection.</p>
                </>
              ) : (
                <>
                  <h3>No roles match these filters</h3>
                  <p>Try widening the location, seniority or recency filters.</p>
                  <button className="btn primary" onClick={resetFilters}>
                    Reset filters
                  </button>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      <footer>
        Roles come straight from each company&apos;s own applicant-tracking feed – “Apply” always opens the company&apos;s page. Match scores are a keyword-and-level heuristic to help you prioritise, not a hiring prediction.
      </footer>
    </div>
  );
}
