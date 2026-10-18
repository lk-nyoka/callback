import "server-only";
import { z } from "zod";
import { chat, chatJson, UNTRUSTED_GUARD } from "./nemotron";
import type { Trace } from "./trace";
import type { CareerFact, FitLevel, FitResult, JobPosting, RequirementCoverage } from "./types";

// Fit = requirement coverage against CONFIRMED Vault facts.
// Super rates each requirement and cites fact IDs; code validates the
// citations and computes the level, so the model cannot inflate fit.

const FitSchema = z.object({
  requirements: z
    .array(
      z.object({
        requirement: z.string(),
        must_have: z.boolean().optional().default(true),
        coverage: z.enum(["met", "partial", "missing"]),
        fact_ids: z.array(z.string()).default([]),
        note: z.string().default(""),
      }),
    )
    .min(1)
    .max(14),
  summary: z.string(),
  strengths: z.array(z.string()).max(5).default([]),
  gaps: z.array(z.string()).max(5).default([]),
});

export function factsBlock(facts: CareerFact[]) {
  return facts.map((f) => `[${f.id}] (${f.type}) ${f.text}`).join("\n");
}

export function computeLevel(reqs: (RequirementCoverage & { mustHave?: boolean })[]): FitLevel {
  const must = reqs.filter((r) => r.mustHave !== false);
  const pool = must.length ? must : reqs;
  const score = pool.reduce((s, r) => s + (r.coverage === "met" ? 1 : r.coverage === "partial" ? 0.5 : 0), 0) / pool.length;
  if (score >= 0.65) return "strong";
  if (score >= 0.35) return "partial";
  return "weak";
}

export async function scoreFit(job: JobPosting, facts: CareerFact[], trace: Trace): Promise<FitResult> {
  const confirmed = facts.filter((f) => f.status === "user_confirmed");
  const ids = new Set(confirmed.map((f) => f.id));
  const { data, model } = await chatJson({
    step: `Fit: ${job.title} @ ${job.company}`,
    tier: "super",
    schema: FitSchema,
    maxTokens: 10000,
    temperature: 0.1,
    trace,
    messages: [
      {
        role: "system",
        content: `You assess how well a candidate's VERIFIED facts cover a job's requirements. ${UNTRUSTED_GUARD}
Steps: extract the 5-10 most important requirements from the posting (mark must_have true for stated requirements, false for "nice to have"). For each, rate coverage using ONLY the candidate facts: "met" (a fact clearly shows it), "partial" (related or weaker evidence), "missing". Cite the fact IDs you relied on. Be strict and honest: never assume skills that are not in the facts.
summary: one plain sentence. strengths/gaps: short phrases.
Respond with JSON only: {"requirements":[{"requirement":"","must_have":true,"coverage":"met","fact_ids":["fct_x"],"note":""}],"summary":"","strengths":[],"gaps":[]}`,
      },
      {
        role: "user",
        content: `CANDIDATE FACTS:\n${factsBlock(confirmed)}\n\n<posting>\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\n\n${job.descriptionText.slice(0, 7000)}\n</posting>`,
      },
    ],
  });
  const requirements = data.requirements.map((r) => {
    const valid = r.fact_ids.filter((id) => ids.has(id));
    // A "met" without a valid citation is not met.
    const coverage = (r.coverage !== "missing" && valid.length === 0 ? "missing" : r.coverage) as RequirementCoverage["coverage"];
    return { requirement: r.requirement, coverage, factIds: valid, note: r.note, mustHave: r.must_have };
  });
  return {
    level: computeLevel(requirements),
    summary: data.summary,
    requirements: requirements.map((r) => ({ requirement: r.requirement, coverage: r.coverage, factIds: r.factIds, note: r.note })),
    strengths: data.strengths,
    gaps: data.gaps,
    model,
    scoredAt: new Date().toISOString(),
  };
}

// Ultra on demand: honest positioning advice for one role.
export async function deepAnalysis(job: JobPosting, facts: CareerFact[], trace: Trace): Promise<{ markdown: string; model: string }> {
  const confirmed = facts.filter((f) => f.status === "user_confirmed");
  const r = await chat({
    step: `Deep analysis: ${job.title}`,
    tier: "ultra",
    maxTokens: 16000,
    temperature: 0.3,
    trace,
    messages: [
      {
        role: "system",
        content: `You are a blunt, honest career strategist. ${UNTRUSTED_GUARD} Using ONLY the candidate's verified facts, explain: (1) the 3 strongest honest angles for this application, citing fact IDs in brackets; (2) the real gaps a recruiter will notice and how to address each truthfully (e.g. a small project, a course, how to frame transferable work), never by exaggerating; (3) one question to ask the employer. Plain markdown, under 300 words.`,
      },
      { role: "user", content: `CANDIDATE FACTS:\n${factsBlock(confirmed)}\n\n<posting>\n${job.title} at ${job.company} (${job.location})\n\n${job.descriptionText.slice(0, 7000)}\n</posting>` },
    ],
  });
  return { markdown: r.content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim(), model: r.model };
}
