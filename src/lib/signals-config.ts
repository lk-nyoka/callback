// Hiring-signal weights and thresholds. Starting values, documented in the
// README and tuned against a manually reviewed sample. The numeric score is
// internal; the UI leads with the status and the evidence.

export const SIGNAL_WEIGHTS = {
  onEmployerAts: 3, // role is live on the employer's own ATS job board right now
  freshWithin30d: 2, // posted or updated within 30 days
  staleOver90d: -2, // first published more than 90 days ago and not updated since
  applyLinkLive: 1, // application link resolves to the live posting
  applyLinkDead: -2, // link 404s or redirects to the board index
  boardActive: 1, // employer has updated 3+ other roles in the last 30 days
  multiSource: 1, // same role confirmed by an independent source (Tavily)
  repostedOften: -2, // seen re-published 3+ times in 90 days (needs history)
  missingFromBoard: -3, // was on the employer's board, now gone
} as const;

export const STATUS_RULES = {
  strongMinScore: 4,
  strongMinObserved: 3,
  insufficientBelowObserved: 2,
} as const;

export const FRESH_DAYS = 30;
export const STALE_DAYS = 90;
export const BOARD_ACTIVE_MIN_ROLES = 3;
