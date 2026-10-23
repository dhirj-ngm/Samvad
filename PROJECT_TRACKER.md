# Samvad project tracker

**Snapshot:** 24 October 2026 (IST), P0 closeout and P1 mobile work

**Source of truth for scope:** [Product Scope](Samvad_Product_Scope.md), [technical specification](Samvad_Detailed_Project_Report_Codex.md), and [implementation plan](Samvad_Implementation.md).
**Working branches:** `main` is the integrated handoff; Developer A uses `dev/mobile`, Developer B uses `dev/backend`. Pull `main` before starting new phase work. Keep owner changes on their branches and coordinate shared contracts through the integration captain.

## Where the project stands

| Workstream | Current state | Evidence and next gate |
|---|---|---|
| P0 mobile shell | **Implemented on Expo SDK 58.** One React Native app has five tabs, sample conversation, design tokens, and typed client shapes. Content is labeled as sample. | Typecheck, Expo dependency check, and Android/iOS exports passed. Android navigation passed by user observation on iQOO Z7 Pro 5G, Android 15: Home, Explore, Compose, Activity, Profile, sample conversation. [Mobile log](docs/build-log-mobile.md). |
| P0 Android API reachability | **Phone browser passed.** Android Chrome displayed the P0 `/health` JSON through a temporary HTTPS tunnel. | This proves phone-to-API reachability only. The P0 app has no in-app API request. [Integration checklist](docs/integration-checklist.md). |
| P0 iOS and overall gate | **PASS by user observation.** Samvad opened in Expo Go on iPhone 17 Pro / iOS 27.0.1; all five tabs, sample conversation, and Safari `/health` worked. Overall P0 bootstrap gate passed. | Expo Go version was not reported. Browser `/health` is separate from an in-app API request, which P0 does not implement. [Mobile log](docs/build-log-mobile.md). |
| Developer B P0 API | **Implemented locally.** FastAPI exposes `GET /health`; no Auth/content/AI endpoints are live in P0. | Local health and API tests passed. See [backend log](docs/build-log-backend.md) and [API README](api/README.md). |
| Developer B P1 identity foundation | **Code present; external acceptance BLOCKED.** The identity/interests migration, local SQL tests, and an opt-in real-account test harness are on `main`. | SQL tests passed 22/22. The API suite passed 33 tests with 1 live test skipped at integration. No hosted migration, two real Auth accounts, or live RLS check has run. See [Supabase README](supabase/README.md) and [backend log](docs/build-log-backend.md). |
| Developer A P1 mobile auth/onboarding | **Integrated with the backend foundation and Expo SDK compatibility changes; device acceptance BLOCKED.** Sign in/up, persisted session, handle/language/interests, retryable save, and logout are implemented. | Combined-tree TypeScript and Expo dependency checks passed; backend tests passed 33 with 1 live test skipped, and SQL tests passed 22/22. No real P1 account or device test has run. Follow [mobile log](docs/build-log-mobile.md). |

## Next handoff

1. **Developer A / integration captain:** Configure the public development Supabase URL/key locally after B applies the migration, then test P1 Auth/onboarding, session restore, and logout on Android and iOS separately. The temporary tunnel hostname from the old log may have changed; verify it before device testing.
2. **Developer B / database captain:** Review the P1 migration with A, then apply it only to the agreed development Supabase project. Configure Auth and run the opt-in two-real-account test plus negative RLS/public-field checks. Record the exact environment and results in the [backend log](docs/build-log-backend.md). Do not commit credentials.
3. **Both:** Reconcile any changes to [shared contracts](docs/contracts.md) before P1 mobile integration. Test an actual in-app API/Auth path when implemented; keep phone-browser reachability distinct from an app request. P1 and later gates remain open.

## Updating this tracker

Each developer updates their own build log with implemented, tested, blocked, and next steps, then pushes their owned branch. The integration captain updates this tracker and the [integration checklist](docs/integration-checklist.md) on `main` after reviewing evidence. Include the device/account environment, exact result, and commit SHA; use **BLOCKED** for work that has not been observed. Do not store secrets or temporary account credentials here.
