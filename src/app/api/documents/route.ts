import { NextResponse } from "next/server";
import { ingestDocument } from "@/lib/ingest";
import { parseDocument } from "@/lib/parse";
import { Trace } from "@/lib/trace";
import { jsonError, saveTrace } from "@/lib/workspace";

export const maxDuration = 300;

// Vercel caps request bodies at 4.5 MB; the browser shrinks photos first.
const MAX_BYTES = 4.4 * 1024 * 1024;
const MAX_PASTE = 60_000;

export async function POST(req: Request) {
  const trace = new Trace();
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = (await req.json()) as { text?: unknown };
      const text = typeof body.text === "string" ? body.text : "";
      if (text.length > MAX_PASTE) return jsonError("That's longer than a CV. Paste up to 60,000 characters.", 400);
      return NextResponse.json(await ingestDocument("Pasted CV text", text, trace));
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("No file uploaded", 400);
    if (file.size === 0) return jsonError("That file is empty.", 400);
    if (file.size > MAX_BYTES) return jsonError("That file is larger than 4.4 MB. Save it as a smaller PDF, or upload a photo instead.", 413);
    const { text, via } = await parseDocument(file.name, new Uint8Array(await file.arrayBuffer()), trace);
    const result = await ingestDocument(file.name || "Uploaded CV", text, trace);
    return NextResponse.json({ ...result, via });
  } catch (e) {
    await saveTrace(trace).catch(() => {});
    return jsonError(e, 400);
  }
}
