"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IconArrow, IconBriefcase, IconDoc, IconMoon, IconPin, IconSearch, IconVault } from "@/components/icons";
import { Orb } from "@/components/orb";
import { ErrorNote, FitBadge, Monogram, SignalBadge } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { api, displayLocation, timeAgo } from "@/lib/client";

const ROLES = ["Data Analyst", "Data Scientist", "BI Analyst", "Data Engineer", "Software Engineer"];
const PLACES = ["Johannesburg", "Cape Town", "Pretoria", "Durban"];
const STAGES = ["Searching employer job boards", "Finding roles on careers pages with Tavily", "Testing application links", "Scoring your fit with Nemotron 3 Super"];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function HomePage() {
  const { state, refresh } = useWorkspace();
  const router = useRouter();
  const [role, setRole] = useState("");
  const [place, setPlace] = useState("Johannesburg");
  const [remote, setRemote] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [err, setErr] = useState("");
  const [hello, setHello] = useState("Welcome");

  useEffect(() => setHello(greeting()), []);
  useEffect(() => {
    if (state?.intent && !role) {
      setRole(state.intent.role);
      const p = state.intent.locations.find((l) => !/remote/i.test(l));
      if (p) setPlace(p);
      setRemote(state.intent.remoteOk);
    }
  }, [state?.intent, role]);
  useEffect(() => {
    if (!busy) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 9000);
    return () => clearInterval(t);
  }, [busy]);

  const stats = useMemo(() => {
    const s = state;
    return {
      confirmed: s?.facts.filter((f) => f.status === "user_confirmed").length ?? 0,
      pending: s?.facts.filter((f) => f.status === "extracted").length ?? 0,
      roles: s?.jobs.length ?? 0,
      strong: s?.jobs.filter((j) => j.signal?.status === "strong").length ?? 0,
      drafts: s?.applications.filter((a) => a.status === "drafted").length ?? 0,
      sent: s?.applications.filter((a) => !["drafted", "approved"].includes(a.status)).length ?? 0,
      replies: s?.applications.filter((a) => ["replied", "interview"].includes(a.status)).length ?? 0,
    };
  }, [state]);

  const hasVault = stats.confirmed >= 3;
  const top = (state?.jobs ?? []).filter((j) => j.fit?.level === "strong" || j.signal?.status === "strong").slice(0, 3);
  const lastRun = state?.watchRuns[state.watchRuns.length - 1];

  async function search(r = role) {
    if (!r.trim()) return setErr("Type a role, or pick one below.");
    if (!hasVault) {
      router.push("/vault");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api("/api/intent", {
        method: "POST",
        json: {
          role: r.trim(),
          locations: [place, ...(remote ? ["Remote"] : [])],
          remoteOk: remote,
          seniority: state?.intent?.seniority ?? "junior",
          keywords: state?.intent?.keywords ?? [],
          dealbreakers: state?.intent?.dealbreakers ?? [],
        },
      });
      await api("/api/discover", { method: "POST" });
      await refresh();
      router.push("/jobs");
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[2.2rem] font-semibold tracking-[-0.035em] sm:text-[2.7rem]">{hello}</h1>
          <p className="mt-1 text-muted">Let&apos;s find roles that are really hiring, and apply with claims you can defend.</p>
        </div>
      </div>

      {/* Search hero */}
      <section className="glass-strong relative mt-8 overflow-hidden rounded-[30px] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-28 opacity-50 sm:-right-6 sm:-top-10 sm:opacity-90">
          <Orb size={busy ? 230 : 200} mood={busy ? "thinking" : "idle"} />
        </div>
        <div className="relative max-w-2xl">
          <h2 className="text-lg font-semibold">What kind of role are you looking for?</h2>
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <div className="flex items-center gap-2 rounded-full border border-rule-strong bg-black/30 p-1.5 pl-4 focus-within:border-accent/60 focus-within:shadow-[0_0_0_4px_rgba(123,108,255,0.16)]">
              <IconSearch size={18} className="text-muted" />
              <label htmlFor="role" className="sr-only">
                Role
              </label>
              <input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Data Analyst, ML Engineer, Software Engineer…" className="min-w-0 flex-1 bg-transparent py-2 text-[1rem] outline-none placeholder:text-[#6e6e78]" disabled={busy} />
              <button className="btn btn-accent size-11 shrink-0 p-0" aria-label="Find roles" disabled={busy}>
                <IconArrow size={18} />
              </button>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-muted">Popular</span>
            {ROLES.map((r) => (
              <button key={r} className={`chip ${role === r ? "active" : ""}`} aria-pressed={role === r} onClick={() => setRole(r)} disabled={busy}>
                {r}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 flex items-center gap-1 text-xs text-muted">
              <IconPin size={13} />
              Where
            </span>
            {PLACES.map((p) => (
              <button key={p} className={`chip ${place === p ? "active" : ""}`} aria-pressed={place === p} onClick={() => setPlace(p)} disabled={busy}>
                {p}
              </button>
            ))}
            <button className={`chip ${remote ? "active" : ""}`} aria-pressed={remote} onClick={() => setRemote((v) => !v)} disabled={busy}>
              + Remote
            </button>
          </div>

          {busy && (
            <div className="mt-6 space-y-2" aria-live="polite">
              {STAGES.map((s, i) => (
                <p key={s} className={`flex items-center gap-2.5 text-sm transition-opacity ${i <= stage ? "opacity-100" : "opacity-35"}`}>
                  <span className={`grid size-4 place-items-center rounded-full ${i < stage ? "bg-verified text-black" : i === stage ? "bg-accent/30 ring-2 ring-accent/60" : "bg-white/10"}`}>
                    {i < stage && <span className="text-[0.6rem] font-bold">✓</span>}
                  </span>
                  {s}
                </p>
              ))}
              <p className="pt-1 text-xs text-muted">Usually under a minute. Every step shows up in &ldquo;How this ran&rdquo;.</p>
            </div>
          )}
          {!hasVault && !busy && <p className="mt-5 text-sm text-caution">Confirm at least 3 facts in your Vault first. The search uses them to score your fit.</p>}
          <div className="mt-3">
            <ErrorNote>{err}</ErrorNote>
          </div>
        </div>
      </section>

      {/* Action cards */}
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <ActionCard
          icon={<IconVault size={20} />}
          title="Career Vault"
          body={stats.confirmed ? `${stats.confirmed} confirmed facts${stats.pending ? `, ${stats.pending} waiting for you` : ""}.` : "Upload your CV. Every fact is linked to its source and confirmed by you."}
          href="/vault"
          cta={stats.confirmed || stats.pending ? (stats.pending ? "Review facts" : "Open Vault") : "Upload CV"}
          tone="from-[#7b6cff] to-[#c06bff]"
        />
        <ActionCard
          icon={<IconBriefcase size={20} />}
          title="Job search"
          body={stats.roles ? `${stats.roles} live roles, ${stats.strong} with a strong hiring signal.` : "Roles from employers' own job boards and careers pages, with evidence."}
          href="/jobs"
          cta="Browse jobs"
          tone="from-[#4f9dff] to-[#36c5ff]"
        />
        <ActionCard
          icon={<IconDoc size={20} />}
          title="Application packs"
          body={stats.drafts || stats.sent ? `${stats.drafts} draft${stats.drafts === 1 ? "" : "s"}, ${stats.sent} sent, ${stats.replies} with a reply.` : "CV bullets and a note, every line checked by the Claims Ledger."}
          href="/applications"
          cta="Open packs"
          tone="from-[#30d158] to-[#4fd1c5]"
        />
      </section>

      {/* Stats */}
      <section className="glass mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[24px] sm:grid-cols-4">
        {[
          ["Verified facts", stats.confirmed],
          ["Live roles", stats.roles],
          ["Applications sent", stats.sent],
          ["Replies & interviews", stats.replies],
        ].map(([label, n]) => (
          <div key={label} className="bg-black/10 px-5 py-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-[1.9rem] font-semibold tracking-tight tabular-nums">{n}</p>
          </div>
        ))}
      </section>

      {/* Top roles + overnight */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="glass min-w-0 rounded-[24px] p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Best matches right now</h3>
            <Link href="/jobs" className="text-sm text-accent-2 hover:underline">
              See all
            </Link>
          </div>
          {top.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Run a search to see your strongest roles here.</p>
          ) : (
            <ul className="mt-3 divide-y divide-rule">
              {top.map((j) => (
                <li key={j.id}>
                  <Link href={`/jobs/${j.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-white/[0.04]">
                    <Monogram name={j.company} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{j.title}</span>
                      <span className="block truncate text-xs text-muted">
                        {j.company} · {displayLocation(j.location, state?.intent?.locations)}
                      </span>
                    </span>
                    <span className="hidden gap-1.5 sm:flex">
                      <FitBadge level={j.fit?.level} />
                      <SignalBadge status={j.signal?.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link href="/overnight" className="glass lift group flex flex-col rounded-[24px] p-5">
          <span className="flex items-center gap-2 text-sm text-muted">
            <IconMoon size={16} /> Overnight watch
          </span>
          <span className="mt-3 text-lg font-semibold leading-snug">
            {lastRun ? (lastRun.newJobs ? `${lastRun.newJobs} new role${lastRun.newJobs > 1 ? "s" : ""} found` : "No new roles last run") : state?.intent ? "Scheduled nightly" : "Save a search to switch it on"}
          </span>
          <span className="mt-1 text-sm text-muted">{lastRun ? `Last run ${timeAgo(lastRun.at)}` : "Re-checks boards, links and fit while you sleep."}</span>
          <span className="mt-auto flex items-center gap-1 pt-5 text-sm text-accent-2">
            Open digest <IconArrow size={15} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </section>
    </div>
  );
}

function ActionCard({ icon, title, body, href, cta, tone }: { icon: React.ReactNode; title: string; body: string; href: string; cta: string; tone: string }) {
  return (
    <Link href={href} className="glass lift group flex flex-col rounded-[24px] p-5">
      <span className={`grid size-11 place-items-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg`}>{icon}</span>
      <span className="mt-4 text-lg font-semibold">{title}</span>
      <span className="mt-1 text-sm leading-relaxed text-muted">{body}</span>
      <span className="mt-auto pt-5">
        <span className="btn btn-quiet btn-sm">
          {cta} <IconArrow size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}
