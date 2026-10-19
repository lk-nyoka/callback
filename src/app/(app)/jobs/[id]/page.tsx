"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { IconBack, IconLink, IconPin, IconSpark } from "@/components/icons";
import { ErrorNote, FitBadge, Monogram, SignalBadge, Spinner } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { Markdown } from "@/components/markdown";
import { api, displayLocation, shortModel, timeAgo } from "@/lib/client";
import type { SignalObservation } from "@/lib/types";

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, refresh } = useWorkspace();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const job = state?.jobs.find((j) => j.id === id);

  if (!state) return <p className="text-muted">Loading…</p>;
  if (!job) return <p>That role is no longer in your list. <Link className="underline" href="/jobs">Back to jobs</Link></p>;
  const factById = new Map(state.facts.map((f) => [f.id, f]));
  const existing = state.applications.find((a) => a.jobId === job.id);

  async function run(kind: string, path: string, after?: (r: unknown) => void) {
    setBusy(kind);
    setErr("");
    try {
      const r = await api(path, { method: "POST" });
      await refresh();
      after?.(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconBack size={15} /> All jobs
      </Link>
      <div className="glass-strong relative mt-4 overflow-hidden rounded-[28px] p-6 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-accent/25 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <Monogram name={job.company} size={56} />
          <div className="min-w-0">
            <h1 className="text-[1.7rem] font-semibold leading-tight tracking-[-0.025em] sm:text-[2rem]">{job.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-ink-2" title={job.location}>
              {job.company} <span className="text-muted">·</span> <IconPin size={14} className="text-muted" /> {displayLocation(job.location, state.intent?.locations)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <FitBadge level={job.fit?.level} />
              <SignalBadge status={job.signal?.status} />
              <a href={job.url} target="_blank" rel="noreferrer" className="chip">
                <IconLink size={13} /> {job.provider === "web" ? "Original posting" : "On the employer's job board"}
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <ErrorNote>{err}</ErrorNote>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
        {/* Hiring signal */}
        <section className="glass rounded-[22px] p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">Hiring signal</h2>
            <button className="btn btn-quiet btn-sm" disabled={!!busy} onClick={() => run("recheck", `/api/jobs/${job.id}/recheck`)}>
              {busy === "recheck" && <Spinner />}Re-check now
            </button>
          </div>
          <p className="mt-1 text-sm text-muted">
            Evidence we could observe, checked {job.signal ? timeAgo(job.signal.checkedAt) : "never"}. A signal assessment, not proof.
          </p>
          <ul className="mt-4 space-y-3">
            {job.signal?.observations.map((o) => (
              <Observation key={o.key} o={o} />
            ))}
          </ul>
        </section>

        {/* Fit */}
        <section className="glass rounded-[22px] p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">Your fit</h2>
            <button className="btn btn-quiet btn-sm" disabled={!!busy} onClick={() => run("fit", `/api/jobs/${job.id}/fit`)}>
              {busy === "fit" && <Spinner />}
              {job.fit ? "Re-score" : "Score fit"}
            </button>
          </div>
          {job.fit ? (
            <>
              <p className="mt-1 text-sm text-muted">
                {shortModel(job.fit.model)} rated each requirement against your confirmed facts. Code checked the citations and set the level.
              </p>
              <p className="mt-3">{job.fit.summary}</p>
              <ul className="mt-4 space-y-3">
                {job.fit.requirements.map((r, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-start gap-2">
                      <CoverageMark c={r.coverage} />
                      <div>
                        <p className="font-medium">{r.requirement}</p>
                        {r.note && <p className="text-muted">{r.note}</p>}
                        {r.factIds.length > 0 && (
                          <p className="quote mt-1 text-ink-2">{r.factIds.map((id) => factById.get(id)?.text).filter(Boolean).join("; ")}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">Not scored yet.</p>
          )}
        </section>
      </div>

      {/* Deep analysis */}
      <section className="mt-8 glass rounded-[22px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><IconSpark size={18} className="text-accent" /> How to position yourself honestly</h2>
            <p className="mt-1 text-sm text-muted">A deeper read by Nemotron 3 Ultra, run only when you ask. It can take a minute. This is advice: nothing here goes into an application unless it passes the Claims Ledger.</p>
          </div>
          <button className="btn btn-quiet btn-sm" disabled={!!busy} onClick={() => run("deep", `/api/jobs/${job.id}/deep`)}>
            {busy === "deep" && <Spinner />}
            {job.deepAnalysis ? "Run again" : "Run deep analysis"}
          </button>
        </div>
        {job.deepAnalysis && (
          <div className="mt-4 border-t border-rule pt-4">
            <Markdown text={job.deepAnalysis.markdown} facts={factById} />
            <p className="mt-3 text-xs text-muted">
              {shortModel(job.deepAnalysis.model)}, {timeAgo(job.deepAnalysis.at)}
            </p>
          </div>
        )}
      </section>

      {/* Posting preview */}
      <details className="glass mt-8 rounded-[22px] p-5">
        <summary className="cursor-pointer font-semibold">Posting excerpt</summary>
        <p className="mt-3 whitespace-pre-line text-sm text-ink-2">{job.descriptionPreview}…</p>
      </details>

      <div className="glass-strong sticky bottom-4 z-20 mt-10 flex flex-wrap items-center justify-between gap-3 rounded-[24px] p-4 sm:rounded-full sm:py-3 sm:pl-6 sm:pr-3">
        <p className="text-sm text-muted">
          {existing ? "You already have a pack for this role." : "Drafts CV bullets and a short note. Every line is checked against your Vault."}
        </p>
        {existing ? (
          <Link href={`/applications/${existing.id}`} className="btn btn-primary">
            Open application pack
          </Link>
        ) : (
          <button
            className="btn btn-accent"
            disabled={!!busy}
            onClick={() => run("pack", `/api/jobs/${job.id}/pack`, (r) => router.push(`/applications/${(r as { id: string }).id}`))}
          >
            {busy === "pack" && <Spinner />}
            {busy === "pack" ? "Drafting and checking claims…" : "Draft application pack"}
          </button>
        )}
      </div>
    </div>
  );
}

function Observation({ o }: { o: SignalObservation }) {
  const mark = o.direction === "positive" ? ["+", "bg-verified-tint text-verified"] : o.direction === "negative" ? ["−", "bg-blocked-tint text-blocked"] : ["?", "bg-neutral-tint text-muted"];
  return (
    <li className="flex gap-3 text-sm">
      <span aria-label={o.direction} className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full font-bold ${mark[1]}`}>
        {mark[0]}
      </span>
      <div>
        <p className={`font-medium ${o.direction === "unavailable" ? "text-muted" : ""}`}>{o.label}</p>
        <p className="text-muted">{o.detail}</p>
        {o.sourceUrl && (
          <a href={o.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-xs underline decoration-rule-strong underline-offset-2">
            Source
          </a>
        )}
      </div>
    </li>
  );
}

function CoverageMark({ c }: { c: "met" | "partial" | "missing" }) {
  const m = { met: ["✓", "text-verified", "Met"], partial: ["◐", "text-caution", "Partly met"], missing: ["✕", "text-blocked", "Missing"] }[c];
  return (
    <span className={`mt-0.5 w-4 shrink-0 text-center font-bold ${m[1]}`} title={m[2]} aria-label={m[2]}>
      {m[0]}
    </span>
  );
}
