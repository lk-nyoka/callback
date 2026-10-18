import { it, expect } from "vitest";
import { readFileSync } from "fs";
import { extractFacts } from "@/lib/vault";
import { Trace } from "@/lib/trace";

it("extracts facts from the demo CV", async () => {
  const text = readFileSync("data/demo/thandi-mokoena-cv.txt", "utf8");
  const t = new Trace();
  const r = await extractFacts("d1", text, t);
  console.log("model", r.model, "facts", r.facts.length, "dropped", r.dropped);
  for (const f of r.facts) console.log(`- [${f.type}] ${f.text}\n    quote: ${f.evidenceQuote}`);
  console.log(t.calls);
  expect(r.facts.length).toBeGreaterThan(10);
});
