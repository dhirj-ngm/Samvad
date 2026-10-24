# Integration gates

## P6 local release candidate — 24 October 2026

Both workstreams' P6 preparation is implemented on `release/p6-demo`; P0–P5
history retained. 135 Python passed / 3 legacy hosted live skips, 105 SQL and
34 mobile passed; TypeScript/Ruff/pip/Expo, native exports, local ordinary-user
social/Storage/SDK and cache-isolated smoke pass. Eight-version ledger matches
source. Backend image builds and runs non-root without networking. Fresh-account
bootstrap retries/admin separation pass with temporary-account cleanup.
Prior user-reported functional acceptance is preserved.

**Gate PENDING:** final Android/iPhone venue rehearsal/screenshots, named human
language/policy evidence and disposition of four dependency findings, followed by
approved main/tag/publication. Ten-user pilot remains a separate observed step.
No P6 push, final tag, hosted migration or deployment performed.
[Exact evidence](p6-verification.md) · [current handoff](P6_RELEASE_RUNBOOK.md).

## P0–P5 GitHub publication — 24 October 2026

User confirmed completion through P5 and requested pushing the combined source.
P5 functional acceptance is PASS by user report. Final working-tree fixes and
P5 verification/review tools are included with all earlier main work. Fresh
publication checks: backend 114 passed and 3 live tests skipped; SQL 105 passed;
mobile 34 passed; TypeScript, Ruff and pip dependency validation passed.
Earlier configured/live evidence is preserved. Dependency/security and human
language-review follow-ups are not erased or waived by this publication; no
automatic-publication setting, hosted deployment or P6 work is changed.

## Post-fix functional acceptance — user confirmation

User confirms “all test case is passed sucessfully” after the final P5 fix pass
and account handoff. **Post-fix functional/phone acceptance: PASS by user report.**
The recorded automated result remains 256 PASS, zero skips; no new automated run
is claimed. No per-case trace, new device version or language reviewer/model
metadata was supplied. This closes the requested functional retest by user
acceptance, not the four unwaived dependency findings or the separate documented
human language/policy gate. Automatic publication remains OFF. Earlier pending
post-fix functional-test notes below are historical.

## Final P5 code-review checkpoint

**256 tests PASS, zero skips:** 117 configured API, 105 SQL and 34 mobile.
Both native exports, TypeScript/Expo/Ruff/pip, local social/Storage/reviewer smoke,
provider-isolated cache smoke and the SDK regressions pass after the fixes.
The real gateway and both Metro bundles serve the reviewed working tree.
[Fixes/evidence](p5-verification.md#final-code-review-pass--latest-evidence).

User-reported Android/iOS working acceptance for the prior baseline is retained.
The post-fix phone recovery checks, human language/policy evaluation and four
unwaived node-forge-chain high findings remain open. **Joint P5: not signed off.**
Follow [these ordered closeout steps](P5_NEXT_STEPS.md); this checkpoint does not
promote unobserved T01–T19 device/language cases to PASS.

## Latest phone confirmation — 24 October 2026

After the LAN preview correction, user reports “andriod and ios is working
properly.” **Android working smoke: PASS by user report. iOS working smoke: PASS
by user report.** No new device/OS/Expo Go details or individual step outcomes were
supplied; offline recovery, accessibility and the cross-device reviewed exchange
are not independently established. This supersedes earlier unobserved basic
phone-working status, not the entire T01–T19 matrix. Human language/policy review
and unwaived dependency risk remain open; joint P5 is not yet closed.

## P5 hardening follow-up — both workstreams

Developer A's mobile recovery/keyboard/accessibility/performance changes and
Developer B's repeatable provider-isolated smoke/safety tests are implemented.
**235 configured tests PASS, zero skips**: 105 Python, 105 SQL, 25 mobile; TypeScript,
Expo compatibility, Ruff/pip, both native exports, seven local social/Storage
HTTP groups and the complete new P5 smoke pass. Zod is patched; four high audit
findings remain in one node-forge chain with no upstream patched release.
[Evidence and blocker disposition](p5-verification.md#hardening-follow-up--developer-a-and-developer-b).

The T01–T19 matrix below remains scoped to automated evidence. **Developer A phone
acceptance: BLOCKED; human language review: BLOCKED; joint P5: BLOCKED.** Backend
local core checks PASS, but upstream dependency risk is not waived. Hosted
migration/deployment is separate and unchanged. No new device pass is claimed.
The user confirmed both phones are available for guided testing and explicitly
chose to keep dependency risk open. The current local preview/bundles are ready;
actual Android/iPhone observations are still pending.

## P5 smoke checkpoint — 24 October 2026

Source `18b54e4222ef3dce274c795c723b7a593166871f`. **221 configured tests pass**
(94 Python, 105 database, 22 mobile), with zero skips; TypeScript, Expo compatibility,
Ruff, pip consistency, separate Android/iOS exports, local Auth/save/review and seven
social/Storage HTTP check groups pass. Six prepared AI cache results pass with
inference disabled. [Full evidence and commands](p5-verification.md).

**Android P5: BLOCKED. iOS P5: BLOCKED. Overall P5: BLOCKED.** Neither device was
operated during this run. Earlier P0–P3 acceptance is preserved, not extended to
new P4/P4.5/AI interactions. No provider inference, hosted migration/deployment or
automatic-publication enablement was performed.

### DPR section 14 acceptance matrix (T01–T19)

PASS below is explicitly scoped to the observed automated/backend result; the
device column is not implied by it. Complete each phone checklist in the report.

| ID | Automated/backend evidence | Android / iOS end-to-end |
|---|---|---|
| T01 | PASS: onboarding/interests and discovery regressions; new signup/email delivery not exercised | BLOCKED / BLOCKED |
| T02 | PASS: distinct accounts, canonical handle uniqueness and duplicate rejection | BLOCKED / BLOCKED |
| T03 | PASS: cross-account/private identity RLS and exact public profile projection | BLOCKED / BLOCKED |
| T04 | PASS: Malayalam/Hindi/emoji storage, round-trip and Unicode limits | BLOCKED / BLOCKED: rendering unobserved |
| T05 | PASS: persisted translation cache, labels/provenance contract and source authorization; meaning review pending | BLOCKED / BLOCKED |
| T06 | PASS: mocked provider failures and real provider-disabled cache miss; original still readable | BLOCKED / BLOCKED: retry UI unobserved |
| T07 | PASS: legacy three-line contract and demo four/five-line cached post summary; revised demo behavior documented in runbook | BLOCKED / BLOCKED: source disclosure/UI unobserved |
| T08 | PASS: seeded source URL/data regressions only | BLOCKED / BLOCKED: external publisher opening unobserved |
| T09 | PASS: real two-account nested reply SDK regression and local fixture boundaries | BLOCKED / BLOCKED: cross-device exchange unobserved |
| T10 | PASS: four concurrent SDK submissions, stable retries and database deduplication | BLOCKED / BLOCKED: physical double-tap unobserved |
| T11 | PASS: private report RLS, report retry and protected reviewer HTTP checks | BLOCKED / BLOCKED |
| T12 | PASS: automated moderation/gating safety cases and held fixture boundaries; human language/policy evaluation BLOCKED | BLOCKED / BLOCKED |
| T13 | PASS: standalone mixed-feed database regression and local HTTP human approval/public release | BLOCKED / BLOCKED |
| T14 | PASS: anonymous cold-start nonempty discovery database test; local SDK mixed feed | BLOCKED / BLOCKED |
| T15 | PASS: draft/account isolation and confirmed-pending/retry models only | BLOCKED / BLOCKED: unstable-network UI not exercised |
| T16 | PASS: targeted current-file, reachable Git history and both exported-bundle secret scans; scope in report | No device interaction required |
| T17 | PASS: both native bundle exports and shared backend/SDK checks only | BLOCKED / BLOCKED: not device acceptance |
| T18 | PASS: quota/concurrency/failure tests, charged failures, no paid fallback, pending saves and real cache with inference disabled | BLOCKED / BLOCKED: recovery UI unobserved |
| T19 | BLOCKED: no fresh free-plan/dashboard or human EN/HI/ML/code-mixed evaluation; previous provider evidence retained, fixtures labeled | BLOCKED / BLOCKED |

Open findings: hosted lacks P4.5/final AI schema (`manual_hidden` read returns
`42703`; hosted discovery SDK fails while local passes); five existing high npm
audit findings remain; web export is unsupported without `react-native-web`.
The supported Android/iOS exports pass. See the report before using hosted config.

## Current-work integration with all prior phases — 24 October 2026

The user requested merging/pushing the P4.5 social and final local AI demo work
alongside P0–P4. The feature branch descends from existing main `4d6c321`, which
already includes P0–P4. Fresh verification: **94 configured Python tests, zero
skips; 105 SQL tests; 22 mobile tests**. Both platform exports, TypeScript, Expo
compatibility, Ruff, pip check and local Auth/save/retry/reviewer HTTP smoke pass.
See [AI demo evidence](ai-demo-verification.md). This publishes source only:
human EN/HI/ML review, new native phone acceptance and venue rehearsal remain
pending. Hosted social/AI migration deployment remains separate. P0–P3 accepted
status is preserved; automatic publication is OFF.

## P0–P4 main integration — 24 October 2026

User requested pushing all phases through P4 and resolving any conflicts. P4
descends from accepted P0–P3 main `78e5825`; the integration is conflict-free and
preserves all six P4 commits through `3eafd66`, including the Malayalam correction.
Fresh checks: Python **70 passed, 3 live tests skipped** without loading dedicated
live configuration; SQL **74 passed**; mobile **11 passed**; TypeScript, Ruff and
pip dependency validation passed. No live provider inference was triggered by this
merge check. Earlier configured/live results remain recorded below.

Provider configuration and bounded live samples are now available per the P4
follow-up. Human language/policy review under the revised prompt and Android/iOS
P4 acceptance remain **PENDING**. Main integration does not mark P4 complete.
P0–P3 user acceptance remains intact; no P5/P6 implementation is included.

## P4 combined implementation — 24 October 2026

Started integrate/p4 from accepted main 78e5825 (P0–P3 already merged, no conflicts).
Preserved preexisting final-verification notes separately in b2fa66d. Both mobile
and backend P4 code implemented; migration 20261023225554 applied non-destructively
to agreed development project. Python 69 configured tests/zero skips, SQL 74,
mobile 11, TypeScript, Expo compatibility, both exports, Ruff/pip and both real
shared SDK regressions pass. Actual two-account P4 JWKS/JWT/RLS/original check passes.
Provider-output tests use explicit mocks; no live language-quality pass inferred.

**P4 provider/account/live inference: BLOCKED on server keys/configuration.**
**Language/policy review: PENDING. Android P4: PENDING. iOS P4: PENDING.**
No main merge or joint P4 gate pass claimed. P0–P3 acceptance remains intact.
Use [P4 setup and verification](p4-verification.md); no P5/P6 or paid AI initiated.

## Final merged-code live rerun — 24 October 2026, 03:39 IST

Main `78e5825` freshly passed **36 configured Python tests with zero skips**,
including all three P1/P2/P3 live suites, plus both shared mobile SDK live checks.
SQL **63 passed**, mobile **8 passed**, TypeScript, Ruff and pip check passed.
This closes the live rerun gap from merge preparation below. No fresh phone run,
bundle export or security-advisor scan is claimed. P0–P3 remain accepted; existing
audit warnings remain documented. [Full result](final-live-verification-2026-10-24.md).

## P3 acceptance and main integration — 24 October 2026

User confirmation: "p3 is tested and completed and it works" with an explicit
request to merge all phases. **P3 PASS by user acceptance**, alongside the recorded
hosted/live evidence below. No new per-device traces or runtime versions were
provided. This supersedes the earlier pending P3 status; P0–P2 remain accepted.

Merge preparation checks: mobile TypeScript and 8 model tests passed; 63 SQL tests
passed; backend local suite 33 passed and 3 live tests skipped without loading
dedicated live configuration; Ruff passed. The earlier configured 36-test live
result below is retained as earlier evidence, not a fresh live rerun. Both P3
workstreams are integrated together with P0–P2. P4 has not started.

## P2 acceptance and P3 handoff — 24 October 2026

User confirmation: "verfication of andriod and ios is complete uptill p2 and they
are working properly". This supersedes the pending P2 status below. **Android P2:
PASS by user acceptance. iOS P2: PASS by user acceptance. Joint P2: PASS.** No new
individual device traces or runtime versions were supplied; this is user evidence.

P3 now implements both workstreams on `integrate/p3`. Migration
`20261023213814_conversation_safety` is applied to the agreed development project.
Automated evidence: 63 local PostgreSQL checks, 36 configured Python tests (no
skips), 8 mobile model tests, real two-account HTTP and shared SDK checks, TypeScript,
Expo dependency compatibility and Android/iOS exports pass. Trusted operator
reviewed only two exact benign labeled demo reply IDs; ordinary users performed
all authorization assertions. Security advisor has intentional no-client-policy
INFO for private identity and internal budgets, plus the existing disabled leaked
password protection WARN; no new P3 security warning.

**Android P3: PENDING. iOS P3: PENDING. Joint P3: PENDING** until the
[P3 device checklist](p3-verification.md) is exercised. P0–P2 remain accepted.
Publish tested P3 branch for review; keep main at accepted P2 until this gate passes.
No P4 implementation or inference is included.

## P2 — implementation and pending device acceptance (24 October 2026)

P0/P1 closeouts below remain accepted. P2 was implemented for both developers and
deployed to the same development project. Backend live checks, the actual shared
SDK adapter, 41 SQL checks, 35 configured Python tests, 5 mobile model tests,
TypeScript and Android/iOS bundle exports passed. This supports code integration,
not a claim that new P2 screens were exercised on either device.

**Android P2: PENDING. iOS P2: PENDING. Overall joint P2 gate: PENDING.**
Use [p2-verification.md](p2-verification.md) for the exact per-device steps and
manual review boundary. New submissions are private pending trusted review.
No automatic publication, AI moderation, reply or report feature is claimed.

| Gate | Android | iOS | Other dependencies | Overall |
|---|---|---|---|---|
| P0 | **PASS**: SDK 58 Expo Go launch, five tabs and sample conversation on iQOO Z7 Pro 5G / Android 15; phone Chrome `/health` passed | **PASS by user report**: Expo Go opened on iPhone 17 Pro / iOS 27.0.1; five tabs, sample conversation, Safari `/health` worked; Expo Go version not reported | Combined-tree checks passed (API 33 passed, 1 live test skipped; SQL 22 passed); P0 `/health` reachable in both phone browsers; no in-app API call exists in P0 | **PASS** for P0 bootstrap/navigation/phone health evidence. Browser health is not an in-app API test. |
| P1 | **PASS by user closeout confirmation** of remaining verification; no new per-device logs supplied | **PASS by user closeout confirmation** of remaining verification; no new per-device logs supplied | Hosted migration; backend 34 passed, no skips; SQL 22 passed; live Auth/onboarding/privacy and refresh/logout checks passed; TypeScript and both bundle exports passed. [Evidence](p1-live-verification.md) | **PASS**: automated evidence plus user acceptance on 24 October 2026. Ready for P2. |

P1 closeout on 24 October 2026: After the remaining Android/iPhone, session,
logout and signup confirmation checks were requested, the user confirmed that
everything works and testing/verification is complete. This is user-reported
acceptance, not direct agent observation of phone steps. Earlier P1 blockers in
historical logs are superseded. P2 implementation has not started in this closeout.

P0 closeout on 24 October 2026: The user confirmed that all six P0 views and Safari `/health` worked on the previously identified iPhone 17 Pro / iOS 27.0.1, with no error reported. The Expo Go version was not provided. This updates the earlier blocked iOS attempt below; it does not retroactively make the P0 app-to-API path exist.

P0 checks on 23 October 2026: `npm ci`, `npm run typecheck`, and `npx expo export --platform android|ios` passed; `api/.venv/bin/python -m pytest -q` passed 28 tests, Ruff and pip check passed; an actual local Uvicorn `/health` request returned HTTP 200 with Supabase `not_configured` and AI `disabled_p0`. Bundle exports do not prove a device launch. No authenticated flow, database migration, or app-to-API connection was tested.

## P0 device checkpoint attempt — 23 October 2026, 23:04 IST

| Check | Android | iOS |
|---|---|---|
| Device and OS | None available; OS unknown | None available; OS unknown |
| Expo Go runtime / actual launch | **BLOCKED**; no device or emulator observed | **BLOCKED**; no iPhone or simulator observed |
| Home, Explore, Compose, Activity, Profile | All unobserved | All unobserved |
| Open sample conversation | Unobserved | Unobserved |
| Phone browser `GET /health` | Unobserved | Unobserved |
| In-app API call | Not implemented in P0; not tested | Not implemented in P0; not tested |

Host-only diagnostics: Expo returned HTTP 200 and `packager-status:running` at `http://10.122.228.35:8081/status`. Developer B's existing API, temporarily bound to `0.0.0.0:8765`, returned HTTP 200 at the host LAN address `http://10.122.228.35:8765/health` with `settings=valid`, `supabase=not_configured`, and `ai=disabled_p0`. Both requests originated on the development computer and do **not** prove phone reachability. This HTTP LAN endpoint is for P0 browser diagnostics; a trusted HTTPS URL is still needed for later in-app API use. `npm run typecheck`, `npx expo install --check`, and `git diff --check` passed during this checkpoint attempt. Android ADB/emulator tools were absent; the Linux host has no iOS Simulator and `idevice_id -l` returned a device-list error. Overall P0 remains **BLOCKED** pending observed launches on both platforms and phone network checks.

### SDK 58 update, same gate status

On 23 October 2026, the user requested SDK 58 after an SDK 57 APK installation failure. Developer A upgraded the one mobile app to SDK 58. Fresh `npm ci`, TypeScript, Expo dependency check, Expo Doctor (20/20), and Android/iOS bundle exports passed; a restarted SDK 58 Metro process returned host-side `packager-status:running`. **Android: BLOCKED** and **iOS: BLOCKED** for actual device launches and all P0 screen checks; device model/OS and phone `/health` results have not been supplied. The previous SDK 57 installation error remains unknown. No in-app API call exists in P0. Do not promote the P0 gate on the basis of exports or host LAN checks.

### P0 live launch follow-up — 23 October 2026

The earlier Metro server had stopped after its session ended. The Android phone, first as the laptop's hotspot host and then on `EVENTS1_5G`, could not reach the laptop's LAN `/status` address in Chrome. Persistent user services now serve Metro and the P0 API. A temporary Cloudflare HTTPS tunnel provides a public Expo endpoint; host-side public `/status`, SDK 58 manifest and Android bundle fetched successfully. On the Android phone, the user confirmed that Chrome loaded the public `/status`, Expo Go opened Samvad, and Home, Explore, Compose, Activity, Profile and a sample conversation all worked. **Android P0 navigation: PASS by user observation on iQOO Z7 Pro 5G, Android 15.** The user also confirmed phone Chrome displayed the public API `/health` JSON; this is phone-to-API reachability, not an in-app call. Metro logged iOS Expo Go/CLI sign-in errors; the user confirmed no iPhone was used, so those unidentified requests are not iOS test evidence. An iPhone 17 Pro on iOS 27.0.1 is available, but the user deferred Expo sign-in and iOS testing; runtime compatibility and all iOS screens remain untested. **iOS: BLOCKED**. In-app API access and Supabase connectivity remain untested and unimplemented in P0. Overall **P0: BLOCKED**.

### GitHub main integration — 24 October 2026

At the user's request, the integration captain merged `origin/dev/backend` at `d107843` and `origin/dev/mobile` at `8557de8` into an isolated checkout for publication to `main`. This publishes Developer B's P1 identity foundation alongside the SDK 58 mobile P0 shell; it does **not** mark either gate passed or apply a migration to a hosted Supabase project.

Combined-tree checks: `mobile/npm ci`, `npm run typecheck`, and `npx expo install --check` passed; `supabase/npm ci` and `npm test` passed **22/22** local SQL tests; `api/.venv/bin/python -m pytest -q` passed **33**, skipped **1** live two-account test, with one dependency deprecation warning; Ruff and pip check passed. Android's observed P0 navigation and browser `/health` evidence are above. iOS P0 remains **BLOCKED** because no iPhone launch was run. Backend P1 external acceptance remains **BLOCKED**: no hosted migration, real Auth accounts, or live RLS check was run. Publishing commits is not a release or gate sign-off.
