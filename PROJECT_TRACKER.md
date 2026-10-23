# Samvad project tracker

**Current P4 handoff (24 October):** Both workstreams implemented on integrate/p4,
based on accepted merged P0–P3 main 78e5825. No previous-phase conflicts existed.
Preserved the prior uncommitted final verification notes in b2fa66d. Deployed P4
private cache/quota/moderation migration; 69 Python, 74 SQL and 11 mobile tests,
both exports, real shared SDK regressions and P4 two-account JWT/RLS checks pass.
Server keys/Free-plan confirmation, live provider/language review and P4 Android/iOS
gate remain pending. [Next verification](docs/p4-verification.md). No P5/P6 started.

**Snapshot:** 24 October 2026 (IST), P0–P3 accepted and integrated for main; P4 has not started

**Source of truth for scope:** [Product Scope](Samvad_Product_Scope.md), [technical specification](Samvad_Detailed_Project_Report_Codex.md), and [implementation plan](Samvad_Implementation.md).
**Working branches:** `main` is the integrated handoff; Developer A uses `dev/mobile`, Developer B uses `dev/backend`. Pull `main` before starting new phase work. Keep owner changes on their branches and coordinate shared contracts through the integration captain.

## Where the project stands

Final merged-code rerun at `78e5825` (24 October, 03:39 IST): **36 configured Python
tests, zero skips**, including P1/P2/P3 live suites; **63 SQL**, **8 mobile model**,
both actual shared SDK live checks, TypeScript, Ruff and pip check passed. The
earlier merge-preparation live skips are superseded by this fresh result.
[Final verification](docs/final-live-verification-2026-10-24.md). Existing device
acceptance remains user-reported; security/dependency warnings are not erased.

P2 was implemented for both workstreams at the user's request. The mixed feed,
archive/source links, topic filters, durable composer, account-scoped drafts,
pending status and owner removal are connected to Supabase. The development
migrations and six source records are deployed; three benign demo posts were
individually reviewed and labeled. Automated evidence and the remaining device
checks are in [P2 verification](docs/p2-verification.md). User confirmed both platforms
working through P2. P3 now adds threaded replies, private reporting, durable drafts,
ownership/visibility rules and account write limits. Database migration is deployed;
63 SQL, 36 Python, 8 mobile model tests, hosted two-account and shared SDK checks pass.
See [P3 verification](docs/p3-verification.md). No AI features added; public visibility
still requires trusted review.

| Workstream | Current state | Evidence and next gate |
|---|---|---|
| P0 mobile shell | **Implemented on Expo SDK 58.** One React Native app has five tabs, sample conversation, design tokens, and typed client shapes. Content is labeled as sample. | Typecheck, Expo dependency check, and Android/iOS exports passed. Android navigation passed by user observation on iQOO Z7 Pro 5G, Android 15: Home, Explore, Compose, Activity, Profile, sample conversation. [Mobile log](docs/build-log-mobile.md). |
| P0 Android API reachability | **Phone browser passed.** Android Chrome displayed the P0 `/health` JSON through a temporary HTTPS tunnel. | This proves phone-to-API reachability only. The P0 app has no in-app API request. [Integration checklist](docs/integration-checklist.md). |
| P0 iOS and overall gate | **PASS by user observation.** Samvad opened in Expo Go on iPhone 17 Pro / iOS 27.0.1; all five tabs, sample conversation, and Safari `/health` worked. Overall P0 bootstrap gate passed. | Expo Go version was not reported. Browser `/health` is separate from an in-app API request, which P0 does not implement. [Mobile log](docs/build-log-mobile.md). |
| Developer B P0 API | **Implemented locally.** FastAPI exposes `GET /health`; no Auth/content/AI endpoints are live in P0. | Local health and API tests passed. See [backend log](docs/build-log-backend.md) and [API README](api/README.md). |
| Developer B P1 identity foundation | **PASS.** Migration `20261023201908` is deployed to `mtgsyjqcoyzijicpydee`; live password-grant/onboarding/RLS checks passed. | Backend 34 passed with no skips; SQL 22 passed. Dedicated-account checks verified duplicate handles, private data denial and cross-account isolation. See [live verification](docs/p1-live-verification.md). |
| Developer A P1 mobile auth/onboarding | **PASS by user acceptance.** Integrated sign in/up, persisted session, handle/language/interests, retryable save and logout. | TypeScript and Android/iOS exports passed. User confirmed remaining testing complete on 24 October; no additional per-device logs or step results supplied. See [closeout](docs/p1-live-verification.md). |

## Next handoff

1. Developers A and B sync from `main`, which integrates accepted P0–P3.
2. P3 is PASS based on the recorded automated/live evidence and the user's confirmation that testing is complete and it works. No additional per-device traces were supplied at closeout.
3. Preserve trusted review, private reports, retry-safe writes and ownership rules in later work. Test harnesses mutate dedicated accounts only.
4. Next planned phase is P4 AI; agree provider/model access and shared contracts before starting it. No P4 implementation is included in this merge.

## Updating this tracker

Each developer updates their own build log with implemented, tested, blocked, and next steps, then pushes their owned branch. The integration captain updates this tracker and the [integration checklist](docs/integration-checklist.md) on `main` after reviewing evidence. Include the device/account environment, exact result, and commit SHA; use **BLOCKED** for work that has not been observed. Do not store secrets or temporary account credentials here.
