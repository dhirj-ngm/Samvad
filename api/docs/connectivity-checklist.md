# Developer A handoff — identical API on Android and iOS

P0 device tests are BLOCKED: no mobile app or device evidence in this workspace.
Record date, OS/device, Expo path, API URL, HTTP result and response for each platform.

| Check | Android | iOS |
|---|---|---|
| Expo app launches | BLOCKED | BLOCKED |
| GET /health returns actual JSON over reachable HTTPS | BLOCKED | BLOCKED |
| Network interruption shows retry, recovery works | BLOCKED | BLOCKED |
| API/Supabase configuration uses same shared backend | BLOCKED | BLOCKED |
| Redirect paths agreed (P1 actual auth verification deferred) | BLOCKED | BLOCKED |

1. Start API locally and check loopback health first. For device testing arrange a
   captain-approved reachable HTTPS deployment/tunnel with a trusted certificate.
   If LAN routing is needed bind Uvicorn to `0.0.0.0` and allow only the required
   local firewall access. Never use `0.0.0.0` as the client's destination.
2. Set `EXPO_PUBLIC_API_BASE_URL=https://<reachable-host>` in Developer A's config;
   omit trailing slash and append `/health`. Phone localhost is the phone.
   Android emulator `10.0.2.2` refers to the Windows host for local diagnostics;
   that address is not an iPhone backend URL. Do not disable transport protections.
3. Supabase mobile config: `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` (public anon/publishable value only). Never put
   Groq or service-role keys in Expo configuration. Native requests do not require
   CORS; web testing needs an explicit allowed origin and an API restart.
4. Check both devices receive HTTP 200 with `supabase=not_configured/not_checked`
   and `ai=disabled_p0`. A live response proves connectivity only.
5. For P1 agree exact redirect URLs from the selected Expo Go or native app paths,
   allowlist them in Supabase, configure the mobile scheme, and test email links,
   callback handling and restored sessions separately on each platform. Do not
   assume Expo Go and signed-build redirects are interchangeable. No auth flow
   is available in this P0 backend.
6. Send Supabase user access tokens later as `Authorization: Bearer <access_token>`;
   never pass user IDs as authentication. Test expiry/refresh and rejected tokens
   when P1 validation exists. `/health` intentionally needs no token.
7. On Windows use a physical iPhone/Expo Go or a teammate's Mac simulator. Missing
   iPhone/Mac access stays BLOCKED. Android success does not establish iOS success.
