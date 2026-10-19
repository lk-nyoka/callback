"use client";

import Link from "next/link";
import { useState } from "react";
import { IconMoon, IconRefresh } from "@/components/icons";
import { Orb } from "@/components/orb";
import { ErrorNote, FitBadge, Monogram, SectionTitle, SignalBadge, Spinner } from "@/components/ui";
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
      <SectionTitle
        title="Overnight"
        sub="Every night Callback re-checks employer job boards for your saved search, re-tests links on roles you're tracking, and scores anything new against your Vault."
      />

      <div className="glass-strong relative mt-8 overflow-hidden rounded-[30px] p-6 sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-10 opacity-80">
          <Orb size={170} mood={busy ? "thinking" : "idle"} />
        </div>
        <span className="relative mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-ink-2 ring-1 ring-rule">
          <IconMoon size={13} /> Runs nightly at 05:00 SAST
        </span>
        {last ? (
          <>
            <p className="text-sm text-muted">Last run {timeAgo(last.at)}</p>
            <p className="relative mt-2 max-w-lg text-2xl font-semibold leading-snug tracking-[-0.02em]">
              {last.newJobs === 0 ? "No new roles matched overnight." : `${last.newJobs} new role${last.newJobs > 1 ? "s" : ""} matched your search.`}
              {last.changed > 0 && ` ${last.changed} listing${last.changed > 1 ? "s" : ""} changed hiring signal.`}
            </p>
          </>
        ) : (
          <p className="text-lg font-semibold">The watch hasn&apos;t run for you yet.</p>
        )}
        {best && (
          <div className="relative mt-5 flex items-start gap-3 rounded-[20px] border border-rule bg-white/[0.04] p-4">
            <Monogram name={best.company} size={40} />
            <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted">Start here today</p>
            <Link href={`/jobs/${best.id}`} className="mt-0.5 block text-lg font-semibold hover:underline">
              {best.title}, {best.company}
            </Link>
            <div className="mt-2 flex flex-wrap gap-2">
              <FitBadge level={best.fit?.level} />
              <SignalBadge status={best.signal?.status} />
            </div>
            </div>
          </div>
        )}
        {lowNow.length > 0 && (
          <p className="mt-4 text-sm text-blocked">
            {lowNow.length} role{lowNow.length > 1 ? "s" : ""} you have a pack for now show a low hiring signal. Check the evidence before spending more time on {lowNow.length > 1 ? "them" : "it"}.
          </p>
        )}
        <div className="relative mt-6 flex flex-wrap gap-3">
          <button className="btn btn-accent" onClick={runNow} disabled={busy || !state.intent}>
            {busy ? <Spinner /> : <IconRefresh size={16} />}
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
          <ul className="divide-y divide-rule overflow-hidden glass rounded-[22px]">
            {fresh.map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-white/[0.04]">
                  <span className="flex min-w-0 items-center gap-3 font-medium">
                    <Monogram name={j.company} size={32} />
                    <span>
                      {j.title} <span className="font-normal text-muted">· {j.company}</span>
                    </span>
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
          <ul className="glass relative space-y-0 overflow-hidden rounded-[22px] px-5 py-2 text-sm">
            {runs.slice(0, 14).map((r) => (
              <li key={r.at} className="flex items-center justify-between gap-3 border-b border-rule py-2.5 last:border-b-0">
                <span className="flex items-center gap-2.5 text-ink-2">
                  <span className={`size-2 rounded-full ${r.newJobs > 0 ? "bg-accent shadow-[0_0_10px] shadow-accent" : "bg-white/20"}`} />
                  {new Date(r.at).toLocaleString()}
                </span>
                <span className="tabular-nums text-muted">{r.newJobs} new · {r.changed} changed</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
