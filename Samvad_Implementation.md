# SAMVAD — PARALLEL IMPLEMENTATION PLAYBOOK

**Version:** 1.1 | **Date:** 23 October 2026 | **Audience:** two developers using separate Codex CLI sessions | **Delivery:** Android and iOS 24-hour hackathon prototype

> **Authority:** `Samvad_Product_Scope.md` defines WHAT and priorities; `Samvad_Detailed_Project_Report_Codex.md` defines architecture, data model, endpoints, safety, and tests; this file defines WHO, WHEN, HOW TO INTEGRATE, and WHEN TO PUSH. If this file conflicts with the product scope, follow the product scope and log the conflict in `docs/decisions.md`. The teammate's `India_Social_Media_App_Features.md` is an optional feature guide, not a mandate.

## 0. The mission and non-negotiable demo

**Samvad is an India-first, AI-native open public conversation network, NOT a campus-branded product.** A university-sized cohort is a controlled pilot/test population only. Build X-style public posts and replies, interest-aware discovery seeded with attributed news, private login identity/public pseudonyms, and English–Hindi–Malayalam translation with **Show original**. Basic reporting and AI-assisted moderation protect conversation without suppressing ordinary disagreement.

**Must demonstrate:** Two different accounts choose different reading languages; see the same sourced news discussion; one replies in Malayalam; the other reads a clearly labeled Hindi/English translation, reveals the original, and replies; original text is preserved. Also show a standalone public post, a submitted report, and inaccessible private account data. **Do not replace open posts with rooms/communities, turn Samvad into a news-only app, or claim full identity verification when only email verification exists.**

## 1. Team structure and edit ownership

| | Developer A — MOBILE / HCI | Developer B — DATA / API / AI |
|---|---|---|
| Primary branch | `dev/mobile` | `dev/backend` |
| Owns | `mobile/**`, app navigation, UI components, local UI state, Android and iOS testing | `supabase/**`, `api/**`, SQL/RLS, seed data, AI adapters, backend tests |
| Shared docs | May update `docs/build-log-mobile.md` | May update `docs/build-log-backend.md` |
| Integration | Tests merged mobile flow; fixes UI integration | Runs migrations and API; fixes backend integration |
| Must avoid | Editing migrations, server secrets, backend implementation | Editing screen/components in `mobile/**` |

**Integration captain:** Developer A handles Git merges into `main` and release/demo builds. **Database captain:** Developer B alone applies schema migrations to the shared Supabase project. Both review any change touching public API contracts, shared types, RLS or environment names before implementing it. If the team prefers Developer B as integration captain, change that in `docs/decisions.md` once; never have both merge `main` concurrently.

**Shared file ownership:** root `README.md`, `.gitignore`, `.env.example`, `docs/decisions.md`, and `docs/contracts.md` are edited only by the integration captain *after* an agreed change. Each developer can propose changes in their own log. Avoid a shared mutable `docs/build-log.md`; maintain two logs. Both developers should use separate working directories or Git worktrees and separate Codex sessions; never run two agents that can edit the same working tree.

### Revision 1.1: platform and AI agreements

- Android and iOS are equal targets from one Expo app; Developer A owns both. Developer B supplies one shared backend and verifies connectivity/auth contracts with A.
- P0 establishes both platform test paths. P5 records separate Android/iOS outcomes. Prefer a final Android-to-iPhone conversation demo. Missing hardware is BLOCKED, not PASS.
- Expo Go on each platform is acceptable if dependencies support it. Standalone signed builds are optional; store release is deferred. iOS signing/TestFlight may need existing Apple membership/credentials; local Apple iOS Simulator requires macOS. See DPR section 20 for official sources.
- AI inference must stay on verified free tiers: Qwen on Groq Free plan first, with configurable model IDs; Gemma is an alternative after evaluation. Follow DPR section 9.5. Never enable paid fallback; keep unscreened content pending on screening failure.
- AI briefs remain SHOULD under the authoritative product scope. Implement after core conversation/privacy gates; record a deferred brief check honestly rather than inventing a pass.

## 2. Repo initialization: one-time, before parallel work

Integration captain creates GitHub repository and initial `main` with:

```text
samvad/
  README.md
  .gitignore
  .env.example
  docs/
    Samvad_Product_Scope.md
    Samvad_Detailed_Project_Report_Codex.md
    Samvad_Implementation.md
    decisions.md
    contracts.md
    build-log-mobile.md
    build-log-backend.md
    integration-checklist.md
  mobile/                      # Developer A
  api/                         # Developer B
  supabase/                    # Developer B
```

Create `docs/contracts.md` BEFORE divergent implementation. Use the DPR §7 as the initial AI endpoint contract and DPR §6 as the database model; record exact table/column names, auth expectations, response examples, visibility rules, and supported language codes (`en`, `hi`, `ml`). **Do not invent separate incompatible shapes on either side.** If exact schema fields aren't finalized, Developer B drafts the first version and Developer A signs off within the first checkpoint. No secrets in repo. `.env.example` contains variable NAMES and placeholder values only.

```bash
# Captain: initial repo (replace YOUR_ORG/YOUR_REPO)
git init -b main
git add .
git commit -m "chore: initialize Samvad docs and repository"
git remote add origin git@github.com:YOUR_ORG/YOUR_REPO.git
git push -u origin main

# Each developer in their OWN clone (recommended):
git clone git@github.com:YOUR_ORG/YOUR_REPO.git samvad-mobile  # A
git clone git@github.com:YOUR_ORG/YOUR_REPO.git samvad-backend # B
# A in own clone: git switch -c dev/mobile
# B in own clone: git switch -c dev/backend
```

**Important Git principle:** Developers push their OWN branches after each passing phase; the captain integrates **both** phase branches into `main` at each synchronized checkpoint. Pushing branches is not the same as merging them. Don't have both developers push directly to `main`. Use pull requests when available; otherwise the captain performs reviewed local merges. Push only tested code and never commit credentials.

## 3. Parallel phase map (same phase number, different tasks)

These are **milestones**, not a requirement that both people finish simultaneously. A developer who finishes early may help test the other's branch but should not edit the other owner's files. If time is running out, use the cut order in §8.

| Gate | Developer A — MOBILE/HCI | Developer B — BACKEND/AI | Joint integration result |
|---|---|---|---|
| **P0 — Bootstrap & contracts** | Expo/TypeScript/Expo Router boots; tabs and design tokens; mock cards; typed client interfaces | Supabase migration plan, FastAPI `/health`, auth/JWT plan, contract examples, seed format | App launches; API health responds; contracts and env names agree |
| **P1 — Identity & onboarding** | Sign in/up, handle, interests, preferred language, logout, session UX | Supabase Auth, public profile/private identity separation, unique handles, interest tables, RLS tests | Two accounts log in, onboard, private data protected |
| **P2 — Discovery & publishing** | Mixed news/post feed, story card/source link, composer, pending/errors | News seed (6–12 attributed items), feed query, original posts, write idempotency and ownership policies | New user sees feed; one original post appears exactly once |
| **P3 — Conversation & safety** | Thread detail, reply composer, pseudonym display, report sheet | Reply persistence, thread queries, report table/policies, basic rate limits, moderation state | Two accounts exchange durable replies; report saved privately |
| **P4 — Multilingual AI & briefs** | Inline Translate / Show original, three-line brief reveal, failure UI, language-aware labels | `/v1/translate`, `/v1/summarize-news`, `/v1/moderate`, auth, model adapters, caching, fixtures fallback | Malayalam ↔ Hindi/English conversation works; original preserved |
| **P5 — Polish & hardening** | Android/iOS keyboard, safe areas, fonts, accessibility, loading/empty/offline, scroll/refresh | RLS negative tests, AI error paths, duplicate-write checks, audit/report review path | End-to-end smoke tests pass separately on Android and iOS |
| **P6 — Release & demo** | Android APK and iOS development/TestFlight build if practical; Expo Go on both acceptable; final UX and 3-min demo | Stable seed/demo accounts, API availability, migration/rollback notes, free-tier quota limits; no paid AI fallback | Demo freeze; signed-off release commit/tag and final push |

### P0 — Bootstrap & contracts (roughly 1–2 hours elapsed)

**A:** Create `mobile/` Expo Router app; implement navigation shell (Home, Explore, Compose, Activity, Profile), neutral loading states, theme tokens, sample typed UI components. No fake functional claims. Confirm Android and iOS boot, using Expo Go if compatible; record missing device access as blocked. **B:** Create `api/` FastAPI app, `/health`, `supabase/migrations/` and a migration/schema proposal, backend dependency lock, local test harness. Define auth bearer-token verification approach, seed format and env variables. **Together:** approve `docs/contracts.md` and `docs/decisions.md`; test connectivity from Android and iOS devices or appropriate simulators. A Windows host can test iOS using a physical iPhone; local Apple iOS Simulator requires macOS.

**Gate P0:** app boots on Android and iOS; API health check succeeds; schema/client contracts and free-tier AI configuration agree; both branches clean/committed. Record platforms separately; missing device access is BLOCKED, not PASS.

### P1 — Identity & onboarding (roughly 2–4 hours)

**A:** Auth screens, session restoration, pseudonym handle input, language selection (`en`, `hi`, `ml`), interests (sports/business/technology/infrastructure/politics/culture), onboarding skip only for optional fields; logout; show public handle and never public email. **B:** Auth integration, `profiles` public view/table, private account information policy, `interests`/`user_interests`, handle uniqueness, database RLS; create a two-account negative-access test. Use verified email only if configured; do not assert institution-issued identity verification.

**Gate P1:** A and B accounts can sign in, choose handles and interests, and B cannot query A's private email via client or API.

### P2 — Discovery & publishing (roughly 3–4 hours)

**A:** Virtualized mixed feed of sourced news cards and public posts, pull-to-refresh, clear source attribution and external-link action; text compose, character counter, submit progress, error/retry UI. **B:** Curate 6–12 real sourced headlines with legitimate links and short excerpts, interest tags, a deterministic interest + recency feed query, public post storage, author ownership and idempotent create (client request ID or equivalent). Demo fixture posts must be clearly labeled; do not invent publisher content or scrape full copyrighted articles.

**Gate P2:** new account has a useful nonempty feed; source opens publisher; a post survives refresh; rapid retry doesn't duplicate.

### P3 — Conversation & safety (roughly 2–3 hours)

**A:** Conversation screen for news and original posts, threaded replies, author handles, reply composer and report menu; preserve draft on failure. **B:** Thread/reply persistence and retrieval, reply parent references, report records private to reporter/reviewers, moderation status/visibility checks, basic abuse rate limiting. **Never** auto-ban simply because many reports were submitted; reporting is not a popularity vote.

**Gate P3:** two real test accounts see each other's replies and a report persists without exposing private reporter information.

### P4 — Multilingual AI & summaries (roughly 3–4 hours)

**A:** translate/show-original inline on posts and replies; preserve original Unicode; translated label and visible language; three-line brief disclosure and source link; graceful timeout. **B:** implement DPR §7 contracts; server-side authentication; fetch authorized content by ID; cache translation by content hash + target language; generate exactly three brief lines from legitimately available source content; if only headline/excerpt available, label **headline-based brief**. AI moderation triages and logs, without blanket suppressing political criticism. Protect API keys, enforce shared free-tier quotas and prohibit paid AI fallback. Follow DPR section 9.5; validate outputs and test EN/HI/ML quality before claiming live support. Clearly mark mock/cached fixture responses if provider unavailable.

**Gate P4:** Malayalam user replies; Hindi/English user can translate and show original; opposite-direction reply works; model outage leaves original text readable.

### P5 — Polish, integration, verification (roughly 2–3 hours)

**A:** low-end Android and iPhone responsiveness, platform-specific keyboard/safe-area behavior, long-list rendering, Malayalam/Hindi typography, tap targets, errors and recovery; final user journey. **B:** rerun RLS negative tests, API auth and rate-limit tests, report visibility, no secret exposure, migration reproducibility and AI failure cases. **Together:** run DPR §14 T01–T19; log actual pass/fail/blocked in `docs/integration-checklist.md`. No fictional test passes.

**Gate P5:** complete story works without developer intervention; known demo blockers are resolved or transparently documented.

### P6 — Demo, freeze, handoff (last ~2 hours)

**A:** verify Android and iOS; create Android APK and iOS development/TestFlight builds if existing credentials/tooling permit, otherwise use compatible Expo Go demos on both; rehearse 3-minute narrative and capture screenshots. **B:** keep backend reachable, verify seeded news/fixtures, demo account credentials distributed securely (not Git), document how to restart and reset. **Together:** stop feature work, fix only P0 bugs, merge approved changes, tag `hackathon-demo-v1`, push tag, preserve demo instructions.

**Gate P6:** final app starts on Android and iOS, AI/fixture status is honest, GitHub `main` contains a reproducible demo, and a teammate can follow README without oral instructions.

## 4. Git and integration protocol — mandatory at every phase

### Developer checklist BEFORE pushing their branch

1. Pull latest `main` into the phase branch (merge or rebase carefully; don't rewrite shared published history).
2. Verify changes are within owned directories. For shared contracts, request captain approval.
3. Run relevant tests: A → TypeScript/typecheck, lint and app boot; B → Python tests, API health, migration/RLS tests. If a test cannot run, document why.
4. Run `git status` and `git diff --check`; inspect staged files for `.env`, tokens, keys and personal data.
5. Update `docs/build-log-mobile.md` or `docs/build-log-backend.md` with **phase, implemented, tested, blocked, next**.
6. Commit with a descriptive message and push the branch; send the captain commit SHA and gate evidence.

```bash
# From each developer's own clone and phase branch
git status
git diff --check
git add mobile docs/build-log-mobile.md  # A; B uses: git add api supabase docs/build-log-backend.md
git commit -m "feat(mobile): complete P2 feed and composer" # change scope/phase
 git push -u origin dev/mobile  # B: dev/backend
```

> `git add` examples are intentional path-specific staging; include approved config changes only after reviewing them. Don't use `git add .` blindly in a repo containing local credentials.

### Captain checklist BEFORE merging into `main`

1. Check both branches are pushed and their logs include gate evidence.
2. Review contract compatibility, schema migrations, environment names and changed files; don't merge broken assumptions.
3. Merge backend first when schema/API changes are needed, then mobile, in a **single integration checkout**; use GitHub PRs or reviewed merges.
4. Apply migrations in order in the agreed development environment; do not apply unreviewed destructive migrations to shared data.
5. Run joint end-to-end gate on device with two accounts. If gate fails, keep `main` at last passing checkpoint; fix on the appropriate developer branch.
6. Commit any captain-owned integration docs and push `main` only after passing. Create a lightweight checkpoint tag (`checkpoint-p0` through `checkpoint-p6`) if useful.
7. Announce integration SHA and blockers. Developers sync with latest `main` before starting next phase.

```bash
# Captain's clean integration checkout; use PR merge UI if preferred
git switch main
git pull --ff-only origin main
git fetch origin
git merge --no-ff origin/dev/backend -m "merge: backend P2"
git merge --no-ff origin/dev/mobile -m "merge: mobile P2"
# run migrations + typecheck/tests + two-account smoke test
# IF checks pass:
git push origin main
git tag checkpoint-p2
git push origin checkpoint-p2
# IF checks fail before pushing: fix/revert safely; do not publish broken main.
```

**If developers finish at different times:** Developer A/B may push completed work to their branch immediately. The captain merges only compatible, tested increments; never force a synchronized merge solely because the clock says a phase ended. A PR can remain open while another workstream catches up. **If a branch contains work for multiple phases, review all its commits before merging**; preferably commit one phase at a time and integrate promptly.

**Conflicts:** Don't resolve by overwriting the other developer's implementation. If a change needs both sides, first update `docs/contracts.md` with a short agreement, then make owner-specific changes in separate commits. For emergencies, captain cherry-picks a small tested fix instead of merging an unfinished branch wholesale.

## 5. Shared contracts that must not drift

- **Auth:** Mobile passes Supabase access token to FastAPI as `Authorization: Bearer <token>`; server validates token and derives user identity, never trusting a caller-supplied `user_id`.
- **Identity:** Public handles unique; display names may duplicate. Public profile responses exclude private email/verification data; Supabase RLS restricts private records.
- **Language:** ISO codes `en`, `hi`, `ml`; original text and language stored; translation labeled; Show original always available. Tamil is stretch only.
- **News:** Each story has ID, title, publisher/source, URL, excerpt and interest tags. Briefs must not pretend to summarize inaccessible full articles.
- **Conversation:** News and original posts both support threads; every reply has stable ID, author, parent/thread association and moderation visibility.
- **AI budget/provider:** All app AI uses free-tier hosted inference only. Start with Qwen on Groq Free plan; example `qwen/qwen3.8-27b`, subject to live account/model verification and EN/HI/ML evaluation. Gemma on Google AI Studio is an evaluated alternative, not a required second P0 adapter. No subscriptions, paid inference, billing upgrades or silent paid fallback. DPR section 9.5 defines quota, caching, data handling and fail-safe rules.
- **Platform parity:** Android and iOS share schema, auth and endpoints. Verify device-reachable HTTPS URLs and auth redirects; do not assume phone localhost or Android-emulator host aliases work on iPhone.
- **AI endpoints:** Match DPR §7: `POST /v1/translate`, `/v1/summarize-news`, `/v1/moderate`; consistent error envelope and `401/403/404/429/503` semantics.
- **Moderation:** User reports persisted privately; AI flags assist review; normal disagreement isn't a violation. Don't claim human review or automated bans unless implemented.
- **Writes:** idempotent retries and clear client pending/success/error states; avoid double post on repeated taps.
- **Offline/error:** if AI fails, original conversation remains usable; if write fails, user input is preserved for retry.

## 6. Initial prompts — paste into TWO SEPARATE Codex CLI sessions

### Developer A — Mobile/HCI agent prompt

```text
You are Developer A, the MOBILE/HCI owner for Samvad, an India-first AI-native public conversation app. Read, in order: docs/Samvad_Product_Scope.md, docs/Samvad_Detailed_Project_Report_Codex.md, docs/Samvad_Implementation.md, docs/contracts.md. Inspect the actual repo before changing anything. Your edit ownership: mobile/** and docs/build-log-mobile.md only, unless the integration captain explicitly approves a shared file. Another Codex agent owns api/** and supabase/**. Do not touch those directories, do not change contracts unilaterally, and never push to main.

Mission: deliver a polished Android and iOS React Native/Expo/TypeScript app that supports pseudonymous onboarding, interest-aware sourced-news + original-post feed, threaded replies, reports, and inline English/Hindi/Malayalam translation with Show original. Samvad is NOT a campus-only product; the university-sized cohort is merely pilot scale. No mandatory communities/rooms. Preserve original posts and cross-language conversation as MVP essentials. Test both Android and iOS; follow the backend free-tier-only AI policy and never call providers directly from mobile.

Start at P0 in docs/Samvad_Implementation.md. For each phase: (1) write a concise plan; (2) implement ONLY your phase tasks, using typed mocks/adapters until backend contracts are ready; (3) run relevant checks and document exact results; (4) update docs/build-log-mobile.md with implemented/tested/blocked/next; (5) commit and push ONLY dev/mobile after checks pass; (6) STOP and report the commit SHA, integration dependencies, and gate evidence. Wait for explicit instruction to begin the next phase. Do not invent passing tests, fake live AI, or hardcode secrets. Ask only blocking questions. Prefer working user flows to decorative extras.

First response: summarize repo status, P0 files you will create, commands to verify, and any contract mismatch. Then execute P0.
```

### Developer B — Backend/AI agent prompt

```text
You are Developer 2 / Developer B, the DATA / BACKEND / AI owner for Samvad, a 24-hour hackathon public conversation app targeting BOTH Android and iOS through one Expo app and one shared backend.

Implement ONLY backend Phase P0 (Bootstrap & contracts) in this thread. Read AGENTS.md if present, then Samvad_Product_Scope.md, Samvad_Detailed_Project_Report_Codex.md and Samvad_Implementation.md (find them in docs/ or the repository root), followed by docs/contracts.md if it exists. Inspect files, Git status, branch/remotes, existing code and available tooling before changes. Preserve existing work; do not move/duplicate the project documents or initialize/rewrite a repository blindly.

Ownership: api/**, supabase/** and docs/build-log-backend.md. Do not edit mobile/** or push to main. Shared README, .gitignore, root .env.example, docs/contracts.md and docs/decisions.md belong to the integration captain. Propose shared changes in api/docs/contracts-proposal.md and the backend log unless captain authorization already exists. Keep local configuration/secrets out of Git. If there is no Git repository/remote or no captain bootstrap yet, continue reversible P0 scaffolding and proposals in your owned directories, then report the integration blocker; do not invent a remote or claim a push succeeded.

P0 deliverables:
1. A minimal FastAPI service with GET /health, validated settings, reproducible dependencies and local start instructions. Health must not require live AI credentials; distinguish process health from external-service readiness.
2. Backend-local configuration template with Supabase URL/JWT settings, AI_PROVIDER=groq, AI_BASE_URL=https://api.groq.com/openai/v1, GROQ_API_KEY, per-task model IDs, free-tier-only/no-paid-fallback flags, bounded quotas/timeouts and DEMO_MODE=false. No secrets in output or source control.
3. Supabase migration/schema and seed-format proposals covering profiles/private identity, interests, news, posts, conversations, replies, translations, reports and moderation events. Specify RLS/ownership, unique handles, Unicode, stable IDs, retry-safe writes and server-controlled moderation visibility. P0 proposes the schema; do not apply shared migrations or implement P1-P4 features yet.
4. Contract proposal with exact planned fields, en/hi/ml language codes, Supabase operations, verified bearer-token identity derivation, /v1/translate, /v1/summarize-news, /v1/moderate, error envelopes, cache/fixture provenance and pending publication on screening failure. Document the JWT validation approach without implementing fake authorization.
5. Provider interface/configuration skeleton only. All app AI must use verified FREE-TIER inference: start with Qwen on Groq Free plan; the documented example is qwen/qwen3.8-27b, to be rechecked against current official docs and the actual account. Gemma on Google AI Studio is an evaluated alternative. No subscription, paid usage, billing upgrade or silent fallback. No live AI feature implementation in P0; later evaluate EN/HI/ML quality. Missing credentials must not block local scaffolding or produce fake success.
6. Meaningful local health/settings tests and a documented Android/iOS connectivity/auth-redirect checklist for Developer A. Use reachable HTTPS for real devices; phone localhost is not the development PC. Do not claim mobile testing unless actually run.

Validate locally, inspect changes for secrets and update docs/build-log-backend.md with implemented / tested / blocked / next. If Git and the remote are configured, commit and push reviewed owned files ONLY to dev/backend after relevant checks pass; otherwise report why not. Do not mark the joint P0 gate complete without mobile launch evidence and captain-approved contracts.

Start with a short repo assessment and P0 plan, then execute. Finish with changed files, exact check results, commit/push status, contract proposals and minimum external setup still required. STOP after P0 and wait for explicit instruction before P1.
```

### Integration captain prompt (run at each gate in a separate Codex session or manually)

```text
You are Samvad's integration captain. Read docs/Samvad_Product_Scope.md, docs/Samvad_Detailed_Project_Report_Codex.md, docs/Samvad_Implementation.md, docs/contracts.md, and both build logs. Do not implement new features during this checkpoint. For PHASE P<N>, inspect origin/dev/mobile and origin/dev/backend, review their commits and tests, check contract/schema consistency and secrets, merge reviewed changes into local main (backend then mobile), run the phase gate and relevant checks, and update docs/integration-checklist.md with actual evidence. Push main and tag checkpoint-p<N> ONLY if the integrated gate passes. If it fails, do not push main; identify exact owner-specific fixes and report them. Never overwrite another developer's work, invent test results, or run destructive production migrations.
```

**Next-phase prompt (either developer):**

```text
Main has been integrated through checkpoint-p<N-1>. Sync your own branch with latest origin/main, read docs/contracts.md and docs/Samvad_Implementation.md, then implement ONLY your ownership tasks for P<N>. Run checks, update your log, commit/push your branch, and stop with SHA + test evidence + integration notes. Do not start P<N+1> without approval.
```

## 7. Phase gate checklist (captain fills in, no automatic pass)

| Gate | Required evidence | Result |
|---|---|---|
| P0 | Android and iOS launch evidence, `/health`, contracts and free-tier AI config | ☐ PASS ☐ FAIL ☐ BLOCKED |
| P1 | Two accounts, distinct handles, private-data denial | ☐ PASS ☐ FAIL ☐ BLOCKED |
| P2 | Sourced nonempty feed, original post, retry-safe write | ☐ PASS ☐ FAIL ☐ BLOCKED |
| P3 | Two-account replies, private report persistence | ☐ PASS ☐ FAIL ☐ BLOCKED |
| P4 | ML↔HI/EN translate/show-original, optional 3-line brief, free-quota/outage fallback | ☐ PASS ☐ FAIL ☐ BLOCKED |
| P5 | DPR T01–T19 run/logged, separate Android and iOS smoke tests | ☐ PASS ☐ FAIL ☐ BLOCKED |
| P6 | Final Android and iOS demos, reproducible setup, tag pushed | ☐ PASS ☐ FAIL ☐ BLOCKED |

Record actual checks and commit SHAs in `docs/integration-checklist.md`. Checkbox states above are deliberately unfilled.

## 8. Time pressure: cut order and safety floor

**Cut first:** dark mode, avatars, likes, follows, hashtags, search, Activity notifications, advanced explore, event auto-clustering, realtime subscriptions (use refresh), Tamil, detailed analytics, polish beyond usability. **Keep:** login/session, public pseudonym/private data separation, interests, attributed news, original posts, durable replies, EN/HI/ML translate/show original, report persistence, safe free-tier AI access, Android and iOS demos. If model API unavailable, use explicitly labeled fixtures and still show original text; don't misrepresent mock output as real AI. If native builds/signing are unavailable, use compatible Expo Go demos on Android and iPhone; never report an untested platform as passed. No public launch is authorized by a passing hackathon gate: privacy, legal, moderation operations and abuse controls require a separate launch review.

## 9. Quick handoff sequence

1. Captain puts **all three docs** in `docs/`, creates `docs/contracts.md`, pushes initial `main`.
2. A and B each clone the repo and start separate Codex CLI sessions using their own prompt above.
3. Both complete **P0**, commit and push their OWN branches, and report SHA/test evidence.
4. Captain merges both into `main`, tests gate, tags `checkpoint-p0`, pushes; communicates SHA.
5. Repeat P1 → P6, updating contracts explicitly before breaking changes.
6. Finalize `README.md`, `docs/integration-checklist.md`, Android and iOS demos, and `hackathon-demo-v1` tag.

**Definition of success:** A reproducible, honest, two-user multilingual social conversation demo with open posting, news-seeded discovery and pseudonymous safety — not a long feature checklist or an untested code dump.
