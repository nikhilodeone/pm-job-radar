import type { Job, Level, MatchResult } from "./types";
import { COMPILED, countMatches, type Skill } from "./skills";
import { LEVEL_YEARS } from "./level";

/* ============================================================
   Resume ↔ job-description matching.
   Everything here is deterministic and runs in the browser – the resume never leaves the device.

   score = 40% skills  +  25% wording  +  20% level fit  +  15% domain fit
   (multiplied by 0.85 if the resume barely reads like a PM resume)
   ============================================================ */

const STOP = new Set(
  (
    "a about above after again all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just me more most my no nor not now of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up us very was we were what when where which while who whom why will with would you your " +
    "etc including include includes within across ability able strong excellent proven demonstrated looking join role roles position candidate candidates team teams work working works new using use used one two well also per via years year experience experienced plus preferred required requirements responsibilities qualifications basic must may like get make based great good best day every high highly help helps ensure ensuring responsible opportunity company"
  ).split(" ")
);

export function stem(w: string): string {
  if (w.length <= 4) return w;
  let r = w;
  if (r.endsWith("ies")) r = r.slice(0, -3) + "y";
  else if (r.endsWith("sses")) r = r.slice(0, -2);
  else if (r.endsWith("s") && !r.endsWith("ss") && !r.endsWith("us")) r = r.slice(0, -1);
  if (r.length > 5 && r.endsWith("ing")) r = r.slice(0, -3);
  else if (r.length > 5 && r.endsWith("ed")) r = r.slice(0, -2);
  else if (r.length > 5 && r.endsWith("ly")) r = r.slice(0, -2);
  return r.length >= 3 ? r : w;
}

export function termCounts(text: string): Map<string, number> {
  const words = (text.toLowerCase().match(/[a-z][a-z+#&./-]*[a-z+#]|[a-z]/g) ?? [])
    .map((w) => w.replace(/^[./-]+|[./-]+$/g, ""))
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
  const m = new Map<string, number>();
  for (let i = 0; i < words.length; i++) {
    m.set(words[i], (m.get(words[i]) ?? 0) + 1);
    if (i + 1 < words.length) {
      const bg = words[i] + " " + words[i + 1];
      m.set(bg, (m.get(bg) ?? 0) + 1);
    }
  }
  return m;
}

/* ---------------- resume profile ---------------- */

export interface ResumeProfile {
  text: string;
  terms: Map<string, number>;
  skillCounts: Map<string, number>;
  years: number | null;
  level: Level | null;
  pmSignal: number; // 0–1: how much the resume reads like a PM resume
  wordCount: number;
}

function skillCountsFor(text: string, tailFrom = -1): Map<string, number> {
  const lower = text.toLowerCase();
  const out = new Map<string, number>();
  for (const { skill, re } of COMPILED) {
    let n = countMatches(re, lower);
    if (n && tailFrom >= 0) n += 0.5 * countMatches(re, lower.slice(tailFrom));
    if (n) out.set(skill.id, n);
  }
  return out;
}

const DEGREE_LINE = /\b(b\.?tech|b\.?e\.?|b\.?sc|bachelor|master|m\.?tech|m\.?sc|mba|ph\.?d|diploma|university|college|institute|school|gpa|cgpa|graduat)/i;

export function estimateYears(text: string, now = new Date()): number | null {
  // 1) explicit "8+ years of ... experience"
  let best: number | null = null;
  for (const m of text.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b([^.\n]{0,60})/gi)) {
    const n = parseInt(m[1], 10);
    const ctx = (m[0] + text.slice(m.index! + m[0].length, m.index! + m[0].length + 20)).toLowerCase();
    if (n >= 1 && n <= 40 && /(experience|product|management|industry|professional|career)/.test(ctx)) best = Math.max(best ?? 0, n);
  }
  if (best !== null) return best;
  // 2) earliest year on a work-history style line (ignore education lines)
  const year = now.getFullYear();
  let earliest: number | null = null;
  for (const line of text.split(/\n/)) {
    if (DEGREE_LINE.test(line)) continue;
    if (!/(present|current|now|\b(19|20)\d{2}\s*[-–—to]+\s*(19|20)?\d{2})/i.test(line)) continue;
    for (const m of line.matchAll(/\b(19[89]\d|20[0-4]\d)\b/g)) {
      const y = parseInt(m[1], 10);
      if (y <= year) earliest = earliest === null ? y : Math.min(earliest, y);
    }
  }
  return earliest === null ? null : Math.max(0, year - earliest);
}

export function levelForYears(y: number): Level {
  if (y < 1.5) return "Associate";
  if (y < 5) return "PM";
  if (y < 9) return "Senior";
  if (y < 14) return "Lead / Group";
  return "Director";
}

export function buildResumeProfile(text: string, now = new Date()): ResumeProfile {
  const clean = text.replace(/\r/g, "").trim();
  const skillCounts = skillCountsFor(clean);
  const craftHits = [...skillCounts.keys()].filter((id) => COMPILED.find((c) => c.skill.id === id)?.skill.kind === "craft").length;
  const pmWords = (clean.toLowerCase().match(/product (manager|management|owner|strategy|roadmap)|roadmap|\bpm\b|\bprd/g) ?? []).length;
  const years = estimateYears(clean, now);
  return {
    text: clean,
    terms: termCounts(clean),
    skillCounts,
    years,
    level: years === null ? null : levelForYears(years),
    pmSignal: Math.min(1, craftHits / 7) * 0.6 + Math.min(1, pmWords / 4) * 0.4,
    wordCount: clean.split(/\s+/).filter(Boolean).length,
  };
}

/* ---------------- job features & corpus ---------------- */

interface JobFeatures {
  terms: Map<string, number>;
  skillCounts: Map<string, number>;
  reqYears: number | null;
  textLen: number;
}

const TAIL_HEAD = /(qualifications|requirements|what you['’]?ll bring|what we['’]?re looking for|who you are|you have|about you|minimum qualifications|preferred qualifications|basic qualifications)/i;
const featureCache = new Map<string, JobFeatures>();

export function jobFeatures(job: Job): JobFeatures {
  const key = `${job.id}|${job.description.length}`;
  const hit = featureCache.get(key);
  if (hit) return hit;
  const text = `${job.title}\n${job.description}`;
  const lower = text.toLowerCase();
  const tail = lower.search(TAIL_HEAD);
  const f: JobFeatures = {
    terms: termCounts(text),
    skillCounts: skillCountsFor(text, tail),
    reqYears: requiredYears(lower),
    textLen: job.description.length,
  };
  featureCache.set(key, f);
  return f;
}

export function requiredYears(lowerText: string): number | null {
  let min: number | null = null;
  for (const m of lowerText.matchAll(/(\d{1,2})\s*\+?\s*(?:(?:-|–|to)\s*\d{1,2}\s*)?years?\b([^.\n]{0,80})/g)) {
    const n = parseInt(m[1], 10);
    if (n < 1 || n > 25) continue;
    if (!/(experience|product|management|manager)/.test(m[0] + lowerText.slice(m.index! + m[0].length, m.index! + m[0].length + 40))) continue;
    min = min === null ? n : Math.min(min, n);
  }
  return min;
}

export interface Corpus {
  n: number;
  idf: Map<string, number>;
}

export function buildCorpus(jobs: Job[]): Corpus {
  const df = new Map<string, number>();
  let n = 0;
  for (const j of jobs) {
    if (j.description.length < 200) continue;
    n++;
    for (const t of jobFeatures(j).terms.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [t, d] of df) idf.set(t, Math.log((n + 1) / (d + 0.5)) + 1);
  return { n, idf };
}

/* ---------------- scoring ---------------- */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function skillLabel(id: string): string {
  return COMPILED.find((c) => c.skill.id === id)!.skill.label;
}

export function scoreJob(profile: ResumeProfile, job: Job, corpus: Corpus): MatchResult {
  const f = jobFeatures(job);
  const notes: string[] = [];

  if (f.textLen < 200) {
    return {
      score: null,
      label: "No data",
      parts: { skills: 0, wording: 0, level: 0, domain: 0 },
      matched: [],
      missing: [],
      notes: ["This posting has no usable description in the feed, so it can't be scored. Open it to read the full JD."],
    };
  }

  /* skills & domains */
  const split = (kind: Skill["kind"]) => {
    let total = 0;
    let got = 0;
    const matched: Array<[string, number]> = [];
    const missing: Array<[string, number]> = [];
    for (const [id, count] of f.skillCounts) {
      const sk = COMPILED.find((c) => c.skill.id === id)!.skill;
      if (sk.kind !== kind) continue;
      const imp = sk.weight * Math.min(2, 1 + 0.5 * (count - 1));
      const inResume = profile.skillCounts.get(id) ?? 0;
      const strength = inResume >= 2 ? 1 : inResume >= 1 ? 0.8 : 0;
      total += imp;
      got += imp * strength;
      (strength > 0 ? matched : missing).push([sk.label, imp]);
    }
    const byImp = (a: [string, number], b: [string, number]) => b[1] - a[1];
    return { ratio: total ? got / total : null, matched: matched.sort(byImp).map((x) => x[0]), missing: missing.sort(byImp).map((x) => x[0]), has: total > 0 };
  };
  const craft = split("craft");
  const domain = split("domain");
  const skills = craft.ratio ?? 0.5;
  const domainScore = domain.ratio ?? 0.6; // JD names no domain → neutral

  /* wording overlap: share of the JD's distinctive vocabulary (tf-idf weighted) found in the resume */
  let jdWeight = 0;
  let covered = 0;
  for (const [t, c] of f.terms) {
    const w = (1 + Math.log(c)) * (corpus.idf.get(t) ?? Math.log(corpus.n + 2) + 1);
    jdWeight += w;
    if (profile.terms.has(t)) covered += w;
  }
  const coverage = jdWeight ? covered / jdWeight : 0;
  const wording = clamp01((coverage - 0.12) / (0.5 - 0.12));

  /* level fit */
  let levelFit = 0.6;
  const [loBase, hiBase] = LEVEL_YEARS[job.level];
  const lo = f.reqYears !== null ? f.reqYears : loBase;
  const hi = f.reqYears !== null ? Math.max(f.reqYears + 5, hiBase) : hiBase;
  if (profile.years !== null) {
    const y = profile.years;
    if (y >= lo && y <= hi) levelFit = 1;
    else if (y < lo) levelFit = clamp01(1 - 0.22 * (lo - y));
    else levelFit = clamp01(1 - 0.1 * (y - hi));
    const need = f.reqYears !== null ? `JD asks for ${f.reqYears}+ yrs` : `${job.level} roles typically want ${loBase}–${hiBase} yrs`;
    if (levelFit >= 0.9) notes.push(`Level fits: ~${y} yrs of experience vs. ${need}.`);
    else if (y < lo) notes.push(`Possible stretch: ~${y} yrs of experience vs. ${need}.`);
    else notes.push(`You may be over-level: ~${y} yrs of experience vs. ${need}.`);
  } else {
    notes.push("Couldn't detect your years of experience – add a line like “8+ years of product management experience” to sharpen level matching.");
  }

  let overall = 0.4 * skills + 0.25 * wording + 0.2 * levelFit + 0.15 * domainScore;
  if (profile.pmSignal < 0.3) {
    overall *= 0.85;
    notes.push("Your resume doesn't read strongly as a product-management resume (few PM terms found) – the score is discounted.");
  }
  const score = Math.round(clamp01(overall) * 100);
  const label = score >= 75 ? "Strong" : score >= 60 ? "Good" : score >= 45 ? "Fair" : "Stretch";

  if (craft.missing.length) notes.push(`Not found in your resume: ${craft.missing.slice(0, 5).join(", ")}. Add only what you've genuinely done.`);

  return {
    score,
    label,
    parts: { skills: Math.round(skills * 100), wording: Math.round(wording * 100), level: Math.round(levelFit * 100), domain: Math.round(domainScore * 100) },
    matched: [...craft.matched, ...domain.matched].slice(0, 10),
    missing: [...craft.missing, ...domain.missing].slice(0, 8),
    notes,
  };
}

export function topSkillsInResume(profile: ResumeProfile, limit = 10): string[] {
  return [...profile.skillCounts.entries()]
    .sort((a, b) => b[1] * (COMPILED.find((c) => c.skill.id === b[0])!.skill.weight) - a[1] * (COMPILED.find((c) => c.skill.id === a[0])!.skill.weight))
    .slice(0, limit)
    .map(([id]) => skillLabel(id));
}
