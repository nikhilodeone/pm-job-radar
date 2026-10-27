import type { Company, Job } from "../types";
import { isPmTitle, inferLevel } from "../level";
import { parseLocations, isRemoteJob } from "../location";
import { cleanDescription, toIso } from "../text";
import { getJson } from "./http";

export interface LeverPosting {
  id: string;
  text: string;
  createdAt?: number;
  hostedUrl?: string;
  applyUrl?: string;
  workplaceType?: string;
  categories?: { location?: string; team?: string; department?: string; allLocations?: string[] };
  descriptionPlain?: string;
  description?: string;
  lists?: Array<{ text?: string; content?: string }>;
  additionalPlain?: string;
}

export function normalizeLever(c: Company, p: LeverPosting): Job | null {
  if (!p.text || !isPmTitle(p.text)) return null;
  const rawLocs = p.categories?.allLocations?.length ? p.categories.allLocations : [p.categories?.location];
  const locations = parseLocations(rawLocs);
  const listText = (p.lists ?? []).map((l) => `${l.text ?? ""}\n${l.content ?? ""}`);
  return {
    id: `${c.id}:${p.id}`,
    companyId: c.id,
    company: c.name,
    title: p.text.trim(),
    level: inferLevel(p.text),
    team: p.categories?.team || p.categories?.department || undefined,
    url: p.hostedUrl || p.applyUrl || c.careersUrl,
    postedAt: toIso(p.createdAt),
    locations,
    remote: isRemoteJob(locations, p.workplaceType),
    description: cleanDescription(p.descriptionPlain ?? p.description, ...listText, p.additionalPlain),
  };
}

export async function fetchLever(c: Company & { source: { ats: "lever"; site: string; eu?: boolean } }): Promise<Job[]> {
  const host = c.source.eu ? "api.eu.lever.co" : "api.lever.co";
  const data = await getJson<LeverPosting[]>(`https://${host}/v0/postings/${encodeURIComponent(c.source.site)}?mode=json`);
  return (Array.isArray(data) ? data : []).map((p) => normalizeLever(c, p)).filter((j): j is Job => !!j);
}
