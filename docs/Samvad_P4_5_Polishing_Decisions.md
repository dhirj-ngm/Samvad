> **Execution override — 24 October 2026:** The user's latest instruction is to
> implement the UI/UX and non-AI social experience as one combined Developer A/B
> workstream. AI work is deferred from P4.5: no Sarvam integration, new models,
> fine-tuning, expanded translation guarantees, new summary execution or AI
> moderation changes. Preserve existing P4 AI behavior. AI items below remain
> future proposals, not requirements for this build. The scoped sequence and
> acceptance criteria are in [p4-5-plan.md](p4-5-plan.md). Planning/contract alignment
> is recorded; implementation and device/live acceptance are not yet claimed.

# SAMVAD — P4.5 POLISHING DECISIONS & CODEX CHANGE REQUEST

**Status:** Updated change request (profile and language onboarding added); AI execution remains separately planned. Proposed change request, to implement after P4 and before P5. **Scope:** Preserve the existing nationwide open-conversation vision; university-sized deployment is a pilot, not a campus-only identity. **Owners:** Developer A (mobile/HCI), Developer B (backend/AI). **Baseline:** Existing product scope, DPR and implementation playbook remain authoritative except where this change request explicitly extends P4.5.

## 1. Executive decision

Introduce **P4.5: Social Experience + AI Refinement + 10-user Hosted Pilot**. Do not restart the app or change frameworks. Use the existing React Native/Expo, Supabase/Postgres and FastAPI foundation. Add three AI capabilities through one gateway: moderation triage, short summaries, and multilingual translation. Expand social features in the style of Koo's familiar public feed: posts, news-as-posts, likes, replies with @mentions, reposts, people directory, and follow/following. Take interaction inspiration from Koo, not copyrighted branding, assets or a pixel-perfect clone.

## 2. Priority / completion order

| Priority | Feature | Acceptance |
|---|---|---|
| **Critical** | Existing P4 functionality stays working | No regressions in auth, news feed, original posts, replies, translation |
| **Critical** | Moderation triage + report-based admin queue | One admin can review flagged posts/replies and apply a recorded action |
| **Critical** | Hosted deployment + 10 real email accounts | 10 consenting participants can log in on separate devices and post/reply |
| **High** | Sarvam translation provider | Expanded language selector, working provider adapter, original text toggle |
| **High** | Summarize article or long post/thread | User requests a labeled 3–4 line summary; no automatic rewriting |
| **High** | Native-language onboarding + editable personal profile | Preferred language persists; avatar, follower/following counts, interests and language settings work |
| **High** | Like, follow/unfollow, discover people | Durable, unique relationships and accurate counts |
| **High** | @mentions and reposts | Tag a valid handle and repost with source attribution |
| **Optional** | Notifications for mentions/follows | Add only after core flows are stable |
| **Defer** | Full fine-tuning, large GPU hosting, recommendation ML, media, DMs | Document as roadmap unless measured necessity |

## 2A. Onboarding language and personal profile — UI/UX decision (NEW)

**Native-language choice is part of first-run onboarding, not hidden inside translation settings.** After authentication and public-handle setup, users choose their preferred/native reading language from the currently supported language registry. Save this preference to their own profile, use it for the feed's translation target and summary language where supported, and allow changing it **at any time** in Profile → Edit Profile / Language Preferences. Do not claim every language has full UI localization merely because translation is available. Preserve original posts and offer **Show original**.

**Personal Profile is a first-class destination** in the app navigation, inspired by the familiar social profile layout of Koo but with original Samvad branding. Include:

- Profile picture/avatar with upload, replace, remove, default fallback, image-size/type validation and safe storage; **no real-name requirement**.
- Public display name and unique pseudonymous @handle; optional bio. Never expose the login email in public views.
- Accurate **Followers** and **Following** counts, tappable lists of public handles, and follow/unfollow controls when viewing someone else's profile.
- **My Interests**: selected interest tags with a clear edit flow; updates should affect feed personalization.
- **Language Preference**: current native/preferred reading language, editable selector and save confirmation; changing it affects subsequent translations without rewriting original content.
- Own posts and reposts, and optionally a replies tab if already implemented; consistent likes/comments/repost actions.
- Profile editing and account settings/logout entry points; accessible empty, loading and error states.

**Privacy/UX:** Public visitors see only public profile fields and social counts; the owner can manage personal preferences and account settings. Private email/authentication details stay in protected account settings, not the public profile API. Profile pictures are optional and should never be a signup blocker. Support Indian-script handles/display names appropriately and keep language choices readable in their native scripts.

**Acceptance:** A newly registered user selects Malayalam (or another actually supported language), sees it retained after logout/login, changes to Hindi in their profile, and sees future on-demand translations use Hindi while originals remain unchanged. A second account can visit the profile, follow it, and see accurate follower/following counts; the email remains inaccessible.

**Owner separation:** Developer A owns the onboarding picker, profile UI, avatar UX, interests editor, and follow lists. Developer B owns persistence, avatar storage policies, language/interest update authorization, public profile projections, and accurate count queries. **AI provider selection, moderation-model work, summary-model execution and fine-tuning are deliberately separate workstreams**; do not make this UI/UX decision contingent on them.

## 3. AI layer A — compliance-aware moderation assistant

**Purpose:** Assist one human administrator in finding potentially harmful posts, replies, and abusive patterns. AI is not a judge of legality and must not automatically equate controversial opinions or criticism with misconduct.

**Pipeline:**
1. On new post/reply, enforce basic deterministic checks (length, rate limit, obvious spam), store a `pending` or policy-appropriate visibility state.
2. Run multilingual classification for categories such as threats, targeted harassment, hateful abuse, doxxing/personal data, impersonation, scams/spam, and other policy violations. Use a versioned platform policy that has been reviewed against relevant Indian legal obligations; **do not dump legislation into a prompt and claim legal compliance**.
3. Emit structured result: `category`, `severity`, `confidence`, `reason_code`, `evidence_excerpt` (minimized), `policy_version`, `model_version`, `recommended_action` (`allow`, `warn`, `review`, `temporarily_hold`).
4. Ingest user reports into the same queue. Deduplicate reports; a large report count alone is not proof of wrongdoing.
5. Administrator sees prioritized queue with original text, translation on request, reason, report count, previous incidents, and actions: `dismiss`, `warn`, `hide/remove`, `restore`, `suspend` (suspension requires explicit human confirmation).
6. Record moderator ID, timestamp, reason, action, and appeal/review status. Warn users through an in-app notice; no automated threatening or accusatory messages.
7. High-severity content may be held pending review according to a documented policy; failures must not silently publish known unsafe material. Preserve human oversight and an appeal path before public launch.

**Legal framing:** India's IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, as amended, are relevant to notices, grievance handling, content moderation and applicable synthetic-content obligations; DPDP obligations require separate analysis. Legal applicability, deadlines, and platform classifications must be reviewed before public launch. This is **compliance-aware design**, not certification. See official MeitY source: https://www.meity.gov.in/ and the 2026 amendment FAQ at https://www.meity.gov.in/static/uploads/2025/10/065b6deb585441b5ccdf8be42502a49c.pdf .

**Data:** `moderation_cases`, `moderation_actions`, `user_warnings` plus existing `reports` and `moderation_events`; enforce admin-only RLS/roles. Protect reporter identities. Don't expose private emails in public profiles or moderation API payloads to unauthorized users.

**Demo:** submit an obviously abusive *synthetic test* comment, see flagged queue, issue warning or hide, verify feed update. Also demonstrate that a civil disagreement is not flagged as harassment. Never test with real threats or personal information.

## 4. AI layer B — short, on-demand summaries

- Support (a) attributed news item and (b) long user post or thread.
- User explicitly taps **Summarize**; return **3–4 concise lines** with a `Summary generated by AI` label and a link/toggle to the full original.
- News summary must be grounded in legitimately accessible text; when only headline/excerpt exists, call it a **headline-based brief** and do not invent article facts.
- For discussions, distinguish **author's argument** from **other people's replies**; if summarizing a thread, represent competing views neutrally without claiming consensus.
- Cache by content hash, language, model/version; invalidate after edits/deletion. Limit text and tokens; handle timeout gracefully.
- Use a small instruction-tuned open-weight model (e.g. suitable Qwen/Gemma variant) via a server-controlled inference adapter. Benchmark before fine-tuning. **No requirement to fine-tune for a hackathon**: prompts and a few evaluated examples may outperform rushed LoRA training.

## 5. AI layer C — Sarvam translation and expanded languages

- Replace hardcoded three-language-only assumptions with a language registry and feature flags.
- Use Sarvam Translate (`sarvam-translate:v1`) for coverage of **22 scheduled Indian languages plus English**; Sarvam Mayura (`mayura:v1`) can be selected for supported colloquial/code-mixed language pairs. Confirm current API quotas, costs, supported directions, and model availability at integration time.
- Preserve the original Unicode post. Always show `Translated by AI` and `Show original`; don't silently change user-authored text.
- Map app codes (`en`, `hi`, `ml`, `ta`, etc.) to provider codes (`en-IN`, `hi-IN`, `ml-IN`, `ta-IN`, etc.) centrally. Chunk long text at sentence boundaries within provider limits; cache results; use explicit retry/fallback.
- **Important distinction:** translation availability is not the same as fully localized UI, language-aware search, or moderation quality. Mark language capabilities accurately. Test native-script, Romanized and mixed-language examples.
- Keep Sarvam credentials server-side. If using a friend's credits, obtain permission and clarify who owns the account, spending limits and credential access; never paste the key into Expo variables or Git.
- Reference: https://docs.sarvam.ai/api/getting-started/models/sarvam-translate

## 6. Open models / free infrastructure decision

**Preference:** no new paid AI subscriptions. Evaluate Qwen and Gemma open-weight checkpoints for summaries and moderation; check model licenses, memory requirements, quantization, Indian-language performance and moderation reliability. Colab is a development/training notebook environment, **not a reliable always-on production inference host**. Hugging Face model repositories store weights; hosting an API requires a running Space, endpoint, or other server. Free CPU hosting can sleep and may be too slow for larger models. Do not promise zero-cost, 24/7 inference or real-time latency without testing.

**Practical sequence:** (1) run an existing small model with structured prompts; (2) evaluate ~30 labeled cases including Indian-language and code-mixed content; (3) optionally LoRA fine-tune if clear quality gaps and sufficient GPU time; (4) upload permitted artifacts to Hugging Face; (5) deploy a small, secured inference endpoint if resources permit; (6) retain timeout/fallback behavior. Sarvam is an optional metered API, not necessarily free, and is separate from the open-model path.

## 7. Koo-inspired social UX extension

**Interaction model:** one open public feed with standalone posts and news-as-posts, rather than mandatory rooms/communities. Every post card: pseudonymous avatar/handle, timestamp, text, translation, like, reply, repost, report, and (if applicable) source link and summary. Reposts retain source post ID and original author attribution; no orphaned copies. News is clearly labeled `News / Source`, not impersonated as a human author.

**Screens:** Home (For You / Following if available); Compose; Explore/People (search and discover handles); Conversation (threaded replies and @mentions); **Profile (avatar, public handle/bio, posts/reposts, follower/following counts and lists, My Interests, editable native-language preference, edit-profile/settings)**; Admin (separate protected route). Preserve original Samvad design identity; use Koo for navigation and social interaction inspiration only.

**Database additions:**
- `likes(user_id, post_id, created_at)` with unique `(user_id,post_id)` and RLS ownership.
- `follows(follower_id, followed_id, created_at)` unique pair, no self-follow, RLS.
- `reposts(user_id, original_post_id, created_at)` unique pair; attribution and deleted-content behavior.
- `mentions(id, author_id, target_user_id, post_id/reply_id, created_at)` with valid handle resolution, notification optional.
- Public `profiles` listing only non-sensitive fields; no email or internal identity exposure.
- Index relevant counts/lookups and avoid N+1 feed queries; use existing data model and migrations, not a destructive rewrite.

**UX acceptance:** like/unlike toggles correctly; follow/unfollow persists; People search finds handles; mentions resolve and link to a profile; repost preserves original attribution; both news and original posts support discussion. A handle is public pseudonym, not proof of legal identity.

## 8. Ten-user hosted pilot / release gate

**Target:** at least 10 **real, consenting participants using their own valid email accounts**; pseudonymous public handles. Never fabricate registrations, use disposable impersonated identities, or expose a roster of private emails in screenshots.

**Plan:**
1. Deploy Supabase database/auth and FastAPI to stable HTTPS endpoints; configure secrets and CORS, and publish mobile build (Expo Go or installable APK) with reachable production-like API URL. LAN-only URLs will not work for remote users.
2. Verify email signup/confirmation flow and email provider quotas; avoid switching off security solely to make the demo easier.
3. Invite 10 participants to sign up, choose language/interests and make one genuine post or reply. Use a clearly marked test conversation prompt to bootstrap discussion.
4. Test 10 sessions with concurrent reads/writes, follows, likes, reposts and translation. Collect only aggregate pilot results (signups, replies, languages, errors) with notice/consent.
5. Protect admin role with restricted auth, ideally MFA; verify RLS and reports visibility; keep recovery and emergency takedown procedure documented.
6. Rehearse on mobile data, not only campus Wi-Fi; have a cached/demo fallback clearly labeled in case external AI services fail.

**Pilot success:** 10 unique real accounts can authenticate, view feed, reply, follow, and access available translations; admin can moderate; no private email leaks. This is **a controlled pilot, not approval for unrestricted public launch**.

## 9. Two-developer parallel execution: P4.5

| Checkpoint | Developer A — mobile/HCI (`dev/mobile`) | Developer B — backend/AI (`dev/backend`) | Joint gate |
|---|---|---|---|
| **4.5A — Contract freeze** | Screen/interaction map, onboarding native-language picker, personal profile components | DB migration + AI response schemas + role model | Agree API and schema without breaking P4 |
| **4.5B — AI upgrades** | Summary button, language picker, moderation warning UI, admin board frontend | Sarvam adapter, summary route, moderation queue/action APIs | Translation + summaries + report-to-admin path |
| **4.5C — Social graph** | Koo-inspired feed card, like/repost, @mentions, people directory, follow UI, **complete profile and editable interests/language** | likes/follows/reposts/mentions schema, policies, queries | Two accounts can follow, like, mention, repost |
| **4.5D — Hosted pilot** | Mobile build, user onboarding, 10-person usability smoke | HTTPS API, Supabase auth/email, admin security, monitoring | 10 real accounts work outside local network |
| **4.5E — Freeze** | Device UX fixes only | Security/regression fixes only | P5 tests may begin |

**Merge protocol:** After each checkpoint, each developer runs checks, commits and pushes only their own branch; integration captain reviews both, verifies shared contract compatibility, merges into `main` only after combined gate passes, and tags `checkpoint-p4-5a` etc. Do not push directly to `main` from two Codex agents. Keep existing `P5` test phase, but expand its test matrix for new features and ten-user load.

## 10. Codex kickoff prompts

### Developer A — Mobile

```text
Read docs/Samvad_Product_Scope.md, docs/Samvad_Detailed_Project_Report_Codex.md, docs/Samvad_Implementation.md, and docs/Samvad_P4_5_Polishing_Decisions.md. P4 is complete. You own mobile/** and your mobile build log; do not edit backend files. Implement P4.5A contract alignment first, then wait for integration gate approval before P4.5B–E. Build Koo-inspired (not cloned) feed cards, likes, reposts, @mentions, People directory, follow/following, **first-run native-language selection and a complete personal profile (PFP, bio, followers/following counts/lists, My Interests, editable language preference, posts/reposts)**, translation selector, short summary UX, and a protected admin moderation screen. **Keep AI model/provider execution separate; only implement UI and API integration contracts for AI features.** Preserve Samvad's open public feed, pseudonymous identity, and original-language toggle. Run typecheck and Android smoke checks; commit/push dev/mobile after each completed checkpoint. Report SHA, tested, blocked, next. No fake test results or secrets.
```

### Developer B — Backend/AI

```text
Read docs/Samvad_Product_Scope.md, docs/Samvad_Detailed_Project_Report_Codex.md, docs/Samvad_Implementation.md, and docs/Samvad_P4_5_Polishing_Decisions.md. P4 is complete. You own api/**, supabase/**, and backend build log; do not edit mobile files. Start with P4.5A contracts/migration design. **Support persisted onboarding language, profile language changes, interests editing, avatar storage, public profile projections and follower/following counts. Keep AI provider/model execution as a separately approved workstream; do not start fine-tuning or AI implementation changes without further CLI instructions.** Add moderation triage, report-prioritized human review queue, recorded warning/hide/restore/suspension actions; source-grounded 3–4-line news/post/thread summaries; Sarvam provider adapter and language registry; likes, follows, reposts, mentions and public people directory. Preserve P4 endpoints and RLS. Use env-only credentials, secure admin authorization, tests for cross-user privacy and false-positive moderation. Deploy reachable HTTPS backend and validate 10 real consenting accounts. Commit/push dev/backend after each approved checkpoint; report SHA, tested, blocked, next. Do not claim legal compliance or production readiness.
```

### Integration captain

```text
Read all four Samvad docs and both developer logs. For P4.5 checkpoint A/B/C/D/E, fetch dev/mobile and dev/backend, inspect commits and contracts, verify tests and secret safety, merge reviewed changes into local main, run joint smoke test, and only then push main and tag checkpoint-p4-5<letter>. If gate fails, keep main on last passing commit and assign precise fixes. At E, freeze scope and begin P5 full regression testing.
```

## 11. P5 additions: test checklist

- [ ] Native-language choice persists across sessions; changing it in Profile updates preferred translations without modifying original posts.
- [ ] Personal profile supports optional PFP, editable interests, accurate follower/following counts/lists and safe public/private field separation.
- [ ] 10 real distinct email accounts register and authenticate; no private email in public user listing.
- [ ] Like/unlike, follow/unfollow, mention resolution, repost attribution all persist and obey RLS.
- [ ] News and user posts use the same reply and interaction model.
- [ ] Sarvam translation across multiple selected Indian languages, with show-original and graceful failure.
- [ ] Three-to-four-line summary for article (source-limited) and long discussion (balanced attribution).
- [ ] AI flags an obviously abusive synthetic test; does not suppress a civil opposing view.
- [ ] Reports appear only in admin queue; admin action is logged and updates feed visibility.
- [ ] User receives a non-accusatory warning notice when admin sends one.
- [ ] All secrets remain server-side; no unauthorized admin access; migrations and rollback checked.
- [ ] Hosted API works from mobile data; simultaneous pilot actions succeed; fallback demonstrated.

## 12. Explicit decisions to confirm before implementation

1. Who owns the Sarvam API account and what is the agreed spending cap?
2. Which Qwen/Gemma checkpoint can run within actual available RAM/CPU/GPU? Benchmark before choosing.
3. Is the admin interface mobile-only, or is a small protected web dashboard easier? **Recommendation:** small responsive web admin panel if it can reuse the existing backend.
4. Which 10 consenting pilot participants will test the app, and how will their feedback be recorded without collecting unnecessary private data?

**Freeze rule:** Do not delay P5 indefinitely for fine-tuning or cosmetic feature expansion. Working 10-user social interactions, protected identity, translation and admin moderation outrank a custom-trained model.
