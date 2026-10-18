"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    { href: "/vault", label: "Vault", count: pending, hint: "facts to review" },
    { href: "/jobs", label: "Jobs", count: fresh, hint: "new" },
    { href: "/applications", label: "Applications", count: drafts, hint: "drafts" },
    { href: "/overnight", label: "Overnight" },
    { href: "/settings", label: "Your data" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur md:h-screen md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:flex-col md:items-stretch md:gap-6 md:px-5 md:py-8">
        <Link href="/" aria-label="Callback home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto md:flex-col">
          {items.map((it) => {
            const active = path === it.href || path.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-[0.95rem] ${active ? "bg-ink text-paper" : "text-ink-2 hover:bg-sunk"}`}
              >
                {it.label}
                {!!it.count && (
                  <span className={`rounded px-1.5 text-xs ${active ? "bg-paper/20" : "bg-sunk text-muted"}`} title={`${it.count} ${it.hint}`}>
                    {it.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:mt-auto md:block">
          <TransparencyButton />
          <p className="mt-3 text-xs leading-snug text-muted">Runs on NVIDIA Nemotron via Nebius Token Factory.</p>
        </div>
      </div>
      <div className="flex justify-end px-4 pb-2 md:hidden">
        <TransparencyButton />
      </div>
    </header>
  );
}
