const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  bull: "•",
  middot: "·",
  copy: "©",
  reg: "®",
  trade: "™",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try {
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      } catch {
        return m;
      }
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/**
 * HTML (or HTML-that-was-escaped, as Greenhouse returns it) → readable plain text.
 */
export function htmlToText(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input);
  // Greenhouse returns escaped markup: "&lt;p&gt;Hello&lt;/p&gt;"
  if (!/<[a-z!/][^>]*>/i.test(s) && /&lt;\/?[a-z]/i.test(s)) s = decodeEntities(s);
  s = s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|tr|section)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  return s
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

/** Keep job descriptions to a size that is cheap to ship to the browser. */
export const MAX_DESCRIPTION = 6000;
export function cleanDescription(...parts: Array<string | null | undefined>): string {
  return truncate(
    parts
      .map((p) => htmlToText(p))
      .filter(Boolean)
      .join("\n\n"),
    MAX_DESCRIPTION
  );
}

export function toIso(v: unknown): string | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  let d: Date;
  if (typeof v === "number") d = new Date(v < 1e11 ? v * 1000 : v); // seconds or ms
  else d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
