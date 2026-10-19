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
    "https://www.erieri.com/salary/job/data-analyst/south-africa/johannesburg",
    "https://www.tiktok.com/@data.with.clarence/video/7615520898753285393",
    "https://www.glassdoor.ca/Job/johannesburg-data-analyst-jobs-SRCH_IL.0,12_IC2638926_KO13,25.htm",
    "https://www.emeris.ac.za/blogs/data-analyst-career-path",
  ];
  const single = [
    "https://rporecruitment.co.za/job/data-analyst",
    "https://careers.iconplc.com/job/clinical-data-analyst-in-south-africa-johannesburg",
    "https://jobs.experian.com/job/analytics-analyst-in-johannesburg-south-africa-12345",
    "https://www.careers24.com/jobs/adverts/2140912-data-analyst-johannesburg/",
    "https://jobs.gauteng.gov.za/public/ViewJob.aspx?u=Ri+aNsDPLRm%2FvKICqAlE0Q%3D%3D",
    "https://reunert.ci.hr/applicant/index.php?controller=Listings&method=view&listingid=9daf79a4-d5aa",
    "https://absa.wd3.myworkdayjobs.com/en-GB/ABSAcareersite/job/Johannesburg/BI-Data-Analyst_R-12345",
    "https://careers.bic.com/BIC/job/Johannesburg-Sales-Data-Analyst-2042/1371015255",
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
