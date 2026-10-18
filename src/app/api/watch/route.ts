import { NextResponse } from "next/server";
import { z } from "zod";
import { runSearch } from "@/lib/pipeline";
import { Trace } from "@/lib/trace";
import { jsonError, mutate, saveTrace } from "@/lib/workspace";

export const maxDuration = 300;

const Body = z.object({ action: z.enum(["run", "seen"]) });

// Run this workspace's watch on demand (same code as the scheduled run),
// or clear the "new overnight" markers.
export async function POST(req: Request) {
  const trace = new Trace();
  try {
    const { action } = Body.parse(await req.json());
    if (action === "seen") {
      await mutate((s) => s.jobs.forEach((j) => (j.isNew = false)));
      return NextResponse.json({ ok: true });
    }
    const r = await mutate(async (s) => {
      const before = new Map(s.jobs.map((j) => [j.id, j.signal?.status]));
      const res = await runSearch(s, trace, { markNew: true });
      const changed = s.jobs.filter((j) => before.has(j.id) && before.get(j.id) !== j.signal?.status).length;
      s.watchRuns.push({ at: new Date().toISOString(), newJobs: res.newJobs, changed });
      return { newJobs: res.newJobs, changed };
    }, trace);
    return NextResponse.json(r);
  } catch (e) {
    await saveTrace(trace);
    return jsonError(e, 400);
  }
}
