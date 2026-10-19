import { describe, expect, it } from "vitest";
import { looksLikeSinglePosting } from "./discovery";
import { classifyLink } from "./ats";
import { computeSignal } from "./signals";

describe("looksLikeSinglePosting", () => {
  const listing = [
    "https://www.pnet.co.za/jobs/data-analyst/in-johannesburg",
    "https://www.pnet.co.za/jobs/data-analyst",
    "https://www.careers24.com/jobs/lc-johannesburg/kw-data-analyst",
    "https://www.upwork.com/hire/data-analysts/za",
    "https://za.prosple.com/entry-level-data-analyst-jobs-south-africa",
    "https://e-merge.co.za/data-jobs",
    "https://www.remoterocketship.com/country/africa/jobs/data-analyst",
    "https://jobgether.com/remote-jobs/south-africa/data-analyst",
    "https://www.executiveplacements.com/Jobs/data-analyst-jobs.asp",
    "https://za.simplyhired.com/search?q=remote+data+analyst&l=south+africa",
    "https://www.youtube.com/watch?v=JQmnRjEzoW0",
  ];
  const single = [
    "https://rporecruitment.co.za/job/data-analyst",
    "https://careers.iconplc.com/job/clinical-data-analyst-in-south-africa-johannesburg",
    "https://jobs.experian.com/job/analytics-analyst-in-johannesburg-south-africa-12345",
    "https://www.careers24.com/jobs/adverts/2140912-data-analyst-johannesburg/",
  ];
  for (const u of listing) it(`rejects ${u}`, () => expect(looksLikeSinglePosting(u)).toBe(false));
  for (const u of single) it(`accepts ${u}`, () => expect(looksLikeSinglePosting(u)).toBe(true));
});

describe("link checks", () => {
  it("treats bot protection as unverified, not dead", () => {
    expect(classifyLink(403, "https://x.com/job/1")).toBe("unverified");
    expect(classifyLink(429, "https://x.com/job/1")).toBe("unverified");
    expect(classifyLink(0, "https://x.com/job/1")).toBe("unverified");
  });
  it("treats 404 and board-index redirects as dead", () => {
    expect(classifyLink(404, "https://x.com/job/1")).toBe("dead");
    expect(classifyLink(200, "https://job-boards.greenhouse.io/acme/jobs")).toBe("dead");
  });
  it("does not penalise an unverified link", () => {
    const r = computeSignal({ now: "2026-10-19T00:00:00Z", provider: "web", onBoardNow: null, historyDays: 0, link: { ok: false, state: "unverified", status: 403, finalUrl: "x" } });
    const o = r.observations.find((x) => x.key === "apply_link")!;
    expect(o.direction).toBe("unavailable");
    expect(o.weight).toBe(0);
  });
});
