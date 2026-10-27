export function timeAgo(iso?: string, now = Date.now()): string {
  if (!iso) return "date n/a";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "date n/a";
  const days = Math.floor((now - t) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function isRecent(iso: string | undefined, days: number, now = Date.now()): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return !Number.isNaN(t) && now - t <= days * 86400000;
}

export function hueOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
