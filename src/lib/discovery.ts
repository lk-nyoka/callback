import "server-only";
import { z } from "zod";
import { boardFromUrl, checkLink, fetchBoard, toJobPosting, type BoardRef, type BoardSnapshot, type RawPosting } from "./ats";
import { chatJson, UNTRUSTED_GUARD } from "./nemotron";
import { hitsDealbreaker, locationMatches, seniorityMatches, titleRelevance } from "./matching";
import { computeSignal } from "./signals";
import { ATS_DOMAINS, tavilyEnabled, tavilySearch, type TavilyResult } from "./tavily";

// Aggregators whose terms forbid automated use, or that only re-post others' listings.
// ATS boards that belong to job aggregators re-posting other companies' roles.
// Their listings are not "the employer's own board", so they are skipped.
export const AGGREGATOR_BOARDS = new Set(["jobgether", "remoterocketship", "himalayas", "jobleads", "talentify", "lensa", "jooble", "dice"]);
const isSkippableBoard = (slug: string) => AGGREGATOR_BOARDS.has(slug.toLowerCase()) || /internal|referral|test|sandbox|demo/i.test(slug);

const EXCLUDED_DOMAINS = [
  "linkedin.com", "indeed.com", "za.indeed.com", "glassdoor.com", "glassdoor.co.za", "ziprecruiter.com", "facebook.com",
  // not job postings, or aggregators of other sites' listings
  "youtube.com", "upwork.com", "fiverr.com", "reddit.com", "quora.com", "medium.com", "simplyhired.com", "za.simplyhired.com",
  "jobgether.com", "remoterocketship.com", "himalayas.app", "jooble.org", "careerjet.co.za", "adzuna.co.za", "talent.com",
];

// Search, category and listing pages are not single postings, whatever a
// model says about them. Checked in code before a result is used.
export function looksLikeSinglePosting(rawUrl: string): boolean {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (EXCLUDED_DOMAINS.some((d) => host === d || host.endsWith("." + d))) return false;
  const path = u.pathname.toLowerCase().replace(/\/+$/, "");
  const segs = path.split("/").filter(Boolean);
  const last = segs[segs.length - 1] ?? "";
  if (/[?&](q|query|keywords?|search|kw|what)=/i.test(u.search)) return false;
  if (/\/(search|hire|browse|categories|category|country|remote-jobs|job-search|jobs-in)(\/|$)/.test(path)) return false;
  if (/(^|-)jobs?(\.\w+)?$/.test(last) || /(^|-)jobs(-|$)/.test(last) || /(^|\/)(kw|lc)-/.test(path)) return false;
  if (!segs.length) return false;
  // Positive evidence of a single posting: an id, a /job/ style path, or a long slug.
  if (segs.some((x) => /\d{4,}/.test(x))) return true;
  if (/\/(job|jobs\/view|vacancy|vacancies|position|posting|opening|careers?\/[^/]+)\/[^/]+/.test(path)) return true;
  return last.split("-").length >= 5;
}

const WebSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int(),
      is_single_job_posting: z.boolean(),
      title: z.string().default(""),
      company: z.string().default(""),
      location: z.string().default(""),
      remote: z.boolean().default(false),
    }),
  ),
});

// Lightning (reasoning off) turns raw search results into structured listings.
async function normaliseWebResults(all: TavilyResult[], trace: Trace): Promise<RawPosting[]> {
  const results = all.filter((r) => looksLikeSinglePosting(r.url));
  if (!results.length) return [];
  try {
    const { data } = await chatJson({
      step: "Normalise web listings",
      tier: "lightning",
      reasoning: false,
      maxTokens: 4000,
      temperature: 0,
      schema: WebSchema,
      trace,
      messages: [
        {
          role: "system",
          content: `For each search result, decide if the page is ONE specific job posting (not a list of jobs, article or company page). If so extract the job title ONLY (no company, location or site name, e.g. "BI Data Analyst"), the hiring company (not the job site), the location as written, and whether it is remote. ${UNTRUSTED_GUARD} Respond JSON only: {"items":[{"index":0,"is_single_job_posting":true,"title":"","company":"","location":"","remote":false}]}`,
        },
        { role: "user", content: results.map((r, i) => `#${i}\nURL: ${r.url}\n<posting>\n${r.title}\n${r.content.slice(0, 700)}\n</posting>`).join("\n\n") },
      ],
    });
    return data.items
      .filter((x) => x.is_single_job_posting && x.title && results[x.index] && looksLikeSinglePosting(results[x.index].url))
      .map((x) => {
        const r = results[x.index];
        const host = new URL(r.url).hostname.replace(/^www\./, "");
        return {
          provider: "web" as const,
          companySlug: host,
          company: x.company || host,
          externalId: Buffer.from(r.url).toString("base64url").slice(-24),
          title: x.title,
          location: x.location,
          remote: x.remote,
          url: r.url,
          applyUrl: r.url,
          postedAt: r.published_date ? new Date(r.published_date).toISOString() : undefined,
          descriptionText: r.content.slice(0, 6000),
        };
      });
  } catch {
    return [];
  }
}
import type { Trace } from "./trace";
import type { JobPosting, SearchIntent } from "./types";

// Employers with public ATS boards that regularly post roles open to
// South Africa / EMEA / unrestricted remote. Tavily adds more at runtime.
export const SEED_BOARDS: BoardRef[] = [
  { provider: "greenhouse", slug: "canonical" },
  { provider: "greenhouse", slug: "gitlab" },
  { provider: "greenhouse", slug: "luno" },
  { provider: "greenhouse", slug: "offerzen" },
  { provider: "greenhouse", slug: "twilio" },
  { provider: "greenhouse", slug: "stripe" },
  { provider: "greenhouse", slug: "airbnb" },
  { provider: "greenhouse", slug: "datadog" },
  { provider: "greenhouse", slug: "discord" },
  { provider: "greenhouse", slug: "elastic" },
  { provider: "greenhouse", slug: "cloudflare" },
  { provider: "greenhouse", slug: "mongodb" },
  { provider: "ashby", slug: "ramp" },
];

const DAY = 86_400_000;

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

export interface DiscoveryResult {
  jobs: JobPosting[];
  boardsChecked: number;
  boardsFailed: string[];
  postingsScanned: number;
  tavilyUsed: boolean;
  tavilyBoards: number;
}

export async function discover(intent: SearchIntent, previous: JobPosting[], trace: Trace, limit = 25): Promise<DiscoveryResult> {
  const now = new Date().toISOString();
  const boards = new Map<string, BoardRef>(SEED_BOARDS.map((b) => [`${b.provider}:${b.slug}`, b]));
  const independentByTitle = new Map<string, string>();
  let tavilyBoards = 0;
  let webPostings: RawPosting[] = [];

  // Tavily: find more employer boards hosting matching roles.
  if (tavilyEnabled()) {
    const places = intent.locations.filter((l) => !/remote/i.test(l));
    const sa = places.some((p) => /johannesburg|joburg|cape town|pretoria|durban|gauteng|south africa|sandton/i.test(p));
    const where = [...places, ...(sa ? ["South Africa"] : [])];
    const role = `"${intent.role}"`;
    // A few targeted queries: employer boards near the user, and remote roles open to their region.
    const atsQueries = [
      `${role} jobs ${where.join(" OR ") || "remote"}`,
      ...(intent.remoteOk ? [`${role} remote ${sa ? "Africa OR EMEA OR worldwide" : "worldwide"}`] : []),
    ];
    const q = atsQueries[0];
    try {
      for (const aq of atsQueries) {
        const results = await tavilySearch(aq, { includeDomains: ATS_DOMAINS, maxResults: 20, step: "Discover employer boards", trace });
        for (const r of results) {
          const b = boardFromUrl(r.url);
          if (b && !isSkippableBoard(b.slug) && !boards.has(`${b.provider}:${b.slug}`)) {
            boards.set(`${b.provider}:${b.slug}`, b);
            tavilyBoards++;
          }
        }
      }
      // Employer careers pages and local job sites. Used as listings in their
      // own right (weaker evidence) and as independent confirmation.
      const web = await tavilySearch(`${q} careers apply`, { excludeDomains: [...ATS_DOMAINS, ...EXCLUDED_DOMAINS], maxResults: 20, step: "Find roles on careers pages", trace });
      for (const r of web) independentByTitle.set(r.title.toLowerCase(), r.url);
      webPostings = await normaliseWebResults(web, trace);
    } catch {
      /* Tavily failure degrades to seed boards */
    }
  }

  const snapshots: BoardSnapshot[] = await pool([...boards.values()], 6, (b) => fetchBoard(b, trace));
  const prevById = new Map(previous.map((j) => [j.id, j]));
  const candidates: { job: JobPosting; rel: number; snap: BoardSnapshot | null }[] = [];
  let scanned = 0;

  for (const snap of snapshots) {
    if (!snap.ok) continue;
    for (const p of snap.postings) {
      scanned++;
      const rel = titleRelevance(p.title, intent);
      if (rel <= 0) continue;
      if (!seniorityMatches(p.title, intent.seniority)) continue;
      if (!locationMatches(p.location, p.remote, intent).ok) continue;
      if (hitsDealbreaker(`${p.title} ${p.location} ${p.descriptionText}`, intent.dealbreakers)) continue;
      const job = toJobPosting(p, now, prevById.get(postingIdOf(p)));
      candidates.push({ job, rel, snap });
    }
  }

  // Web listings found by Tavily (not on a public ATS feed).
  const atsKeys = new Set(candidates.map((c) => `${c.job.company}|${c.job.title}`.toLowerCase()));
  for (const p of webPostings) {
    scanned++;
    if (atsKeys.has(`${p.company}|${p.title}`.toLowerCase())) continue;
    const rel = titleRelevance(p.title, intent);
    if (rel <= 0 || !seniorityMatches(p.title, intent.seniority)) continue;
    if (!locationMatches(p.location, p.remote, intent).ok) continue;
    if (hitsDealbreaker(`${p.title} ${p.location} ${p.descriptionText}`, intent.dealbreakers)) continue;
    candidates.push({ job: toJobPosting(p, now, prevById.get(postingIdOf(p))), rel: rel - 1, snap: null });
  }

  candidates.sort((a, b) => b.rel - a.rel || recency(b.job) - recency(a.job));
  // One listing per company + title (employers often post a role per city).
  const seenRole = new Set<string>();
  const unique = candidates.filter((c) => {
    const k = `${c.job.company}|${c.job.title}`.toLowerCase().replace(/\s+/g, " ");
    if (seenRole.has(k)) return false;
    seenRole.add(k);
    return true;
  });
  const top = unique.slice(0, limit);

  // Evidence for each kept listing.
  await pool(top, 6, async (c) => {
    const link = await checkLink(c.job.applyUrl ?? c.job.url);
    trace.addFetch({ step: "Check application link", url: c.job.applyUrl ?? c.job.url, provider: "http", ok: link.ok });
    const since = Date.parse(now) - 30 * DAY;
    const others = c.snap
      ? c.snap.postings.filter((p) => postingIdOf(p) !== c.job.id && [p.postedAt, p.updatedAt].some((d) => d && Date.parse(d) >= since)).length
      : null;
    const indep = c.snap
      ? [...independentByTitle.entries()].find(([t]) => t.includes(c.job.title.toLowerCase()) && t.includes(c.job.company.toLowerCase()))?.[1]
      : null;
    c.job.signal = computeSignal({
      now,
      provider: c.job.provider,
      boardUrl: c.snap ? boardPublicUrl(c.snap.board) : undefined,
      onBoardNow: c.snap ? true : null,
      postedAt: c.job.postedAt,
      updatedAt: c.job.updatedAt,
      link,
      otherRolesUpdatedLast30d: others,
      independentSourceUrl: indep ?? null,
      historyDays: Math.floor((Date.parse(now) - Date.parse(c.job.firstSeenAt)) / DAY),
    });
  });

  return {
    jobs: top.map((c) => c.job),
    boardsChecked: snapshots.length,
    boardsFailed: snapshots.filter((s) => !s.ok).map((s) => s.board.slug),
    postingsScanned: scanned,
    tavilyUsed: tavilyEnabled(),
    tavilyBoards,
  };
}

// Re-check one listing: is it still on the employer's board, and does the link work?
export async function recheck(job: JobPosting, trace: Trace): Promise<JobPosting> {
  const now = new Date().toISOString();
  const board: BoardRef | null = job.provider === "web" ? null : { provider: job.provider, slug: job.companySlug };
  let onBoard: boolean | null = null;
  let others: number | null = null;
  let updated = job;
  if (board) {
    const snap = await fetchBoard(board, trace, true);
    if (snap.ok) {
      const p = snap.postings.find((x) => postingIdOf(x) === job.id);
      onBoard = !!p;
      if (p) updated = { ...toJobPosting(p, now, job) };
      const since = Date.parse(now) - 30 * DAY;
      others = snap.postings.filter((x) => postingIdOf(x) !== job.id && [x.postedAt, x.updatedAt].some((d) => d && Date.parse(d) >= since)).length;
    }
  }
  const link = await checkLink(updated.applyUrl ?? updated.url);
  trace.addFetch({ step: "Re-check application link", url: updated.applyUrl ?? updated.url, provider: "http", ok: link.ok });
  updated.signal = computeSignal({
    now,
    provider: updated.provider,
    boardUrl: board ? boardPublicUrl(board) : undefined,
    onBoardNow: onBoard,
    postedAt: updated.postedAt,
    updatedAt: updated.updatedAt,
    link,
    otherRolesUpdatedLast30d: others,
    historyDays: Math.floor((Date.parse(now) - Date.parse(updated.firstSeenAt)) / DAY),
  });
  return updated;
}

function postingIdOf(p: { provider: string; companySlug: string; externalId: string }) {
  return `${p.provider}-${p.companySlug}-${p.externalId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function recency(j: JobPosting) {
  return Date.parse(j.updatedAt ?? j.postedAt ?? "1970-01-01");
}

export function boardPublicUrl(b: BoardRef) {
  if (b.provider === "greenhouse") return `https://job-boards.greenhouse.io/${b.slug}`;
  if (b.provider === "ashby") return `https://jobs.ashbyhq.com/${b.slug}`;
  return `https://jobs.lever.co/${b.slug}`;
}
