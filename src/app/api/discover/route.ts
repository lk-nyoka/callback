import { NextResponse } from "next/server";
import { runSearch } from "@/lib/pipeline";
import { Trace } from "@/lib/trace";
import { jsonError, mutate, saveTrace } from "@/lib/workspace";

export const maxDuration = 300;

export async function POST() {
  const trace = new Trace();
  try {
    const summary = await mutate((s) => runSearch(s, trace), trace);
    return NextResponse.json(summary);
  } catch (e) {
    await saveTrace(trace);
    return jsonError(e, 400);
  }
}
