"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconChevron, IconPin, IconRefresh, IconSearch } from "@/components/icons";
import { ErrorNote, FitBadge, Monogram, SectionTitle, SignalBadge, Spinner } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { api, displayLocation, timeAgo, type ClientJob } from "@/lib/client";
import type { SignalStatus } from "@/lib/types";

const SIGNAL_RANK: Record<SignalStatus, number> = { strong: 0, mixed: 1, insufficient: 2, low: 3 };
const FIT_RANK = { strong: 0, partial: 1, weak: 2 } as const;

function sortJobs(a: ClientJob, b: ClientJob) {
  const fa = a.fit ? FIT_RANK[a.fit.level] : 3;
  const fb = b.fit ? FIT_RANK[b.fit.level] : 3;
  if (fa !== fb) return fa - fb;
  return SIGNAL_RANK[a.signal?.status ?? "insufficient"] - SIGNAL_RANK[b.signal?.status ?? "insufficient"];
}

type Filter = "all" | "strong-fit" | "strong-signal" | "remote" | "employer-board";
const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["strong-fit", "Strong fit"],
  ["strong-signal", "Strong signal"],
  ["employer-board", "On employer's board"],
  ["remote", "Remote"],
];

export default function JobsPage() {
  const { state, refresh } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showLow, setShowLow] = useState(false);

  const jobs = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...(state?.jobs ?? [])]
      .sort(sortJobs)
      .filter((j) => showLow || j.signal?.status !== "low")
      .filter((j) => !term || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(term))
      .filter((j) => {
        if (filter === "strong-fit") return j.fit?.level === "strong";
        if (filter === "strong-signal") return j.signal?.status === "strong";
        if (filter === "remote") return j.remote;
        if (filter === "employer-board") return j.provider !== "web";
        return true;
      });
  }, [state?.jobs, q, filter, showLow]);

  if (!state) return <p className="text-muted">Loading…</p>;
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
    <div className="mx-auto max-w-5xl">
      <SectionTitle
        title="Real job opportunities"
        sub={
          state.intent ? (
            <>
              {state.intent.role} · {state.intent.locations.join(" or ")}. Sorted by how well your confirmed facts cover each role, then by hiring signal.
            </>
          ) : (
            "Tell Callback what you're looking for on Home first."
          )
        }
        right={
          state.intent && (
            <button className="btn btn-quiet" onClick={search} disabled={busy}>
              {busy ? <Spinner /> : <IconRefresh size={16} />}
              {busy ? "Searching…" : "Search again"}
            </button>
          )
        }
      />
      <div className="mt-4">
        <ErrorNote>{err}</ErrorNote>
      </div>
      {state.jobs[0]?.pinnedAt && (
        <p className="mt-4 rounded-2xl border border-caution/30 bg-caution-tint px-4 py-2.5 text-sm text-caution">
          Demo mode: a pinned snapshot from {new Date(state.jobs[0].pinnedAt).toLocaleDateString()}, so the demo is repeatable. Fit, drafting and claim checks run live.
        </p>
      )}

      {state.jobs.length === 0 ? (
        <div className="glass mt-8 rounded-[26px] p-10 text-center">
          <p className="text-lg font-semibold">No roles yet</p>
          <p className="mx-auto mt-1 max-w-md text-muted">Confirm your facts and start a search. Callback checks employers&apos; own job boards and careers pages for live roles.</p>
          <Link href="/home" className="btn btn-accent mt-6">
            Start a search
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-7 flex items-center gap-2 rounded-full border border-rule-strong bg-white/[0.04] px-4 focus-within:border-accent/60">
            <IconSearch size={16} className="text-muted" />
            <label htmlFor="jobq" className="sr-only">
              Filter roles
            </label>
            <input id="jobq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by title, company or place" className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-[#6e6e78]" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {FILTERS.map(([key, label]) => (
              <button key={key} className={`chip ${filter === key ? "active" : ""}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
            {lowCount > 0 && (
              <button className={`chip ${showLow ? "active" : ""}`} aria-pressed={showLow} onClick={() => setShowLow((v) => !v)}>
                {showLow ? "Hide" : "Show"} {lowCount} low-signal
              </button>
            )}
            <span className="ml-auto text-xs text-muted">
              {jobs.length} of {state.jobs.length} roles
            </span>
          </div>

          <ul className="mt-5 space-y-3">
            {jobs.map((j, i) => (
              <li key={j.id} className="rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <Link href={`/jobs/${j.id}`} className="glass lift group flex items-start gap-4 rounded-[22px] p-4 sm:p-5">
                  <Monogram name={j.company} size={46} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[1.05rem] font-semibold leading-snug">{j.title}</span>
                      {j.isNew && <span className="rounded-full bg-gradient-to-r from-accent to-accent-2 px-2 py-0.5 text-[0.66rem] font-bold text-white">New overnight</span>}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                      {j.company}
                      <span aria-hidden>·</span>
                      <IconPin size={13} />
                      {displayLocation(j.location, state.intent?.locations)}
                    </span>
                    <span className="mt-2.5 flex flex-wrap gap-1.5">
                      <FitBadge level={j.fit?.level} />
                      <SignalBadge status={j.signal?.status} />
                      {j.provider !== "web" && <span className="rounded-full bg-white/5 px-2.5 py-1 text-[0.72rem] text-ink-2 ring-1 ring-rule">Employer&apos;s board</span>}
                    </span>
                    {j.fit?.summary && <span className="mt-2.5 line-clamp-2 block max-w-3xl text-sm text-ink-2">{j.fit.summary}</span>}
                    {j.signal && <span className="mt-1.5 block text-xs text-muted">Signals checked {timeAgo(j.signal.checkedAt)}</span>}
                  </span>
                  <IconChevron size={18} className="mt-3 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
          {jobs.length === 0 && <p className="mt-8 text-center text-muted">No roles match that filter.</p>}
        </>
      )}
    </div>
  );
}
