# Callback

**Stop applying to everything. Start getting callbacks.**

Callback is a private job-search assistant. It reads your CV into a **Career Vault** of facts you confirm, finds roles published on employers' own job boards, shows the **hiring-signal evidence** for each one, and drafts applications in which **every line must cite a confirmed fact and pass the Claims Ledger**: deterministic checks, plus a Nemotron audit that can only make a verdict stricter. Lines that fail are blocked or sent back to you. **You approve the final pack, and Callback never sends anything for you.**

> Built for the **Nebius x NVIDIA Global AI Hackathon 2026**, Personal AI track.
> Models: **NVIDIA Nemotron 3.5 Lightning, Nemotron 3 Super and Nemotron 3 Ultra** on **Nebius Token Factory**. Search: **Tavily**. License: **MIT**.

| | |
|---|---|
| Live demo | `TODO: add URL after deploy` |
| Video (3 min) | `TODO: add YouTube URL` |

---

## The problem

Job seekers lose twice.

1. **Many listings go nowhere.** Greenhouse classified about 19% of jobs advertised on digital job boards in Q2 as "ghost jobs": postings that received applications but produced no hiring activity such as interviews or job tests ([Allwork.Space, 21 Aug 2026](https://allwork.space/2026/08/nearly-1-in-5-job-ads-may-be-fake-ghost-jobs/); [FOX 5 DC](https://www.fox5dc.com/news/ghost-jobs-greenhouse-analysis)).
2. **AI has flooded the other side.** Anyone can generate a polished CV in seconds, and the tools that write them happily turn "helped with" into "led". Honest candidates end up looking weaker, and embellished ones look like everyone else.

Most AI job tools make both worse: they help you send *more* applications, faster, with *more* embellishment. Callback does the opposite: **fewer applications, to roles with visible hiring evidence, with claims you can defend in an interview.**

## How it works

```
CV ──► Career Vault ──► Discover ──► Hiring signal ──► Fit ──► Application pack ──► You approve ──► Tracker
        (you confirm)   (ATS boards,   (code)        (Super, then   (Super, then              (you apply
                         Tavily)                       code checks)   Claims Ledger)            yourself)
                                    ▲
                        The overnight watch re-runs this every night
```

### Who decides what

| Step | Who decides |
|---|---|
| Read the CV into facts | **Nemotron 3.5 Lightning** proposes facts with verbatim quotes; **code** verifies every quote exists in the document; **you** confirm each fact |
| Is the job still advertised? | **Code**, from the employer's own ATS job board, first-publish date and a live link check |
| How well do you fit? | **Nemotron 3 Super** rates each requirement and cites fact IDs; **code** drops uncited "met" ratings and computes the level |
| Draft CV bullets and note | **Nemotron 3 Super**, every line citing fact IDs |
| Does each line match your facts? | **Code** (the Claims Ledger), plus a **Lightning auditor** that can only make a verdict stricter. This reduces unsupported claims; it does not guarantee correctness |
| Honest positioning advice | **Nemotron 3 Ultra**, only when you click "Deep analysis" |
| Send the application | **You.** No auto-submit, no bulk apply, a daily cap |

## The Claims Ledger

Every drafted line arrives as `{ text, factIds }`. `src/lib/ledger.ts` checks it in layers. The reason code on each verdict names the layer that produced it.

| Layer | What it checks | Outcome | Reason codes |
|---|---|---|---|
| Citations | Every cited fact exists and you confirmed it | Block | `missing_or_unconfirmed_fact` |
| Hard rules | Numbers (including number words, so "five" can't dodge "3"), quantity words, scope, superlatives, audience (executives, board), capability phrases (machine learning, forecasting, in production), career progression (promoted), and seniority/ownership verbs in curated families (led, managed, architected, mentored, founded...) must appear in the cited facts | Block | `unsupported_number`, `unsupported_scope`, `escalated_claim`, `unsupported_progression`, ... |
| Uncited lines | Connective sentences may not claim experience or quality ("extensive experience", "consistently") | Block | `uncited_claim` |
| Named terms | Tools, technologies and organisations must appear in the cited facts. The target company and role may be named, but never in a claim of having worked there | Block, or route a single near-match to you | `unsupported_term`, `unmatched_term` |
| Novelty | Two or more substantive words the cited facts never mention | Route to you | `new_content` |
| Auditor | Nemotron 3.5 Lightning reviews lines the code passed | Can only downgrade to "check this" | `auditor_flag` |

The novelty layer is a **conservative review trigger, not a truth test**. Some honest elaboration trips it, and one well-chosen word can slip past it.

Other rules:
- **No "ignore" button.** A flagged line is resolved by rewriting it (or asking Super to rewrite it honestly), removing it, or adding a true fact to your Vault, which is marked as added by you.
- **Auditor flags are sticky.** Re-checking is pure code, but an auditor flag stays attached to that exact line (same text, same citations) until you change one of them.
- **Approval is bound to the exact pack.** Approving re-runs the ledger against your Vault *as it is now* and stores a SHA-256 hash of the approved lines. An approved pack can't be edited; you draft a new one instead.

### Measured results

All counts come from labelled sets in `evals/`, built on the synthetic demo CV. Run `npm run eval` (code only) and `npm run eval:live` (with the auditor).

**Caveats first:** the sets are small (18 to 31 overstated claims each), they are hand-written claims rather than real drafts, and the same author wrote the ledger and the test sets, so none of this is an independent evaluation.

| Set | How it was used | Overstated claims that reached approval | Honest lines blocked | Honest lines sent to you |
|---|---|---|---|---|
| **Fresh held-out v2** (`ledger-heldout-v2.json`) | Written after all ledger changes were frozen, run once | **Code only: 5 of 19. Code + auditor: 3 of 19** | 0 of 9 | 1 of 9 |
| Held-out v1 (`ledger-heldout.json`), first run | Before the novelty layer existed | Code only: 13 of 18 | 0 of 10 | 0 of 10 |
| Held-out v1 after the novelty layer | The layer was designed after seeing the first run, so this set is no longer held out | Code + auditor: 1 of 18 | 0 of 10 | 2 of 10 |
| Tuning set (`ledger-cases.json`) | The ledger was tuned on it, so this is a regression test, not evidence | 0 of 31 | 0 of 13 | 0 of 13 |

What got through on the fresh set, and why:

- **Relational claims: all three got past the code.** Word-level checks can't see who did what, when or where. "Assisted the manager who led the route-planning project" became "*Led* the route-planning project": every word is in the fact, but the relationship changed. Python at one employer and Java at another became "Used Java at the first employer". The auditor caught both of these. "50,000 transactions across two years" became "50,000 transactions *monthly*", which **passed both layers**. The fix is to compare structured claims (actor, action, object, time, place) rather than words. That is the next piece of work.
- **Timeframe and quality claims.** "...within my first month" and "highly analytical, detail-obsessed problem solver" also passed both layers.

The live drafts during development show the ledger doing its job on real model output: from the fact *"Track club income and expenses in Google Sheets"*, Nemotron 3 Super wrote *"**Managed** club finances as Volunteer Treasurer"*, and the ledger blocked it (`escalated_claim:managed`).

**Not yet measured:** the false-flag rate on real Super drafts. The plan is to generate 20+ packs and hand-label every line as passed, flagged or blocked, and as true or untrue.

## Hiring signals

Callback never calls a job fake. It records observable evidence, and code computes a status (`src/lib/signals.ts`; weights in `signals-config.ts`).

| Signal | Source | Weight |
|---|---|---:|
| Published on the employer's own ATS board right now | Greenhouse / Ashby / Lever public job-board APIs | +3 |
| First published within 30 days | ATS `first_published` / `publishedAt` | +2 |
| First published more than 90 days ago, even if edited since | ATS dates | −2 |
| Application link resolves to the live posting | HTTP check | +1 / −2 |
| Employer published or updated 3+ other roles in 30 days (a maintained board, not proof this role is being interviewed for) | Same board | +1 |
| Same role on an independent page | Tavily | +1 |
| Disappeared from the employer's board | Re-check | −3 |
| Reposted 3+ times | Callback's own history | −2, shown as "needs a few weeks of history" until then |

**Decision order** (first matching rule wins):

1. The listing has vanished from the employer's own board → **Low hiring signal**
2. Fewer than 2 observable signals → **Insufficient evidence**
3. A dead link or vanished listing → can never be **Strong**
4. Score ≥ 4 with at least 3 observed signals → **Strong signal**
5. Score < 0 → **Low hiring signal**
6. Otherwise → **Mixed signal**

Being published on an ATS board proves the employer is **advertising** a role, not that it is interviewing. Recent "updated" timestamps never count as fresh on their own: ATS systems bump them for many reasons, and a role first posted in 2021 and edited last week is still a 2021 posting. Every observation shows its source and time, and every listing has a **Re-check** button.

**Hard filters** run in code before any model call: location (a remote role restricted to another country is excluded; a role with **no stated location is kept and flagged** rather than dropped), seniority and dealbreakers. Salary isn't filtered yet, because few postings state it.

## Where NVIDIA, Nebius and Tavily are used

- **Nemotron 3.5 Lightning** (reasoning off): CV fact extraction, web-listing normalisation, the claims auditor.
- **Nemotron 3 Super** (reasoning on): fit scoring per requirement, drafting application packs, honest rewrites.
- **Nemotron 3 Ultra**: the on-demand "how to position yourself honestly" analysis.
- **Nebius Token Factory**: one OpenAI-compatible client for all three tiers (`src/lib/nemotron.ts`), with a one-tier-down fallback (never up), JSON validation with one corrective retry, and every call logged.
- **Tavily**: finds employer job boards and careers-page listings beyond the built-in board list, and provides the independent-source signal. In a live run for a junior data analyst in Johannesburg, three Tavily searches added 31 employer boards (12 built in, 45 in total), lifting a two-role shortlist to fifteen, including roles at Takealot and Nedbank.
- **"How this ran"** panel on every screen: the model used per step, tokens, latency, fallbacks and every source fetched.

### Measured cost

Token counts are from live runs on the demo CV. Prices are third-party listings for Token Factory (Lightning $0.06 / $0.24, Super $0.30 / $0.90 per million input / output tokens); confirm them in your console.

| Step | Model | Tokens in / out (one run) | Approx. cost |
|---|---|---|---:|
| CV extraction | Lightning | 849 / 921 | $0.0003 |
| Fit for one role | Super | 2,189 / 3,803 | $0.004 |
| Shortlist (fit for the top 8 roles) | Super | ~17,500 / ~30,400 | $0.03 |
| Application pack + audit | Super + Lightning | 2,178 / 3,593 + 666 / 288 | $0.004 |

A full run from CV to shortlist to one pack costs about **4 US cents**. Reasoning tokens dominate Super's output.

## Hackathon requirements

| Requirement | How Callback meets it |
|---|---|
| Runs on Nebius Token Factory or AI Cloud | Every model call is a runtime call to Token Factory. The FAQ confirms the web tier may be hosted elsewhere ([FAQ](https://nebiusglobalaihackathon.devpost.com/details/faqs)) |
| Uses at least one NVIDIA open model | Nemotron 3.5 Lightning, Nemotron 3 Super, Nemotron 3 Ultra |
| Track | Personal AI: a persistent, user-confirmed Vault; a nightly watch; private, exportable, deletable data; every outbound action approval-gated |
| Public repo with an open-source license | MIT, `LICENSE` at the root |
| README with setup | [Run it](#run-it) |
| Working demo and video | `TODO` |
| Feedback on the tools | [Below](#feedback-on-the-tools) |

## Run it

Requires Node 20+.

```bash
git clone https://github.com/lk-nyoka/callback.git
cd callback
npm install
cp .env.example .env.local   # add NEBIUS_API_KEY and TAVILY_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # unit tests and ledger evaluations
```

Check which model IDs your key can use:

```bash
curl -s https://api.tokenfactory.nebius.com/v1/models -H "Authorization: Bearer $NEBIUS_API_KEY" | grep -o '"nvidia/[^"]*"'
```

To try it without your own CV, open the Vault and choose **Use a sample CV** (a fictional junior data analyst in Johannesburg).

**Pinned demo mode.** Run a good live search locally, then `node scripts/capture-fixture.mjs` saves those listings to `data/demo/shortlist.json`. With `DEMO_MODE=true`, discovery serves that snapshot (labelled as such in the UI), while fit, drafting and the ledger still run live. This keeps a recorded demo repeatable.

### Deploy (free tiers)

1. **Supabase**: create a project, run `supabase/schema.sql`, and copy the URL and service-role key.
2. **Vercel**: import the repo and set the variables from `.env.example`. `vercel.json` schedules the overnight watch; alternatively, use `.github/workflows/overnight-watch.yml` with `CRON_SECRET` and `CALLBACK_URL` secrets.

Locally, without Supabase variables, workspaces are stored as JSON files in `.data/`. On Vercel, a missing Supabase configuration fails loudly instead of silently writing to temporary disk.

## Architecture

- **Next.js 15** (App Router) on Vercel: UI and API in one deploy.
- **Workspaces**: each visitor gets a private, cookie-scoped workspace. There is no sign-up; export or delete everything from "Your data".
- **Storage**: one JSON document per workspace (Supabase Postgres `jsonb` in production, files locally).
- `src/lib/` holds the logic: `ledger.ts`, `signals.ts`, `ats.ts`, `discovery.ts`, `matching.ts`, `vault.ts`, `fit.ts`, `composer.ts`, `nemotron.ts`, `tavily.ts`.

## Privacy and source policy

- **This hackathon build has no accounts.** A workspace is tied to a browser cookie. Use the sample CV, or remove ID numbers and your home address before uploading a real one.
- Your CV text is sent to Nebius Token Factory for inference. Callback itself does not store it anywhere else or train on it. **We have not verified Nebius's data-retention terms**, so check them before uploading real documents.
- Job searches go to employers' public job boards and Tavily. Your CV is never sent to them.
- Callback uses documented public ATS job-board APIs and Tavily. It does not scrape LinkedIn, Indeed or Glassdoor.
- Prompts treat documents and web pages as untrusted data. Verdicts and the approval gate live outside the model.

## What is real and what is demo

| | Status |
|---|---|
| Nemotron calls | Live, Nebius Token Factory |
| ATS discovery and hiring signals | Live, from the built-in list of employer boards (`SEED_BOARDS` in `discovery.ts`) |
| Tavily discovery | Live (tested 19 Oct 2026) |
| Demo CV | Synthetic (`data/demo/`) |
| Pinned demo shortlist | Optional, clearly labelled in the UI |
| Overnight watch | A real endpoint, scheduled with Vercel Cron or GitHub Actions |
| Outcomes in the tracker | Entered by you, never inferred |
| Evaluation numbers | Measured on the included synthetic sets only |

## Limitations

- **The ledger misses relational and timeframe exaggeration** (see the fresh held-out results). Every pack needs your review.
- **Coverage.** Without Tavily, discovery only covers employers on the built-in board list (`SEED_BOARDS`): for a junior data analyst in Johannesburg that found two relevant roles. With Tavily it found fifteen, but listings found only on careers pages or job sites carry weaker evidence (usually "Insufficient evidence"). Broad local coverage will need job-feed partnerships.
- **Aggregator boards.** Some ATS boards belong to aggregators that re-post other companies' roles (for example Jobgether, which posted one role once per country). Known ones are excluded (`AGGREGATOR_BOARDS`), but the list is manual.
- Hiring signals are evidence, not proof, and will sometimes be wrong in both directions.
- English-language CVs and postings only. Scanned-image PDFs are not supported.

## Path to production

| Stage | Scope |
|---|---|
| Now | Single-user workspaces, live discovery, the ledger, the overnight watch |
| Next | Structured-claim comparison for relational claims, a real-draft evaluation, accounts and per-user budgets, SmartRecruiters and Workable feeds |
| Then | "Verified by Callback" packs employers can audit line by line; dashboards for universities and youth-employment programmes |

## Feedback on the tools

- **Token Factory**: the OpenAI-compatible API made three Nemotron tiers a configuration change. The biggest surprise was that reasoning is on by default: an extraction call with a 16k `max_tokens` budget spent all of it reasoning and returned almost nothing after 55 seconds. Setting `chat_template_kwargs: { enable_thinking: false }` brought the same call down to about 4 seconds and under 1k tokens, with a complete answer. We found the switch by experiment; it deserves a prominent place in the docs and model cards.
- **Nemotron**: Lightning with reasoning off was fast and faithful at verbatim quoting (23 facts, 0 unverifiable quotes on the demo CV). Super's drafts were strong but naturally embellished ("managed" for "tracked"), which is exactly why the ledger exists. As an auditor, Lightning caught 2 of the 5 fresh-set claims the code missed, and flagged no honest lines.
- **Tavily**: `include_domains` restricted to ATS hosts was the most useful pattern: two queries surfaced 31 employer boards Callback didn't know about. Open-web queries for roles mostly returned *list* pages from job sites (PNet, CareerJunction, Jobgether) rather than single postings, so Callback has Lightning classify each result before using it. `published_date` was empty on every job result we saw, which would be the single most useful field for a hiring-signal product.

## Pre-existing work

All code was written during the submission period (October 2026). The concept README predates the code.

## License

MIT. See [LICENSE](LICENSE).
