// Save the jobs from your most recent local workspace as the pinned demo
// shortlist: node scripts/capture-fixture.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
const dir = ".data";
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => `${dir}/${f}`).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
if (!files.length) throw new Error("No local workspace found in .data/");
const ws = JSON.parse(readFileSync(files[0], "utf8"));
// Drop per-user fields (fit, deep analysis, "new" markers) from the snapshot.
const DROP = ["fit", "deepAnalysis", "isNew", "pinnedAt"];
const jobs = ws.jobs.map((j) => Object.fromEntries(Object.entries(j).filter(([k]) => !DROP.includes(k))));
writeFileSync("data/demo/shortlist.json", JSON.stringify({ capturedAt: new Date().toISOString(), jobs }, null, 1));
console.log(`Pinned ${jobs.length} jobs from ${files[0]}`);
