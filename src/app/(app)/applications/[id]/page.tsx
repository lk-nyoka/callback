"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconBack, IconCheck, IconCopy, IconDownload, IconLink } from "@/components/icons";
import { ErrorNote, Monogram, Spinner, Verdict } from "@/components/ui";
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

  function download() {
    const cite = (ids: string[]) =>
      ids
        .map((id) => facts.get(id))
        .filter(Boolean)
        .map((f) => `    - ${f!.text}${f!.quoteStart >= 0 ? `\n      > "${f!.evidenceQuote}"` : " (added by you)"}`)
        .join("\n");
    const md = [
      `# Application pack: ${job!.title}, ${job!.company}`,
      "",
      "## CV bullets",
      ...app!.bullets.map((b) => `- ${b.text}`),
      "",
      "## Note to the hiring team",
      app!.noteLines.map((l) => l.text).join(" "),
      "",
      "---",
      "## Evidence appendix (Callback Claims Ledger)",
      `Approved ${app!.history.find((h) => h.status === "approved")?.at ?? ""}`,
      `Pack fingerprint (SHA-256): ${app!.approvedHash ?? "not approved yet"}`,
      "",
      ...[...app!.bullets, ...app!.noteLines].map((l) => `- "${l.text}"\n  Verdict: ${l.verdict.status}${l.factIds.length ? `\n  Cited facts:\n${cite(l.factIds)}` : "\n  Cites no facts (connective text)"}`),
      "",
      `Posting: ${job!.url}`,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `callback-pack-${job!.company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const total = lines.length || 1;
  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/jobs/${job.id}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconBack size={15} /> {job.title}, {job.company}
      </Link>

      {approved ? (
        <section className="glass-strong relative mt-4 overflow-hidden rounded-[30px] p-8 text-center">
          <div className="pointer-events-none absolute left-1/2 top-0 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-verified/25 blur-3xl" />
          <span className="stamp-in relative mx-auto grid size-16 place-items-center rounded-full bg-verified/15 text-verified ring-2 ring-verified/50">
            <IconCheck size={30} />
          </span>
          <h1 className="relative mt-5 text-[1.9rem] font-semibold tracking-[-0.03em]">{app.status === "approved" ? "Application pack ready" : "Pack approved and tracked"}</h1>
          <p className="relative mx-auto mt-2 max-w-lg text-muted">
            Every line is supported by your Vault. Callback never submits for you: download or copy the pack, then apply on {job.company}&apos;s own page.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-2.5">
            <button className="btn btn-accent" onClick={download}>
              <IconDownload size={16} /> Download pack
            </button>
            <button className="btn btn-quiet" onClick={copyAll}>
              <IconCopy size={15} /> {copied ? "Copied" : "Copy"}
            </button>
            <a className="btn btn-quiet" href={job.applyUrl ?? job.url} target="_blank" rel="noreferrer">
              <IconLink size={15} /> Open application page
            </a>
            {app.status === "approved" ? (
              <button className="btn btn-primary" disabled={!!busy} onClick={() => setStatus("applied")}>
                I&apos;ve applied
              </button>
            ) : (
              <Link className="btn btn-primary" href="/applications">
                View in tracker
              </Link>
            )}
          </div>
          <p className="relative mt-4 text-xs text-muted">The download includes an evidence appendix: each line, its cited facts and the approved pack&apos;s fingerprint.</p>
        </section>
      ) : (
        <section className="glass-strong mt-4 flex flex-col gap-6 rounded-[30px] p-6 sm:flex-row sm:items-center sm:p-7">
          <ProgressRing value={counts.pass} total={total} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <Monogram name={job.company} size={36} />
              <h1 className="text-[1.7rem] font-semibold tracking-[-0.03em]">Application pack</h1>
            </div>
            <p className="mt-2 text-[0.95rem] text-muted">
              Drafted by {shortModel(app.model)}, then checked line by line by the Claims Ledger: plain code comparing numbers, tools, scope and seniority with the Vault facts each line cites.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm" aria-live="polite">
              <Tally n={counts.pass} label="verified" cls="text-verified" />
              <Tally n={counts.needs_confirmation} label="to check" cls="text-caution" />
              <Tally n={counts.blocked} label="blocked" cls="text-blocked" />
            </div>
          </div>
        </section>
      )}
      <div className="mt-4">
        <ErrorNote>{err}</ErrorNote>
      </div>

      <LedgerSection title="CV bullets for this role" kind="bullets" lines={app.bullets} facts={facts} jobId={job.id} locked={approved} busy={busy} onSave={save} onRewrite={rewrite} refresh={refresh} />
      <LedgerSection title="Short note to the hiring team" kind="noteLines" lines={app.noteLines} facts={facts} jobId={job.id} locked={approved} busy={busy} onSave={save} onRewrite={rewrite} refresh={refresh} />

      {!approved && (
        <div className="glass-strong sticky bottom-4 z-20 mt-10 flex flex-wrap items-center justify-between gap-3 rounded-[24px] p-4 sm:rounded-full sm:py-3 sm:pl-6 sm:pr-3">
          <p className="text-sm text-muted">{ready ? "Every line is verified. Nothing is sent until you apply yourself." : `${counts.blocked + counts.needs_confirmation} line${counts.blocked + counts.needs_confirmation === 1 ? "" : "s"} to fix, rewrite or remove before you can approve.`}</p>
          <button className="btn btn-accent" disabled={!ready || !!busy} onClick={() => setStatus("approved")}>
            {busy === "approved" && <Spinner />}Approve pack
          </button>
        </div>
      )}
    </div>
  );
}

function ProgressRing({ value, total }: { value: number; total: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / total));
  return (
    <div className="relative mx-auto size-[120px] shrink-0 sm:mx-0" role="img" aria-label={`${value} of ${total} lines verified`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#30d158" />
            <stop offset="1" stopColor="#4f9dff" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="url(#ring)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.2,0.8,0.2,1)" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <span>
          <span className="block text-2xl font-semibold tabular-nums">
            {value}
            <span className="text-muted">/{total}</span>
          </span>
          <span className="block text-[0.68rem] text-muted">verified</span>
        </span>
      </div>
    </div>
  );
}

function Tally({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <span className="glass rounded-full px-3.5 py-1.5">
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
      <ol className="overflow-hidden glass rounded-[22px]">
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
    <li className={`relative grid grid-cols-[1fr_auto] gap-x-4 border-b border-rule py-4 pl-5 pr-4 transition-colors last:border-b-0 sm:grid-cols-[1fr_9rem] ${blocked ? "bg-blocked-tint/40" : shown.verdict.status === "needs_confirmation" ? "bg-caution-tint/30" : ""}`}>
      <span aria-hidden className={`absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full ${shown.verdict.status === "pass" ? "bg-verified/70" : shown.verdict.status === "blocked" ? "bg-blocked/80" : "bg-caution/80"}`} />
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
                <div key={id} className="rounded-2xl border border-rule bg-white/[0.03] px-3.5 py-2.5 text-sm">
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
        <div className="mt-3 flex flex-wrap gap-2">
          {!locked && (editing ? (
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
            ))}
            <button className="btn btn-quiet btn-sm" onClick={() => setShowSrc((v) => !v)}>
              {showSrc ? "Hide sources" : `Sources (${line.factIds.length})`}
            </button>
        </div>
      </div>
      <div className="pt-0.5 text-right">
        <Verdict status={shown.verdict.status} animate={editing} key={shown.verdict.status} />
      </div>
    </li>
  );
}
