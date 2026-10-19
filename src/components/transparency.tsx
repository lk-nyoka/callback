"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { shortModel, timeAgo } from "@/lib/client";
import { useWorkspace } from "./workspace";

// Shows exactly which NVIDIA Nemotron model ran each step on Nebius Token
// Factory, tokens, latency and fallbacks, plus every external source fetched.
export function TransparencyButton() {
  const [open, setOpen] = useState(false);
  const { state } = useWorkspace();
  const calls = [...(state?.modelCalls ?? [])].reverse();
  const fetches = [...(state?.sourceFetches ?? [])].reverse();
  // The drawer is portalled to <body>: the sidebar uses backdrop-filter, which
  // would otherwise trap a position:fixed overlay inside the sidebar.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const totals = calls.reduce((t, c) => ({ inp: t.inp + c.inputTokens, out: t.out + c.outputTokens }), { inp: 0, out: 0 });
  return (
    <>
      <button className="btn btn-quiet btn-sm" onClick={() => setOpen(true)} aria-haspopup="dialog">
        How this ran
        {calls.length > 0 && <span className="rounded-full bg-white/10 px-1.5 text-xs text-ink-2">{calls.length}</span>}
      </button>
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <aside
            role="dialog"
            aria-label="How this ran"
            className="glass-strong h-full w-full max-w-xl overflow-y-auto rounded-l-[28px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">How this ran</h2>
                <p className="mt-1 text-sm text-muted">
                  Every language step runs on NVIDIA Nemotron through Nebius Token Factory. Verdicts on your claims and on hiring signals are computed by code, not by a model.
                </p>
              </div>
              <button className="btn btn-quiet btn-sm" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <dl className="mb-6 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-2xl border border-rule bg-white/[0.04] p-3">
                <dt className="text-muted">Model calls</dt>
                <dd className="text-lg font-semibold">{calls.length}</dd>
              </div>
              <div className="rounded-2xl border border-rule bg-white/[0.04] p-3">
                <dt className="text-muted">Tokens in</dt>
                <dd className="text-lg font-semibold">{totals.inp.toLocaleString()}</dd>
              </div>
              <div className="rounded-2xl border border-rule bg-white/[0.04] p-3">
                <dt className="text-muted">Tokens out</dt>
                <dd className="text-lg font-semibold">{totals.out.toLocaleString()}</dd>
              </div>
            </dl>
            <h3 className="mb-2 font-semibold">Model calls</h3>
            {calls.length === 0 && <p className="text-sm text-muted">Nothing has run yet.</p>}
            <ul className="divide-y divide-rule text-sm">
              {calls.map((c) => (
                <li key={c.id} className="py-2.5">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{c.step}</span>
                    <span className="shrink-0 text-muted">{timeAgo(c.createdAt)}</span>
                  </div>
                  <div className="mt-0.5 text-muted">
                    <span className={c.ok ? "text-ink-2" : "text-blocked"}>{shortModel(c.model)}</span>
                    {c.fallbackUsed && <span className="text-caution">, fell back from {shortModel(c.requestedModel)}</span>}
                    {c.ok ? `, ${c.inputTokens.toLocaleString()} in / ${c.outputTokens.toLocaleString()} out, ${(c.latencyMs / 1000).toFixed(1)} s` : `, failed: ${c.error}`}
                  </div>
                </li>
              ))}
            </ul>
            <h3 className="mb-2 mt-6 font-semibold">Sources fetched</h3>
            {fetches.length === 0 && <p className="text-sm text-muted">No sources fetched yet.</p>}
            <ul className="divide-y divide-rule text-sm">
              {fetches.slice(0, 40).map((f) => (
                <li key={f.id} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="text-muted">{f.step}: </span>
                    {f.url.startsWith("http") ? (
                      <a href={f.url} target="_blank" rel="noreferrer" className="break-all underline decoration-rule-strong underline-offset-2">
                        {f.url.replace(/^https?:\/\//, "").slice(0, 70)}
                      </a>
                    ) : (
                      <span className="break-all">{f.url}</span>
                    )}
                  </span>
                  <span className={`shrink-0 ${f.ok ? "text-verified" : "text-blocked"}`}>{f.ok ? "ok" : "failed"}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
}
