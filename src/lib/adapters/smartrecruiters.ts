import type { Company, Job } from "../types";
import { isPmTitle, inferLevel } from "../level";
import { parseLocations, isRemoteJob } from "../location";
import { cleanDescription, toIso } from "../text";
import { getJson, pool } from "./http";

/**
 * SmartRecruiters public Posting API (documented: developers.smartrecruiters.com).
 *   list:   GET /v1/companies/{id}/postings?q=…&limit=100&offset=…
 *   detail: GET /v1/companies/{id}/postings/{postingId}   → jobAd.sections.*.text (HTML)
 */
export interface SrPosting {
  id: string;
  uuid?: string;
  name: string;
  releasedDate?: string;
  location?: { city?: string; region?: string; country?: string; remote?: boolean; hybrid?: boolean };
  department?: { label?: string };
  function?: { label?: string };
}
export interface SrDetail {
  postingUrl?: string;
  applyUrl?: string;
  jobAd?: { sections?: Record<string, { title?: string; text?: string } | undefined> };
}

type SrCompany = Company & { source: { ats: "smartrecruiters"; company: string; extraCountries?: string[] } };

const PAGE = 100;
const GLOBAL_PAGES = 5;
const COUNTRY_PAGES = 2;
const MAX_DETAILS = 40;

/** SmartRecruiters returns ISO-3166 alpha-2 codes; spell them out so the location parser never confuses "IN" with Indiana. */
const ISO2: Record<string, string> = {
  us: "United States", in: "India", gb: "United Kingdom", uk: "United Kingdom", ca: "Canada", de: "Germany", fr: "France", ie: "Ireland", nl: "Netherlands",
  es: "Spain", it: "Italy", pl: "Poland", se: "Sweden", ch: "Switzerland", sg: "Singapore", au: "Australia", nz: "New Zealand", jp: "Japan", kr: "South Korea",
  cn: "China", hk: "Hong Kong", tw: "Taiwan", il: "Israel", ae: "United Arab Emirates", br: "Brazil", mx: "Mexico", ar: "Argentina", co: "Colombia", cl: "Chile",
  ph: "Philippines", id: "Indonesia", vn: "Vietnam", th: "Thailand", my: "Malaysia", za: "South Africa", ng: "Nigeria", ke: "Kenya", eg: "Egypt", pt: "Portugal",
  be: "Belgium", at: "Austria", dk: "Denmark", no: "Norway", fi: "Finland", ro: "Romania", cz: "Czechia", hu: "Hungary", tr: "Türkiye",
};

export function normalizeSmartRecruiters(c: SrCompany, p: SrPosting, detail?: SrDetail): Job | null {
  if (!p.name || !isPmTitle(p.name)) return null;
  const l = p.location ?? {};
  const code = typeof l.country === "string" ? l.country.trim().toLowerCase() : "";
  const country = ISO2[code] ?? (code.length > 2 ? l.country : undefined);
  const raw = [l.city, l.region, country].filter((x): x is string => typeof x === "string" && !!x.trim()).join(", ");
  const locations = parseLocations([raw]);
  const sections = detail?.jobAd?.sections ?? {};
  const url = detail?.postingUrl || `https://jobs.smartrecruiters.com/${encodeURIComponent(c.source.company)}/${p.id}`;
  return {
    id: `${c.id}:${p.id}`,
    companyId: c.id,
    company: c.name,
    title: p.name.trim(),
    level: inferLevel(p.name),
    team: p.department?.label || p.function?.label || undefined,
    url,
    postedAt: toIso(p.releasedDate),
    locations,
    remote: isRemoteJob(locations, l.remote === true),
    description: cleanDescription(sections.jobDescription?.text, sections.qualifications?.text, sections.additionalInformation?.text),
  };
}

async function list(company: string, extra: string, pages: number): Promise<SrPosting[]> {
  const out: SrPosting[] = [];
  for (let page = 0; page < pages; page++) {
    const url =
      `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings` +
      `?q=${encodeURIComponent("product manager")}&limit=${PAGE}&offset=${page * PAGE}${extra}`;
    const data = await getJson<{ totalFound?: number; content?: SrPosting[] }>(url);
    const batch = data.content ?? [];
    out.push(...batch);
    if (batch.length < PAGE || (data.totalFound !== undefined && (page + 1) * PAGE >= data.totalFound)) break;
  }
  return out;
}

export async function fetchSmartRecruiters(c: SrCompany): Promise<Job[]> {
  const { company, extraCountries = [] } = c.source;
  const passes = await Promise.allSettled([
    list(company, "", GLOBAL_PAGES),
    ...extraCountries.map((cc) => list(company, `&country=${encodeURIComponent(cc)}`, COUNTRY_PAGES)),
  ]);
  const ok = passes.filter((r): r is PromiseFulfilledResult<SrPosting[]> => r.status === "fulfilled");
  if (!ok.length) throw new Error((passes[0] as PromiseRejectedResult).reason?.message ?? "SmartRecruiters request failed");

  const byId = new Map<string, SrPosting>();
  for (const r of ok) for (const p of r.value) if (p?.id && p.name && isPmTitle(p.name) && !byId.has(p.id)) byId.set(p.id, p);
  const postings = [...byId.values()];

  const details = await pool(postings.slice(0, MAX_DETAILS), 8, async (p) => {
    try {
      return await getJson<SrDetail>(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings/${encodeURIComponent(p.id)}`, {}, 12000);
    } catch {
      return undefined;
    }
  });
  return postings.map((p, i) => normalizeSmartRecruiters(c, p, details[i])).filter((j): j is Job => !!j);
}
