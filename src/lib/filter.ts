import type { Job, Level, MatchResult, Tier } from "./types";
import { COMPANIES } from "./companies";

export type Status = "saved" | "applied";
export type SortKey = "match" | "newest" | "company";

export interface Filters {
  q: string;
  companies: string[]; // empty = all
  tiers: Tier[]; // empty = all
  country: string; // "" = any
  city: string; // "" = any
  mode: "any" | "remote" | "onsite";
  alsoRemote: boolean; // also include location-less "Remote" roles when a country is chosen
  levels: Level[]; // empty = all
  posted: "any" | "7" | "14" | "30";
  status: "all" | "saved" | "applied" | "untracked";
  minScore: number;
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = {
  q: "",
  companies: [],
  tiers: [],
  country: "",
  city: "",
  mode: "any",
  alsoRemote: false,
  levels: [],
  posted: "any",
  status: "all",
  minScore: 0,
  sort: "newest",
};

const tierOf = new Map(COMPANIES.map((c) => [c.id, c.tier]));

export function matchesLocation(job: Job, f: Pick<Filters, "country" | "city" | "alsoRemote">): boolean {
  if (!f.country && !f.city) return true;
  const inPlace = job.locations.some((l) => (!f.country || l.country === f.country) && (!f.city || l.city === f.city));
  if (inPlace) return true;
  // "Remote" with no country attached at all – counts as available everywhere
  return f.alsoRemote && job.remote && job.locations.every((l) => !l.country);
}

export function applyFilters(
  jobs: Job[],
  f: Filters,
  statuses: Record<string, Status | undefined>,
  scores: Record<string, MatchResult | undefined>,
  now = Date.now()
): Job[] {
  const tokens = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  const cutoff = f.posted === "any" ? 0 : now - parseInt(f.posted, 10) * 86400000;
  const out = jobs.filter((j) => {
    if (f.companies.length && !f.companies.includes(j.companyId)) return false;
    if (f.tiers.length && !f.tiers.includes(tierOf.get(j.companyId) as Tier)) return false;
    if (f.levels.length && !f.levels.includes(j.level)) return false;
    if (f.mode === "remote" && !j.remote) return false;
    if (f.mode === "onsite" && j.remote) return false;
    if (!matchesLocation(j, f)) return false;
    if (cutoff) {
      const t = j.postedAt ? Date.parse(j.postedAt) : NaN;
      if (Number.isNaN(t) || t < cutoff) return false;
    }
    const st = statuses[j.id];
    if (f.status === "saved" && st !== "saved") return false;
    if (f.status === "applied" && st !== "applied") return false;
    if (f.status === "untracked" && st) return false;
    if (f.minScore > 0) {
      const s = scores[j.id]?.score;
      if (s === null || s === undefined || s < f.minScore) return false;
    }
    if (tokens.length) {
      const hay = `${j.title} ${j.company} ${j.team ?? ""} ${j.locations.map((l) => l.raw).join(" ")}`.toLowerCase();
      if (!tokens.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
  const time = (j: Job) => (j.postedAt ? Date.parse(j.postedAt) : 0);
  const score = (j: Job) => scores[j.id]?.score ?? -1;
  out.sort((a, b) => {
    if (f.sort === "match") return score(b) - score(a) || time(b) - time(a);
    if (f.sort === "company") return a.company.localeCompare(b.company) || a.title.localeCompare(b.title);
    return time(b) - time(a) || a.company.localeCompare(b.company);
  });
  return out;
}

export function countBy<T>(items: T[], key: (x: T) => string | string[] | undefined): Array<[string, number]> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    for (const v of Array.isArray(k) ? [...new Set(k)] : k ? [k] : []) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
