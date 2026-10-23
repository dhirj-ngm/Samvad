# Integration gates

| Gate | Android | iOS | Other dependencies | Overall |
|---|---|---|---|---|
| P0 | Bundle export passed; device launch not tested | Bundle export passed; device launch not tested | API tests 28 passed, lint and pip check passed, local `/health` returned 200; contract design baseline recorded, Supabase unconfigured | Blocked: device launch and app-to-API connectivity remain unverified |

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
