import { describe, expect, it } from "vitest";
import { checkLines } from "./composer";
import type { CareerFact, JobPosting, PackBullet } from "./types";

const facts: CareerFact[] = [{ id: "f1", text: "Built automated tests for a Python service.", type: "experience", documentId: "d", evidenceQuote: "Built automated tests for a Python service.", quoteStart: 0, status: "user_confirmed", userEdited: false, createdAt: "" }];
const job = { company: "Acme", title: "QA Analyst" } as JobPosting;

describe("checkLines keeps auditor flags", () => {
  const flagged: PackBullet = { text: "Built automated tests for a Python service.", factIds: ["f1"], verdict: { status: "needs_confirmation", reasons: ["auditor_flag:overstates scope"] } };
  it("keeps the flag when the line is unchanged", () => {
    expect(checkLines([flagged], facts, job, [flagged])[0].verdict.status).toBe("needs_confirmation");
  });
  it("re-evaluates when the text changes", () => {
    expect(checkLines([{ text: "Built tests for a Python service.", factIds: ["f1"] }], facts, job, [flagged])[0].verdict.status).toBe("pass");
  });
  it("re-evaluates when a new fact is cited", () => {
    const more = [...facts, { ...facts[0], id: "f2" }];
    expect(checkLines([{ text: flagged.text, factIds: ["f1", "f2"] }], more, job, [flagged])[0].verdict.status).toBe("pass");
  });
});

import { stripCitationIds } from "./composer";
describe("stripCitationIds", () => {
  it("removes pasted citation ids", () => {
    expect(stripCitationIds("Built a dashboard (fct_JtB8clK9), and wrote SQL (fct_a, fct_b).")).toBe("Built a dashboard, and wrote SQL.");
    expect(stripCitationIds("Presented findings [fct_x1] to managers")).toBe("Presented findings to managers");
  });
});
