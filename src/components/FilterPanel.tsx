"use client";
import { COMPANIES } from "@/lib/companies";
import { LEVELS, TIERS, type Level } from "@/lib/types";
import { splitCityKey, type Filters } from "@/lib/filter";
import MultiSelect, { type Option } from "./MultiSelect";
import type { SourceState } from "./Dashboard";

interface Props {
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  reset: () => void;
  countries: Option[];
  cities: Option[];
  jobCounts: Record<string, number>;
  sources: Record<string, SourceState | undefined>;
  hasResume: boolean;
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function FilterPanel({ filters: f, set, reset, countries, cities, jobCounts, sources, hasResume }: Props) {
  return (
    <section className="panel filters">
      <div className="row-between">
        <h2>Filters</h2>
        <button className="btn link" onClick={reset}>
          Reset
        </button>
      </div>

      <label className="field">
        <span>Search</span>
        <input type="search" value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Title, team, company, city…" />
      </label>

      <fieldset className="group">
        <legend>Location</legend>
        <MultiSelect
          label="Countries"
          placeholder="All countries"
          searchPlaceholder="Search countries…"
          options={countries}
          selected={f.countries}
          onChange={(v) =>
            // removing a country also drops the cities you had picked in it
            set({ countries: v, cities: v.length ? f.cities.filter((k) => v.includes(splitCityKey(k).country)) : f.cities })
          }
        />
        <MultiSelect
          label="Cities"
          placeholder={f.countries.length ? "All cities in selected countries" : "All cities"}
          searchPlaceholder="Search cities…"
          options={cities}
          selected={f.cities}
          onChange={(v) => set({ cities: v })}
          format={(k) => splitCityKey(k).city}
          disabled={!cities.length && !f.cities.length}
        />
        <div className="seg" role="group" aria-label="Work mode">
          {(["any", "remote", "onsite"] as const).map((m) => (
            <button key={m} className={f.mode === m ? "on" : ""} aria-pressed={f.mode === m} onClick={() => set({ mode: m })}>
              {m === "any" ? "Any" : m === "remote" ? "Remote" : "On-site / hybrid"}
            </button>
          ))}
        </div>
        <label className="check-row">
          <input type="checkbox" checked={f.alsoRemote} onChange={(e) => set({ alsoRemote: e.target.checked })} disabled={!f.countries.length && !f.cities.length} />
          <span>Also show “Remote” roles with no country listed</span>
        </label>
      </fieldset>

      <fieldset className="group">
        <legend>Seniority</legend>
        <div className="chips">
          {LEVELS.filter((l) => l !== "Intern").map((l: Level) => (
            <button key={l} className={`pill${f.levels.includes(l) ? " on" : ""}`} aria-pressed={f.levels.includes(l)} onClick={() => set({ levels: toggle(f.levels, l) })}>
              {l}
            </button>
          ))}
          <button className={`pill${f.levels.includes("Intern") ? " on" : ""}`} aria-pressed={f.levels.includes("Intern")} onClick={() => set({ levels: toggle(f.levels, "Intern" as Level) })}>
            Intern
          </button>
        </div>
      </fieldset>

      <div className="two">
        <label className="field">
          <span>Posted</span>
          <select value={f.posted} onChange={(e) => set({ posted: e.target.value as Filters["posted"] })}>
            <option value="any">Any time</option>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
        <label className="field">
          <span>My list</span>
          <select value={f.status} onChange={(e) => set({ status: e.target.value as Filters["status"] })}>
            <option value="all">Everything</option>
            <option value="saved">Saved</option>
            <option value="applied">Applied</option>
            <option value="untracked">Not tracked</option>
          </select>
        </label>
      </div>

      {hasResume && (
        <label className="field">
          <span>
            Minimum match: <b>{f.minScore || "any"}</b>
          </span>
          <input type="range" min={0} max={90} step={5} value={f.minScore} onChange={(e) => set({ minScore: parseInt(e.target.value, 10) })} />
        </label>
      )}

      <fieldset className="group">
        <legend>Companies</legend>
        <div className="chips">
          {TIERS.map((t) => (
            <button key={t} className={`pill${f.tiers.includes(t) ? " on" : ""}`} aria-pressed={f.tiers.includes(t)} onClick={() => set({ tiers: toggle(f.tiers, t) })}>
              {t}
            </button>
          ))}
        </div>
        <details className="company-list">
          <summary>
            {f.companies.length ? `${f.companies.length} selected` : "Pick specific companies"}
          </summary>
          {f.companies.length > 0 && (
            <button className="btn link" onClick={() => set({ companies: [] })}>
              Clear selection
            </button>
          )}
          {TIERS.map((t) => (
            <div key={t}>
              <h4>{t}</h4>
              {COMPANIES.filter((c) => c.tier === t).map((c) => {
                const st = sources[c.id];
                return (
                  <label key={c.id} className="check-row company">
                    <input type="checkbox" checked={f.companies.includes(c.id)} onChange={() => set({ companies: toggle(f.companies, c.id) })} />
                    <span>{c.name}</span>
                    <small className={`dot ${st?.state ?? "loading"}`} title={st?.state === "error" ? st.error : st?.state === "ok" ? "Loaded" : "Loading…"}>
                      {st?.state === "ok" ? jobCounts[c.id] ?? 0 : st?.state === "error" ? "!" : "…"}
                    </small>
                  </label>
                );
              })}
            </div>
          ))}
        </details>
      </fieldset>
    </section>
  );
}
