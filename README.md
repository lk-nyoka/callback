# Callback

**Stop applying to everything. Start getting callbacks.**

Callback is a private job-search assistant. It reads your CV into a **Career Vault** of facts you confirm, finds roles that are live on employers' own hiring systems, shows the **hiring-signal evidence** for each one, and drafts applications in which **every line is checked by code against your confirmed facts**. If your documents can't prove it, it doesn't go in. Nothing is ever sent for you.

> Built for the **Nebius x NVIDIA Global AI Hackathon 2026**, Personal AI track.
> Models: **NVIDIA Nemotron 3.5 Lightning, Nemotron 3 Super and Nemotron 3 Ultra** on **Nebius Token Factory**. Search: **Tavily**. Licence: **MIT**.

| | |
|---|---|
| Live demo | `TODO: add URL after deploy` |
| Video (3 min) | `TODO: add YouTube URL` |

---

## The problem

Job seekers lose twice.

1. **Many listings go nowhere.** Greenhouse classified about one in five jobs advertised on digital job boards as showing no hiring activity. Long-open "evergreen" requisitions and reposted roles soak up applications that will never be read.
2. **AI has flooded the other side.** Anyone can generate a polished CV in seconds, so recruiters trust CVs less. The tools that write them happily turn "helped with" into "led", which makes honest candidates look weaker and dishonest ones look the same as everyone else.

Most AI job tools make both problems worse: they help you send *more* applications, faster, with *more* embellishment.

Callback does the opposite: **fewer applications, to roles that show real hiring signals, with claims you can defend in an interview.**

## How it works

```
CV ──► Career Vault ──► Discover ──► Hiring signal ──► Fit ──► Application pack ──► You approve ──► Tracker
        (you confirm)    (ATS + Tavily)  (code)        (Super + code)  (Super + Claims Ledger)     (you apply)
                                   ▲
                       Overnight watch re-runs this every night
```

### Who decides what

| Step | Who decides |
|---|---|
| Read the CV into facts | **Nemotron 3.5 Lightning** proposes facts with verbatim quotes; **code** verifies every quote exists in the document; **you** confirm each fact |
| Is this job live? | **Code**, from the employer's own ATS job board, first-publish date and a live link check |
| How well do you fit? | **Nemotron 3 Super** rates each requirement and cites fact IDs; **code** drops uncited "met" ratings and computes the level |
| Draft CV bullets and note | **Nemotron 3 Super**, every line citing fact IDs |
| Is each line true? | **Code**: the Claims Ledger. A **Lightning auditor** can make a verdict stricter, never more permissive |
| Honest positioning advice | **Nemotron 3 Ultra**, only when you click "Deep analysis" |
| Send the application | **You.** There is no auto-submit and no bulk apply |

## The Claims Ledger

Every drafted line arrives as `{ text, factIds }`. `src/lib/ledger.ts` then checks it, in layers:

1. **Citations.** Every cited fact must exist and be confirmed by you.
2. **Hard checks, no rescue.** Numbers (including number words, so "five" can't dodge "3"), quantity words (doubled, halved), scope (enterprise-wide, global, at scale), superlatives (award-winning, best), audience (executives, board), capability phrases (machine learning, forecasting, in production) and seniority/ownership verbs in curated families (led, managed, architected, mentored, founded...) must all appear in the cited facts.
3. **Named terms.** Tools, technologies and organisations must appear in the cited facts. The target company and role may be named, but never in a claim of having worked there.
4. **Novelty.** A line that adds two or more substantive words its cited facts never mention is routed to you. This catches exaggeration written in ordinary words that no vocabulary list can name.
5. **Uncited lines** (connective sentences in the note) may not claim experience or quality ("extensive experience", "consistently", "expert").
6. **Auditor.** Nemotron 3.5 Lightning reviews lines the code passed and can only downgrade them to "check this".

There is no "ignore" button. A flagged line is resolved by rewriting it (or asking Super to rewrite it honestly), removing it, or adding a true fact to your Vault, which is then marked as added by you.

### Measured results

All numbers come from the labelled sets in `evals/` (synthetic CV facts). Run `npm run eval` and `npm run eval:live`.

| Set | Cases | Overstated claims that reached approval | Honest lines blocked | Honest lines sent to you to confirm |
|---|---:|---:|---:|---:|
| Tuning set (`ledger-cases.json`), code only | 44 | **0 / 31** | 0 / 13 | 0 / 13 |
| **Held-out set** (`ledger-heldout.json`), code only, first run | 28 | 13 / 18 | 0 / 10 | 0 / 10 |
| Held-out, code after adding the novelty layer (designed after seeing the first run) | 28 | 2 / 18 | 0 / 10 | 2 / 10 |
| **Held-out, full stack (code + Lightning auditor)** | 28 | **1 / 18** | **0 / 10** | 2 / 10 |

The held-out set was written after the tuning set. The first run is reported as measured, which showed that vocabulary rules alone miss most exaggeration phrased in ordinary words. That result is why the novelty layer exists; since it was designed after seeing those failures, the next step is a fresh held-out set. The remaining miss ("...where I was promoted to analyst") is why you review every pack before approving.

The ledger also caught a real model draft during development: from the fact *"Track club income and expenses in Google Sheets"*, Nemotron 3 Super wrote *"**Managed** club finances as Volunteer Treasurer"*. The ledger blocked it (`escalated_claim:managed`).

## Hiring signals

Callback never calls a job fake. It shows observable evidence and computes a status in code (`src/lib/signals.ts`, weights in `signals-config.ts`):

| Signal | Source | Weight |
|---|---|---:|
| Live on the employer's own ATS board right now | Greenhouse / Ashby / Lever public job-board APIs | +3 |
| First published within 30 days | ATS `first_published` / `publishedAt` | +2 |
| Open more than 90 days (even if edited recently: evergreen requisitions are a known ghost-listing pattern) | ATS dates | −2 |
| Application link resolves to the live posting | HTTP check | +1 / −2 |
| Employer published or updated 3+ other roles in 30 days | Same board | +1 |
| Same role on an independent page | Tavily | +1 |
| Disappeared from the employer's board | Re-check | −3 |
| Reposted 3+ times | Callback's own history | −2, shown as "needs a few weeks of history" until then |

Statuses: **Strong signal**, **Mixed signal**, **Low hiring signal**, **Insufficient evidence**. Every observation shows its source and time, and every listing has a **Re-check** button. A dead link or a vanished listing prevents "Strong".

Recent "updated" timestamps alone never count as fresh: ATS systems bump them for many reasons, and a role first posted in 2021 and edited last week is still a 2021 posting.

## Where NVIDIA, Nebius and Tavily are used

- **Nemotron 3.5 Lightning** (reasoning off): CV fact extraction, web-listing normalisation, the claims auditor. Turning reasoning off for mechanical extraction cut one extraction from 55 s and 16k tokens (with no usable answer) to about 4 s and under 1k tokens.
- **Nemotron 3 Super** (reasoning on): fit scoring per requirement, drafting application packs, honest rewrites.
- **Nemotron 3 Ultra**: on-demand "how to position yourself honestly" analysis.
- **Nebius Token Factory**: one OpenAI-compatible client for all three tiers (`src/lib/nemotron.ts`), with a one-tier-down fallback chain, JSON validation with one corrective retry, and every call logged.
- **Tavily**: finds employer job boards and careers-page listings beyond the built-in board list; also an independent-source signal.
- **"How this ran"** panel on every screen: model per step, tokens, latency, fallbacks and every source fetched.

## Run it

Requires Node 20+.

```bash
git clone https://github.com/lk-nyoka/callback.git
cd callback
npm install
cp .env.example .env.local   # add NEBIUS_API_KEY (and TAVILY_API_KEY)
npm run dev                  # http://localhost:3000
npm test                     # 53 unit tests + ledger evaluations
```

Check model IDs available to your key:

```bash
curl -s https://api.tokenfactory.nebius.com/v1/models -H "Authorization: Bearer $NEBIUS_API_KEY" | grep -o '"nvidia/[^"]*"'
```

Try it without your own CV: open the Vault and choose **Use a sample CV** (a fictional junior data analyst in Johannesburg).

### Deploy (free tiers)

1. **Supabase**: create a project, run `supabase/schema.sql`, copy the URL and service-role key.
2. **Vercel**: import the repo, set the variables from `.env.example`. `vercel.json` schedules the overnight watch; or use `.github/workflows/overnight-watch.yml` with `CRON_SECRET` and `CALLBACK_URL` secrets.

Without Supabase variables Callback stores workspaces as JSON files in `.data/` (local development only).

## Architecture

- **Next.js 15** (App Router) on Vercel: UI and API in one deploy.
- **Workspaces**: each visitor gets a private, cookie-scoped workspace. No sign-up; export or delete everything from "Your data".
- **Storage**: one JSON document per workspace (Supabase Postgres `jsonb` in production, files locally).
- `src/lib/` holds the logic: `ledger.ts`, `signals.ts`, `ats.ts`, `discovery.ts`, `matching.ts` (hard filters), `vault.ts`, `fit.ts`, `composer.ts`, `nemotron.ts`, `tavily.ts`.

## Privacy and source policy

- Your CV text goes to Nebius Token Factory for inference only. Callback does not train on it. Review Nebius's data terms before uploading real documents.
- Job searches go to employers' public job boards and Tavily. Your CV is never sent to them.
- Callback uses documented public ATS job-board APIs and Tavily. It does not scrape LinkedIn, Indeed or Glassdoor.
- Prompts treat documents and web pages as untrusted data. Verdicts and the approval gate live outside the model.
- Daily approval cap (default 10). No auto-submit.

## What is real and what is demo

| | Status |
|---|---|
| Nemotron calls | Live, Nebius Token Factory |
| Job listings and hiring signals | Live from employer ATS boards and Tavily |
| Demo CV | Synthetic (`data/demo/`) |
| Overnight watch | Real endpoint; scheduled with Vercel Cron or GitHub Actions |
| Outcomes in the tracker | Entered by you, never inferred |
| Evaluation numbers | Measured on the included synthetic sets only |

## Limitations

- Hiring signals are evidence, not proof, and will sometimes be wrong both ways.
- Public ATS feeds cover many global employers but few South African ones; Tavily widens coverage, and broad local coverage will need job-feed partnerships.
- The ledger is conservative and still imperfect (see the held-out result). Every pack needs your review.
- English-language CVs and postings only so far. Scanned-image PDFs are not supported.

## Path to production

| Stage | Scope |
|---|---|
| Now | Single-user workspaces, live discovery, ledger, overnight watch |
| Next | Accounts, per-user budgets, SmartRecruiters and Workable feeds, embeddings-based paraphrase checking, larger held-out evaluation |
| Then | "Verified by Callback" packs employers can audit line by line; university and youth-employment programme dashboards |

## Feedback on the tools

- **Token Factory**: the OpenAI-compatible API made three Nemotron tiers a config change. The biggest surprise: reasoning is on by default, and a 16k `max_tokens` extraction call spent its whole budget reasoning and returned almost nothing. `chat_template_kwargs: { enable_thinking: false }` fixed it, but we found it by experiment. It deserves a prominent place in the docs and model cards.
- **Nemotron**: Lightning with reasoning off was fast and faithful at verbatim quoting (23 facts, 0 unverifiable quotes on the demo CV). Super's drafts were strong but naturally embellished ("managed" for "tracked"), which is exactly why the ledger exists.
- **Tavily**: `TODO after testing with a key`.

## Pre-existing work

All code was written during the submission period (October 2026). The concept README predates the code.

## Licence

MIT. See [LICENSE](LICENSE).
