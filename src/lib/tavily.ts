import "server-only";
import { config } from "./config";
import type { Trace } from "./trace";

export interface TavilyResult {
  url: string;
  title: string;
  content: string;
  score: number;
  published_date?: string;
}

export const tavilyEnabled = () => !!config.tavilyApiKey;

export async function tavilySearch(
  query: string,
  opts: { includeDomains?: string[]; excludeDomains?: string[]; maxResults?: number; step: string; trace?: Trace },
): Promise<TavilyResult[]> {
  if (!config.tavilyApiKey) return [];
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.tavilyApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: opts.maxResults ?? 15,
      include_domains: opts.includeDomains,
      exclude_domains: opts.excludeDomains,
      topic: "general",
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const ok = r.ok;
  opts.trace?.addFetch({ step: opts.step, url: `tavily:search ${query}`, provider: "tavily", ok });
  if (!ok) throw new Error(`Tavily ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = (await r.json()) as { results: TavilyResult[] };
  return d.results ?? [];
}

export const ATS_DOMAINS = ["boards.greenhouse.io", "job-boards.greenhouse.io", "jobs.ashbyhq.com", "jobs.lever.co"];
