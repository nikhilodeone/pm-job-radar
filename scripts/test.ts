/* Run with: npm test  – no network needed. Verifies PM-title filtering, location parsing,
   every adapter's normaliser (against fixtures shaped like the vendors' documented responses),
   filtering and the resume-scoring engine. */
import assert from "node:assert/strict";
import { isPmTitle, inferLevel } from "../src/lib/level";
import { parseLocation, parseLocations } from "../src/lib/location";
import { htmlToText } from "../src/lib/text";
import { normalizeGreenhouse } from "../src/lib/adapters/greenhouse";
import { normalizeLever } from "../src/lib/adapters/lever";
import { normalizeAshby } from "../src/lib/adapters/ashby";
import { normalizeWorkday, parsePostedOn } from "../src/lib/adapters/workday";
import { normalizeAmazon } from "../src/lib/adapters/amazon";
import { normalizeEightfold } from "../src/lib/adapters/eightfold";
import { normalizeAtlassian } from "../src/lib/adapters/atlassian";
import { COMPANIES } from "../src/lib/companies";
import { applyFilters, DEFAULT_FILTERS } from "../src/lib/filter";
import { buildCorpus, buildResumeProfile, scoreJob, estimateYears } from "../src/lib/scoring";
import { jobsToCsv } from "../src/lib/csv";
import { sanitizeJob, sanitizeJobs } from "../src/lib/sanitize";
import type { Company, Job } from "../src/lib/types";

let passed = 0;
const t = (name: string, fn: () => void) => {
  try {
    fn();
    passed++;
    console.log("  ✓", name);
  } catch (e) {
    console.error("  ✗", name, "\n   ", (e as Error).message);
    process.exitCode = 1;
  }
};
const co = (id: string): Company => COMPANIES.find((c) => c.id === id)!;

console.log("PM title filter & level");
t("accepts PM titles", () => {
  for (const x of [
    "Product Manager", "Senior Product Manager, Payments", "Group Product Manager", "Principal Product Manager - Tech", "Associate Product Manager (APM)",
    "Technical Product Manager", "Director of Product Management", "Director, Product", "VP of Product", "Head of Product, Growth", "Product Management Intern",
    "Staff Product Manager", "Senior Manager, Product Management", "Product Manager II", "Lead Product Manager", "Product Owner", "Principal, Product",
  ]) assert.ok(isPmTitle(x), x);
});
t("rejects adjacent functions", () => {
  for (const x of [
    "Product Marketing Manager", "Product Designer", "Senior Product Design Manager", "Product Operations Manager", "Product Analyst", "Software Engineer",
    "Technical Program Manager", "Product Security Engineer", "Product Counsel", "Senior Product Data Scientist", "Program Manager, Product Launch", "Sales Manager",
  ]) assert.ok(!isPmTitle(x), x);
});
t("infers level", () => {
  const cases: Record<string, string> = {
    "Product Management Intern": "Intern", "Associate Product Manager": "Associate", "Product Manager": "PM", "Product Manager II": "PM",
    "Senior Product Manager": "Senior", "Sr. Product Manager, Ads": "Senior", "Staff Product Manager": "Staff / Principal", "Principal Product Manager": "Staff / Principal",
    "Group Product Manager": "Lead / Group", "Senior Manager, Product Management": "Lead / Group", "Director of Product": "Director", "VP, Product": "VP+", "Head of Product": "Director",
  };
  for (const [title, lvl] of Object.entries(cases)) assert.equal(inferLevel(title), lvl, title);
});

console.log("Location parsing");
t("India", () => {
  const a = parseLocation("Bengaluru, Karnataka, India");
  assert.deepEqual([a.city, a.country, a.remote], ["Bengaluru", "India", false]);
  const b = parseLocation("Bangalore, KA, IND");
  assert.deepEqual([b.city, b.country], ["Bengaluru", "India"]);
  const c = parseLocation("Gurgaon, Haryana, India");
  assert.deepEqual([c.city, c.country], ["Gurugram", "India"]);
  const d = parseLocation("Hyderabad, Telangana, IND");
  assert.deepEqual([d.city, d.country], ["Hyderabad", "India"]);
  assert.equal(parseLocation("Hyderabad").country, "India");
  assert.equal(parseLocation("New Delhi, DL, IN").country, "India");
  assert.equal(parseLocation("Pune, Maharashtra").country, "India");
});
t("US / Canada disambiguation", () => {
  const a = parseLocation("San Francisco, CA");
  assert.deepEqual([a.city, a.country], ["San Francisco", "United States"]);
  assert.equal(parseLocation("Seattle, WA, USA").country, "United States");
  assert.equal(parseLocation("Indianapolis, IN").country, "United States");
  assert.equal(parseLocation("Toronto, ON, Canada").country, "Canada");
  assert.equal(parseLocation("Toronto, ON").country, "Canada");
  assert.equal(parseLocation("Austin, Texas, United States").country, "United States");
  assert.equal(parseLocation("Wilmington, DE").country, "United States");
});
t("remote handling", () => {
  const a = parseLocation("Remote - India");
  assert.deepEqual([a.country, a.remote], ["India", true]);
  const b = parseLocation("Remote");
  assert.deepEqual([b.country, b.remote, b.city], [undefined, true, undefined]);
  const c = parseLocation("Remote, US");
  assert.deepEqual([c.country, c.remote], ["United States", true]);
  const d = parseLocation("Seattle, WA (Hybrid)");
  assert.deepEqual([d.city, d.remote], ["Seattle", false]);
});
t("elsewhere & multi-location", () => {
  assert.equal(parseLocation("London, UK").country, "United Kingdom");
  assert.equal(parseLocation("Dublin, Ireland").country, "Ireland");
  assert.equal(parseLocation("Singapore").country, "Singapore");
  assert.equal(parseLocation("Tel Aviv-Yafo, Israel").city, "Tel Aviv");
  const many = parseLocations(["Bengaluru, India; Hyderabad, India | London, UK", "Bangalore, KA, IND"]);
  assert.deepEqual(many.map((l) => l.city), ["Bengaluru", "Hyderabad", "London"]);
  assert.equal(parseLocations(["2 Locations"]).length, 1);
});

console.log("Text helpers");
t("htmlToText handles escaped Greenhouse markup", () => {
  const out = htmlToText("&lt;p&gt;Own the roadmap &amp;amp; metrics.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;SQL&lt;/li&gt;&lt;li&gt;A/B tests&lt;/li&gt;&lt;/ul&gt;");
  assert.match(out, /Own the roadmap & metrics\./);
  assert.match(out, /• SQL/);
  assert.ok(!out.includes("<"));
});
t("htmlToText strips real markup", () => {
  assert.equal(htmlToText("<div>Hello<br/>World&nbsp;&#39;x&#39;</div>"), "Hello\nWorld 'x'");
});

console.log("Adapter normalisers (fixtures)");
const JD = "Own the product roadmap and strategy. Partner with engineering, design and stakeholders. Run A/B tests, use SQL and metrics to drive growth. 5+ years of product management experience. ".repeat(3);
t("greenhouse", () => {
  const raw = { id: 123, title: "Senior Product Manager, Payments", updated_at: "2026-10-20T10:00:00-04:00", location: { name: "Bengaluru, India" }, absolute_url: "https://boards.greenhouse.io/stripe/jobs/123", content: `&lt;p&gt;${JD}&lt;/p&gt;`, departments: [{ name: "Product" }], offices: [{ name: "Bengaluru", location: "Bengaluru, Karnataka, India" }] };
  const j = normalizeGreenhouse(co("stripe"), raw)!;
  assert.equal(j.id, "stripe:123");
  assert.equal(j.level, "Senior");
  assert.equal(j.locations.length, 1);
  assert.equal(j.locations[0].country, "India");
  assert.equal(j.url, raw.absolute_url);
  assert.ok(j.postedAt?.startsWith("2026-10-20"));
  assert.ok(j.description.startsWith("Own the product roadmap"));
  assert.equal(normalizeGreenhouse(co("stripe"), { ...raw, title: "Product Designer" }), null);
});
t("lever", () => {
  const raw = { id: "abc", text: "Product Manager, Growth", createdAt: 1760000000000, hostedUrl: "https://jobs.lever.co/spotify/abc", workplaceType: "remote", categories: { location: "Stockholm", allLocations: ["Stockholm", "London"], team: "Product" }, descriptionPlain: JD, lists: [{ text: "Requirements", content: "<li>SQL</li><li>Experimentation</li>" }], additionalPlain: "Equal opportunity employer." };
  const j = normalizeLever(co("spotify"), raw)!;
  assert.equal(j.remote, true);
  assert.deepEqual(j.locations.map((l) => l.city), ["Stockholm", "London"]);
  assert.match(j.description, /Requirements/);
  assert.match(j.description, /• SQL/);
  assert.equal(j.postedAt, new Date(1760000000000).toISOString());
});
t("ashby", () => {
  const raw = { id: "u-1", title: "Product Manager, Agents", location: "San Francisco", secondaryLocations: [{ location: "New York" }, { location: "Remote - US" }], isRemote: false, publishedAt: "2026-10-01T00:00:00.000+00:00", jobUrl: "https://jobs.ashbyhq.com/openai/u-1", descriptionPlain: JD, team: "Applied" };
  const j = normalizeAshby(co("openai"), raw)!;
  assert.equal(j.locations.length, 3);
  assert.equal(j.remote, true); // one location is remote
  assert.equal(j.team, "Applied");
  const j2 = normalizeAshby(co("openai"), { ...raw, descriptionPlain: undefined, descriptionText: "text variant " + JD })!;
  assert.match(j2.description, /^text variant/);
});
t("workday", () => {
  const wd = co("nvidia") as Company & { source: { ats: "workday"; host: string; tenant: string; site: string } };
  const item = { title: "Senior Product Manager - AI Platform", externalPath: "/job/India-Bengaluru/Senior-Product-Manager_JR1999", locationsText: "2 Locations", postedOn: "Posted 3 Days Ago", bulletFields: ["JR1999"] };
  const detail = { jobPostingInfo: { jobReqId: "JR1999", location: "India, Bengaluru", additionalLocations: ["US, CA, Santa Clara"], startDate: "2026-10-22", jobDescription: `<p>${JD}</p>`, externalUrl: "https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/India-Bengaluru/Senior-Product-Manager_JR1999" } };
  const j = normalizeWorkday(wd, item, detail)!;
  assert.deepEqual(j.locations.map((l) => l.country), ["India", "United States"]);
  assert.ok(j.postedAt?.startsWith("2026-10-22"));
  const noDetail = normalizeWorkday(wd, item)!;
  assert.equal(noDetail.url, `https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite${item.externalPath}`);
  assert.equal(noDetail.description, "");
  assert.equal(parsePostedOn("Posted Today", new Date("2026-10-27T00:00:00Z"))?.slice(0, 10), "2026-10-27");
  assert.equal(parsePostedOn("Posted 30+ Days Ago", new Date("2026-10-27T00:00:00Z"))?.slice(0, 10), "2026-09-27");
});
t("amazon", () => {
  const raw = { id_icims: "3012345", title: "Sr. Product Manager, Technical - Alexa", normalized_location: "Hyderabad, Telangana, IND", job_path: "/en/jobs/3012345/sr-pm", posted_date: "October 21, 2026", description: JD, basic_qualifications: "5+ years of product management experience", preferred_qualifications: "SQL", job_category: "Product Management" };
  const j = normalizeAmazon(co("amazon"), raw)!;
  assert.equal(j.url, "https://www.amazon.jobs/en/jobs/3012345/sr-pm");
  assert.equal(j.locations[0].city, "Hyderabad");
  assert.equal(j.locations[0].country, "India");
  assert.equal(j.level, "Senior");
  assert.ok(j.postedAt);
  assert.equal(normalizeAmazon(co("amazon"), { ...raw, title: "Program Manager II" }), null);
});
t("eightfold (netflix + microsoft shapes)", () => {
  const nf = co("netflix") as Company & { source: { ats: "eightfold"; host: string; domain: string; variant: "apply" | "pcsx" } };
  const a = normalizeEightfold(nf, { id: 790, name: "Product Manager - Games", location: "Los Gatos, California", t_create: 1760000000, canonicalPositionUrl: "https://explore.jobs.netflix.net/careers/job/790", job_description: `<p>${JD}</p>` })!;
  assert.equal(a.url, "https://explore.jobs.netflix.net/careers/job/790");
  assert.equal(a.postedAt, new Date(1760000000 * 1000).toISOString());
  const ms = co("microsoft") as typeof nf;
  const b = normalizeEightfold(ms, { id: 1970393556625300, name: "Principal Product Manager", locations: ["India, Telangana, Hyderabad", "United States, Washington, Redmond"], postedTs: 1760000000, positionUrl: "/careers/job/1970393556625300" }, JD)!;
  assert.equal(b.url, "https://apply.careers.microsoft.com/careers/job/1970393556625300");
  assert.deepEqual(b.locations.map((l) => l.country), ["India", "United States"]);
});
t("atlassian", () => {
  const j = normalizeAtlassian(co("atlassian"), { id: 555, title: "Principal Product Manager", category: "Product", locations: ["Bengaluru, India", "Remote - Australia"], overview: JD, responsibilities: "Own roadmap.", qualifications: "SQL", portalJobPost: { portalUrl: "https://www.atlassian.com/company/careers/details/555", updatedDate: "2026-10-10" } })!;
  assert.equal(j.remote, true);
  assert.equal(j.level, "Staff / Principal");
});

console.log("Filters");
const mk = (id: string, over: Partial<Job>): Job => ({ id, companyId: "stripe", company: "Stripe", title: "Product Manager", level: "PM", url: "https://x/" + id, locations: [], remote: false, description: JD, postedAt: "2026-10-20T00:00:00Z", ...over });
const jobs: Job[] = [
  mk("a", { locations: parseLocations(["Bengaluru, India"]) }),
  mk("b", { locations: parseLocations(["Hyderabad, India"]), companyId: "amazon", company: "Amazon", level: "Senior" }),
  mk("c", { locations: parseLocations(["Remote"]), remote: true }),
  mk("d", { locations: parseLocations(["Remote - India"]), remote: true }),
  mk("e", { locations: parseLocations(["Seattle, WA"]), companyId: "amazon", company: "Amazon", postedAt: "2026-08-01T00:00:00Z" }),
];
const NOW = Date.parse("2026-10-27T00:00:00Z");
const ids = (f: Partial<typeof DEFAULT_FILTERS>) => applyFilters(jobs, { ...DEFAULT_FILTERS, ...f }, {}, {}, NOW).map((j) => j.id).sort().join("");
t("country / city / remote / recency", () => {
  assert.equal(ids({}), "abcde");
  assert.equal(ids({ country: "India" }), "abd");
  assert.equal(ids({ country: "India", alsoRemote: true }), "abcd");
  assert.equal(ids({ country: "India", city: "Hyderabad" }), "b");
  assert.equal(ids({ mode: "remote" }), "cd");
  assert.equal(ids({ mode: "onsite", country: "India" }), "ab");
  assert.equal(ids({ posted: "30" }), "abcd");
  assert.equal(ids({ companies: ["amazon"] }), "be");
  assert.equal(ids({ levels: ["Senior"] }), "b");
  assert.equal(ids({ q: "amazon seattle" }), "e");
  assert.equal(ids({ tiers: ["FAANG+"] }), "be");
});
t("csv escaping", () => {
  const csv = jobsToCsv([mk("z", { title: '=HYPERLINK("x"), PM', company: "A, Inc" })], {}, {});
  assert.match(csv, /"'=HYPERLINK/);
  assert.match(csv, /"A, Inc"/);
});

console.log("Resume scoring");
const RESUME = `
Nikhil Sharma — Senior Product Manager
8+ years of product management experience across fintech and B2B SaaS.
Experience
Senior Product Manager, PayCo (2021 – Present)
- Owned the product roadmap and strategy for the merchant payments platform; prioritized backlog with engineering, design and stakeholders.
- Ran 40+ A/B tests and experiments; defined KPIs and OKRs, used SQL and Amplitude dashboards to track funnel conversion and retention, lifting activation by 18%.
- Led go-to-market and launch of a new pricing and monetization model, driving $12M revenue.
- Managed a team of 4 PMs; mentored associate product managers; presented to executives and cross-functional leadership.
- Worked with APIs and microservices teams; wrote PRDs and user stories in an agile / scrum environment (Jira).
Product Manager, ShopKart (2017 – 2021)
- Marketplace and e-commerce checkout product; conducted customer interviews and user research to drive discovery.
- Improved fraud and risk checks for payments; partnered with ML team on recommendation engine.
Education: B.Tech, IIT Delhi (2013 - 2017)
`;
const JD_FIT = `Senior Product Manager, Payments. You will own the product roadmap and product strategy for our merchant payments and checkout platform. Partner with engineering, design and stakeholders; prioritize the backlog; define metrics, KPIs and OKRs; run A/B tests and experiments; use SQL to analyze funnel conversion and retention. Lead go-to-market and pricing launches. Qualifications: 6+ years of product management experience in fintech, payments or marketplace products. Experience with APIs, fraud and risk is a plus. Strong communication with executives and cross-functional teams.`;
const JD_OFF = `Director of Product, Embedded Hardware and Firmware. Lead the hardware product line for automotive telematics and IoT devices, managing a large team of product managers and engineers. Own semiconductor supplier roadmap, manufacturing cost, vehicle fleet integrations and regulatory compliance. 15+ years of experience shipping consumer hardware at scale; P&L ownership and board-level presentations.`;
const JD_JUNIOR = `Associate Product Manager. Support the product team on research, writing user stories and tracking metrics for a consumer mobile app. 0-2 years of experience. Familiarity with SQL and A/B testing a plus. Learn roadmap planning and prioritization alongside designers and engineers.`;
const filler = Array.from({ length: 6 }, (_, i) => mk(`f${i}`, { title: "Product Manager", description: `Generic product role number ${i}. Work with the team to build things customers love. Collaborate, communicate and deliver results. ${i % 2 ? "Mobile apps and consumer growth." : "Enterprise SaaS and workflows."} Requirements: 3+ years of experience.` }));
const fit = mk("fit", { title: "Senior Product Manager, Payments", level: "Senior", description: JD_FIT });
const off = mk("off", { title: "Director of Product, Embedded Hardware", level: "Director", description: JD_OFF });
const junior = mk("jr", { title: "Associate Product Manager", level: "Associate", description: JD_JUNIOR });
const corpus = buildCorpus([fit, off, junior, ...filler]);
const NOWD = new Date("2026-10-27T00:00:00Z");
const profile = buildResumeProfile(RESUME, NOWD);
t("resume profile detects years, level, skills", () => {
  assert.equal(profile.years, 8);
  assert.equal(profile.level, "Senior");
  assert.ok(profile.pmSignal > 0.8);
  assert.ok(profile.skillCounts.has("roadmap") && profile.skillCounts.has("experimentation") && profile.skillCounts.has("fintech"));
});
t("years fall back to work-history dates and ignore education", () => {
  assert.equal(estimateYears("Product Manager, Foo (2019 – Present)\nB.Tech, XYZ University (2010 - 2014)", NOWD), 7);
  assert.equal(estimateYears("No dates here at all", NOWD), null);
});
const sFit = scoreJob(profile, fit, corpus);
const sOff = scoreJob(profile, off, corpus);
const sJr = scoreJob(profile, junior, corpus);
console.log(`   scores → fit ${sFit.score} (${sFit.label}), junior ${sJr.score}, off-domain ${sOff.score}`);
t("ranks the relevant senior role first", () => {
  assert.ok(sFit.score! >= 70, `fit=${sFit.score}`);
  assert.ok(sFit.score! > sOff.score! + 20, `fit=${sFit.score} off=${sOff.score}`);
  assert.ok(sFit.score! > sJr.score!, `fit=${sFit.score} junior=${sJr.score}`);
  assert.ok(sOff.score! < 55, `off=${sOff.score}`);
});
t("explains the score", () => {
  assert.ok(sFit.matched.length >= 5);
  assert.ok(sOff.missing.length >= 2);
  assert.ok(sFit.notes.some((n) => /Level fits/.test(n)));
  assert.ok(sJr.notes.some((n) => /over-level/.test(n)));
});
t("non-PM resume scores low", () => {
  const chef = buildResumeProfile("Head chef with 12 years of experience running restaurant kitchens. Menu design, food cost control, staff scheduling, supplier negotiation, health and safety compliance. Worked 2012 – Present at various restaurants in Delhi and Mumbai.", NOWD);
  const s = scoreJob(chef, fit, corpus);
  assert.ok(s.score! < 40, `chef=${s.score}`);
  assert.ok(s.score! < sFit.score! - 30);
});
t("postings without descriptions are not scored", () => {
  const s = scoreJob(profile, mk("nodesc", { description: "" }), corpus);
  assert.equal(s.score, null);
  assert.equal(s.label, "No data");
});


console.log("Robustness against odd feed data");
t("location parser never throws and only returns strings", () => {
  const weird = ["", " ", "constructor", "__proto__", "toString, valueOf", "(Remote)", "Remote", "US-CA-Remote", "Multiple Locations", "2 Locations", "N/A", "-", ",,,", "IN", "CA", "DE", "🙂 Berlin", "a".repeat(5000), "Bengaluru,Karnataka,India;Pune,India|Remote", "United States, Remote (Hybrid)"];
  for (const w of weird) {
    const l = parseLocation(w);
    for (const k of ["raw", "city", "region", "country"] as const) assert.ok(l[k] === undefined || typeof l[k] === "string", `${w}: ${k}`);
    assert.equal(typeof l.remote, "boolean");
  }
  assert.equal(parseLocation("constructor").country, undefined);
  parseLocations([null, undefined, 5 as unknown as string, {} as unknown as string]);
});
t("sanitizeJob coerces hostile / malformed jobs", () => {
  const base = { id: "amazon:1", companyId: "amazon", company: "Amazon", title: "Product Manager", level: "PM", url: "https://www.amazon.jobs/x", locations: [], remote: false, description: "x" };
  assert.equal(sanitizeJob(null), null);
  assert.equal(sanitizeJob({ ...base, title: { a: 1 } }), null);
  const j = sanitizeJob({ ...base, team: { id: 5 }, level: "Wizard", postedAt: "garbage", url: "javascript:alert(1)", description: null, locations: [null, 7, { raw: { x: 1 }, city: ["Pune"] }, { raw: "Pune, India", city: "Pune", country: "India", remote: "yes" }] })!;
  assert.equal(j.team, undefined);
  assert.equal(j.level, "PM");
  assert.equal(j.postedAt, undefined);
  assert.equal(j.url, "https://www.amazon.jobs/en/search?base_query=product+manager"); // falls back to the careers page, never javascript:
  assert.equal(j.description, "");
  assert.equal(j.locations.length, 1);
  assert.equal(j.locations[0].remote, false);
  assert.equal(sanitizeJobs("nope").length, 0);
});
t("adapters survive odd shapes end-to-end", () => {
  const am = normalizeAmazon(co("amazon"), { id_icims: "9", title: "Product Manager", team: { id: 3 } as unknown as string, job_category: { x: 1 } as unknown as string, normalized_location: null as unknown as string, description: 42 as unknown as string })!;
  const ef = normalizeEightfold(co("microsoft") as never, { id: 1, name: "Product Manager", locations: [{ city: "X" } as unknown as string, null as unknown as string], department: ["a"] as unknown as string })!;
  const le = normalizeLever(co("spotify"), { id: "1", text: "Product Manager", categories: null as never, lists: null as never })!;
  const at = normalizeAtlassian(co("atlassian"), { id: 1, title: "Product Manager", locations: "Remote" as unknown as string[], category: { a: 1 } as unknown as string })!;
  const out = sanitizeJobs([am, ef, le, at]);
  assert.equal(out.length, 4);
  for (const j of out) {
    assert.ok(j.team === undefined || typeof j.team === "string");
    assert.equal(typeof j.description, "string");
  }
});

console.log(`\n${passed} test groups passed${process.exitCode ? " – WITH FAILURES" : ""}`);
