import { NextResponse } from "next/server";
import { z } from "zod";
import { checkLines } from "@/lib/composer";
import { explainReason } from "@/lib/ledger";
import { getWorkspace, jsonError } from "@/lib/workspace";

const Body = z.object({ jobId: z.string(), text: z.string().min(1).max(600), factIds: z.array(z.string()).max(12) });

// Live check as the user types. Pure code: no model call.
export async function POST(req: Request) {
  try {
    const b = Body.parse(await req.json());
    const s = await getWorkspace();
    const job = s.jobs.find((j) => j.id === b.jobId);
    if (!job) return jsonError("Job not found", 404);
    const [line] = checkLines([{ text: b.text, factIds: b.factIds }], s.facts, job);
    return NextResponse.json({ ...line, explanations: line.verdict.reasons.map(explainReason) });
  } catch (e) {
    return jsonError(e, 400);
  }
}
