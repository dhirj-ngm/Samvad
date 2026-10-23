# Integration gates

| Gate | Android | iOS | Other dependencies | Overall |
|---|---|---|---|---|
| P0 | **PASS**: SDK 58 Expo Go launch, five tabs and sample conversation on iQOO Z7 Pro 5G / Android 15; phone Chrome `/health` passed | **PASS by user report**: Expo Go opened on iPhone 17 Pro / iOS 27.0.1; five tabs, sample conversation, Safari `/health` worked; Expo Go version not reported | Combined-tree checks passed (API 33 passed, 1 live test skipped; SQL 22 passed); P0 `/health` reachable in both phone browsers; no in-app API call exists in P0 | **PASS** for P0 bootstrap/navigation/phone health evidence. Browser health is not an in-app API test. |
| P1 | **BLOCKED**: auth/onboarding code added, no configured project or Android P1 device run | **BLOCKED**: auth/onboarding code added, no configured project or iOS P1 device run | Local identity SQL tests 22 passed; hosted migration, two real accounts and live RLS test not run | **BLOCKED**: real Auth, onboarding, private-data denial and session restoration unverified |

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
