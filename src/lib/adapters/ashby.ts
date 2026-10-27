import type { Company, Job } from "../types";
import { isPmTitle, inferLevel } from "../level";
import { parseLocations, isRemoteJob } from "../location";
import { cleanDescription, toIso } from "../text";
import { getJson } from "./http";

export interface AshbyJob {
  id?: string;
  title: string;
  department?: string;
  team?: string;
  location?: string;
  secondaryLocations?: Array<{ location?: string } | string>;
  isRemote?: boolean;
  workplaceType?: string;
  publishedAt?: string;
  jobUrl?: string;
  applyUrl?: string;
  descriptionPlain?: string;
  descriptionText?: string;
  descriptionHtml?: string;
  isListed?: boolean;
}

export function normalizeAshby(c: Company, j: AshbyJob): Job | null {
  if (!j.title || !isPmTitle(j.title) || j.isListed === false) return null;
  const secondary = (j.secondaryLocations ?? []).map((s) => (typeof s === "string" ? s : s.location));
  const locations = parseLocations([j.location, ...secondary]);
  const url = j.jobUrl || j.applyUrl || c.careersUrl;
  return {
    id: `${c.id}:${j.id ?? url}`,
    companyId: c.id,
    company: c.name,
    title: j.title.trim(),
    level: inferLevel(j.title),
    team: j.team || j.department || undefined,
    url,
    postedAt: toIso(j.publishedAt),
    locations,
    remote: isRemoteJob(locations, j.isRemote ?? j.workplaceType),
    description: cleanDescription(j.descriptionPlain ?? j.descriptionText ?? j.descriptionHtml),
  };
}

export async function fetchAshby(c: Company & { source: { ats: "ashby"; board: string } }): Promise<Job[]> {
  const data = await getJson<{ jobs?: AshbyJob[] }>(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(c.source.board)}`
  );
  return (data.jobs ?? []).map((j) => normalizeAshby(c, j)).filter((j): j is Job => !!j);
}
