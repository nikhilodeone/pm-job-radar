import type { Company, ManualSource } from "./types";

/**
 * Add / remove companies here – one entry per company.
 *
 *  greenhouse → board token = the part after boards.greenhouse.io/ (or job-boards.greenhouse.io/)
 *  lever      → site = the part after jobs.lever.co/
 *  ashby      → board = the part after jobs.ashbyhq.com/
 *  workday    → host/tenant/site from https://<tenant>.<host>/<site> (e.g. nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite)
 *
 * `beta: true` marks endpoints that are undocumented by the vendor and may change.
 * Any source that fails shows up in the "Sources" panel with the reason – it never breaks the dashboard.
 */
export const COMPANIES: Company[] = [
  /* ---------- FAANG+ ---------- */
  { id: "amazon", name: "Amazon", tier: "FAANG+", careersUrl: "https://www.amazon.jobs/en/search?base_query=product+manager", source: { ats: "amazon" } },
  { id: "netflix", name: "Netflix", tier: "FAANG+", careersUrl: "https://explore.jobs.netflix.net/careers?query=product%20manager", beta: true, source: { ats: "eightfold", host: "explore.jobs.netflix.net", domain: "netflix.com", variant: "apply" } },
  { id: "microsoft", name: "Microsoft", tier: "FAANG+", careersUrl: "https://apply.careers.microsoft.com/careers?query=product%20manager", beta: true, source: { ats: "eightfold", host: "apply.careers.microsoft.com", domain: "microsoft.com", variant: "pcsx" } },

  /* ---------- Big Tech ---------- */
  { id: "nvidia", name: "NVIDIA", tier: "Big Tech", careersUrl: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite?q=product%20manager", source: { ats: "workday", host: "nvidia.wd5.myworkdayjobs.com", tenant: "nvidia", site: "NVIDIAExternalCareerSite" } },
  { id: "salesforce", name: "Salesforce", tier: "Big Tech", careersUrl: "https://salesforce.wd12.myworkdayjobs.com/External_Career_Site?q=product%20manager", source: { ats: "workday", host: "salesforce.wd12.myworkdayjobs.com", tenant: "salesforce", site: "External_Career_Site" } },
  { id: "adobe", name: "Adobe", tier: "Big Tech", careersUrl: "https://adobe.wd5.myworkdayjobs.com/external_experienced?q=product%20manager", source: { ats: "workday", host: "adobe.wd5.myworkdayjobs.com", tenant: "adobe", site: "external_experienced" } },
  { id: "intel", name: "Intel", tier: "Big Tech", careersUrl: "https://intel.wd1.myworkdayjobs.com/External?q=product%20manager", source: { ats: "workday", host: "intel.wd1.myworkdayjobs.com", tenant: "intel", site: "External" } },
  { id: "paypal", name: "PayPal", tier: "Big Tech", careersUrl: "https://paypal.wd1.myworkdayjobs.com/jobs?q=product%20manager", source: { ats: "workday", host: "paypal.wd1.myworkdayjobs.com", tenant: "paypal", site: "jobs" } },
  { id: "mastercard", name: "Mastercard", tier: "Big Tech", careersUrl: "https://mastercard.wd1.myworkdayjobs.com/CorporateCareers?q=product%20manager", source: { ats: "workday", host: "mastercard.wd1.myworkdayjobs.com", tenant: "mastercard", site: "CorporateCareers" } },
  { id: "atlassian", name: "Atlassian", tier: "Big Tech", careersUrl: "https://www.atlassian.com/company/careers/all-jobs?search=product%20manager", beta: true, source: { ats: "atlassian" } },
  { id: "spotify", name: "Spotify", tier: "Big Tech", careersUrl: "https://www.lifeatspotify.com/jobs?q=product+manager", source: { ats: "lever", site: "spotify" } },
  { id: "palantir", name: "Palantir", tier: "Big Tech", careersUrl: "https://jobs.lever.co/palantir?query=product", source: { ats: "lever", site: "palantir" } },
  { id: "cloudflare", name: "Cloudflare", tier: "Big Tech", careersUrl: "https://boards.greenhouse.io/cloudflare", source: { ats: "greenhouse", board: "cloudflare" } },
  { id: "datadog", name: "Datadog", tier: "Big Tech", careersUrl: "https://boards.greenhouse.io/datadog", source: { ats: "greenhouse", board: "datadog" } },
  { id: "twilio", name: "Twilio", tier: "Big Tech", careersUrl: "https://boards.greenhouse.io/twilio", source: { ats: "greenhouse", board: "twilio" } },
  { id: "okta", name: "Okta", tier: "Big Tech", careersUrl: "https://boards.greenhouse.io/okta", source: { ats: "greenhouse", board: "okta" } },
  { id: "dropbox", name: "Dropbox", tier: "Big Tech", careersUrl: "https://boards.greenhouse.io/dropbox", source: { ats: "greenhouse", board: "dropbox" } },
  { id: "workday", name: "Workday", tier: "Big Tech", careersUrl: "https://workday.wd5.myworkdayjobs.com/Workday?q=product%20manager", source: { ats: "workday", host: "workday.wd5.myworkdayjobs.com", tenant: "workday", site: "Workday" } },

  /* ---------- High-growth / scale-ups ---------- */
  { id: "stripe", name: "Stripe", tier: "High-growth", careersUrl: "https://stripe.com/jobs/search?query=product+manager", source: { ats: "greenhouse", board: "stripe" } },
  { id: "airbnb", name: "Airbnb", tier: "High-growth", careersUrl: "https://careers.airbnb.com/positions/?keyword=product+manager", source: { ats: "greenhouse", board: "airbnb" } },
  { id: "databricks", name: "Databricks", tier: "High-growth", careersUrl: "https://www.databricks.com/company/careers/open-positions?search=product%20manager", source: { ats: "greenhouse", board: "databricks" } },
  { id: "anthropic", name: "Anthropic", tier: "High-growth", careersUrl: "https://www.anthropic.com/careers/jobs", source: { ats: "greenhouse", board: "anthropic" } },
  { id: "openai", name: "OpenAI", tier: "High-growth", careersUrl: "https://openai.com/careers/search/?q=product%20manager", source: { ats: "ashby", board: "openai" } },
  { id: "figma", name: "Figma", tier: "High-growth", careersUrl: "https://www.figma.com/careers/#job-openings", source: { ats: "greenhouse", board: "figma" } },
  { id: "pinterest", name: "Pinterest", tier: "High-growth", careersUrl: "https://www.pinterestcareers.com/en/jobs/?search=product+manager", source: { ats: "greenhouse", board: "pinterest" } },
  { id: "reddit", name: "Reddit", tier: "High-growth", careersUrl: "https://www.redditinc.com/careers", source: { ats: "greenhouse", board: "reddit" } },
  { id: "coinbase", name: "Coinbase", tier: "High-growth", careersUrl: "https://www.coinbase.com/careers/positions", source: { ats: "greenhouse", board: "coinbase" } },
  { id: "instacart", name: "Instacart", tier: "High-growth", careersUrl: "https://boards.greenhouse.io/instacart", source: { ats: "greenhouse", board: "instacart" } },
  { id: "robinhood", name: "Robinhood", tier: "High-growth", careersUrl: "https://boards.greenhouse.io/robinhood", source: { ats: "greenhouse", board: "robinhood" } },
  { id: "lyft", name: "Lyft", tier: "High-growth", careersUrl: "https://www.lyft.com/careers", source: { ats: "greenhouse", board: "lyft" } },
  { id: "discord", name: "Discord", tier: "High-growth", careersUrl: "https://discord.com/careers", source: { ats: "greenhouse", board: "discord" } },
  { id: "duolingo", name: "Duolingo", tier: "High-growth", careersUrl: "https://careers.duolingo.com/", source: { ats: "greenhouse", board: "duolingo" } },
  { id: "mongodb", name: "MongoDB", tier: "High-growth", careersUrl: "https://www.mongodb.com/company/careers/teams/product", source: { ats: "greenhouse", board: "mongodb" } },
  { id: "asana", name: "Asana", tier: "High-growth", careersUrl: "https://asana.com/jobs/all", source: { ats: "greenhouse", board: "asana" } },
  { id: "gitlab", name: "GitLab", tier: "High-growth", careersUrl: "https://about.gitlab.com/jobs/all-jobs/", source: { ats: "greenhouse", board: "gitlab" } },
  { id: "scaleai", name: "Scale AI", tier: "High-growth", careersUrl: "https://scale.com/careers", source: { ats: "greenhouse", board: "scaleai" } },
  { id: "notion", name: "Notion", tier: "High-growth", careersUrl: "https://www.notion.so/careers", source: { ats: "ashby", board: "notion" } },
  { id: "ramp", name: "Ramp", tier: "High-growth", careersUrl: "https://ramp.com/careers", source: { ats: "ashby", board: "ramp" } },
  { id: "linear", name: "Linear", tier: "High-growth", careersUrl: "https://linear.app/careers", source: { ats: "ashby", board: "linear" } },
  { id: "perplexity", name: "Perplexity", tier: "High-growth", careersUrl: "https://www.perplexity.ai/hub/careers", source: { ats: "ashby", board: "perplexity" } },
  { id: "cred", name: "CRED", tier: "High-growth", careersUrl: "https://jobs.lever.co/cred", source: { ats: "lever", site: "cred" } },
];

/**
 * Companies that do not expose a stable public jobs feed (Google, Meta, Apple, Uber).
 * They appear as one-click, pre-filtered search links instead of rows in the table.
 */
export const MANUAL_SOURCES: ManualSource[] = [
  {
    id: "google",
    name: "Google",
    tier: "FAANG+",
    note: "No public jobs API",
    searchUrl: (loc) =>
      `https://www.google.com/about/careers/applications/jobs/results/?q=${encodeURIComponent('"Product Manager"')}${loc ? `&location=${encodeURIComponent(loc)}` : ""}&sort_by=date`,
  },
  {
    id: "meta",
    name: "Meta",
    tier: "FAANG+",
    note: "Search is GraphQL-only",
    searchUrl: () => `https://www.metacareers.com/jobsearch?q=${encodeURIComponent("product manager")}`,
  },
  {
    id: "apple",
    name: "Apple",
    tier: "FAANG+",
    note: "Search needs a session token",
    searchUrl: () => `https://jobs.apple.com/en-us/search?search=${encodeURIComponent("product manager")}&sort=newest`,
  },
  {
    id: "uber",
    name: "Uber",
    tier: "Big Tech",
    note: "Search needs a CSRF token",
    searchUrl: () => `https://www.uber.com/us/en/careers/list/?query=${encodeURIComponent("product manager")}`,
  },
];

export function companyById(id: string): Company | undefined {
  return COMPANIES.find((c) => c.id === id);
}
