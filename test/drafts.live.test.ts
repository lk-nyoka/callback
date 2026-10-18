// Real-draft evaluation: generate packs with Nemotron 3 Super for live roles and
// record every line with its ledger verdict. Truth labels are added by a human
// in evals/real-drafts.json ("true": true | false), then summarised.
import { it } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { extractFacts } from "@/lib/vault";
import { discover } from "@/lib/discovery";
import { composePack } from "@/lib/composer";
import { Trace } from "@/lib/trace";

it("real drafts", async () => {
  const t = new Trace();
  const { facts } = await extractFacts("d1", readFileSync("data/demo/thandi-mokoena-cv.txt", "utf8"), t);
  facts.forEach((f) => (f.status = "user_confirmed"));
  const intent = { role: "Data Analyst", keywords: [], locations: ["Johannesburg", "Remote"], remoteOk: true, seniority: "junior" as const, dealbreakers: [] };
  const { jobs } = await discover(intent, [], t, 12);
  const picked = jobs.slice(0, Number(process.env.N ?? 6));
  const rows: Record<string, unknown>[] = [];
  for (const job of picked) {
    const { bullets, noteLines } = await composePack(job, facts, t);
    for (const [kind, lines] of [["bullet", bullets], ["note", noteLines]] as const)
      for (const l of lines)
        rows.push({ job: `${job.title} @ ${job.company}`, kind, text: l.text, cited: l.factIds.map((id) => facts.find((f) => f.id === id)?.text), status: l.verdict.status, reasons: l.verdict.reasons, true: null });
  }
  const by = (s: string) => rows.filter((r) => r.status === s).length;
  const summary = { generatedAt: new Date().toISOString(), packs: picked.length, lines: rows.length, pass: by("pass"), needs_confirmation: by("needs_confirmation"), blocked: by("blocked"), truthLabelled: 0 };
  writeFileSync("evals/real-drafts.json", JSON.stringify({ summary, howToLabel: "Set each row's \"true\" to true or false, then run: node scripts/summarise-real-drafts.mjs", rows }, null, 2));
  console.log(JSON.stringify(summary));
  const tok = t.calls.reduce((a, c) => [a[0] + c.inputTokens, a[1] + c.outputTokens], [0, 0]);
  console.log("tokens", tok, "calls", t.calls.length);
});
