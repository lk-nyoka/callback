import "server-only";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { loadWorkspace, updateWorkspace, type WorkspaceState } from "./store";
import type { Trace } from "./trace";

export async function workspaceId(): Promise<string> {
  const c = (await cookies()).get("cb_ws")?.value;
  const h = (await headers()).get("x-cb-ws");
  const id = c ?? h;
  if (!id || !/^[a-zA-Z0-9]{8,64}$/.test(id)) throw new Error("No workspace");
  return id;
}

export async function getWorkspace() {
  return loadWorkspace(await workspaceId());
}

export async function mutate<T>(fn: (s: WorkspaceState) => T | Promise<T>, trace?: Trace) {
  return updateWorkspace(await workspaceId(), async (s) => {
    const r = await fn(s);
    if (trace) {
      s.modelCalls.push(...trace.calls);
      s.sourceFetches.push(...trace.fetches);
    }
    return r;
  });
}

// Persist a trace even when the main work failed.
export async function saveTrace(trace: Trace) {
  if (!trace.calls.length && !trace.fetches.length) return;
  await mutate(() => undefined, trace);
  trace.calls = [];
  trace.fetches = [];
}

export function jsonError(e: unknown, status = 500) {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status });
}

// Public projection of the workspace (no raw document text).
export function publicState(s: WorkspaceState) {
  return {
    documents: s.documents.map((d) => ({ id: d.id, filename: d.filename, uploadedAt: d.uploadedAt, chars: d.text.length })),
    facts: s.facts,
    intent: s.intent,
    jobs: s.jobs.map(({ descriptionText, ...j }) => ({ ...j, descriptionPreview: descriptionText.slice(0, 600) })),
    applications: s.applications,
    modelCalls: s.modelCalls.slice(-80),
    sourceFetches: s.sourceFetches.slice(-80),
    watchRuns: s.watchRuns.slice(-10),
  };
}
