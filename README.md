# Samvad

Samvad is an Expo/React Native app for Android and iOS with a separate FastAPI and Supabase backend. The app includes the P0 navigation shell and labeled sample UI alongside P1 authentication and onboarding. Live accounts require development Supabase configuration and the reviewed identity migration. Publishing, translation, and live content remain future phases.

**Current handoff:** [PROJECT_TRACKER.md](PROJECT_TRACKER.md) shows each owner's progress, open gates, and next actions.

## Mobile setup

The app uses Expo SDK 58. Use Expo Go for SDK 58 on your phone and Node.js
22.13+ (22.x), 24.3+ (24.x), or 26+. Keep your phone and computer on the same Wi-Fi.

```bash
cd mobile
npm ci
npm run typecheck
npx expo start
```

The mobile project is on Expo SDK 58. Open the dev-server address shown by Expo in an SDK 58-compatible Expo Go on an Android phone and an iPhone to validate each platform separately. For a LAN session, both phones must be able to reach the development computer; a successful bundle export is not a phone launch. Device and tool access results are in `docs/build-log-mobile.md`. Do not add provider secrets to any `EXPO_PUBLIC_*` value; those values are bundled into the app.

If Expo Go reports an SDK mismatch, confirm you are running Metro from this
checkout's `mobile/` directory, install dependencies with `npm ci`, and restart
with `npx expo start --clear`. If the phone cannot reach Metro over Wi-Fi, try
`npx expo start --tunnel`.

The product scope, technical specification, and implementation plan are the three `Samvad_*.md` files at the repository root. The proposed shared contract is in `docs/contracts.md`; Developer B's proposal is in `api/docs/contracts-proposal.md`. Developer A owns `mobile/**`, while Developer B owns `api/**` and `supabase/**`.

The P0 backend exposes only `GET /health`; see [api/README.md](api/README.md) for setup and tests. `docs/integration-checklist.md` records the current gate status. The user observed all five tabs, a sample conversation, and browser `/health` on both Android and iPhone; the P0 gate passed on this user-reported evidence. P1 Auth/onboarding code is integrated, but its live Supabase and device gate is blocked. P1 uses Supabase directly; no in-app FastAPI call exists in P0.

### If Expo Go buffers on a phone

First open `http://<laptop-LAN-IP>:8081/status` in that phone's browser. If the browser cannot show `packager-status:running`, the phone cannot reach Metro; changing app code or SDK versions will not fix that network path. Phone-hosted hotspots and public Wi-Fi can block device-to-laptop traffic.

For a temporary HTTPS preview when LAN access is blocked, start a [Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) to Metro and set `EXPO_PACKAGER_PROXY_URL` to its HTTPS URL **before** starting Expo. The public manifest's `launchAsset.url` must use the tunnel hostname without a local `:8081` port. Scan an `exps://<tunnel-host>` QR in Expo Go; `exps://` selects HTTPS. Quick Tunnel addresses are temporary and public, so use this only for the P0 sample app and recheck the address after any restart. The current session and platform evidence are in `docs/build-log-mobile.md`.
