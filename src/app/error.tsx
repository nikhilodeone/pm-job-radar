"use client";

// Shown if anything outside a single job card throws. Surfaces the real message so it can be reported.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  function clearAndReload() {
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith("pmradar:"))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* storage blocked – reload anyway */
    }
    window.location.reload();
  }
  return (
    <div className="shell">
      <div className="panel" role="alert">
        <h2>Something went wrong</h2>
        <p className="error">{error.message || "Unknown error"}</p>
        <pre className="jd">{(error.stack ?? "").split("\n").slice(0, 8).join("\n")}</pre>
        <div className="actions">
          <button className="btn primary" onClick={reset}>
            Try again
          </button>
          <button className="btn" onClick={clearAndReload}>
            Clear saved filters &amp; reload
          </button>
        </div>
      </div>
    </div>
  );
}
