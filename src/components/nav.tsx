"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBriefcase, IconDoc, IconHome, IconLock, IconMoon, IconVault } from "./icons";
import { Logo } from "./ui";
import { TransparencyButton } from "./transparency";
import { useWorkspace } from "./workspace";

export function AppNav() {
  const path = usePathname();
  const { state } = useWorkspace();
  const pending = state?.facts.filter((f) => f.status === "extracted").length ?? 0;
  const fresh = state?.jobs.filter((j) => j.isNew).length ?? 0;
  const drafts = state?.applications.filter((a) => a.status === "drafted").length ?? 0;
  const items = [
    { href: "/home", label: "Home", icon: IconHome },
    { href: "/vault", label: "Vault", icon: IconVault, count: pending, hint: "facts to review" },
    { href: "/jobs", label: "Jobs", icon: IconBriefcase, count: fresh, hint: "new" },
    { href: "/applications", label: "Applications", icon: IconDoc, count: drafts, hint: "drafts" },
    { href: "/overnight", label: "Overnight", icon: IconMoon },
    { href: "/settings", label: "Your data", icon: IconLock },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-[rgba(5,6,11,0.72)] backdrop-blur-2xl md:h-screen md:border-b-0 md:border-r md:bg-[rgba(255,255,255,0.02)]">
      <div className="flex flex-col gap-3 px-4 py-3 md:h-full md:gap-8 md:px-4 md:py-7">
        <div className="flex items-center justify-between gap-3 md:px-2">
          <Link href="/" aria-label="Callback home">
            <Logo />
          </Link>
          <div className="md:hidden">
            <TransparencyButton />
          </div>
        </div>
        <nav aria-label="Main" className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:overflow-visible md:px-0">
          {items.map(({ href, label, icon: Icon, count, hint }) => {
            const active = path === href || path.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-[0.93rem] transition-colors ${
                  active ? "bg-white/[0.09] text-ink ring-1 ring-white/10" : "text-muted hover:bg-white/[0.05] hover:text-ink"
                }`}
              >
                {active && <span className="absolute left-0 top-1/2 hidden h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-accent to-accent-2 md:block" />}
                <Icon size={18} className={active ? "text-accent-2" : ""} />
                <span className="flex-1">{label}</span>
                {!!count && (
                  <span className="rounded-full bg-gradient-to-r from-accent to-accent-2 px-1.5 text-[0.7rem] font-semibold text-white" title={`${count} ${hint}`}>
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:mt-auto md:block">
          <TransparencyButton />
          <div className="glass mt-4 rounded-2xl p-3 text-xs leading-snug text-muted">
            <p className="font-semibold text-ink-2">
              Runs on <span className="text-[#76b900]">NVIDIA</span> Nemotron
            </p>
            <p className="mt-0.5">via Nebius Token Factory. Verdicts are computed by code.</p>
          </div>
        </div>
      </div>
    </header>
  );
}
