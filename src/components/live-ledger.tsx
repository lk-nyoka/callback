"use client";

import { useMemo, useState } from "react";
import { checkClaim, explainReason } from "@/lib/ledger";
import type { CareerFact } from "@/lib/types";
import { Verdict } from "./ui";

// The real Claims Ledger, running in the browser on a sample fact.
const FACT: CareerFact = {
  id: "fct_demo",
  text: "At Kopano Logistics (Data Analyst Intern), built a Power BI dashboard tracking on-time delivery for 14 regional depots, used in the weekly operations meeting.",
  type: "experience",
  documentId: "demo",
  evidenceQuote: "Built a Power BI dashboard tracking on-time delivery for 14 regional depots, used in the weekly operations meeting.",
  quoteStart: 0,
  status: "user_confirmed",
  userEdited: false,
  createdAt: "",
};

const TRIES = [
  "Led an enterprise-wide Power BI programme across 40 depots, doubling on-time delivery.",
  "Built a Power BI dashboard tracking on-time delivery for 14 regional depots.",
  "Built Tableau dashboards for 14 depots at Kopano Logistics.",
];

export function LiveLedger() {
  const [text, setText] = useState(TRIES[0]);
  const verdict = useMemo(() => checkClaim({ text, factIds: [FACT.id] }, [FACT]), [text]);
  return (
    <div className="rounded-2xl border border-rule-strong bg-surface p-5 shadow-[0_1px_0_var(--rule),0_24px_48px_-24px_rgba(23,32,27,0.25)] sm:p-6">
      <p className="text-sm font-medium text-muted">Your confirmed fact</p>
      <p className="quote mt-1 border-l-2 border-verified pl-3 text-ink-2">&ldquo;{FACT.evidenceQuote}&rdquo;</p>

      <label htmlFor="claim" className="mt-5 block text-sm font-medium text-muted">
        A line the AI wants to put on your CV. Edit it.
      </label>
      <div className="mt-1 grid grid-cols-[1fr_auto] items-start gap-3">
        <textarea id="claim" className="field min-h-24 text-[1.02rem] leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="pt-1" aria-live="polite">
          <Verdict status={verdict.status} animate key={verdict.status + verdict.reasons.length} />
        </div>
      </div>
      <ul className="mt-3 min-h-12 space-y-0.5 text-sm">
        {verdict.reasons.length === 0 ? (
          <li className="text-verified">Every number, tool and claim of scope or seniority appears in the fact.</li>
        ) : (
          verdict.reasons.map((r) => (
            <li key={r} className={verdict.status === "blocked" ? "text-blocked" : "text-caution"}>
              {explainReason(r)}
            </li>
          ))
        )}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-rule pt-4">
        <span className="self-center text-sm text-muted">Try:</span>
        {TRIES.map((t, i) => (
          <button key={t} className="btn btn-quiet btn-sm" onClick={() => setText(t)}>
            {["The inflated one", "The honest one", "A swapped tool"][i]}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">This check is plain code running in your browser. No model decides whether a claim is true.</p>
    </div>
  );
}
