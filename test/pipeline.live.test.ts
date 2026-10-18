import { it } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { extractFacts } from "@/lib/vault";
import { discover } from "@/lib/discovery";
import { scoreFit } from "@/lib/fit";
import { composePack } from "@/lib/composer";
import { Trace } from "@/lib/trace";

it("pipeline", async () => {
  const t = new Trace();
  const text = readFileSync("data/demo/thandi-mokoena-cv.txt", "utf8");
  const { facts } = await extractFacts("d1", text, t);
  facts.forEach((f) => (f.status = "user_confirmed"));
  const intent = { role: "Data Analyst", keywords: ["analytics", "insights"], locations: ["Johannesburg", "Remote"], remoteOk: true, seniority: "junior" as const, dealbreakers: [] };
  const d = await discover(intent, [], t, 15);
  console.log("scanned", d.postingsScanned, "boards", d.boardsChecked, "failed", d.boardsFailed, "kept", d.jobs.length);
  for (const j of d.jobs) console.log(`${j.signal?.status.padEnd(12)} ${j.company} | ${j.title} | ${j.location} | ${j.postedAt?.slice(0,10)} | ${j.signal?.observations.filter(o=>o.direction!=='unavailable').map(o=>o.key+':'+o.direction[0]).join(',')}`);
  const job = d.jobs[0];
  const t0 = Date.now();
  const fit = await scoreFit(job, facts, t);
  console.log("FIT", Date.now() - t0, "ms", fit.level, fit.summary, JSON.stringify(fit.requirements, null, 0).slice(0, 1500));
  const t1 = Date.now();
  const pack = await composePack(job, facts, t);
  console.log("PACK", Date.now() - t1, "ms");
  for (const b of [...pack.bullets, ...pack.noteLines]) console.log(b.verdict.status.padEnd(18), b.text, b.factIds, b.verdict.reasons);
  console.log(t.calls.map((c) => `${c.step} | ${c.model} | ${c.inputTokens}/${c.outputTokens} | ${c.latencyMs}ms | ${c.ok}`).join("\n"));
  writeFileSync("/tmp/claude-0/-home-claude/7185c2f3-4f14-5ea6-934a-ec66335bce7e/scratchpad/pipeline.json", JSON.stringify({ facts, jobs: d.jobs }, null, 1));
});
