// Shared domain types for Callback.

export type FactType =
  | "experience"
  | "skill"
  | "education"
  | "certification"
  | "project"
  | "achievement";

export type FactStatus = "extracted" | "user_confirmed" | "rejected";

export interface CareerFact {
  id: string;
  text: string; // normalised statement
  type: FactType;
  documentId: string;
  evidenceQuote: string; // exact excerpt from the source document
  quoteStart: number; // char offset into the document text, -1 if user-added
  status: FactStatus;
  userEdited: boolean;
  createdAt: string;
}

export interface SourceDocument {
  id: string;
  filename: string;
  sha256: string;
  text: string;
  uploadedAt: string;
}

export interface SearchIntent {
  role: string; // e.g. "Data Analyst"
  keywords: string[]; // extra terms
  locations: string[]; // e.g. ["Johannesburg", "Remote"]
  remoteOk: boolean;
  seniority: "intern" | "junior" | "mid" | "senior" | "any";
  dealbreakers: string[];
}

export type SignalDirection = "positive" | "negative" | "unavailable";

export interface SignalObservation {
  key: string;
  label: string;
  direction: SignalDirection;
  weight: number; // applied weight (0 when unavailable)
  detail: string; // human-readable evidence
  sourceUrl?: string;
  checkedAt: string;
}

export type SignalStatus = "strong" | "mixed" | "low" | "insufficient";

export interface SignalResult {
  status: SignalStatus;
  score: number; // internal, not shown prominently
  observations: SignalObservation[];
  checkedAt: string;
}

export type AtsProvider = "greenhouse" | "ashby" | "lever" | "web";

export interface JobPosting {
  id: string;
  provider: AtsProvider;
  company: string;
  companySlug: string;
  title: string;
  location: string;
  remote: boolean;
  url: string; // canonical posting URL
  applyUrl?: string;
  postedAt?: string; // ISO, if known
  updatedAt?: string; // ISO, if known
  descriptionText: string; // plain text, truncated
  firstSeenAt: string;
  lastSeenAt: string;
  signal?: SignalResult;
  fit?: FitResult;
  deepAnalysis?: { markdown: string; model: string; at: string };
  isNew?: boolean; // found by the overnight watch, not yet opened
  pinnedAt?: string; // set when served from the pinned demo snapshot
}

export type FitLevel = "strong" | "partial" | "weak";

export interface RequirementCoverage {
  requirement: string;
  coverage: "met" | "partial" | "missing";
  factIds: string[];
  note: string;
}

export interface FitResult {
  level: FitLevel;
  summary: string;
  requirements: RequirementCoverage[];
  strengths: string[];
  gaps: string[];
  model: string;
  scoredAt: string;
}

export type LedgerStatus = "pass" | "needs_confirmation" | "blocked";

export interface LedgerVerdict {
  status: LedgerStatus;
  reasons: string[];
}

export interface PackBullet {
  text: string;
  factIds: string[];
  verdict: LedgerVerdict;
}

export type ApplicationStatus =
  | "drafted"
  | "approved"
  | "applied"
  | "replied"
  | "interview"
  | "rejected"
  | "no_response";

export interface Application {
  id: string;
  jobId: string;
  bullets: PackBullet[];
  noteLines: PackBullet[];
  model: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  history: { status: ApplicationStatus; at: string; packHash?: string }[];
  approvedHash?: string; // sha-256 of the exact lines that were approved
}

export interface ModelCall {
  id: string;
  step: string;
  requestedModel: string;
  model: string; // the model that actually answered
  fallbackUsed: boolean;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
  createdAt: string;
}

export interface SourceFetch {
  id: string;
  step: string;
  url: string;
  provider: string;
  ok: boolean;
  createdAt: string;
}
