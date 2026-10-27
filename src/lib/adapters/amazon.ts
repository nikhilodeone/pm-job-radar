import type { Company, Job } from "../types";
import { isPmTitle, inferLevel } from "../level";
import { parseLocations, isRemoteJob } from "../location";
import { cleanDescription, toIso } from "../text";
import { getJson } from "./http";

export interface AmazonJob {
  id?: string;
  id_icims?: string;
  title: string;
  normalized_location?: string;
  location?: string;
  job_path?: string;
  posted_date?: string;
  description?: string;
  basic_qualifications?: string;
  preferred_qualifications?: string;
  job_category?: string;
  team?: string;
  business_category?: string;
}

const PAGE = 100;
const GLOBAL_PAGES = 4;
/** Extra country-restricted passes so non-US roles are not crowded out. ISO-3 codes. Edit freely. */
const EXTRA_COUNTRIES = ["IND"];

export function normalizeAmazon(c: Company, j: AmazonJob): Job | null {
  if (!j.title || !isPmTitle(j.title)) return null;
  const locations = parseLocations([j.normalized_location || j.location]);
  const id = j.id_icims || j.id || j.job_path || j.title;
  return {
    id: `${c.id}:${id}`,
    companyId: c.id,
    company: c.name,
    title: j.title.trim(),
    level: inferLevel(j.title),
    team: j.team || j.job_category || undefined,
    url: j.job_path ? `https://www.amazon.jobs${j.job_path}` : c.careersUrl,
    postedAt: toIso(j.posted_date),
    locations,
    remote: isRemoteJob(locations),
    description: cleanDescription(j.description, j.basic_qualifications, j.preferred_qualifications),
  };
}

async function pass(extra: string, pages: number): Promise<AmazonJob[]> {
  const out: AmazonJob[] = [];
  for (let p = 0; p < pages; p++) {
    const url =
      `https://www.amazon.jobs/en/search.json?base_query=${encodeURIComponent("product manager")}` +
      `&sort=recent&result_limit=${PAGE}&offset=${p * PAGE}${extra}`;
    const data = await getJson<{ hits?: number; jobs?: AmazonJob[] }>(url);
    const jobs = data.jobs ?? [];
    out.push(...jobs);
    if (jobs.length < PAGE || (data.hits !== undefined && (p + 1) * PAGE >= data.hits)) break;
  }
  return out;
}

export async function fetchAmazon(c: Company): Promise<Job[]> {
  const passes = await Promise.allSettled([
    pass("", GLOBAL_PAGES),
    ...EXTRA_COUNTRIES.map((cc) => pass(`&country%5B%5D=${cc}`, 2)),
  ]);
  const ok = passes.filter((p): p is PromiseFulfilledResult<AmazonJob[]> => p.status === "fulfilled");
  if (!ok.length) throw new Error((passes[0] as PromiseRejectedResult).reason?.message ?? "Amazon request failed");
  const seen = new Map<string, Job>();
  for (const r of ok)
    for (const raw of r.value) {
      const job = normalizeAmazon(c, raw);
      if (job && !seen.has(job.id)) seen.set(job.id, job);
    }
  return [...seen.values()];
}
