import { NextResponse } from "next/server";
import { scoreFit } from "@/lib/fit";
import { Trace } from "@/lib/trace";
import { getWorkspace, jsonError, mutate, saveTrace } from "@/lib/workspace";

export const maxDuration = 120;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const trace = new Trace();
  try {
    const { id } = await params;
    const s = await getWorkspace();
    const job = s.jobs.find((j) => j.id === id);
    if (!job) return jsonError("Job not found", 404);
    const fit = await scoreFit(job, s.facts, trace);
    await mutate((w) => {
      const j = w.jobs.find((x) => x.id === id);
      if (j) j.fit = fit;
    }, trace);
    return NextResponse.json({ fit });
  } catch (e) {
    await saveTrace(trace);
    return jsonError(e);
  }
}
