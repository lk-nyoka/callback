import { describe, expect, it } from "vitest";
import { computeSignal } from "./signals";
import { boardFromUrl, htmlToText } from "./ats";

const now = "2026-10-19T00:00:00Z";
const base = { now, provider: "greenhouse", historyDays: 0 } as const;

describe("computeSignal", () => {
  it("strong: on board, fresh, link live, active board", () => {
    const r = computeSignal({ ...base, onBoardNow: true, postedAt: "2026-10-10T00:00:00Z", link: { ok: true, status: 200, finalUrl: "x" }, otherRolesUpdatedLast30d: 12 });
    expect(r.status).toBe("strong");
  });
  it("low: gone from board and link dead", () => {
    const r = computeSignal({ ...base, onBoardNow: false, postedAt: "2026-01-01T00:00:00Z", link: { ok: false, status: 404, finalUrl: "x" }, otherRolesUpdatedLast30d: 0 });
    expect(r.status).toBe("low");
  });
  it("mixed: on board but very old and link dead overrides strong", () => {
    const r = computeSignal({ ...base, onBoardNow: true, postedAt: "2026-10-10T00:00:00Z", link: { ok: false, status: 404, finalUrl: "x" }, otherRolesUpdatedLast30d: 10 });
    expect(r.status).toBe("mixed");
  });
  it("mixed: on board but stale", () => {
    const r = computeSignal({ ...base, onBoardNow: true, postedAt: "2026-03-01T00:00:00Z", updatedAt: "2026-03-02T00:00:00Z", link: { ok: true, status: 200, finalUrl: "x" } });
    expect(r.status).toBe("mixed");
  });
  it("insufficient: nothing observable", () => {
    const r = computeSignal({ ...base, provider: "web", onBoardNow: null });
    expect(r.status).toBe("insufficient");
  });
  it("is honest about repost history needing time", () => {
    const r = computeSignal({ ...base, onBoardNow: true });
    expect(r.observations.find((o) => o.key === "repost_history")?.direction).toBe("unavailable");
  });
  it("does not let a recent edit make an old posting look fresh", () => {
    const r = computeSignal({ ...base, onBoardNow: true, postedAt: "2021-05-12T00:00:00Z", updatedAt: "2026-10-15T00:00:00Z", link: { ok: true, status: 200, finalUrl: "x" }, otherRolesUpdatedLast30d: 20 });
    expect(r.observations.find((o) => o.key === "freshness")?.direction).toBe("negative");
    expect(r.status).toBe("mixed");
  });
});

describe("ats helpers", () => {
  it("parses board urls", () => {
    expect(boardFromUrl("https://job-boards.greenhouse.io/luno/jobs/8203782")).toEqual({ provider: "greenhouse", slug: "luno" });
    expect(boardFromUrl("https://boards.greenhouse.io/embed/job_app?for=stripe&token=1")).toEqual({ provider: "greenhouse", slug: "stripe" });
    expect(boardFromUrl("https://jobs.ashbyhq.com/ramp/abc")).toEqual({ provider: "ashby", slug: "ramp" });
    expect(boardFromUrl("https://jobs.lever.co/toptal/xyz")).toEqual({ provider: "lever", slug: "toptal" });
    expect(boardFromUrl("https://www.linkedin.com/jobs/view/1")).toBeNull();
  });
  it("converts escaped html", () => {
    expect(htmlToText("&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;&lt;li&gt;SQL&lt;/li&gt;")).toContain("Hello");
  });
});

import { locationMatches, seniorityMatches, titleRelevance } from "./matching";
describe("matching", () => {
  const intent = { role: "Data Analyst", keywords: [], locations: ["Johannesburg", "Remote"], remoteOk: true, seniority: "junior" as const, dealbreakers: [] };
  it("accepts EMEA home-based for a Joburg user", () => expect(locationMatches("Home based - EMEA", true, intent).ok).toBe(true));
  it("rejects US-only remote", () => expect(locationMatches("Remote, United States", true, intent).ok).toBe(false));
  it("accepts unrestricted remote", () => expect(locationMatches("Remote", true, intent).ok).toBe(true));
  it("accepts Cape Town", () => expect(locationMatches("Cape Town, Western Cape, South Africa", false, intent).ok).toBe(true));
  it("rejects London onsite", () => expect(locationMatches("London, UK", false, intent).ok).toBe(false));
  it("filters senior titles for juniors", () => {
    expect(seniorityMatches("Senior Data Analyst", "junior")).toBe(false);
    expect(seniorityMatches("Data Analyst", "junior")).toBe(true);
  });
  it("excludes other job families", () => {
    expect(titleRelevance("Software Engineer - Data Infrastructure", intent)).toBe(0);
    expect(titleRelevance("Technical & Reporting Accountant", intent)).toBe(0);
    expect(titleRelevance("Sales Operations Analyst", intent)).toBe(0);
  });
  it("scores relevance", () => {
    expect(titleRelevance("Data Analyst, Growth", intent)).toBeGreaterThan(titleRelevance("Account Executive", intent));
    expect(titleRelevance("Account Executive", intent)).toBe(0);
  });
});

describe("matching: remote country restrictions", () => {
  const intent = { role: "Data Analyst", keywords: [], locations: ["Johannesburg", "Remote"], remoteOk: true, seniority: "junior" as const, dealbreakers: [] };
  it("rejects a remote role limited to Austria", () => expect(locationMatches("Austria", true, intent).ok).toBe(false));
  it("accepts a multi-country list that includes Johannesburg", () =>
    expect(locationMatches("Mexico - Monterrey; South Africa - Johannesburg; Chile - Santiago", true, intent).ok).toBe(true));
  it("keeps roles with no stated location", () => expect(locationMatches("", false, intent).ok).toBe(true));
});

describe("matching: title precision", () => {
  const intent = { role: "Data Analyst", keywords: [], locations: ["Johannesburg"], remoteOk: true, seniority: "junior" as const, dealbreakers: [] };
  it("drops head-noun-only matches", () => {
    expect(titleRelevance("Technical Support Analyst (German Speaker)", intent)).toBe(0);
    expect(titleRelevance("Risk Operations Analyst", intent)).toBe(0);
  });
  it("keeps domain matches", () => {
    expect(titleRelevance("People Analytics Intern", intent)).toBeGreaterThan(0);
    expect(titleRelevance("BI Data Analyst", intent)).toBeGreaterThan(0);
    expect(titleRelevance("Junior Data Analyst", intent)).toBeGreaterThan(titleRelevance("People Analytics Intern", intent));
  });
});
