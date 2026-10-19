import Link from "next/link";
import { HeroDemo } from "@/components/landing/hero-demo";
import { Steps } from "@/components/landing/steps";
import { IconArrow, IconBolt, IconCheck, IconLayers, IconLock, IconSpark, IconVault, IconBriefcase, IconEye } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { Logo } from "@/components/ui";

const PROMISES = [
  { icon: IconVault, a: "Your CV", b: "Verified facts" },
  { icon: IconBriefcase, a: "Employer job boards", b: "Real openings" },
  { icon: IconSpark, a: "NVIDIA Nemotron", b: "Expert drafting" },
  { icon: IconCheck, a: "You approve", b: "Full control" },
];

const DECIDES = [
  {
    who: "Nemotron reads and writes",
    icon: IconSpark,
    tone: "from-[#7b6cff] to-[#c06bff]",
    items: ["Lightning extracts facts from your CV, with verbatim quotes", "Super rates fit against each requirement", "Super drafts bullets and your note", "Ultra gives honest positioning advice on request"],
  },
  {
    who: "Code makes the calls",
    icon: IconLayers,
    tone: "from-[#4f9dff] to-[#36c5ff]",
    items: ["Every quote must exist in your document", "Hiring signal from the employer's own board, dates and links", "The Claims Ledger checks numbers, tools, scope and seniority", "An AI auditor can only make a verdict stricter"],
  },
  {
    who: "You decide",
    icon: IconCheck,
    tone: "from-[#30d158] to-[#4fd1c5]",
    items: ["Confirm or reject every fact", "Fix or remove any flagged line", "Approve the exact pack that's sent", "Apply yourself. Nothing is ever auto-submitted"],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Logo tagline />
        <div className="hidden items-center gap-2 rounded-full border border-rule bg-white/[0.04] px-4 py-1.5 text-xs text-muted md:flex">
          Powered by
          <span className="font-semibold tracking-wide text-[#76b900]">NVIDIA</span>
          <span className="text-ink-2">Nemotron</span>
          <span className="text-rule-strong">|</span>
          <span className="font-semibold tracking-[0.18em] text-ink">NEBIUS</span>
        </div>
        <nav className="flex items-center gap-2">
          <a href="https://github.com/lk-nyoka/callback" className="btn btn-quiet btn-sm hidden sm:inline-flex">
            GitHub
          </a>
          <Link href="/home" className="btn btn-primary btn-sm">
            Open Callback
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div className="rise">
            <h1 className="display text-[2.9rem] sm:text-[4rem] xl:text-[4.6rem]">
              <span className="text-silver whitespace-nowrap">Real jobs.</span> <span className="text-silver whitespace-nowrap">Real evidence.</span>
              <br />
              <span className="text-silver">Your career, </span>
              <span className="text-gradient whitespace-nowrap">on track.</span>
            </h1>
            <p className="mt-7 max-w-[34rem] text-[1.12rem] leading-relaxed text-ink-2">
              Callback finds roles published on employers&apos; own job boards, builds a Vault of facts you confirm from your CV, and drafts applications where every line is checked against them. No guesswork. No inflated claims.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/home" className="btn btn-accent px-6 py-3 text-base">
                Get started <IconArrow size={18} />
              </Link>
              <Link href="/vault" className="btn btn-quiet px-5 py-3 text-base">
                Try the sample CV
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">Free. No account. Your workspace is private to this browser.</p>
            <ul className="glass mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl sm:grid-cols-4">
              {PROMISES.map(({ icon: Icon, a, b }) => (
                <li key={a} className="flex items-start gap-2.5 bg-black/10 px-4 py-3.5">
                  <span className="mt-0.5 text-accent-2">
                    <Icon size={17} />
                  </span>
                  <span className="text-[0.82rem] leading-snug">
                    <span className="block font-medium text-ink">{a}</span>
                    <span className="text-muted">{b}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rise [animation-delay:150ms]">
            <HeroDemo />
          </div>
        </section>

        {/* Steps */}
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <Reveal>
            <p className="text-sm font-medium text-accent-2">How it works</p>
            <h2 className="display mt-2 text-[2.2rem] sm:text-[3rem]">
              From <span className="text-gradient">&ldquo;I have a CV&rdquo;</span> to &ldquo;I&apos;m ready to apply&rdquo;.
            </h2>
            <p className="mt-3 max-w-2xl text-ink-2">Five steps, one place. Tap a step to look closer.</p>
          </Reveal>
          <Reveal className="mt-10" delay={100}>
            <Steps />
          </Reveal>
        </section>

        {/* The problem, in one line */}
        <section className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8">
          <Reveal>
            <p className="display text-[2rem] leading-tight sm:text-[3.2rem]">
              <span className="text-silver">About 1 in 5 advertised jobs led to no hiring activity.</span>
              <br />
              <span className="text-gradient">AI CV tools turn &ldquo;helped with&rdquo; into &ldquo;led&rdquo;.</span>
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-ink-2">
              Most tools help you send more applications, faster, with more embellishment. Callback does the opposite: fewer applications, to roles with visible hiring evidence, with claims you can defend in an interview.
            </p>
            <p className="mt-3 text-xs text-muted">Ghost-job figure: Greenhouse, Q2, reported by Allwork.Space (Aug 2026).</p>
          </Reveal>
        </section>

        {/* Who decides */}
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <Reveal>
            <p className="text-sm font-medium text-accent-2">Trust, by design</p>
            <h2 className="display mt-2 text-[2.2rem] sm:text-[3rem]">Models read and write. Code decides. You approve.</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {DECIDES.map(({ who, icon: Icon, tone, items }, i) => (
              <Reveal key={who} delay={i * 120}>
                <div className="glass lift h-full rounded-[26px] p-6">
                  <span className={`grid size-11 place-items-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg`}>
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight">{who}</h3>
                  <ul className="mt-4 space-y-2.5 text-[0.93rem] text-ink-2">
                    {items.map((t) => (
                      <li key={t} className="flex gap-2.5">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/40" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Measured, honestly */}
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <Reveal>
            <div className="glass-strong relative overflow-hidden rounded-[32px] p-8 sm:p-12">
              <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-accent/30 blur-3xl" />
              <p className="text-sm font-medium text-accent-2">Measured, not promised</p>
              <h2 className="display mt-2 max-w-3xl text-[2rem] sm:text-[2.6rem]">We tested the Ledger on claims it had never seen.</h2>
              <dl className="mt-10 grid gap-8 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-muted">Overstated claims stopped before approval</dt>
                  <dd className="display mt-2 text-[3.2rem] text-gradient">16 of 19</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Honest lines wrongly blocked</dt>
                  <dd className="display mt-2 text-[3.2rem]">0 of 9</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Who reviews the rest</dt>
                  <dd className="display mt-2 text-[3.2rem]">You</dd>
                </div>
              </dl>
              <p className="mt-8 max-w-3xl text-sm text-muted">
                Fresh held-out set, written after the Ledger was frozen and run once (code plus Nemotron auditor). Small, synthetic and written by the same team, so read it as evidence, not proof. Full method and every miss are in the README.
              </p>
            </div>
          </Reveal>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-4xl px-5 pb-24 pt-10 text-center sm:px-8">
          <Reveal>
            <h2 className="display text-[2.4rem] sm:text-[3.4rem]">
              <span className="text-silver">Fewer applications.</span> <span className="text-gradient">More callbacks.</span>
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/home" className="btn btn-accent px-6 py-3 text-base">
                Get started <IconArrow size={18} />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 text-sm sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {[
            { icon: IconBriefcase, t: "Built for real careers", s: "Not more applications. Better ones." },
            { icon: IconBolt, t: "NVIDIA Nemotron on Nebius", s: "Lightning, Super and Ultra via Token Factory." },
            { icon: IconLock, t: "Your data stays yours", s: "Private workspace. Export or delete any time." },
            { icon: IconEye, t: "Open source", s: "MIT licensed on GitHub." },
          ].map(({ icon: Icon, t, s }) => (
            <div key={t} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-ink-2 ring-1 ring-rule">
                <Icon size={17} />
              </span>
              <span>
                <span className="block font-medium">{t}</span>
                <span className="text-muted">{s}</span>
              </span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
