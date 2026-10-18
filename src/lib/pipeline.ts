import "server-only";
import { discover } from "./discovery";
import { scoreFit } from "./fit";
import type { WorkspaceState } from "./store";
import type { Trace } from "./trace";
import type { JobPosting } from "./types";

const FIT_TOP_N = 8;

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

// Discovery -> hiring signals -> fit for the top roles. Used by the
// interactive "Find roles" action and by the overnight watch.
export async function runSearch(s: WorkspaceState, trace: Trace, opts: { markNew?: boolean } = {}) {
  if (!s.intent) throw new Error("Set what you're looking for first.");
  const confirmed = s.facts.filter((f) => f.status === "user_confirmed");
  if (confirmed.length < 3) throw new Error("Confirm at least 3 Vault facts first.");

  const result = await discover(s.intent, s.jobs, trace, 25);
  const known = new Set(s.jobs.map((j) => j.id));

  // Fit only where it is not already scored (saves credits on re-runs).
  const needFit = result.jobs.filter((j) => !j.fit && j.signal?.status !== "low").slice(0, FIT_TOP_N);
  await pool(needFit, 4, async (j) => {
    try {
      j.fit = await scoreFit(j, s.facts, trace);
    } catch {
      /* leave unscored; UI offers "Score fit" */
    }
  });

  const newJobs = result.jobs.filter((j) => !known.has(j.id));
  if (opts.markNew) newJobs.forEach((j) => (j.isNew = true));

  // Merge: fresh results first; keep older listings that have an application.
  const appJobIds = new Set(s.applications.map((a) => a.jobId));
  const freshIds = new Set(result.jobs.map((j) => j.id));
  const kept = s.jobs.filter((j) => !freshIds.has(j.id) && appJobIds.has(j.id));
  s.jobs = [...result.jobs, ...kept];
  return { ...result, newJobs: newJobs.length, jobs: undefined as unknown as JobPosting[] };
}
