// Save the jobs from your most recent local workspace as the pinned demo
// shortlist: node scripts/capture-fixture.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
const dir = ".data";
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => `${dir}/${f}`).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
if (!files.length) throw new Error("No local workspace found in .data/");
const ws = JSON.parse(readFileSync(files[0], "utf8"));
const jobs = ws.jobs.map(({ fit, deepAnalysis, isNew, pinnedAt, ...j }) => j);
writeFileSync("data/demo/shortlist.json", JSON.stringify({ capturedAt: new Date().toISOString(), jobs }, null, 1));
console.log(`Pinned ${jobs.length} jobs from ${files[0]}`);
