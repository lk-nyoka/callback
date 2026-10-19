"use client";

import { useEffect, useMemo, useState } from "react";
import { checkClaim, explainReason } from "@/lib/ledger";
import type { CareerFact, LedgerVerdict } from "@/lib/types";
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

export const LEDGER_TRIES = [
  { label: "Inflated", text: "Led an enterprise-wide Power BI programme across 40 depots, doubling on-time delivery." },
  { label: "Honest", text: "Built a Power BI dashboard tracking on-time delivery for 14 regional depots." },
  { label: "Swapped tool", text: "Built Tableau dashboards for 14 depots at Kopano Logistics." },
];

export function LiveLedger({ onVerdict, compact = false }: { onVerdict?: (v: LedgerVerdict) => void; compact?: boolean }) {
  const [text, setText] = useState(LEDGER_TRIES[0].text);
  const verdict = useMemo(() => checkClaim({ text, factIds: [FACT.id] }, [FACT]), [text]);
  useEffect(() => onVerdict?.(verdict), [verdict, onVerdict]);
  return (
    <div>
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.08em] text-muted">Confirmed fact from your CV</p>
      <p className="quote mt-1.5 border-l-2 border-verified/70 pl-3 text-[0.95rem] text-ink-2">&ldquo;{FACT.evidenceQuote}&rdquo;</p>

      <label htmlFor="claim" className="mt-5 block text-[0.72rem] font-medium uppercase tracking-[0.08em] text-muted">
        A line the AI wants on your CV. Try editing it
      </label>
      <div className="mt-2 rounded-2xl border border-rule-strong bg-white/[0.04] p-1 focus-within:border-accent/60 focus-within:shadow-[0_0_0_4px_rgba(123,108,255,0.16)]">
        <textarea
          id="claim"
          className={`w-full resize-none bg-transparent px-3 py-2.5 text-[1rem] leading-relaxed outline-none ${verdict.status === "blocked" ? "text-ink-2" : "text-ink"} ${compact ? "min-h-20" : "min-h-24"}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
        <div className="flex items-center justify-between gap-3 border-t border-rule px-3 py-2" aria-live="polite">
          <span className="text-xs text-muted">Checked by code in your browser, as you type</span>
          <Verdict status={verdict.status} animate key={verdict.status + verdict.reasons.length} />
        </div>
      </div>
      <ul className="mt-3 min-h-[3.25rem] space-y-1 text-[0.86rem]">
        {verdict.reasons.length === 0 ? (
          <li className="flex gap-2 text-verified">
            <span aria-hidden>✓</span>Every number, tool and claim of scope or seniority appears in the fact.
          </li>
        ) : (
          verdict.reasons.slice(0, 3).map((r) => (
            <li key={r} className={`flex gap-2 ${verdict.status === "blocked" ? "text-blocked" : "text-caution"}`}>
              <span aria-hidden>•</span>
              {explainReason(r)}
            </li>
          ))
        )}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {LEDGER_TRIES.map((t) => (
          <button key={t.label} className={`chip ${text === t.text ? "active" : ""}`} aria-pressed={text === t.text} onClick={() => setText(t.text)}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
