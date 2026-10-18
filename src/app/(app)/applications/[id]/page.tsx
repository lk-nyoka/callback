"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ErrorNote, Spinner, Verdict } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { api, shortModel } from "@/lib/client";
import { explainReason } from "@/lib/ledger";
import type { Application, CareerFact, PackBullet } from "@/lib/types";

type Kind = "bullets" | "noteLines";

export default function PackPage() {
  const { id } = useParams<{ id: string }>();
  const { state, refresh } = useWorkspace();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const app = state?.applications.find((a) => a.id === id);
  const job = app && state?.jobs.find((j) => j.id === app.jobId);
  if (!state) return <p className="text-muted">Loading…</p>;
  if (!app || !job) return <p>Pack not found. <Link className="underline" href="/applications">Back</Link></p>;
  const facts = new Map(state.facts.map((f) => [f.id, f]));
  const lines = [...app.bullets, ...app.noteLines];
  const counts = { pass: 0, needs_confirmation: 0, blocked: 0 };
  lines.forEach((l) => counts[l.verdict.status]++);
  const ready = counts.blocked === 0 && counts.needs_confirmation === 0;
  const approved = app.status !== "drafted";

  async function save(kind: Kind, next: PackBullet[]) {
    setErr("");
    await api(`/api/applications/${app!.id}`, { method: "PATCH", json: { [kind]: next.map(({ text, factIds }) => ({ text, factIds })) } });
    await refresh();
  }
  async function setStatus(status: Application["status"]) {
    setBusy(status);
    setErr("");
    try {
      await api(`/api/applications/${app!.id}`, { method: "PATCH", json: { status } });
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function rewrite(kind: Kind, index: number) {
    setBusy(`rw-${kind}-${index}`);
    setErr("");
    try {
      await api(`/api/applications/${app!.id}/rewrite`, { method: "POST", json: { kind, index } });
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  function copyAll() {
    const text = `${app!.bullets.map((b) => `• ${b.text}`).join("\n")}\n\n${app!.noteLines.map((l) => l.text).join(" ")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/jobs/${job.id}`} className="text-sm text-muted underline-offset-2 hover:underline">
        {job.title}, {job.company}
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Application pack</h1>
      <p className="mt-2 max-w-prose text-muted">
        Drafted by {shortModel(app.model)}. Every line was then checked by the Claims Ledger, which is plain code: it compares numbers, tools, scope and seniority with the Vault facts each line cites. Nothing can be approved until every line is supported.
      </p>

      <div className="mt-6 flex flex-wrap gap-3 text-sm" aria-live="polite">
        <Tally n={counts.pass} label="supported" cls="text-verified" />
        <Tally n={counts.needs_confirmation} label="to check" cls="text-caution" />
        <Tally n={counts.blocked} label="blocked" cls="text-blocked" />
      </div>
      <div className="mt-4">
        <ErrorNote>{err}</ErrorNote>
      </div>

      <LedgerSection title="CV bullets for this role" kind="bullets" lines={app.bullets} facts={facts} jobId={job.id} locked={approved} busy={busy} onSave={save} onRewrite={rewrite} refresh={refresh} />
      <LedgerSection title="Short note to the hiring team" kind="noteLines" lines={app.noteLines} facts={facts} jobId={job.id} locked={approved} busy={busy} onSave={save} onRewrite={rewrite} refresh={refresh} />

      <div className="sticky bottom-4 mt-10 rounded-xl border border-rule-strong bg-surface p-4 shadow-lg">
        {!approved ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">{ready ? "Every line is supported by your Vault. Nothing is sent until you apply yourself." : "Fix, rewrite or remove the flagged lines to approve."}</p>
            <button className="btn btn-primary" disabled={!ready || !!busy} onClick={() => setStatus("approved")}>
              {busy === "approved" && <Spinner />}Approve pack
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-semibold text-verified">Approved.</span> Callback never submits for you. Copy the pack, then apply on {job.company}&apos;s own page.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-quiet" onClick={copyAll}>
                {copied ? "Copied" : "Copy pack"}
              </button>
              <a className="btn btn-quiet" href={job.applyUrl ?? job.url} target="_blank" rel="noreferrer">
                Open {job.company}&apos;s application page
              </a>
              {app.status === "approved" && (
                <button className="btn btn-primary" disabled={!!busy} onClick={() => setStatus("applied")}>
                  I&apos;ve applied
                </button>
              )}
              {app.status !== "approved" && (
                <Link className="btn btn-primary" href="/applications">
                  Track it
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tally({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <span className="rounded-lg border border-rule bg-surface px-3 py-1.5">
      <span className={`font-semibold ${cls}`}>{n}</span> {label}
    </span>
  );
}

interface SectionProps {
  title: string;
  kind: Kind;
  lines: PackBullet[];
  facts: Map<string, CareerFact>;
  jobId: string;
  locked: boolean;
  busy: string | null;
  onSave: (kind: Kind, next: PackBullet[]) => Promise<void>;
  onRewrite: (kind: Kind, index: number) => Promise<void>;
  refresh: () => Promise<void>;
}

function LedgerSection(p: SectionProps) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold">{p.title}</h2>
      <ol className="overflow-hidden rounded-xl border border-rule bg-surface">
        {p.lines.map((l, i) => (
          <LedgerLine key={`${i}-${l.text}`} {...p} line={l} index={i} />
        ))}
      </ol>
    </section>
  );
}

function LedgerLine({ line, index, kind, lines, facts, jobId, locked, busy, onSave, onRewrite, refresh }: SectionProps & { line: PackBullet; index: number }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(line.text);
  const [live, setLive] = useState<PackBullet | null>(null);
  const [showSrc, setShowSrc] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newFact, setNewFact] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const blocked = line.verdict.status === "blocked";

  // Live ledger check while typing (pure code on the server, no model).
  useEffect(() => {
    if (!editing) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (draft.trim().length < 2) return;
      try {
        setLive(await api<PackBullet>("/api/ledger/check", { method: "POST", json: { jobId, text: draft, factIds: line.factIds } }));
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [draft, editing, jobId, line.factIds]);

  const shown = editing && live ? live : line;
  const replace = (next: PackBullet | null) => {
    const copy = [...lines];
    if (next) copy[index] = next;
    else copy.splice(index, 1);
    return copy;
  };

  return (
    <li className={`grid grid-cols-[1fr_auto] gap-x-4 border-b border-rule px-4 py-4 last:border-b-0 sm:grid-cols-[1fr_9rem] ${blocked ? "bg-blocked-tint/40" : ""}`}>
      <div className="min-w-0">
        {editing ? (
          <>
            <label className="sr-only" htmlFor={`l-${kind}-${index}`}>Edit line</label>
            <textarea id={`l-${kind}-${index}`} className="field min-h-20" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          </>
        ) : (
          <p className={`text-[1.02rem] leading-relaxed ${blocked ? "struck" : ""}`}>{line.text}</p>
        )}
        {shown.verdict.reasons.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-sm">
            {shown.verdict.reasons.map((r) => (
              <li key={r} className={shown.verdict.status === "blocked" ? "text-blocked" : "text-caution"}>
                {explainReason(r)}
              </li>
            ))}
          </ul>
        )}
        {showSrc && (
          <div className="mt-3 space-y-2">
            {line.factIds.length === 0 && <p className="text-sm text-muted">This line cites no facts, so it may not claim anything about you.</p>}
            {line.factIds.map((id) => {
              const f = facts.get(id);
              return (
                <div key={id} className="rounded-lg bg-sunk px-3 py-2 text-sm">
                  <p className="font-medium">{f?.text ?? "Fact no longer in your Vault"}</p>
                  {f && f.quoteStart >= 0 && <p className="quote mt-1 text-ink-2">&ldquo;{f.evidenceQuote}&rdquo;</p>}
                </div>
              );
            })}
          </div>
        )}
        {adding && (
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = await api<CareerFact>("/api/facts", { method: "POST", json: { text: newFact, type: "experience" } });
              await onSave(kind, replace({ ...line, factIds: [...line.factIds, f.id] }));
              setAdding(false);
              await refresh();
            }}
          >
            <label className="sr-only" htmlFor={`nf-${kind}-${index}`}>Supporting fact</label>
            <input id={`nf-${kind}-${index}`} className="field" value={newFact} onChange={(e) => setNewFact(e.target.value)} placeholder="State the true fact, e.g. Used pytest to test the load-shedding notebook" />
            <button className="btn btn-primary btn-sm shrink-0" disabled={newFact.trim().length < 3}>
              Add to Vault and re-check
            </button>
          </form>
        )}
        {!locked && (
          <div className="mt-3 flex flex-wrap gap-2">
            {editing ? (
              <>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    await onSave(kind, replace({ ...line, text: draft }));
                    setEditing(false);
                    setLive(null);
                  }}
                >
                  Save
                </button>
                <button className="btn btn-quiet btn-sm" onClick={() => { setEditing(false); setDraft(line.text); setLive(null); }}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                {line.verdict.status !== "pass" && (
                  <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => onRewrite(kind, index)}>
                    {busy === `rw-${kind}-${index}` && <Spinner />}Rewrite honestly
                  </button>
                )}
                <button className="btn btn-quiet btn-sm" onClick={() => setEditing(true)}>
                  Edit
                </button>
                {line.verdict.status !== "pass" && (
                  <button className="btn btn-quiet btn-sm" onClick={() => setAdding((v) => !v)}>
                    It&apos;s true, add a fact
                  </button>
                )}
                <button className="btn btn-quiet btn-sm" onClick={() => onSave(kind, replace(null))}>
                  Remove
                </button>
              </>
            )}
            <button className="btn btn-quiet btn-sm" onClick={() => setShowSrc((v) => !v)}>
              {showSrc ? "Hide sources" : `Sources (${line.factIds.length})`}
            </button>
          </div>
        )}
      </div>
      <div className="pt-0.5 text-right">
        <Verdict status={shown.verdict.status} animate={editing} key={shown.verdict.status} />
      </div>
    </li>
  );
}
