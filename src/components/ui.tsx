"use client";

import type { FitLevel, LedgerStatus, SignalStatus } from "@/lib/types";

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="cb-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8c7bff" />
          <stop offset="1" stopColor="#4f9dff" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#cb-g)" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="none" stroke="rgba(255,255,255,0.35)" />
      <path d="M9.5 16.5l4.3 4.3L22.5 12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className = "", tagline = false }: { className?: string; tagline?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="leading-tight">
        <span className="block text-[1.05rem] font-semibold tracking-tight">Callback</span>
        {tagline && <span className="block text-[0.7rem] text-muted">Your career, backed by facts.</span>}
      </span>
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

const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.76rem] font-semibold whitespace-nowrap";

export function SignalBadge({ status }: { status?: SignalStatus }) {
  if (!status) return null;
  const map: Record<SignalStatus, [string, string, string]> = {
    strong: ["Strong signal", "bg-verified-tint text-verified", "var(--verified)"],
    mixed: ["Mixed signal", "bg-caution-tint text-caution", "var(--caution)"],
    low: ["Low hiring signal", "bg-blocked-tint text-blocked", "var(--blocked)"],
    insufficient: ["Insufficient evidence", "bg-neutral-tint text-muted", "var(--muted)"],
  };
  const [label, cls, dot] = map[status];
  return (
    <span className={`${pill} ${cls}`}>
      <span className="size-1.5 rounded-full" style={{ background: dot, boxShadow: `0 0 8px ${dot}` }} aria-hidden />
      {label}
    </span>
  );
}

export function FitBadge({ level }: { level?: FitLevel }) {
  if (!level) return <span className={`${pill} bg-neutral-tint text-muted`}>Fit not scored</span>;
  const map: Record<FitLevel, [string, string]> = {
    strong: ["Strong fit", "bg-[rgba(123,108,255,0.18)] text-[#b9b1ff] ring-1 ring-[rgba(123,108,255,0.4)]"],
    partial: ["Partial fit", "bg-neutral-tint text-ink-2 ring-1 ring-rule-strong"],
    weak: ["Weak fit", "bg-neutral-tint text-muted"],
  };
  const [label, cls] = map[level];
  return <span className={`${pill} ${cls}`}>{label}</span>;
}

export function Verdict({ status, animate = false }: { status: LedgerStatus; animate?: boolean }) {
  const map: Record<LedgerStatus, [string, string, string]> = {
    pass: ["Verified", "text-verified bg-verified-tint ring-verified/40", "✓"],
    needs_confirmation: ["Check this", "text-caution bg-caution-tint ring-caution/40", "!"],
    blocked: ["Blocked", "text-blocked bg-blocked-tint ring-blocked/40", "✕"],
  };
  const [label, cls, glyph] = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.74rem] font-bold ring-1 ${cls} ${animate ? "stamp-in" : ""}`}>
      <span aria-hidden>{glyph}</span>
      {label}
    </span>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-2xl border border-blocked/30 bg-blocked-tint px-4 py-2.5 text-sm text-blocked">
      {children}
    </p>
  );
}

// Company monogram with a stable gradient derived from the name.
export function Monogram({ name, size = 40 }: { name: string; size?: number }) {
  const clean = name.replace(/\b(pty|ltd|inc|cc|llc|limited|group|\(.*?\))\b/gi, "").trim() || name;
  const initials = clean
    .split(/[\s.\-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const a = `hsl(${h} 70% 62%)`;
  const b = `hsl(${(h + 50) % 360} 75% 52%)`;
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-[12px] font-semibold text-white ring-1 ring-white/15"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, ${a}, ${b})`, boxShadow: `0 8px 24px -10px ${b}` }}
      aria-hidden
    >
      {initials || "•"}
    </span>
  );
}

export function SectionTitle({ title, sub, right }: { title: string; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[2rem] font-semibold tracking-[-0.03em] sm:text-[2.3rem]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-[0.98rem] text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
