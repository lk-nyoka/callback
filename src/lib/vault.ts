import "server-only";
import { z } from "zod";
import { nanoid } from "nanoid";
import { chatJson, UNTRUSTED_GUARD } from "./nemotron";
import type { Trace } from "./trace";
import type { CareerFact, FactType } from "./types";

// Career Vault extraction. Lightning proposes facts with exact evidence quotes;
// code then verifies each quote exists in the source document. Facts whose
// quote cannot be located are dropped, so the Vault never contains a fact
// without a real source span.

const OneFact = z.object({
      text: z.string().min(3).max(400),
      type: z
        .string()
        .transform((t) => (["experience", "skill", "education", "certification", "project", "achievement"].includes(t.toLowerCase()) ? t.toLowerCase() : "skill")),
  evidence_quote: z.string().min(3).max(600),
});
// One malformed fact must not fail the whole extraction.
const FactSchema = z.object({
  facts: z.array(z.unknown()).transform((arr) => arr.flatMap((x) => {
    const r = OneFact.safeParse(x);
    return r.success ? [r.data] : [];
  })),
});

const SYSTEM = `You extract a candidate's career facts from their CV for a fact-checked job-application tool.
${UNTRUSTED_GUARD}

Rules:
- Each fact is ONE atomic, verifiable statement in CV style, e.g. "Built a Python ETL pipeline for 50,000 monthly transactions".
- For every role, add one "experience" fact with the exact title, organisation and dates (e.g. "Data Analyst Intern at Acme Ltd, Jan 2025 - Dec 2025").
- For each responsibility or achievement under a role, write the fact with its context first, e.g. "At Acme Ltd (Data Analyst Intern), built a Power BI dashboard ...", and quote the bullet itself as evidence.
- Add one "education" fact per qualification (degree, institution, years).
- Preserve every number, date, tool, employer and title EXACTLY as written. Never round, infer, upgrade or add anything.
- Do not merge separate achievements. Do not invent seniority ("led", "managed") unless the CV says so.
- evidence_quote MUST be copied verbatim from the document (a contiguous span, 5-60 words) that proves the fact.
- Types: experience (roles, responsibilities), project, achievement (awards, measurable results), skill (one tool or competency per fact; group a skills list into a few facts, each listing the tools verbatim), education, certification.
- Skip contact details, ID numbers, references, and personal data such as age, marital status, religion or health.
- Return 10-60 facts.

Respond with JSON only: {"facts":[{"text":"...","type":"experience","evidence_quote":"..."}]}`;

const ws = (s: string) => s.replace(/\s+/g, " ").trim();

// Find a quote in the document, tolerant to whitespace and case differences.
export function locateQuote(doc: string, quote: string): { start: number; exact: string } | null {
  const direct = doc.indexOf(quote);
  if (direct >= 0) return { start: direct, exact: quote };
  // Build a whitespace-collapsed, lowercased view with an index map back to the original.
  const map: number[] = [];
  let flat = "";
  let prevSpace = false;
  for (let i = 0; i < doc.length; i++) {
    const ch = doc[i];
    if (/\s/.test(ch)) {
      if (!prevSpace) {
        flat += " ";
        map.push(i);
      }
      prevSpace = true;
    } else {
      flat += ch.toLowerCase();
      map.push(i);
      prevSpace = false;
    }
  }
  const q = ws(quote).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-");
  const flatNorm = flat.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-");
  const idx = flatNorm.indexOf(q);
  if (idx < 0) return null;
  const start = map[idx];
  const end = map[idx + q.length - 1] + 1;
  return { start, exact: doc.slice(start, end) };
}

export async function extractFacts(docId: string, text: string, trace: Trace): Promise<{ facts: CareerFact[]; dropped: number; model: string }> {
  const { data, model } = await chatJson({
    step: "Extract Career Vault facts",
    tier: "lightning",
    schema: FactSchema,
    maxTokens: 12000,
    temperature: 0.1,
    reasoning: false,
    trace,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `<document>\n${text.slice(0, 60000)}\n</document>` },
    ],
  });
  const now = new Date().toISOString();
  const facts: CareerFact[] = [];
  let dropped = 0;
  const seen = new Set<string>();
  for (const f of data.facts) {
    const loc = locateQuote(text, f.evidence_quote);
    const key = ws(f.text).toLowerCase();
    if (!loc || seen.has(key)) {
      dropped++;
      continue;
    }
    seen.add(key);
    facts.push({
      id: `fct_${nanoid(8)}`,
      text: ws(f.text),
      type: f.type as FactType,
      documentId: docId,
      evidenceQuote: ws(loc.exact),
      quoteStart: loc.start,
      status: "extracted",
      userEdited: false,
      createdAt: now,
    });
  }
  return { facts, dropped, model };
}

export async function parseDocument(filename: string, bytes: Uint8Array): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: false });
    return (Array.isArray(text) ? text.join("\n\n") : text).replace(/\u0000/g, "");
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return new TextDecoder().decode(bytes);
  }
  throw new Error("Unsupported file type. Upload a PDF or TXT file.");
}
