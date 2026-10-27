"use client";
import { memo, useState } from "react";
import type { Job, MatchResult, Tier } from "@/lib/types";
import type { Status } from "@/lib/filter";
import { formatLocation } from "@/lib/location";
import { hueOf, isRecent, timeAgo } from "@/lib/format";
import ScoreRing from "./ScoreRing";

interface Props {
  job: Job;
  tier: Tier;
  match?: MatchResult;
  status?: Status;
  hasResume: boolean;
  onStatus: (id: string, s: Status | undefined) => void;
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="bar">
      <span>{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${value}%` }} />
      </div>
      <b>{value}</b>
    </div>
  );
}

function JobCardImpl({ job, tier, match, status, hasResume, onStatus }: Props) {
  const [why, setWhy] = useState(false);
  const [desc, setDesc] = useState(false);
  const locs = job.locations.map(formatLocation);
  const fresh = isRecent(job.postedAt, 7);

  return (
    <article className={`card${status === "applied" ? " is-applied" : ""}`}>
      <div className="card-main">
        <div className="logo" style={{ background: `hsl(${hueOf(job.company)} 45% 38%)` }} aria-hidden="true">
          {job.company.slice(0, 1)}
        </div>
        <div className="card-body">
          <div className="card-company">
            <span>{job.company}</span>
            <span className={`tier tier-${tier === "FAANG+" ? "a" : tier === "Big Tech" ? "b" : "c"}`}>{tier}</span>
            {fresh && <span className="new">New</span>}
          </div>
          <h3 className="card-title">
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              {job.title}
            </a>
          </h3>
          <div className="meta">
            <span className="chip level">{job.level}</span>
            {locs.slice(0, 2).map((l) => (
              <span className="chip" key={l}>
                {l}
              </span>
            ))}
            {locs.length > 2 && (
              <span className="chip" title={locs.slice(2).join("\n")}>
                +{locs.length - 2} more
              </span>
            )}
            {job.remote && !locs.some((l) => /remote/i.test(l)) && <span className="chip">Remote-friendly</span>}
            {job.team && <span className="chip subtle">{job.team}</span>}
            <span className="when">{timeAgo(job.postedAt)}</span>
          </div>
        </div>
        {hasResume && (
          <button className="ring-btn" onClick={() => setWhy((v) => !v)} aria-expanded={why} title="Why this score?">
            <ScoreRing match={match} />
            <span className="ring-label">{match ? match.label : "Scoring…"}</span>
          </button>
        )}
      </div>

      <div className="actions">
        <a className="btn primary" href={job.url} target="_blank" rel="noopener noreferrer">
          Apply ↗
        </a>
        <button className={`btn${status === "saved" ? " on" : ""}`} aria-pressed={status === "saved"} onClick={() => onStatus(job.id, status === "saved" ? undefined : "saved")}>
          {status === "saved" ? "★ Saved" : "☆ Save"}
        </button>
        <button className={`btn${status === "applied" ? " on" : ""}`} aria-pressed={status === "applied"} onClick={() => onStatus(job.id, status === "applied" ? undefined : "applied")}>
          {status === "applied" ? "✓ Applied" : "Mark applied"}
        </button>
        <span className="spacer" />
        {job.description && (
          <button className="btn link" onClick={() => setDesc((v) => !v)} aria-expanded={desc}>
            {desc ? "Hide JD" : "Read JD"}
          </button>
        )}
        {hasResume && match && (
          <button className="btn link" onClick={() => setWhy((v) => !v)} aria-expanded={why}>
            {why ? "Hide score" : "Why this score?"}
          </button>
        )}
      </div>

      {why && match && (
        <div className="why">
          {match.score !== null && (
            <div className="bars">
              <Bar label="Skills" value={match.parts.skills} />
              <Bar label="Wording" value={match.parts.wording} />
              <Bar label="Level" value={match.parts.level} />
              <Bar label="Domain" value={match.parts.domain} />
            </div>
          )}
          {match.matched.length > 0 && (
            <div className="why-row">
              <b>You cover</b>
              {match.matched.map((m) => (
                <span key={m} className="chip good">
                  {m}
                </span>
              ))}
            </div>
          )}
          {match.missing.length > 0 && (
            <div className="why-row">
              <b>Gaps</b>
              {match.missing.map((m) => (
                <span key={m} className="chip warn">
                  {m}
                </span>
              ))}
            </div>
          )}
          <ul className="notes">
            {match.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {desc && <pre className="jd">{job.description.slice(0, 2500)}{job.description.length > 2500 ? "…\n\n(Open the posting for the full description.)" : ""}</pre>}
    </article>
  );
}

export default memo(JobCardImpl);
