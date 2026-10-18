"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorNote, FitBadge, SignalBadge, Spinner } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { api, timeAgo, type ClientJob } from "@/lib/client";
import type { SignalStatus } from "@/lib/types";

const SIGNAL_RANK: Record<SignalStatus, number> = { strong: 0, mixed: 1, insufficient: 2, low: 3 };
const FIT_RANK = { strong: 0, partial: 1, weak: 2 } as const;

function sortJobs(a: ClientJob, b: ClientJob) {
  const fa = a.fit ? FIT_RANK[a.fit.level] : 3;
  const fb = b.fit ? FIT_RANK[b.fit.level] : 3;
  if (fa !== fb) return fa - fb;
  return SIGNAL_RANK[a.signal?.status ?? "insufficient"] - SIGNAL_RANK[b.signal?.status ?? "insufficient"];
}

export default function JobsPage() {
  const { state, refresh } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [hideLow, setHideLow] = useState(true);
  if (!state) return <p className="text-muted">Loading…</p>;
  const jobs = [...state.jobs].sort(sortJobs).filter((j) => !hideLow || j.signal?.status !== "low");
  const lowCount = state.jobs.filter((j) => j.signal?.status === "low").length;

  async function search() {
    setBusy(true);
    setErr("");
    try {
      await api("/api/discover", { method: "POST" });
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Jobs</h1>
          {state.intent ? (
            <p className="mt-2 text-muted">
              {state.intent.role}, {state.intent.locations.join(" or ")}. Sorted by how well your confirmed facts cover each role, then by hiring signal.
            </p>
          ) : (
            <p className="mt-2 text-muted">Tell Callback what you&apos;re looking for in your Vault first.</p>
          )}
        </div>
        {state.intent && (
          <button className="btn btn-quiet" onClick={search} disabled={busy}>
            {busy && <Spinner />}
            {busy ? "Searching employer boards…" : "Search again"}
          </button>
        )}
      </div>
      <div className="mt-4">
        <ErrorNote>{err}</ErrorNote>
      </div>
      {state.jobs[0]?.pinnedAt && (
        <p className="mt-4 rounded-lg border border-caution/40 bg-caution-tint px-3 py-2 text-sm text-caution">
          Demo mode: these listings are a pinned snapshot from {new Date(state.jobs[0].pinnedAt).toLocaleDateString()}, so the demo is repeatable. Fit, drafting and claim checks run live.
        </p>
      )}

      {state.jobs.length === 0 ? (
        <div className="mt-10 rounded-xl border border-rule bg-surface p-8">
          <p className="font-semibold">No roles yet</p>
          <p className="mt-1 text-muted">Confirm your facts and set your search in the Vault. Callback then checks employers&apos; own job boards for live roles.</p>
          <Link href="/vault" className="btn btn-primary mt-4">
            Go to your Vault
          </Link>
        </div>
      ) : (
        <>
          {lowCount > 0 && (
            <label className="mt-6 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={hideLow} onChange={(e) => setHideLow(e.target.checked)} className="accent-[var(--verified)]" />
              Hide {lowCount} role{lowCount > 1 ? "s" : ""} with a low hiring signal
            </label>
          )}
          <ul className="mt-4 divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className="block px-5 py-4 hover:bg-sunk/60">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <p className="text-[1.05rem] font-semibold leading-snug">
                        {j.title}
                        {j.isNew && <span className="ml-2 rounded bg-verified px-1.5 py-0.5 align-middle text-[0.7rem] font-bold text-paper">New overnight</span>}
                      </p>
                      <p className="mt-0.5 text-sm text-muted">
                        {j.company}, {j.location || "Location not stated"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <FitBadge level={j.fit?.level} />
                      <SignalBadge status={j.signal?.status} />
                    </div>
                  </div>
                  {j.fit?.summary && <p className="mt-2 max-w-prose text-sm text-ink-2">{j.fit.summary}</p>}
                  {j.signal && <p className="mt-1 text-xs text-muted">Signals checked {timeAgo(j.signal.checkedAt)}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
