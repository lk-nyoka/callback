import "server-only";
import { createHash } from "crypto";
import { nanoid } from "nanoid";
import { Trace } from "./trace";
import { extractFacts } from "./vault";
import { mutate, saveTrace } from "./workspace";

export async function ingestDocument(filename: string, text: string) {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length < 200) throw new Error("We could not read enough text from that file. If it is a scanned PDF, export it as text first.");
  const trace = new Trace();
  const docId = `doc_${nanoid(8)}`;
  try {
    const { facts, dropped, model } = await extractFacts(docId, clean, trace);
    await mutate((s) => {
      s.documents.push({ id: docId, filename, sha256: createHash("sha256").update(clean).digest("hex"), text: clean, uploadedAt: new Date().toISOString() });
      s.facts.push(...facts);
    }, trace);
    return { documentId: docId, facts: facts.length, dropped, model };
  } catch (e) {
    await saveTrace(trace);
    throw e;
  }
}
