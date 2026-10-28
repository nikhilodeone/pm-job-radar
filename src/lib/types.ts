export type Level =
  | "Intern"
  | "Associate"
  | "PM"
  | "Senior"
  | "Staff / Principal"
  | "Lead / Group"
  | "Director"
  | "VP+";

export const LEVELS: Level[] = [
  "Intern",
  "Associate",
  "PM",
  "Senior",
  "Staff / Principal",
  "Lead / Group",
  "Director",
  "VP+",
];

export interface NormLocation {
  raw: string;
  city?: string;
  region?: string;
  country?: string;
  remote: boolean;
}

export interface Job {
  /** `${companyId}:${sourceId}` – unique across all sources */
  id: string;
  companyId: string;
  company: string;
  title: string;
  level: Level;
  team?: string;
  /** Link to the job on the company's own career site (where you apply) */
  url: string;
  /** ISO timestamp – posting or last-update date when the source exposes one */
  postedAt?: string;
  locations: NormLocation[];
  remote: boolean;
  /** Plain-text job description (capped) – used for resume matching */
  description: string;
}

export type Tier = "FAANG+" | "Big Tech" | "High-growth" | "Enterprise & Industry";

/** Display order everywhere a tier list is shown. */
export const TIERS: Tier[] = ["FAANG+", "Big Tech", "High-growth", "Enterprise & Industry"];

export type CompanySource =
  | { ats: "greenhouse"; board: string }
  | { ats: "lever"; site: string; eu?: boolean }
  | { ats: "ashby"; board: string }
  | { ats: "workday"; host: string; tenant: string; site: string }
  | { ats: "amazon" }
  | { ats: "eightfold"; host: string; domain: string; variant: "apply" | "pcsx" }
  | { ats: "atlassian" }
  | { ats: "smartrecruiters"; company: string; /** ISO-2 codes (lowercase) to search again so those countries are not crowded out */ extraCountries?: string[] };

export interface Company {
  id: string;
  name: string;
  tier: Tier;
  careersUrl: string;
  /** Endpoint is undocumented / unverified – shown with a "beta" tag in the UI */
  beta?: boolean;
  source: CompanySource;
}

export interface ManualSource {
  id: string;
  name: string;
  tier: Tier;
  note: string;
  /** Pre-filtered search on the company's own careers site */
  searchUrl: (location?: string) => string;
}

export interface SourceResponse {
  id: string;
  fetchedAt?: string;
  jobs?: Job[];
  error?: string;
}

export interface MatchResult {
  /** 0–100, or null when the posting has no usable description */
  score: number | null;
  label: "Strong" | "Good" | "Fair" | "Stretch" | "No data";
  parts: { skills: number; wording: number; level: number; domain: number };
  matched: string[];
  missing: string[];
  notes: string[];
}
