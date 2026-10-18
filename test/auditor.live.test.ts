import { it } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { checkClaim } from "@/lib/ledger";
import { audit } from "@/lib/composer";
import { Trace } from "@/lib/trace";
import type { CareerFact, PackBullet } from "@/lib/types";

for (const set of (process.env.SETS ?? "ledger-cases,ledger-heldout,ledger-heldout-v2").split(",")) {
  it(`full stack on ${set}`, async () => {
    const d = JSON.parse(readFileSync(`evals/${set}.json`, "utf8"));
    const facts: CareerFact[] = d.facts.map((f: { id: string; text: string }) => ({ id: f.id, text: f.text, type: "experience", documentId: "d", evidenceQuote: f.text, quoteStart: 0, status: "user_confirmed", userEdited: false, createdAt: "" }));
    const lines: (PackBullet & { expected: string })[] = d.cases.map((c: { text: string; facts: string[]; expected: string }) => ({ text: c.text, factIds: c.facts, expected: c.expected, verdict: checkClaim({ text: c.text, factIds: c.facts }, facts) }));
    const codeOnly = lines.map((l) => l.verdict.status);
    const t = new Trace();
    await audit(lines, facts, t);
    const rej = lines.filter((l) => l.expected === "reject"), ok = lines.filter((l) => l.expected === "allow");
    const r = {
      set, cases: lines.length,
      codeOnly_overstatedReachingApproval: rej.filter((l) => codeOnly[lines.indexOf(l)] === "pass").length,
      fullStack_overstatedReachingApproval: rej.filter((l) => l.verdict.status === "pass").length,
      fullStack_honestBlocked: ok.filter((l) => l.verdict.status === "blocked").length,
      fullStack_honestRoutedToUser: ok.filter((l) => l.verdict.status === "needs_confirmation").length,
      honest: ok.length, overstated: rej.length,
      stillPassing: rej.filter((l) => l.verdict.status === "pass").map((l) => l.text),
      auditorFlaggedHonest: ok.filter((l) => l.verdict.reasons.some((x) => x.startsWith("auditor"))).map((l) => l.text + " :: " + l.verdict.reasons),
      calls: t.calls.map((c) => `${c.model} ${c.inputTokens}/${c.outputTokens} ${c.latencyMs}ms ${c.ok}`),
    };
    console.log(JSON.stringify(r, null, 1));
    writeFileSync(`evals/${set}-fullstack-report.json`, JSON.stringify(r, null, 2));
  });
}
