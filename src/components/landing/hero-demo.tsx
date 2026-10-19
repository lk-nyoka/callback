"use client";

import { useCallback, useState } from "react";
import { LiveLedger } from "@/components/live-ledger";
import { Orb, type OrbMood } from "@/components/orb";
import { Tilt } from "@/components/reveal";
import type { LedgerVerdict } from "@/lib/types";

// A floating "window" holding the real Claims Ledger. The orb reacts to the
// verdict: green when the line is supported, red when it is blocked.
export function HeroDemo() {
  const [mood, setMood] = useState<OrbMood>("blocked");
  const onVerdict = useCallback((v: LedgerVerdict) => setMood(v.status === "pass" ? "verified" : v.status === "blocked" ? "blocked" : "thinking"), []);
  return (
    <div className="relative">
      <Orb size={300} mood={mood} className="pointer-events-none absolute -right-14 -top-28 z-0 hidden sm:block lg:-right-24 lg:-top-32" />
      <Orb size={120} mood={mood} className="pointer-events-none absolute -bottom-10 -left-10 z-0 hidden opacity-70 lg:block" />
      <Tilt max={4} className="relative z-10">
        <div className="glass-strong relative overflow-hidden rounded-[26px]">
          {/* window chrome */}
          <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-xs font-medium text-muted">Claims Ledger</span>
            <span className="ml-auto rounded-full bg-[rgba(123,108,255,0.18)] px-2 py-0.5 text-[0.68rem] font-semibold text-[#b9b1ff] ring-1 ring-[rgba(123,108,255,0.4)]">Live</span>
          </div>
          <div className="p-5 sm:p-6">
            <LiveLedger onVerdict={onVerdict} />
          </div>
        </div>
      </Tilt>
    </div>
  );
}
