import type { Job, MatchResult } from "./types";
import { formatLocation } from "./location";

const esc = (v: unknown) => {
  let s = String(v ?? "");
  // neutralise spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function jobsToCsv(jobs: Job[], scores: Record<string, MatchResult | undefined>, statuses: Record<string, string | undefined>): string {
  const head = ["Company", "Title", "Level", "Locations", "Remote", "Posted", "Match score", "Status", "Apply link"];
  const rows = jobs.map((j) => [
    j.company,
    j.title,
    j.level,
    j.locations.map(formatLocation).join(" | "),
    j.remote ? "yes" : "",
    j.postedAt?.slice(0, 10) ?? "",
    scores[j.id]?.score ?? "",
    statuses[j.id] ?? "",
    j.url,
  ]);
  return [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}
