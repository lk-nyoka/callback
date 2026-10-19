"use client";

// The Callback "signal orb": an original, animated glass sphere that stands
// in for an assistant mascot. Its colour reflects the state of the work:
// idle (indigo/sky), thinking (faster swirl), verified (green), blocked (red).

export type OrbMood = "idle" | "thinking" | "verified" | "blocked";

const PALETTE: Record<OrbMood, [string, string, string]> = {
  idle: ["#7b6cff", "#4f9dff", "#c06bff"],
  thinking: ["#8c7bff", "#36c5ff", "#b26bff"],
  verified: ["#30d158", "#4fd1c5", "#7b6cff"],
  blocked: ["#ff5a4f", "#ff9f0a", "#c06bff"],
};

export function Orb({ size = 220, mood = "idle", className = "" }: { size?: number; mood?: OrbMood; className?: string }) {
  const [a, b, c] = PALETTE[mood];
  const speed = mood === "thinking" ? "6s" : "14s";
  return (
    <div className={`relative select-none ${className}`} style={{ width: size, height: size }} aria-hidden>
      {/* outer glow */}
      <div className="absolute inset-[-25%] rounded-full opacity-60 blur-3xl transition-[background] duration-700" style={{ background: `radial-gradient(circle, ${a}55 0%, transparent 65%)` }} />
      {/* swirling core */}
      <div className="absolute inset-0 overflow-hidden rounded-full" style={{ boxShadow: `inset 0 0 ${size / 6}px rgba(255,255,255,0.18), 0 ${size / 10}px ${size / 3}px -${size / 8}px ${a}88` }}>
        <div
          className="absolute inset-[-30%] rounded-full blur-2xl transition-[background] duration-700"
          style={{ background: `conic-gradient(from 0deg, ${a}, ${b}, ${c}, ${a})`, animation: `spin ${speed} linear infinite` }}
        />
        <div className="absolute inset-[18%] rounded-full blur-xl" style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.75), transparent 55%)`, opacity: 0.55 }} />
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 70% 85%, rgba(0,0,0,0.45), transparent 60%)" }} />
      </div>
      {/* glass rim + specular */}
      <div className="absolute inset-0 rounded-full border border-white/20" />
      <div className="absolute left-[18%] top-[10%] h-[22%] w-[38%] rotate-[-20deg] rounded-full bg-white/35 blur-md" />
    </div>
  );
}
