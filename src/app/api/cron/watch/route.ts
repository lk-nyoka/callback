import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { runSearch } from "@/lib/pipeline";
import { listWorkspaces, loadWorkspace, updateWorkspace } from "@/lib/store";
import { Trace } from "@/lib/trace";
import { STATUS_LABEL } from "@/lib/signals";

export const maxDuration = 300;

// Overnight watch. Triggered by a scheduler (Vercel Cron / GitHub Actions)
// with `Authorization: Bearer $CRON_SECRET`. For every workspace with a saved
// search it re-runs discovery, hiring signals and fit, and records what changed.
export async function GET(req: Request) {
  if (!config.cronSecret || req.headers.get("authorization") !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const ids = await listWorkspaces();
  const report: { id: string; newJobs?: number; changed?: number; error?: string }[] = [];
  for (const id of ids) {
    const s = await loadWorkspace(id);
    if (!s.intent || s.facts.filter((f) => f.status === "user_confirmed").length < 3) continue;
    const trace = new Trace();
    try {
      const r = await updateWorkspace(id, async (w) => {
        const before = new Map(w.jobs.map((j) => [j.id, j.signal?.status]));
        const res = await runSearch(w, trace, { markNew: true });
        const changed = w.jobs.filter((j) => before.has(j.id) && before.get(j.id) !== j.signal?.status).length;
        w.watchRuns.push({ at: new Date().toISOString(), newJobs: res.newJobs, changed });
        w.modelCalls.push(...trace.calls);
        w.sourceFetches.push(...trace.fetches);
        return { newJobs: res.newJobs, changed };
      });
      report.push({ id: id.slice(0, 6), ...r });
    } catch (e) {
      report.push({ id: id.slice(0, 6), error: (e as Error).message });
    }
  }
  return NextResponse.json({ ranAt: new Date().toISOString(), workspaces: report, labels: STATUS_LABEL });
}
