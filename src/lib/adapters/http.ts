const UA = "Mozilla/5.0 (compatible; PMJobRadar/1.0; +https://github.com/)";

export async function getJson<T>(url: string, init: RequestInit = {}, timeoutMs = 20000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      cache: "no-store",
      headers: { "user-agent": UA, accept: "application/json", ...((init.headers as Record<string, string>) ?? {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error(`Timed out after ${timeoutMs / 1000}s (${new URL(url).host})`);
    if (e instanceof Error && e.message === "fetch failed") {
      const cause = (e as Error & { cause?: { code?: string; message?: string } }).cause;
      throw new Error(`Could not reach ${new URL(url).host}${cause?.code ? ` (${cause.code})` : ""}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export { pool } from "../pool";
