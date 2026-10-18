import { NextResponse } from "next/server";
import { ingestDocument } from "@/lib/ingest";
import { parseDocument } from "@/lib/vault";
import { jsonError } from "@/lib/workspace";

export const maxDuration = 120;

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("No file uploaded", 400);
    if (file.size > MAX_BYTES) return jsonError("File is larger than 5 MB", 400);
    const text = await parseDocument(file.name, new Uint8Array(await file.arrayBuffer()));
    return NextResponse.json(await ingestDocument(file.name, text));
  } catch (e) {
    return jsonError(e, 400);
  }
}
