/**
 * Product-management skill & domain taxonomy used for resume ↔ JD matching.
 * `weight` = how much a miss matters; `patterns` are regex sources matched on lowercase text.
 */
export interface Skill {
  id: string;
  label: string;
  kind: "craft" | "domain";
  weight: number;
  patterns: string[];
}

const s = (id: string, label: string, kind: Skill["kind"], weight: number, ...patterns: string[]): Skill => ({
  id, label, kind, weight, patterns,
});

export const SKILLS: Skill[] = [
  /* ---- craft ---- */
  s("strategy", "Product strategy", "craft", 3, "product strateg", "product vision", "long[- ]term strateg", "strategic (planning|vision|roadmap)"),
  s("roadmap", "Roadmapping", "craft", 3, "roadmap"),
  s("prioritization", "Prioritization", "craft", 2.5, "prioriti[sz]", "rice framework", "moscow"),
  s("requirements", "Requirements / PRDs", "craft", 2, "\\bprds?\\b", "product requirements?", "requirements? (gathering|document|definition)", "user stories", "functional specs?"),
  s("research", "User research & discovery", "craft", 2.5, "user research", "customer research", "(customer|user) interviews?", "usability", "voice of (the )?customer", "jobs[- ]to[- ]be[- ]done", "product discovery", "customer discovery"),
  s("experimentation", "A/B testing & experimentation", "craft", 3, "a/b test", "\\bab test", "experimentation", "\\bexperiments?\\b", "split tests?", "multivariate"),
  s("metrics", "Metrics & KPIs", "craft", 3, "\\bmetrics?\\b", "\\bkpis?\\b", "\\bokrs?\\b", "north star", "data[- ]driven", "data[- ]informed", "\\bfunnels?\\b", "\\bcohorts?\\b", "retention", "conversion"),
  s("sql", "SQL & analytics tooling", "craft", 2.5, "\\bsql\\b", "bigquery", "tableau", "looker", "amplitude", "mixpanel", "power bi", "data analysis", "snowflake"),
  s("stakeholders", "Stakeholder & exec management", "craft", 2.5, "stakeholders?", "executives?", "c-level", "leadership team", "cross[- ]functional", "cross[- ]team", "influenc\\w+ without (formal )?authority"),
  s("agile", "Agile delivery", "craft", 2, "\\bagile\\b", "\\bscrum\\b", "\\bsprints?\\b", "\\bbacklog", "\\bjira\\b", "\\bkanban\\b"),
  s("gtm", "Go-to-market & launch", "craft", 2.5, "go[- ]to[- ]market", "\\bgtm\\b", "product launch", "launch(es|ed|ing)?\\b", "positioning", "pricing", "monetization", "packaging"),
  s("growth", "Growth & engagement", "craft", 2.5, "\\bgrowth\\b", "acquisition", "activation", "engagement", "product[- ]led", "\\bplg\\b", "onboarding", "\\bchurn\\b", "lifecycle"),
  s("design", "Design collaboration", "craft", 1.5, "\\bux\\b", "user experience", "wireframe", "prototyp", "\\bfigma\\b", "design systems?", "design thinking"),
  s("technical", "Technical depth", "craft", 2.5, "\\bapis?\\b", "microservices?", "system design", "architecture", "\\bsdks?\\b", "technical (background|depth|acumen)", "engineering teams?", "software development"),
  s("ai", "AI / ML", "craft", 2.5, "machine learning", "\\bml\\b", "artificial intelligence", "\\bai\\b", "\\bllms?\\b", "large language model", "generative ai", "\\bgenai\\b", "\\bnlp\\b", "recommendation (system|engine)", "computer vision", "\\bagents?\\b"),
  s("leadership", "People leadership", "craft", 2, "(lead|led|leading|manage[ds]?|managing|build(ing)?) (a |an )?(team|org)", "people management", "mentor", "\\bcoach", "direct reports?", "\\bhiring\\b"),
  s("business", "Business acumen", "craft", 2, "p&l", "\\brevenue\\b", "business case", "unit economics", "\\bmargins?\\b", "forecast", "\\bbudget", "\\broi\\b", "market (siz|analysis|research)", "competitive (analysis|landscape)"),
  s("communication", "Communication", "craft", 1.5, "communicat", "presentation", "storytelling", "written (and|&) verbal"),

  /* ---- domains ---- */
  s("fintech", "Fintech & payments", "domain", 3, "payments?", "fintech", "banking", "lending", "\\bcredit\\b", "\\bupi\\b", "fraud", "\\bkyc\\b", "checkout", "billing", "wallet", "trading", "insurance"),
  s("commerce", "E-commerce & marketplaces", "domain", 3, "e-?commerce", "marketplace", "retail", "catalog", "\\bsellers?\\b", "merchants?", "supply chain", "logistics", "fulfil?lment", "last[- ]mile"),
  s("ads", "Ads & monetization", "domain", 3, "advertis", "\\bads\\b", "adtech", "sponsored", "auctions?", "bidding", "campaigns?"),
  s("enterprise", "Enterprise / B2B SaaS", "domain", 3, "\\bb2b\\b", "\\bsaas\\b", "enterprise", "\\bcrm\\b", "\\berp\\b", "workflow automation", "admin(istrator)? (console|experience)"),
  s("consumer", "Consumer / B2C", "domain", 3, "consumer", "\\bb2c\\b", "mobile app", "social (network|media|app)", "creators?", "streaming", "gaming", "entertainment", "\\bmusic\\b", "\\bvideo\\b"),
  s("devtools", "Developer platforms & tools", "domain", 3, "developers?", "developer (tools|experience|platform)", "devops", "open[- ]source", "api platform"),
  s("security", "Security, privacy & trust", "domain", 3, "security", "privacy", "compliance", "trust (and|&) safety", "identity", "authentication", "\\bgdpr\\b", "regulat"),
  s("health", "Health & wellness", "domain", 3, "health(care)?", "clinical", "medical", "wellness", "patients?"),
  s("hardware", "Hardware, IoT & mobility", "domain", 3, "hardware", "\\biot\\b", "embedded", "firmware", "automotive", "mobility", "vehicles?", "\\bfleets?\\b", "telematics", "semiconductor", "\\bgpus?\\b"),
  s("dataplatform", "Data & ML platforms", "domain", 3, "data platform", "data infrastructure", "analytics platform", "\\betl\\b", "data warehouse", "lakehouse", "observability", "data engineering"),
  s("cloud", "Cloud & infrastructure", "domain", 3, "\\bcloud\\b", "infrastructure", "kubernetes", "serverless", "\\bcompute\\b", "networking", "\\baws\\b", "\\bgcp\\b", "\\bazure\\b"),
  s("edu", "Education", "domain", 3, "education", "learning", "edtech", "students?", "\\bcourses?\\b"),
  s("travel", "Travel, maps & local", "domain", 3, "travel", "hospitality", "\\bmaps?\\b", "ride[- ]?(hail|shar)", "food delivery"),
];

export const COMPILED = SKILLS.map((sk) => ({
  skill: sk,
  re: new RegExp(sk.patterns.join("|"), "g"),
}));

export function countMatches(re: RegExp, text: string): number {
  re.lastIndex = 0;
  let n = 0;
  while (re.exec(text) !== null) {
    n++;
    if (re.lastIndex === 0) break;
  }
  return n;
}
