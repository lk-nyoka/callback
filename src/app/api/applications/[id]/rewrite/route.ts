import { NextResponse } from "next/server";
import { z } from "zod";
import { rewriteHonestly } from "@/lib/composer";
import { Trace } from "@/lib/trace";
import { jsonError, mutate, saveTrace, getWorkspace } from "@/lib/workspace";

export const maxDuration = 120;

const Body = z.object({ kind: z.enum(["bullets", "noteLines"]), index: z.number().int().min(0) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const trace = new Trace();
  try {
    const { id } = await params;
    const b = Body.parse(await req.json());
    const s = await getWorkspace();
    const a = s.applications.find((x) => x.id === id);
    const job = a && s.jobs.find((j) => j.id === a.jobId);
    const line = a?.[b.kind][b.index];
    if (!a || !job || !line) return jsonError("Line not found", 404);
    if (a.status !== "drafted") return jsonError("This pack is approved and locked.", 400);
    const fixed = await rewriteHonestly(line, s.facts, job, trace);
    const app = await mutate((w) => {
      const x = w.applications.find((y) => y.id === id)!;
      x[b.kind][b.index] = fixed;
      x.updatedAt = new Date().toISOString();
      return x;
    }, trace);
    return NextResponse.json(app);
  } catch (e) {
    await saveTrace(trace);
    return jsonError(e);
  }
}
