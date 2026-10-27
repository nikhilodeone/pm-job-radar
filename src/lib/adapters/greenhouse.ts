import type { Company, Job } from "../types";
import { isPmTitle, inferLevel } from "../level";
import { parseLocations, isRemoteJob } from "../location";
import { cleanDescription, toIso } from "../text";
import { getJson } from "./http";

export interface GhJob {
  id: number | string;
  title: string;
  updated_at?: string;
  first_published?: string;
  location?: { name?: string } | null;
  absolute_url?: string;
  content?: string;
  departments?: Array<{ name?: string }>;
  offices?: Array<{ name?: string; location?: string | null }>;
}

export function normalizeGreenhouse(c: Company, j: GhJob): Job | null {
  if (!j.title || !isPmTitle(j.title)) return null;
  const locations = parseLocations([j.location?.name, ...(j.offices ?? []).map((o) => o.location || o.name)]);
  return {
    id: `${c.id}:${j.id}`,
    companyId: c.id,
    company: c.name,
    title: j.title.trim(),
    level: inferLevel(j.title),
    team: j.departments?.[0]?.name || undefined,
    url: j.absolute_url || c.careersUrl,
    postedAt: toIso(j.first_published ?? j.updated_at),
    locations,
    remote: isRemoteJob(locations),
    description: cleanDescription(j.content),
  };
}

export async function fetchGreenhouse(c: Company & { source: { ats: "greenhouse"; board: string } }): Promise<Job[]> {
  const data = await getJson<{ jobs?: GhJob[] }>(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(c.source.board)}/jobs?content=true`
  );
  return (data.jobs ?? []).map((j) => normalizeGreenhouse(c, j)).filter((j): j is Job => !!j);
}
