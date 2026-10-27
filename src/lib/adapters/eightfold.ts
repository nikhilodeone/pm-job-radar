import type { Company, Job } from "../types";
import { isPmTitle, inferLevel } from "../level";
import { parseLocations, isRemoteJob } from "../location";
import { cleanDescription, toIso } from "../text";
import { getJson, pool } from "./http";

/**
 * Eightfold-hosted career sites (Netflix, Microsoft). The endpoints are not publicly documented, so
 * this adapter is deliberately tolerant about field names. Both are flagged `beta` in companies.ts.
 */
export interface EfPosition {
  id?: number | string;
  display_job_id?: string;
  name?: string;
  location?: string;
  locations?: string[];
  standardizedLocations?: string[];
  t_create?: number;
  postedTs?: number;
  creationTs?: number;
  job_description?: string;
  canonicalPositionUrl?: string;
  positionUrl?: string;
  department?: string;
  work_location_option?: string;
  workLocationOption?: string;
}

const PAGE_SIZE: Record<"apply" | "pcsx", number> = { apply: 100, pcsx: 10 };
const MAX_PAGES = 8;
const MAX_DETAILS = 30;

export function normalizeEightfold(
  c: Company & { source: { ats: "eightfold"; host: string; domain: string; variant: "apply" | "pcsx" } },
  p: EfPosition,
  description?: string
): Job | null {
  const title = p.name;
  if (!title || !isPmTitle(title)) return null;
  const locs = p.locations?.length ? p.locations : p.standardizedLocations?.length ? p.standardizedLocations : [p.location];
  const locations = parseLocations(locs);
  const path = p.canonicalPositionUrl || p.positionUrl;
  const url = path ? (path.startsWith("http") ? path : `https://${c.source.host}${path}`) : c.careersUrl;
  const mode = p.work_location_option ?? p.workLocationOption;
  return {
    id: `${c.id}:${p.id ?? p.display_job_id ?? url}`,
    companyId: c.id,
    company: c.name,
    title: title.trim(),
    level: inferLevel(title),
    team: p.department || undefined,
    url,
    postedAt: toIso(p.t_create ?? p.postedTs ?? p.creationTs),
    locations,
    remote: isRemoteJob(locations, mode),
    description: cleanDescription(description ?? p.job_description),
  };
}

export async function fetchEightfold(
  c: Company & { source: { ats: "eightfold"; host: string; domain: string; variant: "apply" | "pcsx" } }
): Promise<Job[]> {
  const { host, domain, variant } = c.source;
  const size = PAGE_SIZE[variant];
  const positions: EfPosition[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const start = page * size;
    let batch: EfPosition[] = [];
    let total = Infinity;
    if (variant === "apply") {
      const url = `https://${host}/api/apply/v2/jobs?domain=${encodeURIComponent(domain)}&start=${start}&num=${size}&query=${encodeURIComponent("product manager")}&sort_by=relevance`;
      const data = await getJson<{ positions?: EfPosition[]; count?: number }>(url);
      batch = data.positions ?? [];
      total = data.count ?? Infinity;
    } else {
      const url = `https://${host}/api/pcsx/search?domain=${encodeURIComponent(domain)}&query=${encodeURIComponent("product manager")}&start=${start}&sort_by=timestamp`;
      const data = await getJson<{ data?: { positions?: EfPosition[]; count?: number }; positions?: EfPosition[] }>(url);
      batch = data.data?.positions ?? data.positions ?? [];
      total = data.data?.count ?? Infinity;
    }
    positions.push(...batch);
    if (batch.length < size || positions.length >= total) break;
  }
  const pm = positions.filter((p) => p.name && isPmTitle(p.name));
  // Microsoft's list response has no description – fetch it per role (best effort).
  const descriptions = await pool(pm.slice(0, MAX_DETAILS), 6, async (p) => {
    if (variant !== "pcsx" || p.job_description || p.id === undefined) return undefined;
    try {
      const d = await getJson<{ data?: { jobDescription?: string; job_description?: string } }>(
        `https://${host}/api/pcsx/position_details?position_id=${encodeURIComponent(String(p.id))}&domain=${encodeURIComponent(domain)}&hl=en`,
        {},
        12000
      );
      return d.data?.jobDescription ?? d.data?.job_description;
    } catch {
      return undefined;
    }
  });
  return pm.map((p, i) => normalizeEightfold(c, p, descriptions[i])).filter((j): j is Job => !!j);
}
