# Samvad

Samvad is an Expo/React Native app for Android and iOS with a separate FastAPI and Supabase backend. The P0 mobile app has a navigation shell and labeled sample UI; it is not connected to the backend yet. Authentication, publishing, translation, and live content are not available in the app.

## Mobile setup

The app uses Expo SDK 58. Use Expo Go for SDK 58 on your phone and Node.js
22.13+ (22.x), 24.3+ (24.x), or 26+. Keep your phone and computer on the same Wi-Fi.

```bash
cd mobile
npm ci
npm run typecheck
npx expo start
```

Open the QR code in Expo Go on an Android phone and an iPhone to validate each platform separately. Device and tool access results are in `docs/build-log-mobile.md`. Do not add provider secrets to any `EXPO_PUBLIC_*` value; those values are bundled into the app.

If Expo Go reports an SDK mismatch, confirm you are running Metro from this
checkout's `mobile/` directory, install dependencies with `npm ci`, and restart
with `npx expo start --clear`. If the phone cannot reach Metro over Wi-Fi, try
`npx expo start --tunnel`.

The product scope, technical specification, and implementation plan are the three `Samvad_*.md` files at the repository root. The proposed shared contract is in `docs/contracts.md`; Developer B's proposal is in `api/docs/contracts-proposal.md`. Developer A owns `mobile/**`, while Developer B owns `api/**` and `supabase/**`.

The P0 backend exposes only `GET /health`; see [api/README.md](api/README.md) for setup and tests. `docs/integration-checklist.md` records the current gate status. Both platform bundles can export, but phone launches and app-to-API connectivity still require device checks.
