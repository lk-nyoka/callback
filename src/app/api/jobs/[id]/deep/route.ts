import { NextResponse } from "next/server";
import { deepAnalysis } from "@/lib/fit";
import { Trace } from "@/lib/trace";
import { getWorkspace, jsonError, mutate, saveTrace } from "@/lib/workspace";

export const maxDuration = 300;

// Nemotron 3 Ultra, only when the user asks for it.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const trace = new Trace();
  try {
    const { id } = await params;
    const s = await getWorkspace();
    const job = s.jobs.find((j) => j.id === id);
    if (!job) return jsonError("Job not found", 404);
    const r = await deepAnalysis(job, s.facts, trace);
    const deep = { ...r, at: new Date().toISOString() };
    await mutate((w) => {
      const j = w.jobs.find((x) => x.id === id);
      if (j) j.deepAnalysis = deep;
    }, trace);
    return NextResponse.json({ deepAnalysis: deep, fallback: trace.calls.some((c) => c.ok && c.fallbackUsed) });
  } catch (e) {
    await saveTrace(trace);
    return jsonError(e);
  }
}
