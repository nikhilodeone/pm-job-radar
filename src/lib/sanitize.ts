import { LEVELS, type Job, type Level, type NormLocation } from "./types";
import { companyById } from "./companies";
import { MAX_DESCRIPTION } from "./text";

/**
 * Third-party feeds are untrusted: any field can be missing, null, a number or an object.
 * Every job passes through here before it reaches the browser (and again on arrival), so a single
 * odd posting can never crash the page.
 */
const str = (v: unknown, max = 300): string | undefined => {
  if (typeof v === "string") return v.trim().slice(0, max) || undefined;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
};

function safeUrl(v: unknown): string | undefined {
  const s = str(v, 2000);
  if (!s) return undefined;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function loc(v: unknown): NormLocation | null {
  if (!v || typeof v !== "object") return null;
  const l = v as Record<string, unknown>;
  const raw = str(l.raw) ?? "";
  const city = str(l.city, 80);
  const region = str(l.region, 80);
  const country = str(l.country, 80);
  if (!raw && !city && !country) return null;
  return { raw, city, region, country, remote: l.remote === true };
}

export function sanitizeJob(input: unknown): Job | null {
  if (!input || typeof input !== "object") return null;
  const j = input as Record<string, unknown>;
  const id = str(j.id, 200);
  const companyId = str(j.companyId, 60);
  const title = str(j.title, 200);
  if (!id || !companyId || !title) return null;
  const company = companyById(companyId);
  const url = safeUrl(j.url) ?? safeUrl(company?.careersUrl);
  if (!url) return null;
  const postedRaw = str(j.postedAt, 40);
  const postedAt = postedRaw && !Number.isNaN(Date.parse(postedRaw)) ? postedRaw : undefined;
  const locations = Array.isArray(j.locations) ? j.locations.map(loc).filter((l): l is NormLocation => !!l).slice(0, 25) : [];
  return {
    id,
    companyId,
    company: str(j.company, 80) ?? company?.name ?? companyId,
    title,
    level: LEVELS.includes(j.level as Level) ? (j.level as Level) : "PM",
    team: str(j.team, 80),
    url,
    postedAt,
    locations,
    remote: j.remote === true || locations.some((l) => l.remote),
    description: typeof j.description === "string" ? j.description.slice(0, MAX_DESCRIPTION) : "",
  };
}

export function sanitizeJobs(input: unknown): Job[] {
  return Array.isArray(input) ? input.map(sanitizeJob).filter((j): j is Job => !!j) : [];
}
