import "server-only";
import { z } from "zod";
import { chatJson, UNTRUSTED_GUARD } from "./nemotron";
import { factsBlock } from "./fit";
import { checkClaim } from "./ledger";
import type { Trace } from "./trace";
import type { CareerFact, JobPosting, LedgerVerdict, PackBullet } from "./types";

// Composer: Super drafts recruiter-ready bullets and a short note, each
// citing fact IDs. The Claims Ledger (code) checks every line. A Lightning
// auditor can then make passing lines stricter, never more permissive.

const DraftSchema = z.object({
  bullets: z.array(z.object({ text: z.string().min(3), fact_ids: z.array(z.string()).default([]) })).min(1).max(10),
  note: z.array(z.object({ text: z.string().min(1), fact_ids: z.array(z.string()).default([]) })).min(1).max(10),
});

const AuditSchema = z.object({
  results: z.array(z.object({ index: z.number().int(), overstates: z.boolean(), reason: z.string().default("") })).default([]),
});

export function contextTermsFor(job: JobPosting) {
  return [job.company, job.title, ...job.title.split(/[,\-–()/]+/)].map((s) => s.trim()).filter(Boolean);
}

// Re-checking is pure code, but auditor flags are model output we can't
// recompute for free. A flag stays attached to the exact line it was raised
// on (same text, same citations) so re-checks can never quietly drop it.
export function checkLines(lines: { text: string; factIds: string[] }[], facts: CareerFact[], job: JobPosting, previous: PackBullet[] = []): PackBullet[] {
  const ctx = contextTermsFor(job);
  const flagged = new Map(
    previous
      .filter((p) => p.verdict.reasons.some((r) => r.startsWith("auditor_flag")))
      .map((p) => [lineKey(p), p.verdict] as const),
  );
  return lines.map((l) => {
    const verdict = checkClaim(l, facts, { contextTerms: ctx });
    const prior = flagged.get(lineKey(l));
    if (verdict.status === "pass" && prior) return { text: l.text, factIds: l.factIds, verdict: prior };
    return { text: l.text, factIds: l.factIds, verdict };
  });
}

function lineKey(l: { text: string; factIds: string[] }) {
  return `${l.text.trim()}|${[...l.factIds].sort().join(",")}`;
}

export function combineNote(lines: PackBullet[]): { text: string; verdict: LedgerVerdict } {
  const text = lines.map((l) => l.text.trim()).join(" ");
  const blocked = lines.filter((l) => l.verdict.status === "blocked");
  const review = lines.filter((l) => l.verdict.status === "needs_confirmation");
  if (blocked.length) return { text, verdict: { status: "blocked", reasons: blocked.flatMap((b) => b.verdict.reasons) } };
  if (review.length) return { text, verdict: { status: "needs_confirmation", reasons: review.flatMap((b) => b.verdict.reasons) } };
  return { text, verdict: { status: "pass", reasons: [] } };
}

export async function composePack(job: JobPosting, facts: CareerFact[], trace: Trace) {
  const confirmed = facts.filter((f) => f.status === "user_confirmed");
  const { data, model } = await chatJson({
    step: `Draft application: ${job.title}`,
    tier: "super",
    schema: DraftSchema,
    maxTokens: 12000,
    temperature: 0.4,
    trace,
    messages: [
      {
        role: "system",
        content: `You write tailored, recruiter-ready CV bullets and a short application note. ${UNTRUSTED_GUARD}
Use ONLY the candidate's verified facts. Every bullet and every note sentence that states anything about the candidate must cite the fact IDs it relies on in fact_ids. Write 5-7 bullets ordered by relevance to the posting, strong action verbs, specific, under 30 words each. Keep numbers, tools and titles exactly as in the facts.
The note is 4-6 sentences addressed to the hiring team: why this role, the 2-3 most relevant proofs, a close. Connective sentences that make no claim about the candidate may have empty fact_ids.
Respond with JSON only: {"bullets":[{"text":"","fact_ids":["fct_x"]}],"note":[{"text":"","fact_ids":[]}]}`,
      },
      {
        role: "user",
        content: `CANDIDATE FACTS:\n${factsBlock(confirmed)}\n\n<posting>\n${job.title} at ${job.company} (${job.location})\n\n${job.descriptionText.slice(0, 6000)}\n</posting>`,
      },
    ],
  });
  const bullets = checkLines(data.bullets.map((b) => ({ text: b.text, factIds: b.fact_ids })), facts, job);
  const noteLines = checkLines(data.note.map((b) => ({ text: b.text, factIds: b.fact_ids })), facts, job);
  await audit(bullets, facts, trace);
  return { bullets, noteLines, model };
}

// Second pass: a model may flag subtle overstatement among lines the code
// passed. Flags can only downgrade pass -> needs_confirmation.
export async function audit(lines: PackBullet[], facts: CareerFact[], trace: Trace) {
  const byId = new Map(facts.map((f) => [f.id, f]));
  const passing = lines.map((l, i) => ({ l, i })).filter((x) => x.l.verdict.status === "pass" && x.l.factIds.length);
  if (!passing.length) return;
  try {
    const { data } = await chatJson({
      step: "Audit claims (stricter only)",
      tier: "lightning",
      schema: AuditSchema,
      maxTokens: 6000,
      temperature: 0,
      reasoning: false,
      trace,
      messages: [
        {
          role: "system",
          content: `You are a strict fact-checker. For each claim, compare it with its cited source facts. Set overstates=true ONLY if the claim implies more responsibility, impact, scope, frequency or certainty than the facts show. Rewording that preserves meaning is overstates=false. Return one result per claim. Respond JSON only: {"results":[{"index":0,"overstates":false,"reason":"short reason"}]}`,
        },
        {
          role: "user",
          content: passing
            .map((x) => `#${x.i}\nCLAIM: ${x.l.text}\nSOURCE FACTS: ${x.l.factIds.map((id) => byId.get(id)?.text).join(" | ")}`)
            .join("\n\n"),
        },
      ],
    });
    for (const f of data.results) {
      if (!f.overstates) continue;
      const line = lines[f.index];
      if (line && line.verdict.status === "pass") {
        line.verdict = { status: "needs_confirmation", reasons: [`auditor_flag:${f.reason.slice(0, 140)}`] };
      }
    }
  } catch {
    /* auditor is advisory; failure leaves code verdicts unchanged */
  }
}

const RewriteSchema = z.object({ text: z.string().min(3), fact_ids: z.array(z.string()).default([]) });

export async function rewriteHonestly(line: PackBullet, facts: CareerFact[], job: JobPosting, trace: Trace): Promise<PackBullet> {
  const confirmed = facts.filter((f) => f.status === "user_confirmed");
  const { data } = await chatJson({
    step: "Rewrite blocked claim honestly",
    tier: "super",
    schema: RewriteSchema,
    maxTokens: 6000,
    temperature: 0.2,
    trace,
    messages: [
      {
        role: "system",
        content: `Rewrite a CV bullet so it is fully supported by the candidate's facts. Remove or correct anything the checker flagged. Keep it compelling but never add numbers, tools, scope or seniority not present in the cited facts. Respond JSON only: {"text":"","fact_ids":[]}`,
      },
      {
        role: "user",
        content: `FACTS:\n${factsBlock(confirmed)}\n\nBULLET: ${line.text}\nCITED: ${line.factIds.join(", ") || "none"}\nCHECKER REASONS: ${line.verdict.reasons.join("; ")}\nTARGET ROLE: ${job.title} at ${job.company}`,
      },
    ],
  });
  const [checked] = checkLines([{ text: data.text, factIds: data.fact_ids }], facts, job);
  return checked;
}
