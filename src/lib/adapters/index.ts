import type { Company, Job } from "../types";
import { fetchGreenhouse } from "./greenhouse";
import { fetchLever } from "./lever";
import { fetchAshby } from "./ashby";
import { fetchWorkday } from "./workday";
import { fetchAmazon } from "./amazon";
import { fetchEightfold } from "./eightfold";
import { fetchAtlassian } from "./atlassian";

export async function fetchCompanyJobs(c: Company): Promise<Job[]> {
  const s = c.source;
  let jobs: Job[];
  switch (s.ats) {
    case "greenhouse":
      jobs = await fetchGreenhouse({ ...c, source: s });
      break;
    case "lever":
      jobs = await fetchLever({ ...c, source: s });
      break;
    case "ashby":
      jobs = await fetchAshby({ ...c, source: s });
      break;
    case "workday":
      jobs = await fetchWorkday({ ...c, source: s });
      break;
    case "amazon":
      jobs = await fetchAmazon(c);
      break;
    case "eightfold":
      jobs = await fetchEightfold({ ...c, source: s });
      break;
    case "atlassian":
      jobs = await fetchAtlassian(c);
      break;
  }
  // newest first, stable
  return jobs.sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
}
