import "server-only";
import { createHash } from "crypto";
import { nanoid } from "nanoid";
import { Trace } from "./trace";
import { extractFacts } from "./vault";
import { mutate, saveTrace } from "./workspace";

export async function ingestDocument(filename: string, text: string, trace = new Trace()) {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length < 200) {
    await saveTrace(trace);
    throw new Error("We could only read a little text from that file. A CV usually has more: try a clearer photo, a PDF, or paste the text instead.");
  }
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
