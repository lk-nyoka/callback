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
      <div className="flex flex-col gap-2 px-4 py-3 md:h-full md:gap-6 md:px-5 md:py-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="Callback home">
            <Logo />
          </Link>
          <div className="md:hidden">
            <TransparencyButton />
          </div>
        </div>
        <nav aria-label="Main" className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:overflow-visible md:px-0">
          {items.map((it) => {
            const active = path === it.href || path.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[0.95rem] md:py-2 ${active ? "bg-ink text-paper" : "text-ink-2 hover:bg-sunk"}`}
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
    </header>
  );
}
