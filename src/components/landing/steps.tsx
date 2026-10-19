"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconPin, IconSearch, IconUpload } from "@/components/icons";
import { Monogram } from "@/components/ui";

const STEPS = [
  { title: "Upload & verify", tag: "Career Vault", body: "Drop in your CV. Nemotron Lightning extracts facts, code checks every quote, you confirm." },
  { title: "Find real jobs", tag: "Job search", body: "Live roles from employers' own job boards and careers pages, each with hiring evidence." },
  { title: "Review & apply", tag: "Application pack", body: "Super drafts your bullets and note. Every line is checked against your verified facts." },
  { title: "Track progress", tag: "Applications", body: "Every application, its status and your next step in one place. Outcomes you record." },
  { title: "The callback", tag: "Overnight", body: "Each night Callback re-checks boards, links and new roles, so you start the day ready." },
];

export function Steps() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 4200);
    return () => clearInterval(t);
  }, [paused]);
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <ol className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {STEPS.map((s, i) => {
          const on = i === active;
          return (
            <li key={s.title} className="w-[82%] shrink-0 snap-center sm:w-[46%] lg:w-auto">
              <button
                onClick={() => setActive(i)}
                aria-pressed={on}
                className={`group flex h-full w-full flex-col rounded-[24px] border p-4 text-left transition-all duration-500 ${on ? "glass-strong border-[rgba(123,108,255,0.5)] shadow-[0_30px_80px_-40px_rgba(123,108,255,0.7)]" : "glass opacity-80 hover:opacity-100"}`}
              >
                <span className="flex items-baseline gap-2">
                  <span className={`text-sm font-semibold tabular-nums ${on ? "text-gradient" : "text-muted"}`}>{i + 1}</span>
                  <span className="font-semibold">{s.title}</span>
                </span>
                <span className="mt-0.5 text-xs text-muted">{s.tag}</span>
                <span className="mt-2 text-[0.86rem] leading-snug text-ink-2">{s.body}</span>
                <span className="mt-4 block flex-1 overflow-hidden rounded-2xl border border-rule bg-black/30 p-3">
                  <Preview i={i} on={on} />
                </span>
                <span className="mt-3 h-0.5 overflow-hidden rounded-full bg-white/5">
                  <span className="block h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: on ? "100%" : "0%", transition: on && !paused ? "width 4.2s linear" : "width 300ms ease" }} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Preview({ i, on }: { i: number; on: boolean }) {
  if (i === 0)
    return (
      <span className="block text-[0.72rem]">
        <span className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-rule-strong py-3 text-muted">
          <IconUpload size={16} />
          thandi-cv.pdf
        </span>
        {["Parsing document", "Extracting facts", "Verifying quotes"].map((t, k) => (
          <span key={t} className="mt-1.5 flex items-center gap-2 text-ink-2">
            <span className={`grid size-3.5 place-items-center rounded-full ${on ? "bg-verified text-black" : "bg-white/10"}`} style={{ transition: `background-color 300ms ${k * 400}ms` }}>
              {on && <IconCheck size={10} />}
            </span>
            {t}
          </span>
        ))}
        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: on ? "100%" : "15%", transition: "width 1.6s ease" }} />
        </span>
      </span>
    );
  if (i === 1)
    return (
      <span className="block space-y-1.5 text-[0.72rem]">
        <span className="flex gap-1.5">
          <span className="flex flex-1 items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-muted">
            <IconSearch size={11} />
            Data Analyst
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-muted">
            <IconPin size={11} />
            Joburg
          </span>
        </span>
        {[
          ["Ubuntu Analytics", "Junior Data Analyst", "Strong"],
          ["Metro Insights", "BI Analyst", "Strong"],
          ["Karoo Data Co.", "Data Analyst", "Mixed"],
        ].map(([c, t, s], k) => (
          <span key={c} className={`flex items-center gap-2 rounded-lg p-1.5 ${k === 0 && on ? "bg-[rgba(123,108,255,0.16)] ring-1 ring-[rgba(123,108,255,0.45)]" : "bg-white/[0.03]"}`}>
            <Monogram name={c} size={20} />
            <span className="min-w-0 flex-1 truncate text-ink-2">{t}</span>
            <span className={s === "Strong" ? "text-verified" : "text-caution"}>●</span>
          </span>
        ))}
      </span>
    );
  if (i === 2)
    return (
      <span className="block space-y-1.5 text-[0.72rem]">
        {[
          ["Built a Power BI dashboard for 14 depots", "ok"],
          ["Wrote PostgreSQL queries on 1.2M rows", "ok"],
          ["Managed club finances", "no"],
        ].map(([t, s]) => (
          <span key={t} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5">
            <span className={`truncate ${s === "no" ? "struck" : "text-ink-2"}`}>{t}</span>
            <span className={`shrink-0 font-bold ${s === "no" ? "text-blocked" : "text-verified"}`}>{s === "no" ? "✕" : "✓"}</span>
          </span>
        ))}
        <span className="block pt-1 text-center text-blocked/90">&ldquo;managed&rdquo; isn&apos;t in your facts</span>
      </span>
    );
  if (i === 3)
    return (
      <span className="block space-y-1.5 text-[0.72rem]">
        {[
          ["Ubuntu Analytics", "Interview", "text-verified"],
          ["Metro Insights", "Applied", "text-accent-2"],
          ["Karoo Data Co.", "Approved", "text-ink-2"],
        ].map(([c, s, cls]) => (
          <span key={c} className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-1.5">
            <Monogram name={c} size={20} />
            <span className="flex-1 truncate text-ink-2">{c}</span>
            <span className={`rounded-full bg-white/5 px-1.5 ${cls}`}>{s}</span>
          </span>
        ))}
      </span>
    );
  return (
    <span className="flex h-full flex-col items-center justify-center gap-2 py-2 text-center text-[0.72rem]">
      <span className={`grid size-10 place-items-center rounded-full bg-verified/15 text-verified ring-1 ring-verified/40 transition-transform duration-500 ${on ? "scale-110" : ""}`}>
        <IconCheck size={20} />
      </span>
      <span className="font-semibold text-ink">3 new roles overnight</span>
      <span className="text-muted">1 listing closed. Start with Ubuntu Analytics.</span>
    </span>
  );
}
