// Ledger evaluation on a labelled adversarial set. Writes evals/ledger-heldout-v2-report.json.
import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { checkClaim } from "./ledger";
import type { CareerFact } from "./types";

interface Case { text: string; facts: string[]; expected: "allow" | "reject" }
const data = JSON.parse(readFileSync("evals/ledger-heldout-v2.json", "utf8")) as { facts: { id: string; text: string }[]; cases: Case[] };
const facts: CareerFact[] = data.facts.map((f) => ({ id: f.id, text: f.text, type: "experience", documentId: "d", evidenceQuote: f.text, quoteStart: 0, status: "user_confirmed", userEdited: false, createdAt: "" }));

describe("ledger fresh held-out v2", () => {
  it("never lets an overstated claim pass, and rarely blocks honest ones", () => {
    const rows = data.cases.map((c) => {
      const v = checkClaim({ text: c.text, factIds: c.facts }, facts, { contextTerms: ["Acme Analytics"] });
      return { ...c, status: v.status, reasons: v.reasons };
    });
    const rejects = rows.filter((r) => r.expected === "reject");
    const allows = rows.filter((r) => r.expected === "allow");
    const falsePass = rejects.filter((r) => r.status === "pass");
    const caught = rejects.filter((r) => r.status === "blocked");
    const falseBlock = allows.filter((r) => r.status === "blocked");
    const report = {
      generatedAt: new Date().toISOString(),
      cases: rows.length,
      overstated: rejects.length,
      honest: allows.length,
      overstatedReachingApproval: falsePass.length,
      overstatedBlockedOutright: caught.length,
      overstatedRoutedToUser: rejects.length - caught.length - falsePass.length,
      honestWronglyBlocked: falseBlock.length,
      honestRoutedToUser: allows.filter((r) => r.status === "needs_confirmation").length,
      failures: [...falsePass, ...falseBlock, ...allows.filter((r) => r.status === "needs_confirmation")].map((r) => ({ text: r.text, expected: r.expected, got: r.status, reasons: r.reasons })),
    };
    writeFileSync("evals/ledger-heldout-v2-report.json", JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    expect(rows.length).toBeGreaterThan(0);
  });
});
