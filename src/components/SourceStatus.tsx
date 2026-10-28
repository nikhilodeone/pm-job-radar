"use client";
import { COMPANIES, MANUAL_SOURCES } from "@/lib/companies";
import type { SourceState } from "./Dashboard";

interface Props {
  sources: Record<string, SourceState | undefined>;
  jobCounts: Record<string, number>;
  retry: (id: string) => void;
  location?: string;
}

export default function SourceStatus({ sources, jobCounts, retry, location }: Props) {
  const states = COMPANIES.map((c) => sources[c.id]);
  const ok = states.filter((s) => s?.state === "ok").length;
  const failed = COMPANIES.filter((c) => sources[c.id]?.state === "error");
  const loading = states.filter((s) => !s || s.state === "loading").length;

  return (
    <details className="panel sources">
      <summary>
        <b>Sources</b> · {ok}/{COMPANIES.length} loaded
        {loading > 0 && <> · {loading} loading…</>}
        {failed.length > 0 && <span className="bad"> · {failed.length} unavailable</span>}
      </summary>

      <div className="manual">
        <h4>No public jobs feed – search these directly</h4>
        <p>
          These companies don&apos;t expose a stable public feed, so they can&apos;t be listed in the table. Each link opens their own career site pre-filtered to product-manager roles.
        </p>
        <div className="chips">
          {MANUAL_SOURCES.map((m) => (
            <a key={m.id} className="pill link" href={m.searchUrl(location)} target="_blank" rel="noopener noreferrer" title={`${m.tier} · ${m.note}`}>
              {m.name} ↗
            </a>
          ))}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Status</th>
            <th>PM roles</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {COMPANIES.map((c) => {
            const s = sources[c.id];
            return (
              <tr key={c.id}>
                <td>
                  <a href={c.careersUrl} target="_blank" rel="noopener noreferrer">
                    {c.name}
                  </a>
                  {c.beta && <span className="beta">beta</span>}
                </td>
                <td className={s?.state === "error" ? "bad" : ""}>
                  {!s || s.state === "loading" ? "Loading…" : s.state === "ok" ? "OK" : s.error}
                </td>
                <td>{s?.state === "ok" ? jobCounts[c.id] ?? 0 : "–"}</td>
                <td>
                  {s?.state === "error" && (
                    <button className="btn link" onClick={() => retry(c.id)}>
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </details>
  );
}
