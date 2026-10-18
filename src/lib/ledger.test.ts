import { describe, expect, it } from "vitest";
import { checkClaim, extractQuantities, extractTerms } from "./ledger";
import type { CareerFact } from "./types";

function fact(id: string, text: string, quote = text, status: CareerFact["status"] = "user_confirmed"): CareerFact {
  return { id, text, type: "experience", documentId: "d1", evidenceQuote: quote, quoteStart: 0, status, userEdited: false, createdAt: "" };
}

const F = [
  fact("f1", "Built automated tests for a Python service."),
  fact("f2", "Built a Python ETL pipeline processing 50,000 monthly transactions using Airflow and PostgreSQL."),
  fact("f3", "Led a team of 3 students in a university robotics project."),
  fact("f4", "Improved dashboard load time by 40% using Power BI query folding."),
  fact("f5", "Completed the ISTQB Certified Tester Foundation Level (CTFL) in 2024."),
  fact("f6", "Analysed customer churn data with pandas and scikit-learn.", undefined, "extracted"),
  fact("f7", "Founder of Vuka Runners, a community running club with 120 members."),
];

const ok = (text: string, ids: string[]) => expect(checkClaim({ text, factIds: ids }, F).status).toBe("pass");
const blocked = (text: string, ids: string[]) => expect(checkClaim({ text, factIds: ids }, F).status).toBe("blocked");

describe("README worked example", () => {
  it("blocks the escalated enterprise claim", () => {
    const v = checkClaim({ text: "Led enterprise-wide test-automation strategy across multiple teams.", factIds: ["f1"] }, F);
    expect(v.status).toBe("blocked");
    expect(v.reasons).toEqual(expect.arrayContaining(["escalated_claim:led", "unsupported_scope:enterprise-wide", "unsupported_scope:multiple teams"]));
  });
  it("passes the honest rewrite", () => ok("Built automated tests for a Python service.", ["f1"]));
});

describe("citations", () => {
  it("blocks when a cited fact is unconfirmed", () => blocked("Analysed customer churn data with pandas.", ["f6"]));
  it("blocks when a cited fact does not exist", () => blocked("Built tests.", ["nope"]));
});

describe("numbers", () => {
  it("passes numbers in different formats", () => {
    ok("Built a Python ETL pipeline handling 50k monthly transactions", ["f2"]);
    ok("Built a Python ETL pipeline handling 50000 monthly transactions", ["f2"]);
    ok("Improved dashboard load time by 40 percent using Power BI", ["f4"]);
  });
  it("blocks inflated numbers", () => {
    blocked("Built a Python ETL pipeline processing 500,000 monthly transactions", ["f2"]);
    blocked("Improved dashboard load time by 60% using Power BI", ["f4"]);
  });
  it("blocks number words used to dodge the check", () => blocked("Led a team of five students in a robotics project", ["f3"]));
  it("allows number words that match", () => ok("Led a team of three students in a university robotics project", ["f3"]));
  it("blocks an invented year", () => blocked("Completed the ISTQB CTFL in 2022", ["f5"]));
  it("does not treat S3 or Python3 as quantities", () => {
    expect(extractQuantities("Stored files in S3 with Python3").length).toBe(0);
  });
  it("blocks quantity words", () => blocked("Doubled dashboard performance using Power BI", ["f4"]));
});

describe("seniority and scope", () => {
  it("allows led when the fact says led", () => ok("Led a team of 3 students on a university robotics project", ["f3"]));
  it("blocks managed when fact only says led? (different family)", () =>
    blocked("Managed a team of 3 students in a university robotics project", ["f3"]));
  it("blocks architected", () => blocked("Architected a Python ETL pipeline", ["f2"]));
  it("blocks senior title inflation", () => blocked("Senior engineer who built automated tests for a Python service", ["f1"]));
  it("does not flag 'my own' as ownership", () => ok("Built automated tests for a Python service on my own", ["f1"]));
  it("does not flag 'found that' as founding", () => {
    const v = checkClaim({ text: "Built automated tests for a Python service and found that coverage improved", factIds: ["f1"] }, F);
    expect(v.reasons.some((r) => r.startsWith("escalated_claim"))).toBe(false);
  });
  it("routes new substantive content to the user", () => {
    const v = checkClaim({ text: "Built automated tests for a Python service that improved coverage and reduced outages", factIds: ["f1"] }, F);
    expect(v.status).toBe("needs_confirmation");
  });
  it("allows founder when supported", () => ok("Founded Vuka Runners, a community running club", ["f7"]));
  it("blocks scope words", () => blocked("Built a production Python ETL pipeline at scale", ["f2"]));
  it("blocks superlatives", () => blocked("Built an award-winning Python ETL pipeline", ["f2"]));
});

describe("named terms", () => {
  it("blocks an invented tool", () => blocked("Built automated tests for a Python service using Kubernetes and AWS", ["f1"]));
  it("passes supported tools in any casing", () => ok("Built a python ETL pipeline using airflow and postgresql", ["f2"]));
  it("matches Power BI vs PowerBI", () => ok("Improved dashboard load time by 40% in PowerBI", ["f4"]));
  it("routes a close paraphrase with one new term to the user", () => {
    const v = checkClaim({ text: "Built automated tests for a Python service with pytest", factIds: ["f1"] }, F);
    expect(v.status).toBe("needs_confirmation");
    expect(v.reasons).toEqual(["unmatched_term:pytest"]);
  });
  it("extracts tech-looking terms", () => {
    expect(extractTerms("Built APIs in Node.js and C# on AWS with TypeScript")).toEqual(
      expect.arrayContaining(["APIs", "Node.js", "C#", "AWS", "TypeScript"]),
    );
  });
  it("does not treat the first word of a sentence as a name", () => {
    expect(extractTerms("Built tests. Designed dashboards.")).toEqual([]);
  });
});

describe("uncited sentences (cover note connective text)", () => {
  it("passes generic connective text", () =>
    expect(checkClaim({ text: "I would welcome the chance to discuss how I can help.", factIds: [] }, F).status).toBe("pass"));
  it("allows company and role names as context", () =>
    expect(
      checkClaim({ text: "I am applying for the Data Analyst role at Acme Analytics.", factIds: [] }, F, { contextTerms: ["Acme Analytics", "Data Analyst"] }).status,
    ).toBe("pass"));
  it("blocks uncited experience claims", () =>
    expect(checkClaim({ text: "I have five years of experience with Snowflake.", factIds: [] }, F, { contextTerms: ["Acme"] }).status).toBe("blocked"));
  it("handles curly possessives of the target company", () =>
    expect(checkClaim({ text: "I look forward to contributing to Canonical\u2019s mission.", factIds: [] }, F, { contextTerms: ["Canonical"] }).status).toBe("pass"));
  it("allows the target company in a cited line", () =>
    expect(checkClaim({ text: "Built automated tests for a Python service, skills I would bring to Canonical.", factIds: ["f1"] }, F, { contextTerms: ["Canonical"] }).status).toBe("pass"));
  it("blocks a claim of having worked at the target company", () =>
    expect(checkClaim({ text: "Built automated tests for a Python service while I worked at Canonical.", factIds: ["f1"] }, F, { contextTerms: ["Canonical"] }).status).not.toBe("pass"));
  it("blocks uncited leadership claims", () =>
    expect(checkClaim({ text: "I have led many data teams.", factIds: [] }, F).status).toBe("blocked"));
});

describe("real-draft regressions", () => {
  it("does not treat number words as novel content", () =>
    expect(checkClaim({ text: "Led a team of three students in a university robotics project", factIds: ["f3"] }, F).status).toBe("pass"));
  it("splits terms on em dashes", () => expect(extractTerms("Certified—demonstrates skill")).not.toContain("Certified—demonstrates"));
});
