# SAMVAD — DETAILED PROJECT REPORT (DPR) & CODEX BUILD SPECIFICATION

**Version:** 1.1 · 23 October 2026  
**Project:** Samvad — India-first AI-native public conversation network  
**Deliverable:** Mobile-first Android and iOS prototype for a two-person, 24-hour hackathon  
**Companion document:** `Samvad_Product_Scope.md` — authoritative functional scope  
**Supporting references:** prior Samvad master brief; teammate's `India_Social_Media_App_Features.md` (planning guide, not mandatory feature inventory).

> **Codex instruction:** Treat the product-scope document as the source of truth for behavior and priorities. This DPR specifies one recommended implementation path. Preserve Samvad's India-wide positioning: a university-sized user population is a **pilot scale**, not the target-market definition. Never silently replace an open public feed with mandatory communities or turn the app into a campus-only product.

## 1. Executive brief

Build a polished shared Android and iOS social app where users register with private account credentials, choose a public pseudonym and interests, discover attributed news conversation starters alongside original user posts, read optional three-line AI briefs, and discuss openly in English, Hindi, and Malayalam with translation/show-original controls. Support reports and minimal moderation. Optimize for a smooth end-to-end demo rather than large-scale production infrastructure.

**Non-negotiable demonstration:** Two accounts with different preferred languages can see the same conversation, publish replies, translate each other's replies, and recover the original text; one can publish a standalone post and submit a report.

**Not in scope:** university branding, rooms/subreddits, DMs, reels, nationwide traffic, payments, complex recommendation ML, fully automated punitive moderation, and a full production compliance program.

## 2. Goals, non-goals, and definition of done

### Goals

1. Run the same core flow on Android and iOS; Expo Go is acceptable for both. Signed Android APK and iOS development/TestFlight builds are optional when credentials/tooling permit.
2. Sign up/login/logout and maintain separate public and private identities.
3. Populate a meaningful interest-aware home feed immediately.
4. Render sourced news cards with attribution, links, and an optional 3-line AI brief.
5. Create original text posts and threaded replies, with persistent storage.
6. Support EN/HI/ML posts and on-demand translation; always expose original text.
7. Record reports and perform minimal AI-assisted safety screening.
8. Deliver a stable, visually coherent HCI demonstration with graceful loading and error states.

### Definition of done

- The core journey is verified on both Android and iOS; Android-only evidence does not establish iOS support.
- A fresh account reaches a populated feed in under a few understandable steps.
- Two separate accounts exchange replies in different languages; translation is labeled and reversible.
- A news source link opens the publisher; the AI summary is optional and visibly attributed to AI.
- An original post appears in the public feed after submission.
- Reports are persisted and visible in a protected moderator path or database query.
- A normal user cannot read another user's email/private identity record through app/API/database access.
- No AI/provider secret is present in the mobile bundle or committed repository.
- App handles network/model failures without losing already stored content.

## 3. Decision assumptions (confirm only if blocking)

- **App:** One React Native/Expo/TypeScript/Expo Router codebase targeting Android and iOS with equal feature scope.
- **Backend/data:** Supabase Auth + PostgreSQL + Row Level Security.
- **AI server:** FastAPI Python with a provider-neutral service interface; initially use Groq Free plan hosted Qwen through an OpenAI-compatible transport. This protocol does not require an OpenAI account or paid service. All app AI uses free-tier inference only; no paid subscription, pay-as-you-go fallback or billing upgrade. Keep model IDs in environment configuration and verify availability. If credentials or quota are unavailable, use explicit labeled demo fixtures or return unavailable; never fake live AI. See section 9.5.
- **News:** manually curated licensed/attributed seed set (6–12 items), not unauthorized full-text scraping.
- **Languages:** English, Hindi, Malayalam; Tamil stretch.
- **Account proof:** email confirmation where practical; never claim real-world ID verification without implementing it.
- **Feed:** simple interests + recency; deterministic, transparent and stable.
- **Transport:** internet-hosted Supabase/API; university-sized population is not LAN-only. Local development can use LAN for testing.
- **Moderation:** AI-assisted triage, reporting, conservative enforcement, no automated suspension solely from report count.

If existing repo or team expertise differs materially, inspect before changing stack. Prefer a functioning MVP over a rushed framework rewrite.

## 4. High-level architecture

```text
Android phone or iPhone / shared Expo app (React Native + TypeScript)
  ├─ Expo Router screens and local UI state
  ├─ Supabase client (public anon/publishable key only)
  │    ├─ Supabase Auth (user sessions)
  │    ├─ PostgreSQL with RLS (profiles, interests, posts, replies, news, reports)
  │    └─ optional Realtime (reply changes; polling fallback)
  └─ HTTPS to FastAPI AI service (Bearer Supabase access token)
       ├─ verifies JWT/user session and rate-limits expensive requests
       ├─ translation endpoint (cache-first)
       ├─ article summary endpoint (cache-first, source-grounded)
       ├─ content safety screening endpoint (triage)
       └─ external AI provider via server-side secrets
```

**Security boundary:** The client may call Supabase with a public client key; RLS enforces data access. Service-role secrets and AI API keys exist **only on the server**. FastAPI verifies Supabase JWTs using the project's supported validation method (JWKS or provider validation) and rejects untrusted user IDs supplied by clients. Never bypass RLS in public app endpoints without explicit checks.

## 5. Suggested repository layout

```text
samvad/
  README.md
  .gitignore
  .env.example
  docs/
    Samvad_Product_Scope.md
    Samvad_Detailed_Project_Report_Codex.md
    decisions.md
    demo-script.md
  mobile/
    app/
      _layout.tsx
      (auth)/sign-in.tsx
      (auth)/sign-up.tsx
      onboarding.tsx
      (tabs)/_layout.tsx
      (tabs)/index.tsx         # Home
      (tabs)/explore.tsx
      (tabs)/compose.tsx
      (tabs)/activity.tsx
      (tabs)/profile.tsx
      conversation/[id].tsx
      post/[id].tsx
      settings.tsx
    components/
      PostCard.tsx
      NewsCard.tsx
      ReplyCard.tsx
      TranslateToggle.tsx
      SummarySheet.tsx
      ReportSheet.tsx
      EmptyState.tsx
    lib/
      supabase.ts
      api.ts
      auth.ts
      i18n.ts
    hooks/
    theme/
    types/
    package.json
    app.json
  api/
    app/main.py
    app/config.py
    app/auth.py
    app/routers/translate.py
    app/routers/summarize.py
    app/routers/moderate.py
    app/services/ai_provider.py
    app/services/content_safety.py
    requirements.txt
    tests/
  supabase/
    migrations/001_initial.sql
    seed.sql
  scripts/
    seed_demo.py
```

The directory structure is illustrative; Codex should adapt it to existing code without deleting working modules.

## 6. Data model and authorization

### Core tables

| Table | Important columns | Access rule |
|---|---|---|
| `profiles` | `user_id UUID PK`, `handle CITEXT UNIQUE`, `display_name`, `bio`, `preferred_language`, `created_at` | Public read of public fields; owner write |
| `private_identities` | `user_id UUID PK`, `email`, `verification_status`, `created_at` | Owner/admin-only read; never included in public views |
| `interests` | `id`, `slug UNIQUE`, `label` | Public read, seeded/admin write |
| `user_interests` | `user_id`, `interest_id`, composite unique | Owner read/write; use only for opted-in personalization |
| `news_items` | `id`, `title`, `source_name`, `source_url UNIQUE`, `excerpt`, `language`, `published_at`, `topic`, `summary_3line` | Public read; trusted/admin write |
| `posts` | `id UUID`, `author_id`, `body`, `language`, `created_at`, `deleted_at`, `moderation_state` | Public read only when visible; owner create/delete |
| `conversations` | `id UUID`, `news_item_id NULL`, `root_post_id NULL`, `created_at` | Public read; controlled creation; exactly one root type |
| `replies` | `id UUID`, `conversation_id`, `parent_reply_id NULL`, `author_id`, `body`, `language`, `created_at`, `moderation_state`, `deleted_at` | Public read when visible; owner create/delete |
| `translations` | `id`, `entity_type`, `entity_id`, `target_language`, `translated_text`, `source_hash`, `model_id` | Public read only if source visible; server write |
| `reports` | `id`, `reporter_id`, `entity_type`, `entity_id`, `reason`, `status`, `created_at` | Reporter create/view own; reviewer/admin view all |
| `moderation_events` | `id`, `entity_type`, `entity_id`, `decision`, `reason`, `created_at` | Admin only; do not leak through feed |

### Optional after core: `follows`, `likes`, `notifications`, `post_topics`, `audit_events`.

### Schema details

- Use UUIDs as internal keys; handles are mutable public identifiers.
- Normalize handles case-insensitively and reserve system/impersonation-sensitive names. Display names can repeat.
- Keep `body` Unicode-safe; preserve mixed scripts and emojis. Use a clearly documented character/grapheme limit in the UI.
- Use `CHECK` constraints for allowed languages, moderation states and valid entity types.
- Use foreign keys, unique constraints, and indexes on `posts(created_at,id)`, `replies(conversation_id,created_at,id)`, `news_items(published_at,id)`, and `user_interests(user_id,interest_id)`.
- Use `created_at` server timestamps; do not trust client clocks.
- RLS: never allow public `SELECT` on `private_identities`; never allow arbitrary users to write news/moderation records; enforce ownership for edits/deletions and report creation.
- Deletion: soft-delete public posts/replies if preserving thread continuity, but do not expose deleted body; define account deletion as a future public-launch gate.
- Pagination: stable keyset/cursor by `(created_at,id)` rather than offset for feeds and replies.
- Retry protection: use a client-generated `request_id`/idempotency key for create operations or ensure duplicate prevention via unique constraints.
- Do not expose private identities through database joins, views, RPCs or logs.

### Seed content

Create 6–12 sourced news items across sports, technology, business, public policy, infrastructure and culture. Use genuine, attributable links and short excerpts only; if real article content cannot be legally retrieved, manually enter metadata and use clearly marked demo summaries. Create 3–5 **clearly labeled fixture posts** and a few threaded replies to demonstrate interactions. Do not present simulated activity as genuine user activity.

## 7. Core API contracts

**Client to Supabase:** auth, profiles, interests, news, posts, conversations, replies and reports with RLS.  
**Client to FastAPI:** authenticated AI requests; implement typed request/response schemas and consistent error envelopes.

### `POST /v1/translate`

Request: `{ "entity_type": "post|reply", "entity_id": "uuid", "target_language": "en|hi|ml" }`  
Response: `{ "translated_text": "...", "original_language": "ml", "target_language": "en", "is_cached": false, "label": "Translated by AI" }`  
Server fetches authorized original content by ID, hashes it, checks cache, and calls model only on miss. Do not accept arbitrary untrusted text as proof of access to a private post. Preserve original and do not fabricate missing details.

### `POST /v1/summarize-news`

Request: `{ "news_item_id": "uuid", "target_language": "en|hi|ml" }`  
Response: `{ "lines": ["...", "...", "..."], "source_url": "https://...", "generated_by_ai": true, "is_cached": false }`  
Ground summaries only in source material that is legitimately available; if only headline/excerpt exists, label it **headline-based brief**, not a full article summary. Avoid asserting unseen details.

### `POST /v1/moderate`

Request: `{ "entity_type": "post|reply", "entity_id": "uuid" }`  
Response: `{ "status": "allowed|flagged|blocked", "reason_code": "...", "needs_review": true }`  
This is server-side triage. For real submission flows, ensure moderation is performed at the server-controlled publication boundary; never trust a client-side call as sufficient enforcement. Prototype may submit as `pending` and publish after checks; fail safely on provider outages without silently exposing harmful content.

### Error behavior

Use consistent `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` inaccessible/not found, `429` rate limited, `503` AI unavailable. Show actionable client UI and keep original content accessible when translation fails.

## 8. Feed and discovery logic

**Do not build a machine-learning recommender in 24 hours.**

- Onboarding saves selected interest IDs and preferred reading language.
- Home retrieves recent public original posts plus sourced news items; filters out deleted/held content.
- Sort news by interest match then recency; sort posts by recency, optionally boost selected topics.
- Avoid a feed that is exclusively news: display original posts alongside news from the beginning.
- Render cards with stable IDs, virtualization (`FlatList`), refresh and pagination; restore position where possible.
- Provide basic Explore interest filters; full search and Following feed are SHOULD, not MUST.
- If no content matches, fall back to a general curated feed rather than an empty screen.
- Keep source attribution and article-open action separate from the conversation-open action.

## 9. AI implementation and evaluation

### 9.1 Translation

- On-demand translation, target = user's preferred reading language.
- Preserve named entities, hashtags, URLs, slang and quoted text where possible.
- Show original always; clearly label translations.
- Cache by entity ID + source hash + target language + model/version.
- If source already matches target, return original without an AI call.
- If model fails, show original and a nonblocking retry action.
- Manually test EN↔HI, EN↔ML, HI↔ML; test mixed-script and code-switched text.

### 9.2 News briefs

- Aim for **exactly three concise lines** with factual language and no invented detail.
- Prefer a short source-grounded brief; do not generate article-level summaries from headline-only metadata.
- Display source/published date and a clear "Read full article" link.
- Cache summary once per source/target language; avoid repeated inference calls that consume free quota on every view.

### 9.3 Moderation

- Rule categories: threats, harassment, hate, doxxing, impersonation, scams, spam, other prohibited material.
- Use schema-validated policy classification through the selected free-tier model plus rule-based rate limits; account for multilingual limitations. General Qwen/Gemma models are triage aids, not dedicated safety classifiers. Do not add a paid moderation dependency or mistake a prompt-injection detector for a content-safety model.
- Preserve political disagreement and criticism unless they violate actual safety rules.
- For prototype: `allowed`, `flagged`, `blocked`; flagged items can be held and manually reviewed. No automatic account bans triggered by report counts.
- Add a basic reviewer/admin path if possible; at minimum ensure reports persist and are protected.

### 9.4 Model adapter

Use a single server-side provider adapter with environment-configured model IDs, request timeout, retry policy, and a zero-currency budget enforced by using only verified free-tier accounts/routes with no paid fallback. Bound requests and tokens as well as concurrency. Record latency/errors without logging private content or tokens. Use fake/mock model responses **only in explicit demo mode**, clearly labeled in UI/docs.

### 9.5 Free-tier provider decision and operating policy

**Decision (23 October 2026):** Start with **Qwen on Groq Free plan**, using one provider adapter for translation, source-grounded briefs and policy-based moderation triage. This is an implementation recommendation based on hosted availability and integration simplicity, not a measured claim of superior Indic-language quality.

| Option | Role | Selection condition |
|---|---|---|
| Groq Free plan + Qwen | Default hosted provider | Verify free access and model visibility in the actual project; evaluate EN/HI/ML |
| Google AI Studio free tier + Gemma | Alternative, not a second required P0 integration | Use only a model returned by the account's current model catalog and confirmed free; compare language quality first |
| Local Qwen/Gemma inference | Deferred alternative | Only if suitable hardware and a working server already exist; no new GPU purchase or paid hosting |

**Checked provider facts:** Groq lists `qwen/qwen3.8-27b` as a preview model. Its published Free plan table lists 30 requests/minute, 1,000 requests/day, 8,000 tokens/minute and 200,000 tokens/day. Preview availability and limits can change; the live account limits are authoritative. The server base URL is `https://api.groq.com/openai/v1`. Sources: [model catalog](https://console.groq.com/docs/models), [Free plan limits](https://console.groq.com/docs/rate-limits), [compatible transport](https://console.groq.com/docs/openai).

Google's current pricing page lists Gemma 4 input/output as free; do not assume older Gemma model IDs remain served. Check exact model IDs and project limits before switching. Google notes that free-tier content may be used to improve its products. Sources: [pricing](https://ai.google.dev/gemini-api/docs/pricing), [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits). Groq documents default inference retention exceptions for reliability/abuse; inspect its account data controls: [data handling](https://console.groq.com/docs/your-data).

**Developer B must implement/record:**

- Verify actual free-plan access, model availability and provider settings before live calls. Do not enable billing, purchase credits, attach a paid fallback or treat expiring trial credits as an ongoing free plan. Do not rotate accounts/keys to evade limits. An application flag alone cannot prevent provider billing; account/route selection must also be verified.
- Keep `AI_PROVIDER`, base URL and per-task model IDs configurable. Pin the selected ID in local configuration, not application code. Configure one provider initially; an alternative needs evaluation and an explicit configuration change, not silent failover.
- Cache translations by content hash, target language and provider/model/prompt version. Cache briefs by source hash, target language and provider/model/prompt version. These are application database caches; paid provider context caching is unnecessary.
- Apply a shared quota budget across translation, briefs and moderation; prioritize moderation and translation over optional briefs. Bound input/output tokens, concurrent calls and retries; respect `Retry-After`, use backoff and stop when daily quota is exhausted. Track aggregate usage without storing private text/tokens in logs. No unbounded retry loop.
- Validate all structured output server-side, including exactly three brief lines and allowed moderation states. Treat news/post text as untrusted data, not instructions. Malformed moderation output or provider failure leaves new content pending for review.
- Test at least 12 short translation examples covering all six EN/HI/ML directions, code-mixing, names, slang and emojis. Record language-review evidence rather than assuming correctness from fluency. Also test summaries for factual support and moderation for both abusive content and legitimate disagreement. If neither candidate meets the language gate, report it as blocked or demonstrate only honestly labeled fixtures; do not claim validated live translation.
- Never send emails, identity records, tokens or service secrets to models. Limit payloads to the post/reply text being processed and necessary policy/source context; never include unrelated account data. Explain third-party processing and the chosen free-tier data policy to pilot testers.
- Return normalized `429` for rate limits and `503` for unavailable inference. Existing original text remains accessible; use cached results when valid. Fixtures require `DEMO_MODE=true` and explicit provenance in responses/UI. Cached live results are not fixtures.

**Priority reconciliation:** News briefs are SHOULD in the product scope. Implement and test them after core conversation/privacy requirements; if deferred, mark T07 deferred with a reason rather than inventing a pass.

## 10. Mobile UI/HCI specification

### Visual direction

Modern, minimal, typographic, fast, India-aware but not nationalist-themed. Prioritize clear hierarchy, comfortable reading and accessible touch targets. Do not copy X's exact visual assets or brand identity.

### Screen-by-screen

1. **Auth:** sign in/up with email; error handling; short explanation of public handle vs private email.
2. **Onboarding:** choose handle, language and interests; allow skip of optional steps; no mandatory university field.
3. **Home:** news and post cards, selected interests, summary affordance, reply CTA, visible authors by pseudonym, source attribution.
4. **Conversation:** news context or root post, threaded replies, inline reply composer, translate/show-original toggle.
5. **Compose:** Unicode input, character count, clear submit state, retry without duplicates; public handle shown.
6. **Explore:** topic filters and optionally lightweight search; no mandatory communities.
7. **Activity:** placeholder with real empty state if notifications not built; no fake activity.
8. **Profile:** public handle/display name, posts, logout/settings; private email only in owner settings.
9. **Report sheet:** reason picker, confirmation, no public exposure of reporter.

### Interaction microdetails

- Tap summary to reveal exactly three short lines; avoid blocking the feed.
- Translation and original toggles should be inline, not a new screen.
- Compose/reply should preserve drafts when interrupted if practical.
- Clear empty/loading/offline/error states; prevent double submit.
- Android and iOS keyboard avoidance, safe-area/notch handling, back navigation and external article links; verify both platforms.
- Text scales reasonably and supports Malayalam/Hindi glyph rendering.
- Label icon-only actions for screen readers and use adequate contrast.
- No auto-playing videos or heavy media in MVP.

## 11. Engineering quality, security and performance

**Prototype baseline (not a public-launch certification):**

- Supabase RLS tested with two user tokens.
- Validate all inputs server-side; use parameterized queries and typed schemas.
- No secrets in client bundles or source control.
- Rate-limit AI and write endpoints; bound text length and request sizes.
- Avoid storing full article bodies without permission.
- Keep AI requests cancellable/time-limited; return user-friendly fallback.
- Use lightweight feed cards and virtualized scrolling; verify on a mid/low-end Android device and an iPhone.
- Track errors and basic latency without sensitive user data.
- Provide `.env.example`; ensure `.env` is ignored by Git.
- Include clear README setup and demo instructions.

**Before public launch (outside hackathon):** legal/age/privacy review; proper account recovery/deletion; human moderation capacity and appeals; abuse prevention; backups and restore tests; security review; monitoring and incident response; media compliance; stronger identity claims only with real verification.

## 12. Codex execution workflow

### Agent operating rules

1. Read `docs/Samvad_Product_Scope.md` first, then this DPR, then inspect the repository.
2. Write `docs/decisions.md` with assumptions and any deviations before major changes.
3. Implement one vertical slice at a time; run typecheck/tests after each slice.
4. Keep a short `docs/build-log.md` with completed tasks, changed files, commands, failures and next action.
5. Never delete existing user work or rewrite the stack without explaining why.
6. Do not claim features implemented unless tested.
7. Do not spend time on deferred features unless explicitly authorized.
8. If API credentials are missing, implement safe env-configured adapters and documented mock mode, not hardcoded secrets.
9. Prefer functional mobile flows over decorative screens or backend overengineering.
10. At each checkpoint report: **implemented / tested / blocked / next**.

### Phase 0 — Repo audit and bootstrapping (target ~1–2h)

- Inspect existing project and dependencies; ask only blocking questions.
- Create Expo app and FastAPI service if absent; configure Supabase project vars.
- Add navigation shell, shared types, theme tokens, lint/typecheck.
- Write README, env template and initial decisions.
- **Gate:** mobile boots, API health endpoint works, DB connectivity confirmed.

### Phase 1 — Database, auth and profiles (~3–4h)

- Write migration with RLS, indexes and ownership rules.
- Implement email auth, session persistence and logout.
- Create public profile with unique handle; private email inaccessible to other users.
- Implement onboarding languages/interests.
- **Gate:** two accounts sign in separately; unauthorized private record reads fail.

### Phase 2 — Seeded feed and posts (~3–4h)

- Seed attributed news items and interest taxonomy.
- Build mixed feed with post/news cards, refresh, loading states.
- Add original text compose, submit, persist and delete-own-post.
- **Gate:** fresh user sees feed; original post appears once after submission.

### Phase 3 — Conversation loop (~3h)

- Build conversation detail, replies, author handles, reply composer.
- Make one conversation accessible to two accounts.
- Add report action with protected persistence.
- **Gate:** two accounts exchange durable replies and can report a reply.

### Phase 4 — AI integration (~3–4h)

- Implement authenticated FastAPI translation endpoint and cache.
- Add inline translate/show-original toggle.
- Implement source-grounded three-line briefs and summary UI.
- Add basic moderation triage, conservative failure behavior.
- **Gate:** EN/HI/ML cross-language demo succeeds; AI failure leaves original readable.

### Phase 5 — Integration and polish (~3h)

- Fix Android and iOS navigation/keyboard/Unicode issues; verify session restoration on both.
- Test network failures, duplicate submission, protected data.
- Add empty states, spinner/toast feedback and clean design details.
- **Gate:** complete demo script works without developer intervention.

### Phase 6 — Build, rehearse, freeze (~2h)

- Verify Android and iOS demo paths; produce an Android APK and iOS development/TestFlight build if existing credentials/tooling allow. Expo Go on each platform is acceptable; store publication is deferred.
- Capture demo evidence/screenshots; rehearse 2–3 minute story.
- Freeze scope and fix only blocking issues.
- **Gate:** app can be launched and demonstrated on a phone.

**Scheduling note:** These are approximate parallelizable work packages, not guaranteed elapsed durations. The two-person team must adjust to actual remaining hackathon time.

## 13. Suggested team ownership

| Workstream | Developer A — mobile/HCI | Developer B — backend/AI |
|---|---|---|
| Setup | Expo, routing, UI system | Supabase project, FastAPI, migrations |
| Identity | Signup/onboarding screens | Auth policies, private/public schema |
| Feed | News/Post cards, navigation | Seed data, feed queries, RLS |
| Discussion | Thread and composer | Replies and reports |
| AI | Translation/summary UX | AI endpoints, caching, moderation |
| QA | Android and iOS usability, glyphs | Authorization tests, error handling |
| Integration | Joint checkpoint every phase | Joint checkpoint every phase |

Avoid both people editing the same file simultaneously. Use small feature branches or clearly divided directories, frequent commits and integration checkpoints.

## 14. Test plan / acceptance matrix

| ID | Scenario | Expected result |
|---|---|---|
| T01 | New user signs up and selects interests | Populated feed; no compulsory campus membership |
| T02 | Create two accounts with different handles | Both profiles distinct; handles unique |
| T03 | User B queries A's private identity | Denied by RLS/API; email not exposed |
| T04 | Post Malayalam text + emoji | Original survives storage and display |
| T05 | Translate Malayalam reply into Hindi/English | Labeled translation shown; original recoverable |
| T06 | Translation API unavailable | Original remains readable; retry offered |
| T07 | News brief requested (if enabled) | Three concise lines; source/limitations clear |
| T08 | Open news publisher | Correct external article URL |
| T09 | Two users reply in same conversation | Both replies persist and render |
| T10 | Rapid double tap / retry post | No duplicate creation |
| T11 | Report post/reply | Report stored; other users cannot read report details |
| T12 | Clearly abusive sample | Moderation flags/holds appropriately; normal criticism not blanket-blocked |
| T13 | User publishes standalone post | Appears in open feed, not only under news |
| T14 | Fresh account with no followed users | Nonempty discovery feed |
| T15 | App separately on Android and iOS with unstable network | Clear pending/failure states; no silent loss of user input |
| T16 | Secret scan | No provider service key in app or Git |
| T17 | Core flow on Android and iOS against the same backend | Both pass; preferably complete a cross-device two-account exchange |
| T18 | Free-tier quota exhausted / provider unavailable | No paid fallback; cached result or normalized error; original readable; unscreened writes remain pending |
| T19 | Provider/model configuration and language evaluation | Verified free plan/model; EN/HI/ML evidence recorded; fixtures clearly distinguished |

If tests cannot be automated, record a manual test checklist with evidence. Never report unrun tests as passed.

## 15. Demo narrative for judges

**0:00–0:25 — Problem:** India's public conversations span many languages; speaking under real names can feel risky; new networks have empty feeds.  
**0:25–0:45 — Signup:** create public handle; select language/interests; enter a populated feed.  
**0:45–1:15 — Discovery:** show attributed news, optional AI brief, and open discussion; emphasize news as conversation seed.  
**1:15–2:00 — Wow moment:** account A replies in Malayalam; account B reads in Hindi, toggles original, replies; A sees response.  
**2:00–2:25 — Expression:** create an original post under pseudonym; explain private contact vs public identity.  
**2:25–2:45 — Safety:** report and moderation example without pretending every case is automatically resolved.  
**2:45–3:00 — Scale story:** university-sized pilot validates a nationwide social network vision, not a campus-only app.

## 16. Failure modes and fallback plan

- **No API key/credits:** use explicit demo-mode cached translations/briefs for predefined content; never misrepresent as live AI.
- **Translation quality weak:** restrict to supported language pairs; preserve original; explain limitations.
- **News provider unavailable:** use curated attributed seed records and publisher links; avoid unsupported full-text claims.
- **Realtime unreliable:** manual refresh/polling fallback.
- **Native build/signing delayed:** use Expo Go on Android and iPhone with compatible dependencies. Document missing native artifacts; do not label Expo Go as a standalone signed build.
- **No iPhone/Mac available:** mark iOS device verification blocked and obtain teammate/tester device evidence; never infer iOS success from an Android run.
- **Free quota exhausted:** stop live inference, serve valid cache or normalized errors, and use only explicitly labeled demo fixtures; never enable paid fallback.
- **Auth email delays:** provision preverified demo accounts via authorized development setup, label them as test accounts.
- **Moderation unavailable:** keep reporting and conservative publish handling; do not claim automated safety.
- **Time runs short:** cut likes, search, notifications, avatars, event clustering before cutting core multilingual conversation.

## 17. Risks and mitigation

| Risk | Mitigation |
|---|---|
| Cold start | Curated sourced stories + clearly labeled demo fixtures + real testers |
| Social cold start | Invite initial participants; enable original posts, not only article comments |
| Privacy leakage | Separate tables, RLS, negative tests, no public real-name claims |
| Abuse behind pseudonyms | Rate limits, reports, conservative moderation, documented enforcement |
| Hallucinated news summaries | Source-grounded prompts, cache, link to original, no headline-to-article invention |
| Multilingual inaccuracies | Original toggle, native-speaker spot checks, language fallback |
| Scope explosion | Product-scope MUST list and staged build gates |
| Mobile performance | Virtualized lists, lightweight text-first design, device testing |
| Free-tier AI quota/availability | Shared request/token budgets, application cache, configurable model, no paid fallback, labeled fixtures |
| Legal/compliance gaps | Restrict to controlled demo; separate public-launch review before broad release |

## 18. Future roadmap — do not build now

- More languages and transliteration, deeper language-aware search.
- Following graph, likes, reposts, quotes, bookmarks, robust notifications.
- Advanced search and configurable feeds, better recommendation explanations.
- Images and other accessible media, low-data mode and offline drafts.
- Stronger moderation dashboards, appeals, anti-impersonation, coordinated-abuse detection.
- Privacy/account deletion, export, support workflows and public-launch compliance.
- Optional communities or private messaging **only if validated**; these are not part of the current open-network positioning.
- Scaling, analytics, cost governance and operational resilience based on measured traffic.

## 19. Codex CLI kickoff prompt (copy/paste)

```text
You are the lead implementation agent for Samvad, a 24-hour hackathon Android and iOS prototype.

Read docs/Samvad_Product_Scope.md as the authoritative product scope and docs/Samvad_Detailed_Project_Report_Codex.md as the technical execution specification. Inspect the existing repository before making changes.

Goal: deliver an Expo/React Native app backed by Supabase and a FastAPI AI adapter. The must-work vertical slice is: email login -> pseudonymous public handle -> language/interest onboarding -> nonempty feed of attributed news + original posts -> open conversation -> two accounts replying in different languages -> labeled translation with show-original -> report action. Include optional 3-line source-grounded news briefs and conservative moderation.

Never turn the app into a university-specific product. University scale is only the test deployment. Do not add mandatory communities/rooms, DMs, reels, complex ML recommendations, or other deferred features. Never expose private emails or provider keys. All app AI is free-tier only: start with Qwen on Groq Free plan, verify model access, and never enable paid fallback.

Start by auditing files and environment, writing docs/decisions.md and a brief task plan. Implement in vertical slices, run checks at every phase, and keep docs/build-log.md current. Report implemented, tested, blocked, and next. If credentials are missing, use a clearly labeled demo mode and document exact setup steps; do not invent API success.

Begin with Phase 0 and Phase 1, and tell me the smallest set of environment values or approvals you require.
```

## 20. Configuration checklist

```dotenv
# mobile/.env (PUBLIC ONLY; never put service secrets here)
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_BASE_URL=

# api/.env (SERVER ONLY; keep out of Git)
SUPABASE_URL=
SUPABASE_JWKS_URL=
# Default: Groq Free plan. Never place these values in EXPO_PUBLIC_*.
AI_PROVIDER=groq
AI_BASE_URL=https://api.groq.com/openai/v1
GROQ_API_KEY=
# Example checked 2026-10-23; revalidate availability/free access before live use.
AI_TRANSLATION_MODEL=qwen/qwen3.8-27b
AI_SUMMARY_MODEL=qwen/qwen3.8-27b
AI_MODERATION_MODEL=qwen/qwen3.8-27b
AI_FREE_TIER_ONLY=true
AI_ALLOW_PAID_FALLBACK=false
# Conservative local budgets shared across AI tasks; reduce to actual account limits.
AI_MAX_REQUESTS_PER_MINUTE=10
AI_MAX_REQUESTS_PER_DAY=100
AI_MAX_TOKENS_PER_MINUTE=4000
AI_MAX_TOKENS_PER_DAY=50000
AI_MAX_CONCURRENT_REQUESTS=1
AI_MAX_INPUT_CHARS=6000
AI_MAX_OUTPUT_TOKENS=512
AI_REQUEST_TIMEOUT_SECONDS=20
# Optional alternative only if selected: AI_PROVIDER=google, GOOGLE_API_KEY=,
# AI_BASE_URL= (provider-native default); set all model IDs to verified free Gemma IDs.
ALLOWED_ORIGINS=
DEMO_MODE=false
```

**Note:** actual variable names should match the chosen Supabase SDK/API version. Verify the provider's current documented auth/JWT validation and model identifiers before implementing. Do not place Supabase service-role keys in `EXPO_PUBLIC_*` variables.

### Cross-platform setup and delivery

- Configure `android.package` and `ios.bundleIdentifier` in the shared Expo app; keep Android and iOS capabilities aligned. Avoid dependencies that force custom native builds unless the team already has working builds for both.
- Backend endpoints and auth contracts are identical across platforms. Use reachable HTTPS URLs on devices; `localhost` refers to the phone itself. Android emulator host aliases are not valid iPhone configuration. Do not rely on disabling iOS transport security or Android network protections.
- Verify Supabase auth redirect/deep-link configuration for the selected Expo Go or native app paths on each platform. CORS settings are relevant to web clients and are not native app authorization.
- Record separate Android and iOS evidence for login/session, feed, posting, replies, translation/original, reports, links, keyboard/safe areas and Indic fonts. Missing hardware is BLOCKED.
- Local Apple iOS Simulator/Xcode requires macOS. A Windows developer can use a physical iPhone with Expo Go. Store/TestFlight distribution uses Apple signing/membership; do not promise a free standalone iOS distribution artifact. Cloud-build availability and store fees are separate from the zero-AI-spend rule.
- Official setup references: [Expo environments](https://docs.expo.dev/get-started/set-up-your-environment/), [iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/), [builds and signing](https://docs.expo.dev/deploy/build-project/).

## 21. Final scope and source traceability

- **From project conversations:** nationwide vision, open X-style social graph, university-scale pilot, interest-led onboarding, news as cold-start scaffolding, pseudonymity, optional AI summaries, multilingual discussions, India-first HCI, 24-hour two-person constraint.
- **From teammate checklist:** Indian-script robustness, authentication/privacy separation, feed/reply reliability, reporting/moderation, Android low-data/accessibility concerns, safe retries, analytics and launch readiness gates.
- **Engineering recommendations added here:** Expo/Supabase/FastAPI architecture, tables/RLS, endpoint contracts, phase plan, repo layout, test matrix and Codex kickoff prompt. These are proposed implementation choices, not statements already approved by the team.

**Final implementation rule:** Deliver the smallest honest, working version of the complete Samvad interaction loop; document deferred features rather than pretending to have built them.
