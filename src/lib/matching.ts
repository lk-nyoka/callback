// Deterministic hard filters applied before any model call is spent.

import type { SearchIntent } from "./types";

const SA_HINTS = ["johannesburg", "joburg", "jhb", "sandton", "pretoria", "cape town", "durban", "gauteng", "south africa"];

// Regions/countries that, when named in a remote posting, restrict where
// candidates can be based.
const RESTRICTIVE_REGIONS = [
  "us", "u.s", "u.s.", "usa", "united states", "canada", "mexico", "brazil", "latam", "latin america", "americas", "north america",
  "uk", "united kingdom", "ireland", "germany", "france", "spain", "portugal", "netherlands", "poland", "italy", "europe", "eu",
  "india", "japan", "singapore", "australia", "apac", "asia", "china", "korea", "israel", "uae", "dubai",
  "new york", "san francisco", "seattle", "chicago", "london", "dublin", "berlin", "toronto", "sydney", "bangalore", "tokyo", "paris", "amsterdam",
];

export function allowedRegions(intent: SearchIntent): string[] {
  const locs = intent.locations.map((l) => l.toLowerCase().trim()).filter(Boolean);
  const out = new Set(locs);
  if (locs.some((l) => SA_HINTS.some((h) => l.includes(h)))) {
    ["south africa", "africa", "emea", "johannesburg", "cape town", "pretoria", "durban", "sandton"].forEach((x) => out.add(x));
  }
  ["worldwide", "anywhere", "global", "international"].forEach((x) => out.add(x));
  return [...out].filter((x) => x !== "remote");
}

function mentions(text: string, term: string) {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${esc}([^a-z]|$)`, "i").test(text);
}

export function locationMatches(location: string, remote: boolean, intent: SearchIntent): { ok: boolean; why: string } {
  const loc = location.toLowerCase();
  const allowed = allowedRegions(intent);
  if (allowed.some((a) => mentions(loc, a))) return { ok: true, why: "Location matches" };
  const wantsRemote = intent.remoteOk || intent.locations.some((l) => /remote/i.test(l));
  if (remote && wantsRemote) {
    const restricted = RESTRICTIVE_REGIONS.find((r) => mentions(loc, r));
    if (!restricted) return { ok: true, why: "Remote, no region restriction stated" };
    return { ok: false, why: `Remote but limited to ${restricted.toUpperCase()}` };
  }
  return { ok: false, why: "Outside your locations" };
}

const SENIOR_RE = /\b(senior|sr\.?|staff|principal|lead|director|head|manager|vp|vice president|chief|architect|distinguished)\b/i;
const JUNIOR_RE = /\b(intern|internship|graduate|grad|junior|jr\.?|entry|trainee|associate|apprentice|learnership|early career)\b/i;

export function seniorityMatches(title: string, s: SearchIntent["seniority"]): boolean {
  if (s === "any") return true;
  if (s === "intern") return JUNIOR_RE.test(title) || !SENIOR_RE.test(title);
  if (s === "junior") return !SENIOR_RE.test(title);
  if (s === "mid") return !/\b(staff|principal|director|head|vp|chief|distinguished|intern)\b/i.test(title);
  return true;
}

const SYNONYMS: Record<string, string[]> = {
  analyst: ["analyst", "analytics", "insights", "business intelligence", "bi analyst", "data analysis"],
  "data scientist": ["data scientist", "data science", "machine learning", "ml", "applied scientist", "research scientist", "talent scientist"],
  "data engineer": ["data engineer", "analytics engineer", "etl", "data platform"],
  "software engineer": ["software engineer", "developer", "backend", "frontend", "full stack", "fullstack", "sde"],
  "machine learning": ["machine learning", "ml engineer", "ai engineer", "mlops"],
  qa: ["qa", "quality assurance", "test engineer", "sdet", "tester", "quality engineer"],
};

// Core terms: the role's head noun and its synonyms. A title must contain at
// least one core term to be considered at all.
export function coreTerms(intent: SearchIntent): string[] {
  const role = intent.role.toLowerCase().trim();
  const terms = new Set<string>([role]);
  for (const [k, syn] of Object.entries(SYNONYMS)) {
    if (role.includes(k) || syn.some((s) => role === s || role.endsWith(" " + s))) syn.forEach((s) => terms.add(s));
  }
  const head = role.split(/\s+/).pop();
  if (head && head.length > 2) terms.add(head);
  return [...terms];
}

// Words that signal a different job family than the one searched for.
const FAMILY_WORDS = ["engineer", "developer", "accountant", "sales", "account executive", "designer", "recruiter", "counsel", "lawyer", "marketing manager", "technician", "nurse"];

export function roleTerms(intent: SearchIntent): string[] {
  const extra = intent.keywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
  const modifiers = intent.role.toLowerCase().split(/\s+/).slice(0, -1).filter((w) => w.length > 2);
  return [...new Set([...coreTerms(intent), ...extra, ...modifiers])];
}

export function titleRelevance(title: string, intent: SearchIntent): number {
  const t = title.toLowerCase();
  const core = coreTerms(intent);
  if (!core.some((c) => mentions(t, c))) return 0;
  let score = 0;
  for (const term of roleTerms(intent)) if (mentions(t, term)) score += term.includes(" ") ? 3 : 1;
  if (mentions(t, intent.role.toLowerCase())) score += 4;
  const role = intent.role.toLowerCase();
  for (const fw of FAMILY_WORDS) if (mentions(t, fw) && !role.includes(fw)) score -= 3;
  return Math.max(0, score);
}

export function hitsDealbreaker(text: string, dealbreakers: string[]): string | null {
  const t = text.toLowerCase();
  return dealbreakers.find((d) => d.trim() && t.includes(d.toLowerCase().trim())) ?? null;
}
