import Link from "next/link";
import { LiveLedger } from "@/components/live-ledger";

const DECIDES = [
  ["Read your CV into facts", "Nemotron 3.5 Lightning proposes, you confirm each one"],
  ["Is this job live?", "Code, from the employer's own job board, dates and link checks"],
  ["How well do you fit?", "Nemotron 3 Super rates each requirement, code checks its citations"],
  ["Draft your CV bullets and note", "Nemotron 3 Super writes, citing your facts"],
  ["Is each line true?", "Code: the Claims Ledger. A model can only make it stricter"],
  ["Send the application", "You. Callback never submits anything"],
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
          <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden>
            <rect width="32" height="32" rx="7" fill="var(--ink)" />
            <path d="M9 16.5l4.5 4.5L23 11" fill="none" stroke="var(--paper)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Callback
        </span>
        <nav className="flex items-center gap-2">
          <a href="https://github.com/lk-nyoka/callback" className="btn btn-quiet btn-sm hidden sm:inline-flex">
            Source code
          </a>
          <Link href="/vault" className="btn btn-primary btn-sm">
            Open Callback
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-16">
          <div>
            <h1 className="text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[3.6rem]">
              Stop applying to everything. Start getting callbacks.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-2">
              Callback finds roles that are live on employers&apos; own hiring systems, shows you the evidence, and drafts applications where every line is checked against your own CV. If your documents can&apos;t prove it, it doesn&apos;t go in.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/vault" className="btn btn-primary">
                Try it with your CV
              </Link>
              <Link href="/vault" className="btn btn-quiet">
                Try it with a sample CV
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">Free, no account. Your workspace is private to this browser and you can delete it any time.</p>
          </div>
          <LiveLedger />
        </section>

        <section className="border-t border-rule bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-3">
            <div>
              <h2 className="text-xl font-semibold">Jobs that are actually hiring</h2>
              <p className="mt-2 text-ink-2">
                Roughly one in five advertised jobs shows no hiring activity. Callback checks each role against the employer&apos;s own job board, when it was first published, and whether the application link still works, then shows you that evidence instead of a made-up score.
              </p>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Applications that can&apos;t embellish</h2>
              <p className="mt-2 text-ink-2">
                AI CV tools happily turn &ldquo;helped with&rdquo; into &ldquo;led&rdquo;. Callback&apos;s Claims Ledger blocks any number, tool, scope or seniority word your confirmed facts don&apos;t contain, and shows you exactly why.
              </p>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Fewer, better applications</h2>
              <p className="mt-2 text-ink-2">
                There is no bulk-apply button and there never will be. A daily cap, a nightly watch for new matches, and a tracker for the outcomes you record yourself.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Who decides what</h2>
          <p className="mt-2 max-w-prose text-muted">Models read and write. Code makes the calls that have to be trustworthy. You approve everything.</p>
          <table className="mt-6 w-full max-w-4xl border-collapse text-left">
            <tbody>
              {DECIDES.map(([step, who]) => (
                <tr key={step} className="border-t border-rule align-top">
                  <th scope="row" className="py-3 pr-6 font-medium">
                    {step}
                  </th>
                  <td className="py-3 text-ink-2">{who}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
          <span>Built with NVIDIA Nemotron on Nebius Token Factory, for the Nebius x NVIDIA Global AI Hackathon.</span>
          <span>Open source, MIT licence.</span>
        </div>
      </footer>
    </div>
  );
}
