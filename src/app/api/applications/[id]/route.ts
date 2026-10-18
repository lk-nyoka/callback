import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkLines } from "@/lib/composer";
import { config } from "@/lib/config";
import { jsonError, mutate } from "@/lib/workspace";
import type { ApplicationStatus } from "@/lib/types";

const Line = z.object({ text: z.string().min(1).max(600), factIds: z.array(z.string()).max(12) });
const Body = z.object({
  bullets: z.array(Line).max(12).optional(),
  noteLines: z.array(Line).max(12).optional(),
  status: z.enum(["drafted", "approved", "applied", "replied", "interview", "rejected", "no_response"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = Body.parse(await req.json());
    const app = await mutate((s) => {
      const a = s.applications.find((x) => x.id === id);
      if (!a) throw new Error("Application not found");
      const job = s.jobs.find((j) => j.id === a.jobId);
      if (!job) throw new Error("Job not found");
      // An approved pack is frozen: approval is bound to that exact text.
      if ((b.bullets || b.noteLines) && a.status !== "drafted") throw new Error("This pack is approved and locked. Draft a new pack to change it.");
      // Edits are always re-checked by the ledger on the server.
      if (b.bullets) a.bullets = checkLines(b.bullets, s.facts, job, a.bullets);
      if (b.noteLines) a.noteLines = checkLines(b.noteLines, s.facts, job, a.noteLines);
      if (b.status && b.status !== a.status) {
        let packHash: string | undefined;
        if (b.status === "approved") {
          // Re-check against the Vault as it is now (a cited fact may have been removed since drafting).
          a.bullets = checkLines(a.bullets, s.facts, job, a.bullets);
          a.noteLines = checkLines(a.noteLines, s.facts, job, a.noteLines);
          const lines = [...a.bullets, ...a.noteLines];
          if (lines.some((l) => l.verdict.status !== "pass")) throw new Error("Resolve every flagged line before approving.");
          packHash = createHash("sha256").update(JSON.stringify(lines.map((l) => [l.text, l.factIds]))).digest("hex");
          a.approvedHash = packHash;
          const today = new Date().toISOString().slice(0, 10);
          const approvedToday = s.applications.filter((x) => x.history.some((h) => h.status === "approved" && h.at.startsWith(today))).length;
          if (approvedToday >= config.dailyApplicationCap) throw new Error(`Daily cap of ${config.dailyApplicationCap} applications reached. Fewer, better applications.`);
        }
        if (a.status === "drafted" && b.status !== "approved") throw new Error("Approve the pack first.");
        a.status = b.status as ApplicationStatus;
        a.history.push({ status: a.status, at: new Date().toISOString(), ...(packHash ? { packHash } : {}) });
      }
      a.updatedAt = new Date().toISOString();
      return a;
    });
    return NextResponse.json(app);
  } catch (e) {
    return jsonError(e, 400);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await mutate((s) => {
      s.applications = s.applications.filter((a) => a.id !== id);
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e, 400);
  }
}
