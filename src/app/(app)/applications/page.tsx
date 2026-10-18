"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorNote } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { api, timeAgo } from "@/lib/client";
import type { ApplicationStatus } from "@/lib/types";

const LABEL: Record<ApplicationStatus, string> = {
  drafted: "Draft",
  approved: "Approved, not applied",
  applied: "Applied",
  replied: "Replied",
  interview: "Interview",
  rejected: "Rejected",
  no_response: "No response",
};
const NEXT: ApplicationStatus[] = ["applied", "replied", "interview", "rejected", "no_response"];

export default function ApplicationsPage() {
  const { state, refresh } = useWorkspace();
  const [err, setErr] = useState("");
  if (!state) return <p className="text-muted">Loading…</p>;
  const apps = [...state.applications].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const jobs = new Map(state.jobs.map((j) => [j.id, j]));
  const outcomes = {
    applied: apps.filter((a) => a.status !== "drafted" && a.status !== "approved").length,
    replies: apps.filter((a) => ["replied", "interview"].includes(a.status)).length,
  };

  async function update(id: string, status: ApplicationStatus) {
    setErr("");
    try {
      await api(`/api/applications/${id}`, { method: "PATCH", json: { status } });
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-semibold tracking-tight">Applications</h1>
      <p className="mt-2 text-muted">
        {outcomes.applied} sent, {outcomes.replies} with a reply or interview. You record outcomes here; Callback never guesses them.
      </p>
      <div className="mt-4">
        <ErrorNote>{err}</ErrorNote>
      </div>
      {apps.length === 0 ? (
        <div className="mt-8 rounded-xl border border-rule bg-surface p-8">
          <p className="font-semibold">No applications yet</p>
          <p className="mt-1 text-muted">Open a role and draft a pack. It appears here once drafted.</p>
          <Link href="/jobs" className="btn btn-primary mt-4">
            See your jobs
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface">
          {apps.map((a) => {
            const j = jobs.get(a.jobId);
            const flagged = [...a.bullets, ...a.noteLines].filter((l) => l.verdict.status !== "pass").length;
            return (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <Link href={`/applications/${a.id}`} className="font-semibold hover:underline">
                    {j?.title ?? "Role"}
                  </Link>
                  <p className="text-sm text-muted">
                    {j?.company}, updated {timeAgo(a.updatedAt)}
                    {a.status === "drafted" && flagged > 0 && <span className="text-caution">, {flagged} line{flagged > 1 ? "s" : ""} to fix</span>}
                  </p>
                </div>
                {a.status === "drafted" || a.status === "approved" ? (
                  <Link href={`/applications/${a.id}`} className="btn btn-quiet btn-sm">
                    {LABEL[a.status]}: open
                  </Link>
                ) : (
                  <label className="text-sm">
                    <span className="sr-only">Status</span>
                    <select className="field py-1.5" value={a.status} onChange={(e) => update(a.id, e.target.value as ApplicationStatus)}>
                      {NEXT.map((s) => (
                        <option key={s} value={s}>
                          {LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
