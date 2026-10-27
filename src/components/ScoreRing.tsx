import type { MatchResult } from "@/lib/types";

const COLORS: Record<MatchResult["label"], string> = {
  Strong: "var(--good)",
  Good: "var(--accent)",
  Fair: "var(--warn)",
  Stretch: "var(--muted)",
  "No data": "var(--line)",
};

export default function ScoreRing({ match, size = 56 }: { match?: MatchResult; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const score = match?.score ?? null;
  const color = match ? COLORS[match.label] : "var(--line)";
  return (
    <div className="ring" style={{ width: size, height: size }} aria-label={score === null ? "No match score" : `Match score ${score} out of 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
        {score !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * c} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <span className="ring-num" style={{ color: score === null ? "var(--muted)" : "var(--ink)" }}>
        {score === null ? "–" : score}
      </span>
    </div>
  );
}
