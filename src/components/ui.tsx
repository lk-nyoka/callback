"use client";

import type { FitLevel, LedgerStatus, SignalStatus } from "@/lib/types";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" fill="var(--ink)" />
        <path d="M9 16.5l4.5 4.5L23 11" fill="none" stroke="var(--paper)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Callback
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`spin ${className}`} width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold whitespace-nowrap";

export function SignalBadge({ status }: { status?: SignalStatus }) {
  if (!status) return null;
  const map: Record<SignalStatus, [string, string, string]> = {
    strong: ["Strong signal", "bg-verified-tint text-verified", "●"],
    mixed: ["Mixed signal", "bg-caution-tint text-caution", "◐"],
    low: ["Low hiring signal", "bg-blocked-tint text-blocked", "○"],
    insufficient: ["Insufficient evidence", "bg-neutral-tint text-muted", "◌"],
  };
  const [label, cls, glyph] = map[status];
  return (
    <span className={`${pill} ${cls}`}>
      <span aria-hidden>{glyph}</span>
      {label}
    </span>
  );
}

export function FitBadge({ level }: { level?: FitLevel }) {
  if (!level) return <span className={`${pill} bg-neutral-tint text-muted`}>Fit not scored</span>;
  const map: Record<FitLevel, [string, string]> = {
    strong: ["Strong fit", "border-verified text-verified"],
    partial: ["Partial fit", "border-caution text-caution"],
    weak: ["Weak fit", "border-rule-strong text-muted"],
  };
  const [label, cls] = map[level];
  return <span className={`${pill} border ${cls}`}>{label}</span>;
}

export function Verdict({ status, animate = false }: { status: LedgerStatus; animate?: boolean }) {
  const map: Record<LedgerStatus, [string, string]> = {
    pass: ["Supported", "border-verified text-verified bg-verified-tint"],
    needs_confirmation: ["Check this", "border-caution text-caution bg-caution-tint"],
    blocked: ["Blocked", "border-blocked text-blocked bg-blocked-tint"],
  };
  const [label, cls] = map[status];
  return (
    <span className={`inline-flex items-center rounded-md border-[1.5px] px-2 py-0.5 text-[0.78rem] font-bold ${cls} ${animate ? "stamp-in" : ""}`}>
      {label}
    </span>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg border border-blocked/40 bg-blocked-tint px-3 py-2 text-sm text-blocked">
      {children}
    </p>
  );
}
