// Public, documented job-board feeds published by employers' own applicant
// tracking systems. These are the employer's own listings, so "live on the
// employer's ATS board" is the strongest hiring signal we can observe.
//   Greenhouse: https://developers.greenhouse.io/job-board.html
//   Ashby:      https://developers.ashbyhq.com/docs/public-job-posting-api
//   Lever:      https://github.com/lever/postings-api

import type { AtsProvider, JobPosting } from "./types";
import type { Trace } from "./trace";

export interface BoardRef {
  provider: Exclude<AtsProvider, "web">;
  slug: string;
}

export interface RawPosting {
  provider: AtsProvider;
  companySlug: string;
  company: string;
  externalId: string;
  title: string;
  location: string;
  remote: boolean;
  url: string;
  applyUrl?: string;
  postedAt?: string;
  updatedAt?: string;
  descriptionText: string;
}

export interface BoardSnapshot {
  board: BoardRef;
  ok: boolean;
  fetchedAt: string;
  postings: RawPosting[];
  error?: string;
}

const UA = { "User-Agent": "CallbackJobAssistant/0.1 (+https://github.com/lk-nyoka/callback)" };

export function htmlToText(html: string): string {
  const decoded = html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
  return decoded
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function titleCase(slug: string) {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const MAX_DESC = 6000;

// Boards are often >2 MB (too big for Next's fetch cache), so keep a short
// in-process cache. Re-checks bypass it with fresh=true.
const BOARD_TTL_MS = 10 * 60 * 1000;
const boardCache = new Map<string, { at: number; snap: BoardSnapshot }>();

export async function fetchBoard(board: BoardRef, trace?: Trace, fresh = false): Promise<BoardSnapshot> {
  const key = `${board.provider}:${board.slug}`;
  const hit = boardCache.get(key);
  if (!fresh && hit && Date.now() - hit.at < BOARD_TTL_MS) {
    trace?.addFetch({ step: "ATS board (cached)", url: boardApiUrl(board), provider: board.provider, ok: hit.snap.ok });
    return hit.snap;
  }
  const snap = await fetchBoardLive(board, trace);
  if (snap.ok) boardCache.set(key, { at: Date.now(), snap });
  return snap;
}

function boardApiUrl(b: BoardRef) {
  if (b.provider === "greenhouse") return `https://boards-api.greenhouse.io/v1/boards/${b.slug}/jobs`;
  if (b.provider === "ashby") return `https://api.ashbyhq.com/posting-api/job-board/${b.slug}`;
  return `https://api.lever.co/v0/postings/${b.slug}`;
}

async function fetchBoardLive(board: BoardRef, trace?: Trace): Promise<BoardSnapshot> {
  const fetchedAt = new Date().toISOString();
  let url = "";
  try {
    if (board.provider === "greenhouse") {
      url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.slug)}/jobs?content=true`;
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000), cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as { jobs: GreenhouseJob[] };
      trace?.addFetch({ step: "ATS board", url, provider: "greenhouse", ok: true });
      return {
        board,
        ok: true,
        fetchedAt,
        postings: d.jobs.map((j) => ({
          provider: "greenhouse",
          companySlug: board.slug,
          company: j.company_name || titleCase(board.slug),
          externalId: String(j.id),
          title: j.title.trim(),
          location: j.location?.name ?? "",
          remote: /remote|home.?based|anywhere/i.test(j.location?.name ?? ""),
          url: j.absolute_url,
          applyUrl: j.absolute_url,
          postedAt: j.first_published ?? undefined,
          updatedAt: j.updated_at ?? undefined,
          descriptionText: htmlToText(j.content ?? "").slice(0, MAX_DESC),
        })),
      };
    }
    if (board.provider === "ashby") {
      url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.slug)}?includeCompensation=true`;
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000), cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as { jobs: AshbyJob[] };
      trace?.addFetch({ step: "ATS board", url, provider: "ashby", ok: true });
      return {
        board,
        ok: true,
        fetchedAt,
        postings: d.jobs
          .filter((j) => j.isListed !== false)
          .map((j) => ({
            provider: "ashby",
            companySlug: board.slug,
            company: titleCase(board.slug),
            externalId: j.id,
            title: j.title.trim(),
            location: [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter(Boolean).join("; "),
            remote: !!j.isRemote || j.workplaceType === "Remote",
            url: j.jobUrl,
            applyUrl: j.applyUrl,
            postedAt: j.publishedAt,
            descriptionText: (j.descriptionPlain ?? htmlToText(j.descriptionHtml ?? "")).slice(0, MAX_DESC),
          })),
      };
    }
    url = `https://api.lever.co/v0/postings/${encodeURIComponent(board.slug)}?mode=json`;
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000), cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = (await r.json()) as LeverJob[];
    trace?.addFetch({ step: "ATS board", url, provider: "lever", ok: true });
    return {
      board,
      ok: true,
      fetchedAt,
      postings: d.map((j) => ({
        provider: "lever",
        companySlug: board.slug,
        company: titleCase(board.slug),
        externalId: j.id,
        title: j.text.trim(),
        location: j.categories?.allLocations?.join("; ") || j.categories?.location || "",
        remote: j.workplaceType === "remote" || /remote/i.test(j.categories?.location ?? ""),
        url: j.hostedUrl,
        applyUrl: j.applyUrl,
        postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : undefined,
        descriptionText: (j.descriptionPlain ?? "").slice(0, MAX_DESC),
      })),
    };
  } catch (e) {
    trace?.addFetch({ step: "ATS board", url, provider: board.provider, ok: false });
    return { board, ok: false, fetchedAt, postings: [], error: String((e as Error).message) };
  }
}

// Recognise ATS board URLs (e.g. from Tavily results) and return the board.
export function boardFromUrl(u: string): BoardRef | null {
  try {
    const url = new URL(u);
    const seg = url.pathname.split("/").filter(Boolean);
    const h = url.hostname;
    if (/(^|\.)greenhouse\.io$/.test(h)) {
      // boards.greenhouse.io/{slug}/jobs/{id} | job-boards.greenhouse.io/{slug}/jobs/{id} | ?for=slug
      const forParam = url.searchParams.get("for");
      if (forParam) return { provider: "greenhouse", slug: forParam };
      if (seg[0] && seg[0] !== "embed") return { provider: "greenhouse", slug: seg[0] };
    }
    if (h === "jobs.ashbyhq.com" && seg[0]) return { provider: "ashby", slug: seg[0] };
    if ((h === "jobs.lever.co" || h === "jobs.eu.lever.co") && seg[0]) return { provider: "lever", slug: seg[0] };
  } catch {
    /* ignore */
  }
  return null;
}

// Check that the application link still resolves to a live posting.
//   live       2xx on a page that still looks like the job
//   dead       404 / 410, or redirected to a board index or error page
//   unverified bot protection (401/403/429/999), timeouts, network errors:
//              we could not check, which is NOT evidence the job is gone
export type LinkState = "live" | "dead" | "unverified";
export interface LinkCheck {
  ok: boolean;
  state: LinkState;
  status: number;
  finalUrl: string;
}

export function classifyLink(status: number, finalUrl: string): LinkState {
  let lostJob = false;
  try {
    const u = new URL(finalUrl);
    lostJob = /\/jobs\/?$|error=true|\/404\b|[?&]gh_error/.test(u.pathname + u.search);
  } catch {
    /* keep false */
  }
  if (status === 404 || status === 410) return "dead";
  if (status >= 200 && status < 300) return lostJob ? "dead" : "live";
  return "unverified";
}

export async function checkLink(url: string): Promise<LinkCheck> {
  try {
    const r = await fetch(url, { method: "GET", redirect: "follow", headers: UA, signal: AbortSignal.timeout(15_000), cache: "no-store" });
    const finalUrl = r.url || url;
    const state = classifyLink(r.status, finalUrl);
    return { ok: state === "live", state, status: r.status, finalUrl };
  } catch {
    return { ok: false, state: "unverified", status: 0, finalUrl: url };
  }
}

export function postingId(p: Pick<RawPosting, "provider" | "companySlug" | "externalId">) {
  return `${p.provider}-${p.companySlug}-${p.externalId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function toJobPosting(p: RawPosting, now: string, prev?: JobPosting): JobPosting {
  return {
    id: postingId(p),
    provider: p.provider,
    company: p.company,
    companySlug: p.companySlug,
    title: p.title,
    location: p.location,
    remote: p.remote,
    url: p.url,
    applyUrl: p.applyUrl,
    postedAt: p.postedAt,
    updatedAt: p.updatedAt,
    descriptionText: p.descriptionText,
    firstSeenAt: prev?.firstSeenAt ?? now,
    lastSeenAt: now,
    signal: prev?.signal,
    fit: prev?.fit,
  };
}

interface GreenhouseJob {
  id: number;
  title: string;
  company_name?: string;
  absolute_url: string;
  updated_at?: string;
  first_published?: string;
  location?: { name: string };
  content?: string;
}
interface AshbyJob {
  id: string;
  title: string;
  location?: string;
  secondaryLocations?: { location: string }[];
  isRemote?: boolean;
  isListed?: boolean;
  workplaceType?: string;
  publishedAt?: string;
  jobUrl: string;
  applyUrl?: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
}
interface LeverJob {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number;
  workplaceType?: string;
  descriptionPlain?: string;
  categories?: { location?: string; allLocations?: string[] };
}
