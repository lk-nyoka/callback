// The Claims Ledger.
//
// Deterministic code decides whether a drafted claim is supported by the
// user's confirmed Career Vault facts. Models may propose claims and cite
// fact IDs; they can never approve a claim. An optional model "auditor" may
// make a verdict stricter, never more permissive (see composer).
//
// Hard checks (no rescue): numbers, quantity words, scope qualifiers,
// seniority/ownership verbs, titles and superlatives must be supported by the
// cited facts. Soft check: named tools, technologies and organisations must
// appear in cited facts; if not, a bullet that is otherwise very close to its
// cited facts is routed to the user ("needs_confirmation"), otherwise blocked.

import type { CareerFact, LedgerVerdict } from "./types";

// ---------- vocabularies ----------

// Word families: a claim word is supported if the support text contains any
// member of the same family.
export const ESCALATION_FAMILIES: string[][] = [
  ["led", "lead", "leads", "leading", "leader", "leadership"],
  ["managed", "manage", "manages", "managing", "manager", "management"],
  ["directed", "direct", "directs", "directing", "director"],
  ["headed", "head", "heads", "heading"],
  ["oversaw", "oversee", "oversees", "overseeing", "oversight"],
  ["owned", "own", "owns", "owning", "owner", "ownership"],
  ["spearheaded", "spearhead", "spearheads", "spearheading"],
  ["founded", "found", "founder", "co-founded", "cofounded", "co-founder", "cofounder"],
  ["architected", "architect", "architects", "architecting"],
  ["supervised", "supervise", "supervises", "supervising", "supervisor"],
  ["pioneered", "pioneer", "pioneering"],
  ["championed", "champion", "championing"],
  ["mentored", "mentor", "mentors", "mentoring", "coached", "coach", "coaching"],
  ["chaired", "chair", "chairs", "chairing", "chairperson"],
  ["senior"],
  ["principal"],
  ["chief"],
  ["expert", "experts", "expertise"],
];

// Words that are only escalation when used as a verb/title; "lead" as in
// "lead generation" is rare in CVs, so we accept the false-block risk.
const ESCALATION_INDEX = new Map<string, number>();
ESCALATION_FAMILIES.forEach((fam, i) => fam.forEach((w) => ESCALATION_INDEX.set(w, i)));

// "head" and "found" are too common as non-escalation words ("found that",
// "ahead"); only treat them as escalation in specific patterns.
const CONTEXTUAL_ESCALATION = new Set(["head", "heads", "heading", "found", "own", "direct", "chair", "chairs", "champion", "coach", "architect", "architects", "expertise", "lead"]);

export const SCOPE_QUALIFIERS = [
  "enterprise-wide",
  "enterprise wide",
  "company-wide",
  "company wide",
  "organisation-wide",
  "organization-wide",
  "org-wide",
  "department-wide",
  "nationwide",
  "national",
  "international",
  "global",
  "globally",
  "worldwide",
  "cross-functional",
  "cross functional",
  "multiple teams",
  "several teams",
  "all teams",
  "large-scale",
  "large scale",
  "at scale",
  "end-to-end",
  "end to end",
  "production",
  "mission-critical",
  "millions",
  "thousands",
  "hundreds",
];

export const SUPERLATIVES = [
  "award-winning",
  "award winning",
  "world-class",
  "industry-leading",
  "best-in-class",
  "best",
  "top",
  "#1",
  "number one",
  "record",
  "record-breaking",
  "first-ever",
  "only",
  "sole",
  "single-handedly",
  "singlehandedly",
];

// Who the work reached. Claiming a more senior audience is escalation.
export const AUDIENCE_TERMS = [
  "executive", "executives", "executive team", "c-suite", "board", "board of directors", "ceo", "cto", "cfo", "coo",
  "leadership team", "senior leadership", "senior management", "directors", "investors", "shareholders", "government", "minister",
];

// Capability claims written in ordinary words that the name heuristics miss.
export const CAPABILITY_PHRASES = [
  "machine learning", "ml model", "deep learning", "neural network", "neural networks", "artificial intelligence",
  "llm", "large language model", "nlp", "natural language processing", "computer vision",
  "forecast", "forecasts", "forecasting", "forecasted", "predictive", "prediction model", "predictive model",
  "a/b test", "a/b testing", "ab testing", "experimentation", "causal inference",
  "data warehouse", "data lake", "etl pipeline", "data pipeline", "real-time", "streaming",
  "api", "apis", "microservices", "ci/cd", "devops", "cloud", "deployed", "deployment", "in production",
  "statistical model", "regression model", "classification model", "clustering",
];

// Career-progression claims: must be stated in the cited facts.
export const PROGRESSION_PHRASES = [
  "promoted", "promotion", "promoted to", "fast-tracked", "fast tracked", "rose to", "advanced to", "elevated to",
  "upgraded to", "offered a permanent", "converted to permanent", "retained", "rehired", "re-hired",
];

// Quantity words must be supported like numbers.
const QUANTITY_WORDS: Record<string, string[]> = {
  doubled: ["doubled", "double", "2x", "two-fold", "twofold", "100%"],
  tripled: ["tripled", "triple", "3x", "three-fold", "threefold", "200%"],
  quadrupled: ["quadrupled", "4x", "300%"],
  halved: ["halved", "half", "50%"],
  tenfold: ["tenfold", "10x", "ten-fold"],
  dozens: ["dozens", "dozen"],
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100, dozen: 12,
};

// Capitalised words that are not claims about tools/organisations.
export const GENERIC_ALLOWED = new Set(
  [
    "i", "a", "an", "the", "and", "in", "on", "for", "with", "to", "of", "my", "our",
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "dear", "hiring", "team", "manager", "regards", "kind", "thank", "thanks", "sincerely",
    "ai", "it", "ok",
  ],
);

// Lowercase-written tools that the capitalisation heuristics would miss.
export const TECH_LEXICON = new Set(
  (
    "pytest unittest jest mocha cypress playwright selenium pandas numpy scipy polars matplotlib seaborn plotly " +
    "scikit-learn sklearn tensorflow pytorch keras xgboost lightgbm spacy nltk huggingface langchain " +
    "docker kubernetes k8s terraform ansible jenkins git github gitlab bitbucket jira confluence " +
    "react vue angular svelte nextjs next.js nodejs node.js express django flask fastapi spring rails laravel " +
    "postgres postgresql mysql sqlite mongodb redis kafka spark hadoop airflow dbt snowflake bigquery redshift databricks " +
    "excel tableau looker powerbi figma linux bash powershell vba sas spss stata matlab simulink labview arduino " +
    "python java javascript typescript golang rust kotlin swift scala php ruby sql nosql graphql html css " +
    "aws azure gcp firebase supabase vercel heroku"
  ).split(" "),
);

// ---------- normalisation ----------

export function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function words(s: string): string[] {
  return normalise(s)
    .replace(/[^a-z0-9#+%.\-' ]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[.\-']+|[.\-']+$/g, ""))
    .filter(Boolean);
}

function containsPhrase(haystack: string, phrase: string): boolean {
  const h = ` ${normalise(haystack).replace(/[^a-z0-9#+%\- ]/g, " ").replace(/\s+/g, " ")} `;
  const p = normalise(phrase).replace(/[^a-z0-9#+%\- ]/g, " ").replace(/\s+/g, " ").trim();
  return h.includes(` ${p} `);
}

// ---------- numbers ----------

interface Quantity {
  raw: string;
  value: number;
  unit: "" | "%" | "x";
}

// Standalone numbers only: digits that are part of an alphanumeric token
// (S3, Web3, B2B, 3D, Python3) are treated as names, not quantities.
const NUM_RE = /(?<![A-Za-z0-9.])(\d{1,3}(?:[ ,]\d{3})+|\d+(?:\.\d+)?)\s?(%|percent\b|per cent\b|k\b|m\b|mn\b|bn\b|b\b|x\b|million\b|billion\b|thousand\b)?(?![A-Za-z0-9])/gi;

export function extractQuantities(text: string): Quantity[] {
  const out: Quantity[] = [];
  for (const m of text.matchAll(NUM_RE)) {
    const n = parseFloat(m[1].replace(/[ ,]/g, ""));
    if (Number.isNaN(n)) continue;
    const suf = (m[2] ?? "").toLowerCase();
    let value = n;
    let unit: Quantity["unit"] = "";
    if (suf === "%" || suf.startsWith("percent") || suf.startsWith("per cent")) unit = "%";
    else if (suf === "x") unit = "x";
    else if (suf === "k" || suf === "thousand") value = n * 1e3;
    else if (suf === "m" || suf === "mn" || suf === "million") value = n * 1e6;
    else if (suf === "b" || suf === "bn" || suf === "billion") value = n * 1e9;
    out.push({ raw: m[0].trim(), value, unit });
  }
  // number words ("three engineers") count as quantities too, so they cannot
  // be used to dodge the number check.
  for (const w of words(text)) {
    if (w in NUMBER_WORDS) out.push({ raw: w, value: NUMBER_WORDS[w], unit: "" });
  }
  return out;
}

function quantitySupported(q: Quantity, support: Quantity[]): boolean {
  return support.some((s) => s.unit === q.unit && Math.abs(s.value - q.value) < 1e-9);
}

// ---------- terms (tools, technologies, organisations) ----------

export function extractTerms(text: string): string[] {
  const terms = new Set<string>();
  // split into sentences so the first word of each sentence is not a "name"
  const sentences = text.split(/(?<=[.!?;:])\s+|\n+/);
  for (const sentence of sentences) {
    const tokens = sentence.split(/[\s\u2013\u2014]+/).filter(Boolean);
    tokens.forEach((tok, idx) => {
      const clean = tok
        .replace(/^[("'\u2018\u201c\[]+|[)"'\u2019\u201d\],.;:!?]+$/g, "")
        .replace(/['\u2019]s$/i, "");
      if (!clean) return;
      const lower = clean.toLowerCase();
      if (GENERIC_ALLOWED.has(lower)) return;
      if (/^\d/.test(clean) && !/[a-z]/i.test(clean)) return; // pure numbers handled elsewhere
      if (/^\d+(?:\.\d+)?(?:k|m|mn|bn|b|x)$/i.test(clean)) return; // 50k, 2x: quantities, handled elsewhere
      if (TECH_LEXICON.has(lower)) {
        terms.add(clean);
        return;
      }
      const isAcronym = /^[A-Z][A-Z0-9&]{1,}s?$/.test(clean); // AWS, SQL, ETL, APIs
      const isMixed = /^[A-Za-z]+[A-Z][A-Za-z]*$/.test(clean) && /[a-z]/.test(clean) && /[A-Z]/.test(clean.slice(1)); // PostgreSQL, TypeScript
      const hasTechChars = /[a-z][.#+]|[#+]$|\.[a-z]{2,}$/i.test(clean) && /[a-z]/i.test(clean); // Node.js, C#, C++
      const alnum = /[A-Za-z]\d|\d[A-Za-z]/.test(clean); // S3, Python3, B2B
      const isCapitalised = /^[A-Z][a-z]+/.test(clean) && idx > 0;
      if (isAcronym || isMixed || hasTechChars || alnum || isCapitalised) terms.add(clean);
    });
  }
  return [...terms];
}

function termSupported(term: string, supportNorm: string, supportCompact: string): boolean {
  const t = normalise(term);
  if (containsPhrase(supportNorm, t)) return true;
  const compact = t.replace(/[^a-z0-9#+]/g, "");
  if (compact.length >= 2 && supportCompact.includes(compact)) return true;
  // plural acronym: "APIs" -> "api"
  if (/s$/.test(t) && containsPhrase(supportNorm, t.slice(0, -1))) return true;
  return false;
}

// Content-word overlap between claim and cited facts (deterministic similarity).
const STOP = new Set("a an the and or of to in on for with by at from as is was were be been this that these those into using use used via my our their its it i we".split(" "));
export function overlap(claim: string, support: string): number {
  const c = new Set(words(claim).filter((w) => !STOP.has(w) && w.length > 2));
  const s = new Set(words(support).filter((w) => !STOP.has(w) && w.length > 2));
  if (!c.size) return 1;
  let hit = 0;
  c.forEach((w) => {
    if (s.has(w) || s.has(w.replace(/(ed|ing|s)$/, ""))) hit++;
  });
  return hit / c.size;
}

// ---------- novelty ----------

// Ordinary CV and connective words that don't add a factual claim.
export const NEUTRAL_WORDS = new Set(
  (
    "built build building created create creating developed develop developing wrote write writing authored used use using made make " +
    "reduce reduced reducing cut cutting lowered decreased " +
    "worked work working helped help helping contributed contributing supported supporting prepared prepare produced produce " +
    "analysed analyzed analyse analyze analysing analyzing ran run running conducted completed earned achieved hold holding holds " +
    "including include includes such also both each every-day various different relevant key core main " +
    "role roles position job team teams project projects work tasks experience skills skill ability abilities " +
    "data insights insight findings results reports report information analysis " +
    "clear clearly accurate accurately reliable regular regularly effectively efficiently successfully " +
    "university student students company organisation organization business stakeholders colleagues " +
    "weekly monthly quarterly daily annual yearly week month year years " +
    "applying apply excited eager keen welcome chance opportunity grow growing learn learning contribute bring bringing join joining " +
    "your you yours their them they this that these those which who whom whose what where when while during within across over under " +
    "about after before through throughout via per into onto upon than then there here its it's i'm i've i'd we're our ours my mine me " +
    "would could should will can may might must shall do does did done have has had having be is are was were been being am " +
    "not no nor only just very more most less least well good great strong new percent per-cent"
  ).split(" "),
);

function stem(w: string) {
  return w
    .replace(/['\u2019]s$/, "")
    .replace(/(ies)$/, "y")
    .replace(/(ing|ed|es|s|ly|ment|ments|ation|ations)$/, "")
    .replace(/(.)\1$/, "$1");
}

// Substantive words in the claim that appear nowhere in its cited facts.
export function novelWords(claim: string, support: string, context: Set<string>): string[] {
  const supportStems = new Set(words(support).map(stem));
  const out: string[] = [];
  for (const w of words(claim)) {
    const clean = w.replace(/[^a-z0-9#+\-']/g, "");
    if (clean.length < 3 || STOP.has(clean) || NEUTRAL_WORDS.has(clean) || context.has(clean)) continue;
    if (/^\d/.test(clean) || clean in NUMBER_WORDS) continue; // numbers are checked separately
    if (supportStems.has(stem(clean))) continue;
    if (!out.includes(clean)) out.push(clean);
  }
  return out;
}

// Phrases that claim experience or quality. Uncited lines may not contain them.
export const UNCITED_CLAIM_WORDS = [
  "experience", "experienced", "years", "expert", "expertise", "proven", "track record", "extensive", "extensively",
  "consistently", "always", "exceed", "exceeded", "exceeding", "skilled", "proficient", "proficiency", "mastery",
  "background in", "accomplished", "seasoned", "specialist", "specialise", "specialize", "successfully",
];

// ---------- main check ----------

export interface CheckOptions {
  // Words allowed without support because they describe the target job, not
  // the candidate (company name, role title). Never allowed in a claim of
  // having worked at that company.
  contextTerms?: string[];
  similarityThreshold?: number;
  noveltyThreshold?: number; // number of novel substantive words that routes a line to the user
}

export function checkClaim(
  claim: { text: string; factIds: string[] },
  facts: CareerFact[],
  opts: CheckOptions = {},
): LedgerVerdict {
  const byId = new Map(facts.map((f) => [f.id, f]));
  const cited = claim.factIds.map((id) => byId.get(id));
  const reasons: string[] = [];
  const uncited = claim.factIds.length === 0;

  // 1. Every cited fact must exist and be confirmed by the user.
  if (cited.some((f) => !f || f.status !== "user_confirmed")) {
    return { status: "blocked", reasons: ["missing_or_unconfirmed_fact"] };
  }

  const supportText = cited.map((f) => `${f!.text}. ${f!.evidenceQuote}`).join(" \n ");
  const supportNorm = normalise(supportText);
  const supportCompact = supportNorm.replace(/[^a-z0-9#+]/g, "");
  const claimNorm = normalise(claim.text);
  const claimWords = words(claim.text);

  // 2a. Numbers and number words.
  const supportQ = extractQuantities(supportText);
  for (const q of extractQuantities(claim.text)) {
    if (!quantitySupported(q, supportQ)) reasons.push(`unsupported_number:${q.raw}`);
  }
  // 2b. Quantity words.
  for (const [word, equivalents] of Object.entries(QUANTITY_WORDS)) {
    if (claimWords.includes(word) && !equivalents.some((e) => containsPhrase(supportText, e))) {
      reasons.push(`unsupported_quantity:${word}`);
    }
  }
  // 2c. Scope qualifiers.
  for (const phrase of SCOPE_QUALIFIERS) {
    if (containsPhrase(claimNorm, phrase) && !containsPhrase(supportNorm, phrase)) {
      reasons.push(`unsupported_scope:${phrase}`);
    }
  }
  // 2d. Superlatives.
  for (const phrase of SUPERLATIVES) {
    if (containsPhrase(claimNorm, phrase) && !containsPhrase(supportNorm, phrase)) {
      reasons.push(`unsupported_superlative:${phrase}`);
    }
  }
  // 2e. Audience escalation and capability claims.
  for (const phrase of AUDIENCE_TERMS) {
    if (containsPhrase(claimNorm, phrase) && !containsPhrase(supportNorm, phrase)) reasons.push(`unsupported_audience:${phrase}`);
  }
  for (const phrase of CAPABILITY_PHRASES) {
    if (containsPhrase(claimNorm, phrase) && !containsPhrase(supportNorm, phrase)) reasons.push(`unsupported_capability:${phrase}`);
  }
  for (const phrase of PROGRESSION_PHRASES) {
    if (containsPhrase(claimNorm, phrase) && !containsPhrase(supportNorm, phrase)) reasons.push(`unsupported_progression:${phrase}`);
  }
  // 2f. Seniority / ownership.
  const supportWords = new Set(words(supportText));
  const seenFamilies = new Set<number>();
  for (const w of claimWords) {
    const fam = ESCALATION_INDEX.get(w);
    if (fam === undefined || seenFamilies.has(fam)) continue;
    if (CONTEXTUAL_ESCALATION.has(w) && !isEscalationInContext(w, claimNorm)) continue;
    seenFamilies.add(fam);
    const supported = ESCALATION_FAMILIES[fam].some((x) => supportWords.has(x));
    if (!supported) reasons.push(`escalated_claim:${w}`);
  }

  // 2g. Lines that cite nothing may not claim experience or quality.
  if (uncited) {
    for (const phrase of UNCITED_CLAIM_WORDS) {
      if (containsPhrase(claimNorm, phrase)) reasons.push(`uncited_claim:${phrase}`);
    }
  }

  if (reasons.length) return { status: "blocked", reasons: dedupe(reasons) };

  // 3. Named tools, technologies, organisations.
  const context = new Set((opts.contextTerms ?? []).flatMap((t) => words(t)));
  const missing = extractTerms(claim.text).filter((t) => {
    if (termSupported(t, supportNorm, supportCompact)) return false;
    // The target company / role may be named ("excited to join Acme"), but a
    // claim of having worked there must be supported like any other.
    if (words(t).every((w) => context.has(w)) && !claimsEmploymentAt(claim.text, t)) return false;
    return true;
  });
  if (!missing.length) {
    // 3b. Novelty: substantive words the cited facts never mention. These can
    // carry exaggeration the vocabulary checks can't name ("designed the
    // schema", "improved pass rates"), so the line goes to the user.
    if (!uncited) {
      const novel = novelWords(claim.text, supportText, context);
      if (novel.length >= (opts.noveltyThreshold ?? 2)) {
        return { status: "needs_confirmation", reasons: [`new_content:${novel.slice(0, 5).join(", ")}`] };
      }
    }
    return { status: "pass", reasons: [] };
  }

  // 4. Similarity can only route to the user, never approve.
  // Only a single unmatched term can be routed; two or more invented names block.
  if (!uncited && missing.length === 1 && overlap(claim.text, supportText) >= (opts.similarityThreshold ?? 0.6)) {
    return { status: "needs_confirmation", reasons: missing.map((t) => `unmatched_term:${t}`) };
  }
  return { status: "blocked", reasons: missing.map((t) => `unsupported_term:${t}`) };
}

function claimsEmploymentAt(text: string, term: string): boolean {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b(worked|work|interned|employed|served|joined|was|were|spent|consulted)\\b[^.]*\\b(at|for|with|by)\\s+${esc}`, "i").test(text);
}

function isEscalationInContext(w: string, claimNorm: string): boolean {
  switch (w) {
    case "head":
    case "heads":
    case "heading":
      return /\bhead(?:s|ed|ing)? (?:of|up|the|a|an|our|my)\b/.test(claimNorm);
    case "found":
      return /\bfound (?:a|an|the|my|our)\b/.test(claimNorm) && !/\bfound (?:that|the issue|the bug|a bug|an issue)\b/.test(claimNorm);
    case "own":
      return /\b(?:i|we) own\b|\bown(?:ed)? the\b/.test(claimNorm) && !/\b(?:my|our|his|her|their|its) own\b/.test(claimNorm);
    case "direct":
      return /\bdirect (?:the|a|an|our|my)\b/.test(claimNorm) && !/\bdirect (?:report|line|contact|access|feedback)\b/.test(claimNorm);
    case "lead":
      return !/\blead (?:generation|time|times|scoring|magnet)\b/.test(claimNorm);
    case "expertise":
      return /\bexpertise (?:in|with)\b/.test(claimNorm);
    default:
      return true;
  }
}

function dedupe(a: string[]) {
  return [...new Set(a)];
}

// Human-readable explanation of a reason code, for the UI.
export function explainReason(reason: string): string {
  const [code, ...rest] = reason.split(":");
  const v = rest.join(":");
  switch (code) {
    case "missing_or_unconfirmed_fact":
      return "Cites a fact that is missing or not yet confirmed in your Vault.";
    case "unsupported_number":
      return `The number "${v}" does not appear in the cited facts.`;
    case "unsupported_quantity":
      return `"${v}" is a quantity claim your facts don't support.`;
    case "unsupported_scope":
      return `"${v}" claims a wider scope than your facts show.`;
    case "unsupported_superlative":
      return `"${v}" is a superlative your facts don't back up.`;
    case "unsupported_progression":
      return `"${v}" is a career-progression claim. Add a fact that states it, or remove it.`;
    case "unsupported_audience":
      return `Your facts don't show this reached "${v}".`;
    case "unsupported_capability":
      return `"${v}" is a skill claim your facts don't contain.`;
    case "escalated_claim":
      return `"${v}" implies more seniority or ownership than your facts show.`;
    case "unmatched_term":
      return `"${v}" isn't in the cited facts. Confirm it by adding it to your Vault.`;
    case "unsupported_term":
      return `"${v}" isn't mentioned in any cited fact.`;
    case "new_content":
      return `Adds words your cited facts don't mention (${v}). Confirm it's accurate by adding a fact, or reword.`;
    case "uncited_claim":
      return `"${v}" is a claim about you, but this line cites no facts.`;
    case "auditor_flag":
      return `Second-pass review: ${v}`;
    default:
      return reason;
  }
}
