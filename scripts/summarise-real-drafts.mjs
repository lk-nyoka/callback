// After hand-labelling evals/real-drafts.json, print the real-draft confusion table.
import { readFileSync } from "fs";
const { rows } = JSON.parse(readFileSync("evals/real-drafts.json", "utf8"));
const labelled = rows.filter((r) => r.true !== null);
const cell = (truth, status) => labelled.filter((r) => r.true === truth && r.status === status).length;
console.log(`labelled ${labelled.length} of ${rows.length} lines`);
for (const truth of [true, false]) console.log(`${truth ? "true lines " : "untrue lines"}  pass ${cell(truth, "pass")}  check ${cell(truth, "needs_confirmation")}  blocked ${cell(truth, "blocked")}`);
