import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { ingestDocument } from "@/lib/ingest";
import { jsonError } from "@/lib/workspace";

export const maxDuration = 120;

// Loads the synthetic sample CV and runs the real extraction pipeline on it.
export async function POST() {
  try {
    const text = await fs.readFile(path.join(process.cwd(), "data/demo/thandi-mokoena-cv.txt"), "utf8");
    return NextResponse.json(await ingestDocument("thandi-mokoena-cv.txt (sample)", text));
  } catch (e) {
    return jsonError(e);
  }
}
