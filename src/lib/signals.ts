// Hiring-signal engine. Code, not a model, computes the status from
// observable evidence. A listing is never called "fake".

import { BOARD_ACTIVE_MIN_ROLES, FRESH_DAYS, SIGNAL_WEIGHTS as W, STALE_DAYS, STATUS_RULES as R } from "./signals-config";
import type { SignalObservation, SignalResult, SignalStatus } from "./types";

export interface SignalEvidence {
  now: string;
  provider: string; // greenhouse | ashby | lever | web
  boardUrl?: string;
  onBoardNow: boolean | null; // null = could not check
  postedAt?: string;
  updatedAt?: string;
  link?: { ok: boolean; status: number; finalUrl: string } | null;
  otherRolesUpdatedLast30d?: number | null;
  independentSourceUrl?: string | null; // a non-ATS page listing the same role
  historyDays: number; // how long we have been observing this listing
  republishCount?: number;
}

const DAY = 86_400_000;

function days(fromIso: string | undefined, nowIso: string) {
  if (!fromIso) return null;
  const t = Date.parse(fromIso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.parse(nowIso) - t) / DAY);
}

export function computeSignal(ev: SignalEvidence): SignalResult {
  const obs: SignalObservation[] = [];
  const at = ev.now;
  const add = (o: Omit<SignalObservation, "checkedAt">) => obs.push({ ...o, checkedAt: at });

  // 1. Employer's own ATS board
  if (ev.onBoardNow === true) {
    add({ key: "employer_ats", label: "Published on the employer's own job board", direction: "positive", weight: W.onEmployerAts, detail: `Listed right now on the employer's ${providerName(ev.provider)} job board. This proves the employer is advertising it, not that interviews are happening.`, sourceUrl: ev.boardUrl });
  } else if (ev.onBoardNow === false) {
    add({ key: "employer_ats", label: "No longer on the employer's hiring system", direction: "negative", weight: W.missingFromBoard, detail: "This role was on the employer's job board earlier but is not listed now.", sourceUrl: ev.boardUrl });
  } else {
    add({ key: "employer_ats", label: "Employer hiring system", direction: "unavailable", weight: 0, detail: "Could not confirm against the employer's own job board." });
  }

  // 2. Freshness. ATS "updated" timestamps change for many reasons (edits,
  // re-syncs), so only the first-publish date earns a freshness positive.
  // A long-open posting counts against the listing even if recently edited:
  // evergreen requisitions are a known pattern behind "ghost" listings.
  const pubAge = days(ev.postedAt, at);
  const updAge = days(ev.updatedAt, at);
  if (pubAge === null && updAge === null) {
    add({ key: "freshness", label: "Posting date", direction: "unavailable", weight: 0, detail: "The posting does not show a publish date." });
  } else if (pubAge !== null && pubAge <= FRESH_DAYS) {
    add({ key: "freshness", label: `Published ${ago(pubAge)}`, direction: "positive", weight: W.freshWithin30d, detail: dateDetail(ev.postedAt, ev.updatedAt) });
  } else if (pubAge !== null && pubAge > STALE_DAYS) {
    const maintained = updAge !== null && updAge <= FRESH_DAYS;
    add({
      key: "freshness",
      label: `Open for ${humanDays(pubAge)}`,
      direction: "negative",
      weight: W.staleOver90d,
      detail: `${dateDetail(ev.postedAt, ev.updatedAt)} ${maintained ? "It was edited recently, but long-open postings are often evergreen pipelines rather than one active vacancy." : "Old postings can still be active, so treat this as a caution, not proof."}`,
    });
  } else if (pubAge === null && updAge !== null) {
    add({ key: "freshness", label: `Updated ${ago(updAge)}`, direction: "unavailable", weight: 0, detail: `${dateDetail(ev.postedAt, ev.updatedAt)} No publish date, so freshness isn't scored.` });
  } else {
    add({ key: "freshness", label: `Published ${ago(pubAge!)}`, direction: "unavailable", weight: 0, detail: `${dateDetail(ev.postedAt, ev.updatedAt)} Neither fresh nor stale.` });
  }

  // 3. Application link
  if (ev.link === undefined || ev.link === null) {
    add({ key: "apply_link", label: "Application link", direction: "unavailable", weight: 0, detail: "Not checked yet." });
  } else if (ev.link.ok) {
    add({ key: "apply_link", label: "Application link works", direction: "positive", weight: W.applyLinkLive, detail: `Resolved with HTTP ${ev.link.status}.`, sourceUrl: ev.link.finalUrl });
  } else {
    add({ key: "apply_link", label: "Application link is broken", direction: "negative", weight: W.applyLinkDead, detail: ev.link.status ? `Returned HTTP ${ev.link.status} or redirected away from the job.` : "Could not be reached.", sourceUrl: ev.link.finalUrl });
  }

  // 4. Board activity
  if (ev.otherRolesUpdatedLast30d === undefined || ev.otherRolesUpdatedLast30d === null) {
    add({ key: "board_activity", label: "Employer board activity", direction: "unavailable", weight: 0, detail: "No board activity data." });
  } else if (ev.otherRolesUpdatedLast30d >= BOARD_ACTIVE_MIN_ROLES) {
    add({ key: "board_activity", label: "Employer's board is active", direction: "positive", weight: W.boardActive, detail: `${ev.otherRolesUpdatedLast30d} other roles on this board were published or updated in the last 30 days. That shows a maintained board, not that this role is being interviewed for.`, sourceUrl: ev.boardUrl });
  } else {
    add({ key: "board_activity", label: "Little recent board activity", direction: "unavailable", weight: 0, detail: `Only ${ev.otherRolesUpdatedLast30d} other roles changed in the last 30 days. Shown for context, not scored.` });
  }

  // 5. Independent source
  if (ev.independentSourceUrl) {
    add({ key: "multi_source", label: "Confirmed by a second source", direction: "positive", weight: W.multiSource, detail: "The same role appears on an independent page.", sourceUrl: ev.independentSourceUrl });
  }

  // 6. Repost history: honest about needing time
  if (ev.historyDays < 14) {
    add({ key: "repost_history", label: "Repost history", direction: "unavailable", weight: 0, detail: `Callback has watched this listing for ${ev.historyDays} day${ev.historyDays === 1 ? "" : "s"}. Repost patterns need a few weeks of history.` });
  } else if ((ev.republishCount ?? 0) >= 3) {
    add({ key: "repost_history", label: "Reposted repeatedly", direction: "negative", weight: W.repostedOften, detail: `Re-published ${ev.republishCount} times while we watched.` });
  }

  const observed = obs.filter((o) => o.direction !== "unavailable");
  const score = observed.reduce((s, o) => s + o.weight, 0);

  // Decision order (documented in the README). First matching rule wins.
  //  1. Listing has vanished from the employer's own board  -> low
  //  2. Fewer than 2 observable signals                      -> insufficient
  //  3. Dead link or vanished listing                        -> can never be strong
  //  4. Score >= 4 with at least 3 observed signals          -> strong
  //  5. Score < 0                                            -> low
  //  6. Otherwise                                            -> mixed
  let status: SignalStatus;
  if (ev.onBoardNow === false) status = "low";
  else if (observed.length < R.insufficientBelowObserved) status = "insufficient";
  else if (score >= R.strongMinScore && observed.length >= R.strongMinObserved && !hasConflictSevere(observed)) status = "strong";
  else if (score < 0) status = "low";
  else status = "mixed";

  return { status, score, observations: obs, checkedAt: at };
}

// A dead link or a vanished listing overrides positive freshness.
function hasConflictSevere(observed: SignalObservation[]) {
  return observed.some((o) => (o.key === "apply_link" || o.key === "employer_ats") && o.direction === "negative");
}

function providerName(p: string) {
  return ({ greenhouse: "Greenhouse", ashby: "Ashby", lever: "Lever" } as Record<string, string>)[p] ?? "careers";
}

function ago(d: number) {
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

function humanDays(d: number) {
  if (d >= 730) return `${Math.floor(d / 365)} years`;
  if (d >= 365) return "over a year";
  return `${d} days`;
}

function fmt(iso?: string) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

function dateDetail(posted?: string, updated?: string) {
  const parts = [];
  if (posted) parts.push(`First published ${fmt(posted)}.`);
  if (updated) parts.push(`Last updated ${fmt(updated)}.`);
  return parts.join(" ");
}

export const STATUS_LABEL: Record<SignalStatus, string> = {
  strong: "Strong signal",
  mixed: "Mixed signal",
  low: "Low hiring signal",
  insufficient: "Insufficient evidence",
};
