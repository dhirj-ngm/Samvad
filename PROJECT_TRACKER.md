# Samvad project tracker

**P4.5 publication/preflight (24 October):** User authorized sharing current work
on `feature/p4-5-social` before final AI development. Fresh checks: 96 SQL, 20 mobile,
79 Python passed / 3 live tests skipped; TypeScript/Ruff/pip check passed. Local
Auth A/B and reviewer R verified separately. Local Supabase has all seven versions;
hosted still has five. Groq key/model catalog checked without inference; Sarvam key
and usage authorization/cap are missing. See [six-item preflight](docs/AI_DEMO_PREFLIGHT.md)
and [teammate setup](README.md). No hosted migration or final AI feature
implementation was performed by this publication step.

**Docker local verification completed:** Supabase runs locally; seven migrations
recorded including forward P4.5 feed-type lint fix. Local lint/advisors clear.
Seven actual HTTP check groups and the exact shared SDK pass with ordinary local
A/B accounts and a separate reviewer fixture. SQL 96/mobile 20/API 79 pass (3 legacy
live skips), TypeScript/Ruff pass. Local QR/preview ready on port 8085. Phone/email/
pilot observations remain pending. No hosted migration/deploy/push. This supersedes
the earlier Docker-blocked follow-up below; [current evidence](docs/p4-5-verification.md).

**Local verification follow-up:** User chose to install Docker Desktop and keep
P4.5 verification local. WSL is present; Docker is not ready. Local fixture/HTTP
verification/preview tools are prepared, with 9 new guard tests; API now 79 pass/
3 live skips. No hosted change or phone pass. [Next setup steps](docs/p4-5-verification.md).

**P4.5 local implementation (24 October):** Combined Developer A/B work is on
`feature/p4-5-social`, based on main `4d6c321`; no push/hosted migration/deployment.
Profiles/preferences/avatars, durable social actions/counts/lists, People/mentions,
attributed reposts/Following and protected human review are connected locally.
96 SQL and 20 mobile tests pass; TypeScript, Expo compatibility, both platform
exports pass; API 70 pass/3 live skips; Ruff/pip check pass. Existing 5 high npm
audit findings remain. Docker/local Supabase, Storage HTTP, real P4.5 accounts and
Android/iPhone acceptance are unobserved; hosted migration expressly deferred.
Joint P4.5 gate and ten-user pilot are **pending**. Existing AI behavior and prior
P4 quality gates unchanged. [Actual evidence/checklist](docs/p4-5-verification.md).
The plan/source change request are preserved with the latest non-AI override.
No P5/P6 started. Earlier planning-only status is superseded by this update.

**Current P4 integration (24 October):** Both P4 workstreams are integrated with
accepted P0–P3 for publication to main at the user's request. No merge conflicts.
Preserved prior verification notes and the native-script Malayalam correction.
Fresh merge checks: 70 Python passed, 3 live tests skipped; 74 SQL and 11 mobile
tests, TypeScript, Ruff and pip check passed. Earlier configured live evidence is
in the logs. Provider keys/Free-plan flags are configured locally and limited live
samples ran; human language/policy review and P4 Android/iOS acceptance remain
pending. Code integration does not mark the P4 gate passed.
[Next verification](docs/p4-verification.md). No P5/P6 started.

**Snapshot:** 24 October 2026 (IST), P0-P4 on main; P4.5 local feature branch; P0-P3 accepted, P4/P4.5 acceptance pending.

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
See [P3 verification](docs/p3-verification.md). P4 now adds authenticated AI
translation, briefs and screening. Automatic publication remains gated by human
language/policy evaluation; the prior trusted review path remains available.

| Workstream | Current state | Evidence and next gate |
|---|---|---|
| P0 mobile shell | **Implemented on Expo SDK 58.** One React Native app has five tabs, sample conversation, design tokens, and typed client shapes. Content is labeled as sample. | Typecheck, Expo dependency check, and Android/iOS exports passed. Android navigation passed by user observation on iQOO Z7 Pro 5G, Android 15: Home, Explore, Compose, Activity, Profile, sample conversation. [Mobile log](docs/build-log-mobile.md). |
| P0 Android API reachability | **Phone browser passed.** Android Chrome displayed the P0 `/health` JSON through a temporary HTTPS tunnel. | This proves phone-to-API reachability only. The P0 app has no in-app API request. [Integration checklist](docs/integration-checklist.md). |
| P0 iOS and overall gate | **PASS by user observation.** Samvad opened in Expo Go on iPhone 17 Pro / iOS 27.0.1; all five tabs, sample conversation, and Safari `/health` worked. Overall P0 bootstrap gate passed. | Expo Go version was not reported. Browser `/health` is separate from an in-app API request, which P0 does not implement. [Mobile log](docs/build-log-mobile.md). |
| Developer B P0 API | **Implemented locally.** FastAPI exposes `GET /health`; no Auth/content/AI endpoints are live in P0. | Local health and API tests passed. See [backend log](docs/build-log-backend.md) and [API README](api/README.md). |
| Developer B P1 identity foundation | **PASS.** Migration `20261023201908` is deployed to `mtgsyjqcoyzijicpydee`; live password-grant/onboarding/RLS checks passed. | Backend 34 passed with no skips; SQL 22 passed. Dedicated-account checks verified duplicate handles, private data denial and cross-account isolation. See [live verification](docs/p1-live-verification.md). |
| Developer A P1 mobile auth/onboarding | **PASS by user acceptance.** Integrated sign in/up, persisted session, handle/language/interests, retryable save and logout. | TypeScript and Android/iOS exports passed. User confirmed remaining testing complete on 24 October; no additional per-device logs or step results supplied. See [closeout](docs/p1-live-verification.md). |

## Next handoff

1. Developers A and B sync from `main`, which now integrates P0–P4 code.
2. P3 is PASS based on the recorded automated/live evidence and the user's confirmation that testing is complete and it works. No additional per-device traces were supplied at closeout.
3. Preserve trusted review, private reports, retry-safe writes and ownership rules in later work. Test harnesses mutate dedicated accounts only.
4. Complete the P4 native-script language/policy review and Android/iOS checks before marking its joint gate passed. See the P4 verification handoff; P5/P6 are not started.

## Updating this tracker

Each developer updates their own build log with implemented, tested, blocked, and next steps, then pushes their owned branch. The integration captain updates this tracker and the [integration checklist](docs/integration-checklist.md) on `main` after reviewing evidence. Include the device/account environment, exact result, and commit SHA; use **BLOCKED** for work that has not been observed. Do not store secrets or temporary account credentials here.
