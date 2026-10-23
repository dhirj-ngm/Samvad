# Samvad project tracker

**Snapshot:** 24 October 2026 (IST), P0/P1 accepted; P2 code and development backend implemented, new phone acceptance pending

**Source of truth for scope:** [Product Scope](Samvad_Product_Scope.md), [technical specification](Samvad_Detailed_Project_Report_Codex.md), and [implementation plan](Samvad_Implementation.md).
**Working branches:** `main` is the integrated handoff; Developer A uses `dev/mobile`, Developer B uses `dev/backend`. Pull `main` before starting new phase work. Keep owner changes on their branches and coordinate shared contracts through the integration captain.

## Where the project stands

P2 was implemented for both workstreams at the user's request. The mixed feed,
archive/source links, topic filters, durable composer, account-scoped drafts,
pending status and owner removal are connected to Supabase. The development
migrations and six source records are deployed; three benign demo posts were
individually reviewed and labeled. Automated evidence and the remaining device
checks are in [P2 verification](docs/p2-verification.md). No replies or AI features
were added. Public visibility still requires trusted review.

| Workstream | Current state | Evidence and next gate |
|---|---|---|
| P0 mobile shell | **Implemented on Expo SDK 58.** One React Native app has five tabs, sample conversation, design tokens, and typed client shapes. Content is labeled as sample. | Typecheck, Expo dependency check, and Android/iOS exports passed. Android navigation passed by user observation on iQOO Z7 Pro 5G, Android 15: Home, Explore, Compose, Activity, Profile, sample conversation. [Mobile log](docs/build-log-mobile.md). |
| P0 Android API reachability | **Phone browser passed.** Android Chrome displayed the P0 `/health` JSON through a temporary HTTPS tunnel. | This proves phone-to-API reachability only. The P0 app has no in-app API request. [Integration checklist](docs/integration-checklist.md). |
| P0 iOS and overall gate | **PASS by user observation.** Samvad opened in Expo Go on iPhone 17 Pro / iOS 27.0.1; all five tabs, sample conversation, and Safari `/health` worked. Overall P0 bootstrap gate passed. | Expo Go version was not reported. Browser `/health` is separate from an in-app API request, which P0 does not implement. [Mobile log](docs/build-log-mobile.md). |
| Developer B P0 API | **Implemented locally.** FastAPI exposes `GET /health`; no Auth/content/AI endpoints are live in P0. | Local health and API tests passed. See [backend log](docs/build-log-backend.md) and [API README](api/README.md). |
| Developer B P1 identity foundation | **PASS.** Migration `20261023201908` is deployed to `mtgsyjqcoyzijicpydee`; live password-grant/onboarding/RLS checks passed. | Backend 34 passed with no skips; SQL 22 passed. Dedicated-account checks verified duplicate handles, private data denial and cross-account isolation. See [live verification](docs/p1-live-verification.md). |
| Developer A P1 mobile auth/onboarding | **PASS by user acceptance.** Integrated sign in/up, persisted session, handle/language/interests, retryable save and logout. | TypeScript and Android/iOS exports passed. User confirmed remaining testing complete on 24 October; no additional per-device logs or step results supplied. See [closeout](docs/p1-live-verification.md). |

## Next handoff

1. Start the merged mobile checkout's Metro server and run the P2 checklist separately on Android and iPhone.
2. Confirm sources/topics/refresh, draft recovery, double-tap/offline retry and Unicode input on both devices.
3. Submit a benign real test post, verify it is author-only pending, have a trusted operator review that exact ID, then confirm both accounts see one public original and owner removal works.
4. Record device outcomes in the integration checklist before passing the joint P2 gate. P3/P4 have not started.

## Updating this tracker

Each developer updates their own build log with implemented, tested, blocked, and next steps, then pushes their owned branch. The integration captain updates this tracker and the [integration checklist](docs/integration-checklist.md) on `main` after reviewing evidence. Include the device/account environment, exact result, and commit SHA; use **BLOCKED** for work that has not been observed. Do not store secrets or temporary account credentials here.
