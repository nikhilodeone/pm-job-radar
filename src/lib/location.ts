import type { NormLocation } from "./types";

/* ---------- reference data ---------- */

const COUNTRY_ALIASES: Record<string, string> = {
  india: "India", in: "India", ind: "India", bharat: "India",
  "united states": "United States", "united states of america": "United States", usa: "United States", us: "United States", "u.s.": "United States", "u.s.a.": "United States",
  "united kingdom": "United Kingdom", uk: "United Kingdom", "u.k.": "United Kingdom", gb: "United Kingdom", gbr: "United Kingdom", england: "United Kingdom", scotland: "United Kingdom", wales: "United Kingdom", "northern ireland": "United Kingdom",
  canada: "Canada", can: "Canada",
  germany: "Germany", deu: "Germany", de: "Germany",
  france: "France", fra: "France", fr: "France",
  ireland: "Ireland", irl: "Ireland", ie: "Ireland",
  netherlands: "Netherlands", nld: "Netherlands", nl: "Netherlands", "the netherlands": "Netherlands",
  spain: "Spain", esp: "Spain",
  italy: "Italy", ita: "Italy",
  poland: "Poland", pol: "Poland",
  sweden: "Sweden", swe: "Sweden",
  switzerland: "Switzerland", che: "Switzerland",
  singapore: "Singapore", sg: "Singapore", sgp: "Singapore",
  australia: "Australia", aus: "Australia", au: "Australia",
  "new zealand": "New Zealand", nzl: "New Zealand",
  japan: "Japan", jpn: "Japan", jp: "Japan",
  "south korea": "South Korea", korea: "South Korea", kor: "South Korea",
  china: "China", chn: "China", cn: "China",
  "hong kong": "Hong Kong", hkg: "Hong Kong",
  taiwan: "Taiwan", twn: "Taiwan",
  israel: "Israel", isr: "Israel", il: "Israel",
  "united arab emirates": "United Arab Emirates", uae: "United Arab Emirates", are: "United Arab Emirates",
  brazil: "Brazil", brasil: "Brazil", bra: "Brazil", br: "Brazil",
  mexico: "Mexico", mex: "Mexico", mx: "Mexico",
  argentina: "Argentina", colombia: "Colombia", chile: "Chile",
  philippines: "Philippines", indonesia: "Indonesia", vietnam: "Vietnam", thailand: "Thailand", malaysia: "Malaysia",
  "south africa": "South Africa", nigeria: "Nigeria", kenya: "Kenya", egypt: "Egypt",
  portugal: "Portugal", belgium: "Belgium", austria: "Austria", denmark: "Denmark", norway: "Norway", finland: "Finland",
  romania: "Romania", czechia: "Czechia", "czech republic": "Czechia", hungary: "Hungary", turkey: "Türkiye", türkiye: "Türkiye",
};

const US_STATES: Record<string, string> = {
  al: "Alabama", ak: "Alaska", az: "Arizona", ar: "Arkansas", ca: "California", co: "Colorado", ct: "Connecticut", de: "Delaware", dc: "District of Columbia",
  fl: "Florida", ga: "Georgia", hi: "Hawaii", id: "Idaho", il: "Illinois", in: "Indiana", ia: "Iowa", ks: "Kansas", ky: "Kentucky", la: "Louisiana",
  me: "Maine", md: "Maryland", ma: "Massachusetts", mi: "Michigan", mn: "Minnesota", ms: "Mississippi", mo: "Missouri", mt: "Montana", ne: "Nebraska",
  nv: "Nevada", nh: "New Hampshire", nj: "New Jersey", nm: "New Mexico", ny: "New York", nc: "North Carolina", nd: "North Dakota", oh: "Ohio", ok: "Oklahoma",
  or: "Oregon", pa: "Pennsylvania", ri: "Rhode Island", sc: "South Carolina", sd: "South Dakota", tn: "Tennessee", tx: "Texas", ut: "Utah", vt: "Vermont",
  va: "Virginia", wa: "Washington", wv: "West Virginia", wi: "Wisconsin", wy: "Wyoming",
};
const US_STATE_NAMES = new Set(Object.values(US_STATES).map((s) => s.toLowerCase()));

const CA_PROVINCES = new Set(["on", "bc", "ab", "qc", "mb", "sk", "ns", "nb", "nl", "pe", "ontario", "british columbia", "alberta", "quebec", "québec"]);

const IN_STATES = new Set([
  "karnataka", "maharashtra", "telangana", "haryana", "delhi", "tamil nadu", "uttar pradesh", "west bengal", "gujarat", "rajasthan", "kerala", "punjab", "odisha", "andhra pradesh", "madhya pradesh", "bihar", "chandigarh", "goa", "jharkhand", "uttarakhand",
  "ka", "mh", "ts", "tg", "hr", "dl", "tn", "up", "wb", "gj",
]);

/** lowercase alias → [canonical city, country] */
const CITIES: Record<string, [string, string]> = {};
function addCities(country: string, list: Array<string | [string, ...string[]]>) {
  for (const entry of list) {
    const names = Array.isArray(entry) ? entry : [entry];
    for (const n of names) CITIES[n.toLowerCase()] = [names[0], country];
  }
}
addCities("India", [
  ["Bengaluru", "Bangalore", "Bengalooru"], ["Gurugram", "Gurgaon"], "Hyderabad", ["Delhi", "New Delhi", "Delhi NCR", "NCR"], "Noida", "Mumbai", "Pune", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Kochi", "Chandigarh", "Indore", "Coimbatore", "Thiruvananthapuram", "Navi Mumbai", "Greater Noida", "Mysuru",
]);
addCities("United States", [
  "San Francisco", "Mountain View", "Sunnyvale", "Palo Alto", "Menlo Park", "Cupertino", "San Jose", "Redwood City", "South San Francisco", "Santa Clara", "Los Angeles", "San Diego", "Santa Monica", "Irvine",
  ["New York", "New York City", "NYC", "Brooklyn"], "Seattle", "Bellevue", "Redmond", "Kirkland", "Austin", "Dallas", "Houston", "Chicago", "Boston", "Cambridge", "Atlanta", "Denver", "Boulder", "Miami",
  ["Washington", "Washington DC", "Washington, D.C."], "Arlington", "Reston", "Pittsburgh", "Philadelphia", "Raleigh", "Durham", "Salt Lake City", "Portland", "Phoenix", "Nashville", "Minneapolis", "Detroit", "San Mateo", "Burlingame", "Oakland", "Sacramento", "Plano", "Charlotte",
]);
addCities("United Kingdom", [["London", "Greater London"], "Manchester", "Edinburgh", "Cambridge UK", "Bristol", "Birmingham", "Glasgow", "Leeds"]);
addCities("Canada", ["Toronto", "Vancouver", "Montreal", "Montréal", "Ottawa", "Calgary", "Waterloo", "Kitchener"]);
addCities("Ireland", ["Dublin", "Cork", "Galway"]);
addCities("Germany", ["Berlin", ["Munich", "München"], "Hamburg", "Frankfurt", "Cologne", "Düsseldorf", "Stuttgart"]);
addCities("France", ["Paris", "Lyon", "Toulouse"]);
addCities("Netherlands", ["Amsterdam", "Rotterdam", "Eindhoven", "The Hague"]);
addCities("Spain", ["Madrid", "Barcelona"]);
addCities("Switzerland", ["Zurich", "Zürich", "Geneva", "Basel"]);
addCities("Sweden", ["Stockholm", "Gothenburg"]);
addCities("Poland", ["Warsaw", "Krakow", "Kraków", "Wroclaw", "Gdansk"]);
addCities("Italy", ["Milan", "Rome"]);
addCities("Singapore", ["Singapore"]);
addCities("Australia", ["Sydney", "Melbourne", "Brisbane", "Perth", "Canberra"]);
addCities("Japan", ["Tokyo", "Osaka", "Yokohama"]);
addCities("South Korea", ["Seoul"]);
addCities("China", ["Beijing", "Shanghai", "Shenzhen", "Guangzhou", "Hangzhou"]);
addCities("Hong Kong", ["Hong Kong"]);
addCities("Taiwan", ["Taipei"]);
addCities("Israel", [["Tel Aviv", "Tel Aviv-Yafo", "Tel Aviv Yafo"], "Haifa", "Herzliya", "Jerusalem"]);
addCities("United Arab Emirates", ["Dubai", "Abu Dhabi"]);
addCities("Brazil", ["São Paulo", "Sao Paulo", "Rio de Janeiro"]);
addCities("Mexico", ["Mexico City", "Ciudad de México", "Guadalajara", "Monterrey"]);
addCities("Argentina", ["Buenos Aires"]);
addCities("Colombia", ["Bogotá", "Bogota"]);
addCities("Philippines", ["Manila", "Taguig"]);
addCities("Indonesia", ["Jakarta"]);
addCities("Vietnam", ["Ho Chi Minh City", "Hanoi"]);
addCities("Malaysia", ["Kuala Lumpur"]);
addCities("South Africa", ["Cape Town", "Johannesburg"]);
addCities("Nigeria", ["Lagos"]);
addCities("Portugal", ["Lisbon"]);
addCities("Denmark", ["Copenhagen"]);
addCities("Norway", ["Oslo"]);
addCities("Finland", ["Helsinki"]);
addCities("Austria", ["Vienna"]);
addCities("Belgium", ["Brussels"]);
addCities("Romania", ["Bucharest"]);
addCities("Türkiye", ["Istanbul"]);

const own = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);
const lookup = <T,>(o: Record<string, T>, k: string): T | undefined => (own(o, k) ? o[k] : undefined);

const REMOTE_RE = /\b(remote|anywhere|work from home|wfh|distributed|virtual)\b/i;
const NOISE_RE = /^(remote|hybrid|on-?site|onsite|in[- ]office|multiple locations?|\d+ locations?|various|flexible|field|tbd|n\/a|global|worldwide|emea|apac|amer|latam|americas|europe|asia)$/i;

function titleCase(s: string): string {
  return s.replace(/\b([a-z])([a-z']*)/gi, (_, a: string, b: string) => a.toUpperCase() + b.toLowerCase());
}

/* ---------- parsing ---------- */

export function parseLocation(raw: string): NormLocation {
  const text = String(raw ?? "").trim();
  const remote = REMOTE_RE.test(text);
  // Strip parentheticals like "(Hybrid)" but keep their text for the remote check above.
  const cleaned = text.replace(/\([^)]*\)/g, " ");
  const tokens = cleaned
    .split(/[,;|/–—]| - /)
    .map((t) => t.replace(REMOTE_RE, "").replace(/\s+/g, " ").trim())
    .filter((t) => t && !NOISE_RE.test(t));

  let country: string | undefined;
  let city: string | undefined;
  let region: string | undefined;
  let sawCanadaHint = false;

  // pass 1 – explicit country names / codes (longest-form first, last token wins)
  const lower = tokens.map((t) => t.toLowerCase());
  for (const t of lower) {
    if (t === "canada" || CA_PROVINCES.has(t)) sawCanadaHint = true;
  }
  for (let i = lower.length - 1; i >= 0; i--) {
    const t = lower[i];
    // two-letter tokens are ambiguous (CA = California, IN = Indiana, DE = Delaware…) – only
    // accept them as a country when they are the last token and no US-state reading fits.
    const c = lookup(COUNTRY_ALIASES, t);
    if (!c) continue;
    if (t.length <= 2) {
      const isLast = i === lower.length - 1;
      if (!isLast) continue;
      if (lookup(US_STATES, t) && !sawCanadaHint && lower.length >= 2 && !(t === "in" && lower.some((x) => IN_STATES.has(x) || lookup(CITIES, x)?.[1] === "India"))) continue;
    }
    country = c;
    break;
  }

  // pass 2 – cities
  for (const t of lower) {
    const hit = lookup(CITIES, t);
    if (hit) {
      city = hit[0];
      country = country ?? hit[1];
      break;
    }
  }

  // pass 3 – states / provinces imply a country
  for (let i = 0; i < lower.length; i++) {
    const t = lower[i];
    if (!country && IN_STATES.has(t) && t.length > 2) {
      country = "India";
      region = titleCase(tokens[i]);
    } else if (!country && (US_STATE_NAMES.has(t) || (t.length === 2 && lookup(US_STATES, t) && i > 0))) {
      if (t.length === 2 && sawCanadaHint) continue;
      country = "United States";
      region = lookup(US_STATES, t) ?? titleCase(tokens[i]);
    } else if (!country && CA_PROVINCES.has(t)) {
      country = "Canada";
      region = titleCase(tokens[i]);
    }
  }

  // pass 4 – unknown city: first token that isn't a country/state
  if (!city) {
    const guess = tokens.find((t, i) => {
      const l = lower[i];
      return !lookup(COUNTRY_ALIASES, l) && !lookup(US_STATES, l) && !US_STATE_NAMES.has(l) && !IN_STATES.has(l) && !CA_PROVINCES.has(l);
    });
    if (guess && tokens.length > 1) city = titleCase(guess);
    else if (guess && !country) city = titleCase(guess);
  }

  return { raw: text, city, region, country, remote };
}

/** Split multi-location strings ("A; B | C") and parse each one, de-duplicated. */
export function parseLocations(rawList: Array<string | null | undefined>): NormLocation[] {
  const out: NormLocation[] = [];
  const seen = new Set<string>();
  for (const raw of rawList) {
    if (!raw) continue;
    for (const piece of String(raw).split(/;|\||\s+or\s+|\n/)) {
      const p = piece.trim();
      if (!p) continue;
      const loc = parseLocation(p);
      const key = `${loc.city ?? ""}|${loc.country ?? ""}|${loc.remote}|${loc.city || loc.country ? "" : p.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(loc);
    }
  }
  return out;
}

export function isRemoteJob(locs: NormLocation[], extra?: boolean | string | null): boolean {
  if (extra === true) return true;
  if (typeof extra === "string" && /remote/i.test(extra) && !/hybrid|on-?site/i.test(extra)) return true;
  return locs.some((l) => l.remote);
}

export function formatLocation(l: NormLocation): string {
  const parts = [l.city, l.region && l.region !== l.city && !l.city ? l.region : undefined, l.country].filter(Boolean);
  const base = parts.length ? parts.join(", ") : l.raw;
  return l.remote && !/remote/i.test(base) ? `Remote · ${base}` : base;
}
