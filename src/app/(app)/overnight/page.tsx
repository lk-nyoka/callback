"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorNote, FitBadge, SignalBadge, Spinner } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { api, timeAgo } from "@/lib/client";

export default function OvernightPage() {
  const { state, refresh } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!state) return <p className="text-muted">Loading…</p>;
  const runs = [...state.watchRuns].reverse();
  const last = runs[0];
  const fresh = state.jobs.filter((j) => j.isNew);
  const lowNow = state.jobs.filter((j) => j.signal?.status === "low" && state.applications.some((a) => a.jobId === j.id));
  const best = fresh.find((j) => j.fit?.level === "strong" && j.signal?.status === "strong") ?? fresh[0];

  async function runNow() {
    setBusy(true);
    setErr("");
    try {
      await api("/api/watch", { method: "POST", json: { action: "run" } });
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Overnight</h1>
      <p className="mt-2 max-w-prose text-muted">
        Every night Callback re-checks employer job boards for your saved search, re-tests links on roles you&apos;re tracking, and scores anything new against your Vault. This is what it found.
      </p>

      <div className="mt-8 rounded-xl border border-rule bg-surface p-6">
        {last ? (
          <>
            <p className="text-sm text-muted">Last run {timeAgo(last.at)}</p>
            <p className="mt-2 text-2xl font-semibold leading-snug">
              {last.newJobs === 0 ? "No new roles matched overnight." : `${last.newJobs} new role${last.newJobs > 1 ? "s" : ""} matched your search.`}
              {last.changed > 0 && ` ${last.changed} listing${last.changed > 1 ? "s" : ""} changed hiring signal.`}
            </p>
          </>
        ) : (
          <p className="text-lg font-semibold">The watch hasn&apos;t run for you yet.</p>
        )}
        {best && (
          <div className="mt-5 rounded-lg bg-sunk p-4">
            <p className="text-sm text-muted">Start here today</p>
            <Link href={`/jobs/${best.id}`} className="mt-1 block text-lg font-semibold hover:underline">
              {best.title}, {best.company}
            </Link>
            <div className="mt-2 flex flex-wrap gap-2">
              <FitBadge level={best.fit?.level} />
              <SignalBadge status={best.signal?.status} />
            </div>
          </div>
        )}
        {lowNow.length > 0 && (
          <p className="mt-4 text-sm text-blocked">
            {lowNow.length} role{lowNow.length > 1 ? "s" : ""} you have a pack for now show a low hiring signal. Check the evidence before spending more time on {lowNow.length > 1 ? "them" : "it"}.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={runNow} disabled={busy || !state.intent}>
            {busy && <Spinner />}
            {busy ? "Running the watch…" : "Run the watch now"}
          </button>
          {fresh.length > 0 && (
            <button
              className="btn btn-quiet"
              onClick={async () => {
                await api("/api/watch", { method: "POST", json: { action: "seen" } });
                await refresh();
              }}
            >
              Mark {fresh.length} as seen
            </button>
          )}
        </div>
        {!state.intent && <p className="mt-2 text-sm text-muted">Save a search in your Vault to turn the watch on.</p>}
        <div className="mt-3">
          <ErrorNote>{err}</ErrorNote>
        </div>
      </div>

      {fresh.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold">New since you last looked</h2>
          <ul className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface">
            {fresh.map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-sunk/60">
                  <span className="font-medium">
                    {j.title} <span className="font-normal text-muted">, {j.company}</span>
                  </span>
                  <span className="flex gap-2">
                    <FitBadge level={j.fit?.level} />
                    <SignalBadge status={j.signal?.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {runs.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold">Run history</h2>
          <ul className="space-y-1 text-sm text-muted">
            {runs.map((r) => (
              <li key={r.at}>
                {new Date(r.at).toLocaleString()}: {r.newJobs} new, {r.changed} changed
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
