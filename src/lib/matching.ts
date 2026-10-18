// Deterministic hard filters applied before any model call is spent.

import type { SearchIntent } from "./types";

const SA_HINTS = ["johannesburg", "joburg", "jhb", "sandton", "pretoria", "cape town", "durban", "gauteng", "south africa"];

// Regions/countries that, when named in a remote posting, restrict where
// candidates can be based.
const RESTRICTIVE_REGIONS = [
  "us", "u.s", "u.s.", "usa", "united states", "canada", "mexico", "brazil", "latam", "latin america", "americas", "north america",
  "uk", "united kingdom", "ireland", "germany", "france", "spain", "portugal", "netherlands", "poland", "italy", "europe", "eu",
  "india", "japan", "singapore", "australia", "apac", "asia", "china", "korea", "israel", "uae", "dubai",
  "austria", "belgium", "sweden", "norway", "denmark", "finland", "switzerland", "czech", "romania", "hungary", "greece", "turkey",
  "saudi arabia", "qatar", "united arab emirates", "egypt", "morocco", "nigeria", "kenya", "ghana", "philippines", "indonesia", "malaysia",
  "vietnam", "thailand", "pakistan", "argentina", "colombia", "chile", "peru", "new zealand",
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

// Some regions list several places; a role open to any allowed one matches.
export function locationMatches(location: string, remote: boolean, intent: SearchIntent): { ok: boolean; why: string } {
  const loc = location.toLowerCase();
  // Unknown location: keep the role and say so, rather than silently dropping it.
  if (!loc.trim()) return { ok: true, why: "Location not stated: check before applying" };
  const allowed = allowedRegions(intent);
  if (allowed.some((a) => mentions(loc, a))) return { ok: true, why: "Location matches" };
  const wantsRemote = intent.remoteOk || intent.locations.some((l) => /remote/i.test(l));
  if (remote && wantsRemote) {
    // A remote role is open to the user only if it names no place, or only
    // generic remote wording. Any named city or country restricts it (an
    // allow-list of regions is safer than a block-list of every country).
    const residue = loc
      .replace(/\b(fully\s+)?remote\b|\bhome[\s-]?based\b|\bwork from home\b|\bwfh\b|\bdistributed\b|\bflexible\b/g, " ")
      .replace(/[()\[\];,|/\-–]+/g, " ")
      .trim();
    if (!residue) return { ok: true, why: "Remote, no region restriction stated" };
    const restricted = RESTRICTIVE_REGIONS.find((r) => mentions(loc, r));
    return { ok: false, why: restricted ? `Remote but limited to ${restricted.toUpperCase()}` : `Remote but tied to ${residue}` };
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
  const role = intent.role.toLowerCase().trim();
  const words = role.split(/\s+/);
  const head = words[words.length - 1];
  const core = coreTerms(intent);
  if (!core.some((c) => mentions(t, c))) return 0;
  let score = 0;
  // The bare head noun ("analyst") is weak; synonyms that carry the domain
  // ("analytics", "business intelligence") are stronger.
  for (const term of core) if (mentions(t, term)) score += term === head ? 1 : term.includes(" ") ? 3 : 2;
  const modifiers = words.slice(0, -1).filter((w) => w.length > 2);
  for (const m of modifiers) if (mentions(t, m)) score += 1;
  for (const k of intent.keywords) if (k.trim() && mentions(t, k.toLowerCase().trim())) score += 1;
  if (mentions(t, role)) score += 4;
  for (const fw of FAMILY_WORDS) if (mentions(t, fw) && !role.includes(fw)) score -= 3;
  // A multi-word role ("data analyst") needs more than the head noun alone.
  if (modifiers.length && score < 2) return 0;
  return Math.max(0, score);
}

export function hitsDealbreaker(text: string, dealbreakers: string[]): string | null {
  const t = text.toLowerCase();
  return dealbreakers.find((d) => d.trim() && t.includes(d.toLowerCase().trim())) ?? null;
}
