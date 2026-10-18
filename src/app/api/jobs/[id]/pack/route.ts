import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { composePack } from "@/lib/composer";
import { Trace } from "@/lib/trace";
import { getWorkspace, jsonError, mutate, saveTrace } from "@/lib/workspace";

export const maxDuration = 180;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const trace = new Trace();
  try {
    const { id } = await params;
    const s = await getWorkspace();
    const job = s.jobs.find((j) => j.id === id);
    if (!job) return jsonError("Job not found", 404);
    if (s.facts.filter((f) => f.status === "user_confirmed").length < 3) return jsonError("Confirm your Vault facts first.", 400);
    const { bullets, noteLines, model } = await composePack(job, s.facts, trace);
    const now = new Date().toISOString();
    const app = await mutate((w) => {
      // one live draft per job: replace an unapproved draft
      w.applications = w.applications.filter((a) => !(a.jobId === id && a.status === "drafted"));
      const a = { id: `app_${nanoid(8)}`, jobId: id, bullets, noteLines, model, status: "drafted" as const, createdAt: now, updatedAt: now, history: [{ status: "drafted" as const, at: now }] };
      w.applications.push(a);
      return a;
    }, trace);
    return NextResponse.json(app);
  } catch (e) {
    await saveTrace(trace);
    return jsonError(e);
  }
}
