"use client";

import Link from "next/link";
import { useState } from "react";
import { IconChevron } from "@/components/icons";
import { ErrorNote, Monogram, SectionTitle } from "@/components/ui";
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
const TONE: Record<ApplicationStatus, string> = {
  drafted: "bg-white/5 text-ink-2 ring-rule",
  approved: "bg-accent/15 text-[#b7aeff] ring-accent/30",
  applied: "bg-accent-2/15 text-[#9cc6ff] ring-accent-2/30",
  replied: "bg-verified/15 text-verified ring-verified/30",
  interview: "bg-verified/20 text-verified ring-verified/40",
  rejected: "bg-blocked/10 text-blocked ring-blocked/30",
  no_response: "bg-white/5 text-muted ring-rule",
};
type Tab = "active" | "applied" | "closed";
const TAB_OF = (s: ApplicationStatus): Tab => (s === "drafted" || s === "approved" ? "active" : s === "rejected" || s === "no_response" ? "closed" : "applied");
const NEXT: ApplicationStatus[] = ["applied", "replied", "interview", "rejected", "no_response"];

export default function ApplicationsPage() {
  const { state, refresh } = useWorkspace();
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("active");
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

  const tabCount = (t: Tab) => apps.filter((a) => TAB_OF(a.status) === t).length;
  const shown = apps.filter((a) => TAB_OF(a.status) === tab);
  return (
    <div className="mx-auto max-w-4xl">
      <SectionTitle title="Applications" sub="You record outcomes here; Callback never guesses them." />
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          ["Packs", apps.length],
          ["Sent", outcomes.applied],
          ["Replies", outcomes.replies],
        ].map(([k, v]) => (
          <div key={k} className="glass rounded-[20px] px-4 py-3.5">
            <p className="text-xs text-muted">{k}</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      {apps.length > 0 && (
        <div role="tablist" className="glass mt-6 inline-flex rounded-full p-1">
          {(["active", "applied", "closed"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm capitalize transition ${tab === t ? "bg-white text-black" : "text-muted hover:text-ink"}`}>
              {t} <span className="tabular-nums opacity-60">{tabCount(t)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-4">
        <ErrorNote>{err}</ErrorNote>
      </div>
      {apps.length === 0 ? (
        <div className="mt-8 glass rounded-[22px] p-8">
          <p className="font-semibold">No applications yet</p>
          <p className="mt-1 text-muted">Open a role and draft a pack. It appears here once drafted.</p>
          <Link href="/jobs" className="btn btn-accent mt-4">
            See your jobs
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {shown.length === 0 && <li className="glass rounded-[22px] p-6 text-center text-muted">Nothing here yet.</li>}
          {shown.map((a, i) => {
            const j = jobs.get(a.jobId);
            const flagged = [...a.bullets, ...a.noteLines].filter((l) => l.verdict.status !== "pass").length;
            return (
              <li key={a.id} className="glass lift rise flex flex-wrap items-center gap-4 rounded-[22px] px-4 py-4 sm:px-5" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <Monogram name={j?.company ?? "?"} size={42} />
                <div className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link href={`/applications/${a.id}`} className="font-semibold hover:underline">
                      {j?.title ?? "Role"}
                    </Link>
                    <span className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium ring-1 ${TONE[a.status]}`}>{LABEL[a.status]}</span>
                  </span>
                  <p className="text-sm text-muted">
                    {j?.company}, updated {timeAgo(a.updatedAt)}
                    {a.status === "drafted" && flagged > 0 && <span className="text-caution">, {flagged} line{flagged > 1 ? "s" : ""} to fix</span>}
                  </p>
                </div>
                {a.status === "drafted" || a.status === "approved" ? (
                  <Link href={`/applications/${a.id}`} className="btn btn-quiet btn-sm">
                    {a.status === "drafted" ? "Review" : "Open"} <IconChevron size={14} />
                  </Link>
                ) : (
                  <label className="text-sm">
                    <span className="sr-only">Status</span>
                    <select className="field rounded-full py-1.5" value={a.status} onChange={(e) => update(a.id, e.target.value as ApplicationStatus)}>
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
