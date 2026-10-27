import type { Company, Job } from "../types";
import { isPmTitle, inferLevel } from "../level";
import { parseLocations, isRemoteJob } from "../location";
import { cleanDescription, toIso } from "../text";
import { getJson, pool } from "./http";

export interface WdListItem {
  title: string;
  externalPath: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
}
export interface WdDetail {
  jobPostingInfo?: {
    id?: string;
    title?: string;
    jobDescription?: string;
    location?: string;
    additionalLocations?: string[];
    startDate?: string;
    timeType?: string;
    remoteType?: string;
    externalUrl?: string;
    jobReqId?: string;
    postedOn?: string;
  };
}

const MAX_PAGES = 10; // 20 results/page → 200 search hits per company
const MAX_DETAILS = 40; // description fetches per company

/** "Posted Today" / "Posted 3 Days Ago" / "Posted 30+ Days Ago" → ISO date (approximate) */
export function parsePostedOn(s: string | undefined, now = new Date()): string | undefined {
  if (!s) return undefined;
  const t = s.toLowerCase();
  let days: number | undefined;
  if (t.includes("today")) days = 0;
  else if (t.includes("yesterday")) days = 1;
  else {
    const m = t.match(/(\d+)\+?\s*day/);
    if (m) days = parseInt(m[1], 10);
  }
  if (days === undefined) return undefined;
  return new Date(now.getTime() - days * 86400000).toISOString();
}

export function normalizeWorkday(
  c: Company & { source: { ats: "workday"; host: string; tenant: string; site: string } },
  item: WdListItem,
  detail?: WdDetail
): Job | null {
  if (!isPmTitle(item.title)) return null;
  const info = detail?.jobPostingInfo;
  const locations = parseLocations(
    info ? [info.location, ...(info.additionalLocations ?? [])] : [item.locationsText]
  );
  const { host, site } = c.source;
  const fallbackUrl = `https://${host}/en-US/${site}${item.externalPath}`;
  return {
    id: `${c.id}:${info?.jobReqId ?? item.bulletFields?.[0] ?? item.externalPath}`,
    companyId: c.id,
    company: c.name,
    title: item.title.trim(),
    level: inferLevel(item.title),
    url: info?.externalUrl || fallbackUrl,
    postedAt: toIso(info?.startDate) ?? parsePostedOn(info?.postedOn ?? item.postedOn),
    locations,
    remote: isRemoteJob(locations, info?.remoteType),
    description: cleanDescription(info?.jobDescription),
  };
}

export async function fetchWorkday(
  c: Company & { source: { ats: "workday"; host: string; tenant: string; site: string } }
): Promise<Job[]> {
  const { host, tenant, site } = c.source;
  const base = `https://${host}/wday/cxs/${tenant}/${site}`;
  const items: WdListItem[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await getJson<{ total?: number; jobPostings?: WdListItem[] }>(`${base}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: page * 20, searchText: "product manager" }),
    });
    const batch = data.jobPostings ?? [];
    items.push(...batch);
    if (batch.length < 20 || items.length >= (data.total ?? Infinity)) break;
  }
  const pm = items.filter((i) => isPmTitle(i.title));
  const details = await pool(pm.slice(0, MAX_DETAILS), 8, async (i) => {
    try {
      return await getJson<WdDetail>(`${base}${i.externalPath}`, {}, 12000);
    } catch {
      return undefined;
    }
  });
  return pm
    .map((item, idx) => normalizeWorkday(c, item, details[idx]))
    .filter((j): j is Job => !!j);
}
