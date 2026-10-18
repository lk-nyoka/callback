import { NextResponse } from "next/server";
import { recheck } from "@/lib/discovery";
import { Trace } from "@/lib/trace";
import { getWorkspace, jsonError, mutate, saveTrace } from "@/lib/workspace";

export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const trace = new Trace();
  try {
    const { id } = await params;
    const s = await getWorkspace();
    const job = s.jobs.find((j) => j.id === id);
    if (!job) return jsonError("Job not found", 404);
    const updated = await recheck(job, trace);
    await mutate((w) => {
      const i = w.jobs.findIndex((j) => j.id === id);
      if (i >= 0) w.jobs[i] = { ...w.jobs[i], ...updated };
    }, trace);
    return NextResponse.json({ signal: updated.signal });
  } catch (e) {
    await saveTrace(trace);
    return jsonError(e);
  }
}
