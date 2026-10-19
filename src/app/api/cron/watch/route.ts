import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { runSearch } from "@/lib/pipeline";
import { listWorkspaces, loadWorkspace, updateWorkspace, type WorkspaceState } from "@/lib/store";
import { Trace } from "@/lib/trace";

export const maxDuration = 300;

const INACTIVE_DAYS = 14;
const BUDGET_MS = 240_000; // stop starting new work well before the 300 s limit
const CONCURRENCY = 2;

function lastActive(s: WorkspaceState): number {
  const times = [s.createdAt, ...s.modelCalls.slice(-5).map((c) => c.createdAt), ...s.applications.map((a) => a.updatedAt)];
  return Math.max(...times.map((t) => Date.parse(t) || 0));
}

function lastWatched(s: WorkspaceState): number {
  return Date.parse(s.watchRuns[s.watchRuns.length - 1]?.at ?? "") || 0;
}

// Overnight watch. Triggered daily by Vercel Cron (vercel.json) or GitHub
// Actions with `Authorization: Bearer $CRON_SECRET`. For each active workspace
// with a saved search it re-runs discovery, hiring signals and fit, and
// records what changed. Least-recently-watched first, within a time budget.
export async function GET(req: Request) {
  if (!config.cronSecret || req.headers.get("authorization") !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const started = Date.now();
  const now = Date.now();
  const all = await Promise.all((await listWorkspaces()).map((id) => loadWorkspace(id)));
  const eligible = all
    .filter((s) => s.intent && s.facts.filter((f) => f.status === "user_confirmed").length >= 3)
    .filter((s) => now - lastActive(s) < INACTIVE_DAYS * 86_400_000)
    .sort((a, b) => lastWatched(a) - lastWatched(b));

  const report: { id: string; newJobs?: number; changed?: number; error?: string }[] = [];
  const skipped: string[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < eligible.length) {
        const s = eligible[next++];
        if (Date.now() - started > BUDGET_MS) {
          skipped.push(s.id.slice(0, 6));
          continue;
        }
        const trace = new Trace();
        try {
          const r = await updateWorkspace(s.id, async (w) => {
            const before = new Map(w.jobs.map((j) => [j.id, j.signal?.status]));
            const res = await runSearch(w, trace, { markNew: true });
            const changed = w.jobs.filter((j) => before.has(j.id) && before.get(j.id) !== j.signal?.status).length;
            w.watchRuns.push({ at: new Date().toISOString(), newJobs: res.newJobs, changed });
            w.watchRuns = w.watchRuns.slice(-30);
            w.modelCalls.push(...trace.calls);
            w.sourceFetches.push(...trace.fetches);
            return { newJobs: res.newJobs, changed };
          });
          report.push({ id: s.id.slice(0, 6), ...r });
        } catch (e) {
          report.push({ id: s.id.slice(0, 6), error: (e as Error).message.slice(0, 200) });
        }
      }
    }),
  );
  return NextResponse.json({
    ranAt: new Date().toISOString(),
    seconds: Math.round((Date.now() - started) / 1000),
    eligible: eligible.length,
    inactiveSkipped: all.length - eligible.length,
    processed: report,
    deferredToNextRun: skipped,
  });
}
