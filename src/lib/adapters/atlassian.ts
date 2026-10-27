import type { Company, Job } from "../types";
import { isPmTitle, inferLevel } from "../level";
import { parseLocations, isRemoteJob } from "../location";
import { cleanDescription, toIso } from "../text";
import { getJson } from "./http";

export interface AtlassianListing {
  id: number | string;
  title: string;
  category?: string;
  type?: string;
  locations?: string[];
  applyUrl?: string;
  overview?: string;
  responsibilities?: string;
  qualifications?: string;
  portalJobPost?: { id?: number | string; portalUrl?: string; updatedDate?: string };
}

export function normalizeAtlassian(c: Company, j: AtlassianListing): Job | null {
  if (!j.title || !isPmTitle(j.title)) return null;
  const locations = parseLocations(j.locations ?? []);
  return {
    id: `${c.id}:${j.id}`,
    companyId: c.id,
    company: c.name,
    title: j.title.trim(),
    level: inferLevel(j.title),
    team: j.category || undefined,
    url: j.portalJobPost?.portalUrl || j.applyUrl || `https://www.atlassian.com/company/careers/details/${j.id}`,
    postedAt: toIso(j.portalJobPost?.updatedDate),
    locations,
    remote: isRemoteJob(locations),
    description: cleanDescription(j.overview, j.responsibilities, j.qualifications),
  };
}

export async function fetchAtlassian(c: Company): Promise<Job[]> {
  const data = await getJson<AtlassianListing[]>("https://www.atlassian.com/endpoint/careers/listings");
  return (Array.isArray(data) ? data : []).map((j) => normalizeAtlassian(c, j)).filter((j): j is Job => !!j);
}
