# Developer A build log

## P4 — 24 October 2026, combined A/B implementation

**Implemented:** preferred-language translation and Show original on posts and
replies; exact original text retained, target-language/AI/cache/experimental labels,
processing disclosure, in-flight guards, timeout/errors and account/source/target
remount isolation. Optional three-statement headline-based brief with source link
retained. Shared authenticated API adapter pins initiating session and rejects
account mismatch; HTTPS-origin configuration only. Post/reply creation attempts
screening only after durable ID confirmation; outage does not undo save/duplicate.
Owner-only pending screening retry in replies and My submissions. Submission copy
discloses Groq text processing; private reports are never sent to AI. No new mobile
runtime package, no provider/private key in EXPO_PUBLIC configuration.

**Tested:** TypeScript, 11 mobile tests, Expo dependencies and Android/iOS exports
pass. Actual shared discovery/conversation SDK regressions pass against development
backend with ordinary accounts; temporary verification rows cleaned by owners.
Backend 69 configured Python/74 SQL pass. Actual P4 JWT/RLS/source-original checks
pass for both accounts without inference. No actual P4 provider output or phone
gesture pass claimed. Existing Node/Expo warnings and P2 audit debt remain.

Correct checkout's Metro restarted with local reachable P4 HTTPS API configuration;
existing temporary Expo URL retained. API returns honest disabled AI health while
server keys/confirmation are missing. No upgrade/fallback or fabricated translation.

**Blocked / next:** live key/model/quality gates and Android/iPhone translation,
Show original, briefs, screening, quota/outage, private-data/account/keyboard checks
listed in docs/p4-verification.md. Keep P0–P3 accepted, P4 feature branch pending
native/provider acceptance before main merge. Stop after P4.

## Final merged-code live rerun — 24 October 2026, 03:39 IST

At main `78e5825`, both shared mobile discovery/conversation SDK adapters freshly
passed against the development backend using ordinary dedicated account sessions.
Mobile **8 model tests** and TypeScript passed; backend **36 tests, zero skips**
and SQL **63 tests** passed. No new phone operation or native build was performed;
existing user-reported Android/iOS acceptance remains the device evidence.
See [final live verification](final-live-verification-2026-10-24.md).

## Current closeout — P0–P3 accepted, 24 October 2026

P0, P1, P2 and P3 are accepted for Developer A and integrated with Developer B's
work on main at `78e5825`. Android/iOS acceptance is based on the user confirmations
recorded in the integration checklist, rather than newly captured per-device traces.
This supersedes the pending/blocked statuses in the historical entries below.

P3 evidence includes mobile TypeScript, 8 model tests, Expo compatibility,
Android/iOS exports and the hosted shared SDK checks. Combined backend evidence
records 63 SQL tests and an earlier configured 36-test Python run with zero skips.
Final merge checks ran 33 Python tests with 3 live tests skipped because live
configuration was not loaded; this was not a fresh all-live rerun.

Existing dependency audit/advisor warnings remain documented; acceptance does not
mean a clean security audit. P4 has not started. This note reconciles the existing
records and does not claim a new test run. See [integration checklist](integration-checklist.md)
and [P3 evidence](p3-verification.md).

## P3 — 24 October 2026, combined A/B implementation

**Implemented:** user assigned both P3 owners to one agent and confirmed Android/iOS
working through P2. integrate/p3 starts at main a4a7623. Conversation screen retains
real source/original root and adds chronological paginated replies with public
handles, original Unicode, parent context, fixture/review labels, owner removal
and refresh/error/empty states. Reply controls on news and original posts; root,
reply and author private report controls. Private reason/details report composer
shows actual saved reference and does not claim automatic moderation or removal.

Reply drafts scoped to account/conversation/parent; report drafts to account/target.
Original text/language/reason/key persisted before networking, storage failure stops
send, ambiguous submission locks content for exact retry, in-flight guard prevents
double taps. Account-pinned SDK writes reject mismatches. Switching targets preserves
drafts; root/account changes remount to discard stale held data. Keyboard avoidance,
safe-area screen and Unicode counters retained. No new runtime dependency or P4 AI.

**Tested:** TypeScript, 8 mobile model tests, Expo dependency check and Android/iOS
exports pass. Shared SDK two-real-account checks pass for nested Unicode saves,
four concurrent retries, account mismatch, held reply isolation and private report
read denial. Temporary SDK reply bodies removed by ordinary owners. Backend 63 SQL
and 36 configured Python tests pass. Node module-type/Expo color warnings unchanged;
P2 dependency audit findings remain logged P5 debt. No native P3 screen pass claimed.

**Blocked / next:** Android/iPhone P3 device acceptance pending. Reload preview from
this checkout, open technology conversation (reviewed labeled ML/HI demo thread),
then follow docs/p3-verification.md with two actual accounts. New replies remain
pending until trusted review. Test offline/relaunch/double-tap, parent selection,
report reason restoration/privacy, account isolation, owner removal, keyboard/Indic
text on both platforms. Publish tested feature branch; main stays at accepted P2
until the P3 gate passes. User's P2 acceptance supersedes earlier pending P2 logs.

## P2 — 24 October 2026, combined A/B takeover

User authorized one agent to own both workstreams and merge P0/P1/P2. Existing SDK
58 app, accepted P0/P1 code and public Supabase configuration retained.

**Implemented:** Home/Explore load real mixed Supabase discovery; virtualized list,
topic filters, keyset load-more, refresh/loading/empty/error states, dated archive
attribution, actual publisher links and visible demo labels. Context loads an
authorized source/root and defers replies/reports/translation. Composer accepts
en/hi/ml original Unicode, counts code points, validates length, shows progress,
and persists account-scoped draft/request key before sending. Ambiguous attempts
keep locked text for exact retry; double taps share one attempt. Sessions are
pinned for outgoing writes. Profile shows real own submissions with public/private
review labels and owner removal. No fake live feed or automatic publication.

**Tested:** TypeScript and Expo dependency checks passed; **5 mobile model tests
passed**; actual shared SDK adapter passed live mixed-feed/Unicode/four-concurrent-
retry/account-mismatch checks with a dedicated account. Its temporary post was
removed by the owner. Fresh npm ci passed; both Android/iOS bundle exports passed.
These checks do not establish native UI/device behavior. Backend SQL 41 and full
configured Python 35 tests also passed; see docs/p2-verification.md.

Corrections: fixed footer null/undefined TypeScript error; removed a Node flag
unsupported by this installation. Tests pass with a non-failing module-type warning;
Expo exports emit NO_COLOR/FORCE_COLOR warnings. npm audit found five existing high
Expo CLI-tree advisories (node-forge/zod/dependants); no forced SDK downgrade was
made. Supported upstream fixes remain P5 debt, recorded in the P2 verification doc.

**Blocked / next:** observe P2 on Android and iPhone separately: topics/refresh and
links, Unicode compose/counter, keyboard/safe areas, offline/relaunch/double-tap
retry, account-separated drafts, author-only pending, trusted review then one
public original visible to both, owner removal. Joint P2 remains pending until
that evidence is supplied. P0/P1 are still accepted. No P3/P4 feature work. Exact
Git integration SHA is in the final handoff; unrelated local skills are preserved.

## P1 mobile identity and onboarding — 24 October 2026

**P0 closeout:** The user reported that Samvad opened in Expo Go on an iPhone 17 Pro running iOS 27.0.1. Home, Explore, Compose, Activity, Profile, and a sample conversation all worked, and Safari loaded the P0 API `/health` JSON. No error was reported. The Expo Go app version was not supplied. This is user-observed iPhone evidence, separate from the prior iQOO Z7 Pro 5G / Android 15 observation. Android and iOS P0 navigation and phone-browser `/health` checks now **PASS**. The P0 app had no in-app API call; browser reachability does not prove that later integration. The overall P0 bootstrap gate is **PASS** on the stated device evidence and code checks.

**Implemented:** Synced Developer A's branch to integrated `main`. Added the Expo SDK 58-compatible Supabase client with persistent session storage and foreground refresh, sign-in/sign-up UI, confirmed-email handoff message, public-handle/language/interest onboarding, retry-safe profile and interest writes, session restore and logout, and explicit unconfigured-state UI. An interrupted onboarding draft remains local until a reread confirms the saved interest set. The five-tab sample shell remains visibly sample content; P1 auth does not make the feed or API routes live. No `api/**` or `supabase/**` implementation was edited.

**Tested:** A fresh `npm ci --no-audit --no-fund` installed 530 packages; `npm run typecheck` and `npx expo install --check` passed. `npx expo export --platform android` and `--platform ios` both passed with the new P1 code. The first Android export detected an incompatible old Metro cache and performed a full crawl successfully; no code failure occurred. Android/iOS P1 device tests, real Auth sign-up/sign-in, email confirmation, session restoration, handle uniqueness, interest persistence and two-account privacy checks have **not run**. These need a configured development Supabase project and Developer B's hosted migration/real-account checks. No URL, public key, or test accounts were present in this workspace; the mobile client remains intentionally unconfigured without them.

**Blocked:** Joint P1 gate is **BLOCKED**. Developer B's migration has local SQL evidence but was not applied to a hosted project. The exact email confirmation redirect/Expo Go callback behavior still needs development project configuration and separate Android/iOS observations. The P1 UI has no observed device launch yet.

**Next:** Developer B applies the reviewed migration to the agreed development project and runs two real-account Auth/RLS checks. Developer A adds only the public project URL/key to ignored `mobile/.env`, then observes signup, confirmation, sign-in, onboarding, restart/session restore, edit and logout on Android and iOS separately. Record exact device/OS and failures; verify each account cannot read the other's private data before passing P1.

## P0 — 23 October 2026

### Implemented

- Read product scope, DPR, and implementation playbook in order; confirmed the starting workspace had only those three files and no initialized Git repository or app scaffold.
- Added repository docs/config skeleton; copied authoritative source documents into `docs/`; drafted `docs/contracts.md` with explicit Developer B agreement points.
- Added one Expo SDK 57 / TypeScript / Expo Router app in `mobile/`, with Home, Explore, Compose, Activity, Profile tabs and a sample conversation route; design tokens, safe-area wrapper, typed DTOs and client port.
- Sample story/post/profile/topics are visibly labeled as fictional P0 layout fixtures. Publishing, auth, translation, reporting, live news and notifications are not claimed functional.

### Tested

| Check | Result | Evidence |
|---|---|---|
| Workspace audit | Pass | Only three root project documents; `.git` exists as an unwritable placeholder; no app scaffold |
| JSON configuration and route presence | Pass | `node -e` parsed `mobile/package.json`, `mobile/app.json`, `mobile/tsconfig.json` and found eight route files |
| Dependency install | Blocked | `npm install --prefer-offline --fetch-retries=0 --fetch-timeout=10000` failed `EAI_AGAIN` resolving `registry.npmjs.org/@types/react` |
| TypeScript | Blocked | `npm run typecheck` → `tsc: command not found` because dependencies could not be installed |
| Metro/Expo launch | Blocked | `npm run start -- --offline --non-interactive` → `expo: command not found` |
| Android device/emulator launch | Blocked | No `adb`, `emulator`, Android SDK directory, or USB device access found; no Android device/simulator used |
| iOS device/simulator launch | Blocked | Linux host; no `xcrun` or `xcodebuild`, iPhone connection, or iOS simulator; no iOS device/simulator used |
| Git initialization | Blocked | `git init -b main` → `.git/hooks/: Read-only file system`; no remote or commit available |

### Blocked / pending

- Platform status: **Android BLOCKED, iOS BLOCKED. Neither platform passed.** Bundling and typechecking also remain unverified.
- Developer B must review contract questions in `docs/contracts.md`; backend `/health`, Supabase connectivity, migration plan, and joint API checks are pending B's P0 work.
- No configured Git remote; no push attempted.

### Next for P0 integration gate

1. Provide npm registry access or an approved package cache, install dependencies, run `npm run typecheck` and Expo bundling.
2. Launch the same app in Expo Go on an Android device/emulator and an iPhone/iOS simulator; record device names, OS versions, and actual navigation results separately.
3. Make `.git` writable or create a fresh checkout, initialize `main`, review and commit the scaffold; configure a remote only when supplied.
4. Agree `docs/contracts.md` with Developer B, verify B's `/health` and schema plan, then run the joint P0 gate. Do not start P1 before that checkpoint.

### GitHub branch preparation (23 October 2026)

- Created `dev/mobile` from the existing GitHub `main`, retaining Developer B's `api/**`, `supabase/**`, and backend log.
- Installed mobile dependencies with `npm install --no-audit --no-fund`; generated `mobile/package-lock.json`.
- Fixed the tab icon helper's `ColorValue` type after the first TypeScript run identified five matching errors. `npm run typecheck` then passed.
- Android and iOS device launches remain unverified. The shared contracts remain drafts pending agreement with Developer B.

### P0 integration review (23 October 2026)

- Reproduced a fresh `npm ci` peer conflict from the first lockfile, then pinned `react-dom` to React `19.2.3`; clean `npm ci` passed.
- Expo compatibility check expected TypeScript `~6.0.3`; updated the development dependency. Clean `npm ci`, `npx expo install --check`, and `npm run typecheck` passed.
- `npx expo export --platform android` and `--platform ios` both produced bundles. These exports do not prove either app launched on a device.
- The integration captain adopted Developer B's proposed P1 schema/API shapes into `docs/contracts.md` and aligned the mobile draft DTOs. No live adapter, migration, or authenticated endpoint was implemented.

### P0 device checkpoint attempt — 23 October 2026, 23:04 IST

**Implemented:** No mobile feature changes. Reviewed Developer B's P0 handoff and started its existing `/health` app for connectivity diagnostics. No `api/**` or `supabase/**` files were edited.

**Tested:** `npm run typecheck` passed (exit 0); `npx expo install --check` reported dependencies up to date (exit 0); `git diff --check` passed (exit 0). A previously running Expo SDK 57 dev server returned `packager-status:running` with HTTP 200 at `http://10.122.228.35:8081/status`. Uvicorn, bound to `0.0.0.0:8765`, returned HTTP 200 at both `http://127.0.0.1:8765/health` and `http://10.122.228.35:8765/health`: `{"status":"ok","service":"samvad-api","phase":"P0","checks":{"settings":"valid","supabase":"not_configured","ai":"disabled_p0"}}`. These requests ran on the development computer; they are **not phone reachability tests**. The P0 mobile shell has no API call, so no in-app API connectivity was tested.

| Platform | Device and OS used | Home | Explore | Compose | Activity | Profile | Sample conversation | Result / error |
|---|---|---|---|---|---|---|---|---|
| Android | None; no connected Android phone or emulator, OS unavailable | Not observed | Not observed | Not observed | Not observed | Not observed | Not observed | **BLOCKED**: `adb` and `emulator` absent; no Android device available to this session |
| iOS | None; no connected iPhone or macOS simulator, OS unavailable | Not observed | Not observed | Not observed | Not observed | Not observed | Not observed | **BLOCKED**: Linux host has no `xcrun`/Xcode; `idevice_id -l` returned `ERROR: Unable to retrieve device list!` |

**Blocked:** Neither platform launch nor a phone browser request to `/health` was observed. SDK 57-compatible Expo Go runtime on a phone is also unverified. No P0 launch defect can be confirmed or fixed without a device observation. The host LAN address may change; check it again before testing.

**Next at that checkpoint:** Test the five tabs, sample conversation, and phone-browser `/health` on each device, recording model, OS, and errors. This SDK 57 test path was superseded by the SDK 58 update below. Developer B's checklist still calls for a trusted HTTPS address before future in-app API integration. Keep P0 gate blocked until actual Android and iOS observations are recorded.

### P0 SDK 58 runtime alignment — 23 October 2026

**Reason:** User reported that the attempted SDK 57 Expo Go APK would not install and requested the newer SDK line available to them. No device model, OS, or installer error was supplied, so the original installation failure is not diagnosed.

**Implemented:** Updated `mobile/package.json` and lockfile from Expo SDK 57 to 58, including React 19.3, React Native 0.88, Expo Router 58, and compatible Expo packages. No `api/**` or `supabase/**` change. The first `npx expo install expo@^58.0.0 --fix` stopped at npm `ERESOLVE` because the existing SDK 57 `node_modules` contained older optional Router peers. Moved the old install/lock to `/tmp` and completed a fresh npm install without `--force` or `--legacy-peer-deps`.

**Tested:** Fresh `npm install --no-audit --no-fund` passed (517 packages); `npm ci --no-audit --no-fund` passed (517 packages); `npm run typecheck` passed; `npx expo install --check` reported dependencies up to date; `npx expo-doctor@latest` passed 20/20 checks; `npx expo export --platform android` and `--platform ios` both passed; `npx expo config --json` reported `sdkVersion: 58.0.0`. Restarted Metro using `npx expo start --host lan --clear`; the host returned HTTP 200 and `packager-status:running` at `http://10.122.228.35:8081/status`.

**Blocked:** Android and iOS device launches, five-tab navigation, sample conversation, and phone-browser `/health` remain unobserved. SDK 58 bundle exports and host Metro status do not prove a Play Store Expo Go runtime or either phone launched the app. API connectivity in-app is still outside P0 implementation.

**Next:** Open the fresh SDK 58 session on both phones and record model, OS, exact result/error and each P0 screen separately. Check `/health` in each phone's browser separately. The LAN address can change; confirm it before testing. Keep the P0 integration gate blocked until observed evidence exists.

### P0 live launch diagnosis — 23 October 2026, 23:50 IST

**Observed failure:** The earlier QR pointed at `10.122.228.35:8081`, but the Metro process from that turn was no longer running. After restarting Metro as a persistent user service, the Android phone's Chrome still could not load `/status` while the laptop got HTTP 200. The phone was hosting the original hotspot. User moved phone and laptop to `EVENTS1_5G`; the laptop obtained `192.168.71.88`, but phone Chrome still could not load `http://192.168.71.88:8081/status`. This establishes a device-to-laptop network block for those LAN paths, not a React Native screen failure.

**Codebase checks:** SDK 58 Android manifest fetched from the laptop LAN returned HTTP 200 and `runtimeVersion=exposdk:58.0.0`; its Android bundle returned HTTP 200 (5,693,545 bytes). Mobile TypeScript and `expo install --check` passed. Backend `pytest -q` passed 28 tests and Ruff passed. Backend P0 exposes only `/health`, so it is not in the mobile launch path. A later Expo Doctor attempt could not finish its remote config check because DNS lookup for `exp.host` failed; this was a network error, not an app-schema finding.

**Tunnel diagnosis and fix:** Expo's unauthenticated tunnel required an Expo CLI login; an ngrok fallback connected but repeatedly closed. A Cloudflare Quick Tunnel reached the development server. The first public manifest incorrectly advertised a bundle URL with the tunnel hostname plus local port `:8081`; restarting Metro with `EXPO_PACKAGER_PROXY_URL` set to the HTTPS tunnel URL removed that port. The persistent P0 preview now uses user services `samvad-p0-expo-stable` and `samvad-p0-cloudflared`; the current temporary app address is `exps://corps-caps-synopsis-him.trycloudflare.com`. Host-side checks of its public `/status`, SDK 58 manifest, and Android bundle all returned HTTP 200 (final bundle 5,693,593 bytes). This public URL can change if the tunnel restarts.

**Android observation:** On an **iQOO Z7 Pro 5G running Android 15**, the user confirmed that, using the final `corps-caps-synopsis-him` HTTPS tunnel, phone Chrome showed `packager-status:running`, Expo Go opened Samvad, and Home, Explore, Compose, Activity, Profile, and a sample card's View conversation all worked. This is user-observed device navigation evidence, not merely a bundle export. No Android runtime error was reported during those six views.

**iOS observation:** An **iPhone 17 Pro running iOS 27.0.1** is available, but the user confirmed it has not run Samvad. Metro logged repeated iOS requests rejected with `You need to be signed in to Expo Go and Expo CLI to open your project`; their source is unidentified and they are **not** treated as iPhone test evidence. Expo CLI browser sign-in was opened, then stopped at the user's request; the CLI remains signed out and the iPhone's Expo Go SDK version is unknown. No iOS screen result exists. iOS remains **BLOCKED**.

**Backend reachability:** The API and a separate temporary HTTPS tunnel are persistent user services. Host-side `GET https://others-changing-closest-record.trycloudflare.com/health` returned HTTP 200 with `settings=valid`, `supabase=not_configured`, `ai=disabled_p0`. The user then confirmed the same JSON appeared in Chrome on the Android phone; Uvicorn also logged a proxied `/health` 200 followed by the browser's `/favicon.ico` request. This proves phone-browser reachability to Developer B's P0 liveness endpoint. It does **not** prove an in-app API call or Supabase connectivity; neither exists in P0.

**Next:** Android P0 navigation and phone browser reachability need no further debugging. If the team resumes iOS verification, confirm an SDK 58-compatible iPhone runtime, sign Expo CLI and Expo Go into the same account, then test all six screens and phone-browser `/health`. The user deferred this sign-in/test now, so keep P0 overall blocked on iOS evidence. Do not infer device access from host-side tunnel checks.
