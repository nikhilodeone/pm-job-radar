import type { Level } from "./types";

/**
 * Is this a Product Management role? Deliberately excludes Product Marketing,
 * Product Design, Product Operations, Product Analyst, etc.
 */
export function isPmTitle(title: string): boolean {
  const t = title.toLowerCase();
  if (/\bproduct\s+(manager|management|owner)\b/.test(t)) return true;
  // Everything below is a weaker signal – reject adjacent-function titles.
  if (
    /\bproduct[\s-]+(marketing|design|designer|operations|ops|analyst|analytics|support|security|counsel|legal|specialist|sales|data|science|partner|content|compliance|quality|accounting|finance|training|education|safety|engineer|developer)\b/.test(
      t
    )
  )
    return false;
  if (/\b(apm|gpm|cpo)\b/.test(t)) return true;
  if (/\bhead of product\b/.test(t)) return true;
  if (/\b(vp|vice president|director|senior director|chief)\b[^a-z]{0,6}(of\s+)?product\b/.test(t)) return true;
  // "Senior Manager, Product" / "Principal, Product" – but not "Program Manager, Product Launch"
  if (/\bprogram\b/.test(t)) return false;
  if (/\b(manager|lead|principal|staff|owner)\b[,\s–-]+product\s*($|[,(–-]|management)/.test(t)) return true;
  return false;
}

export function inferLevel(title: string): Level {
  const t = title.toLowerCase();
  if (/\b(intern|internship|co-?op)\b/.test(t)) return "Intern";
  if (/\b(vp|vice president|chief|cpo|svp|evp)\b/.test(t)) return "VP+";
  if (/\b(director|head of)\b/.test(t)) return "Director";
  if (/\b(associate product manager|apm|graduate|new grad|entry[- ]level|early career|rotational)\b/.test(t)) return "Associate";
  if (/\b(group product manager|gpm|senior manager|sr\.? manager|product lead|lead product|principal lead)\b/.test(t)) return "Lead / Group";
  if (/\b(staff|principal|distinguished|fellow)\b/.test(t)) return "Staff / Principal";
  if (/\b(senior|sr\.?|iii|l6|l5-?6|product manager 3)\b/.test(t)) return "Senior";
  if (/\blead\b/.test(t)) return "Lead / Group";
  return "PM";
}

/** Typical years of experience for each level – used when a JD does not state a requirement. */
export const LEVEL_YEARS: Record<Level, [number, number]> = {
  Intern: [0, 1],
  Associate: [0, 3],
  PM: [2, 6],
  Senior: [5, 10],
  "Staff / Principal": [8, 15],
  "Lead / Group": [7, 14],
  Director: [10, 20],
  "VP+": [14, 35],
};
