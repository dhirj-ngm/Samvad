# Samvad mobile P1 setup

The Expo SDK 58 app contains the P0 sample navigation shell and Developer A's P1 Auth/onboarding UI. Live account checks require Developer B's identity migration in an agreed **development** Supabase project.

1. Ask Developer B for the development project URL and **public** publishable/anon key after the migration is applied and Auth email/password settings are checked. Find these in the Supabase dashboard under the project's API settings. Never use a service-role or secret key in Expo.
2. Copy `.env.example` to ignored `mobile/.env` and fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Restart Expo after changing them. `EXPO_PUBLIC_API_BASE_URL` is reserved for later API integration; P1 Auth uses Supabase directly.
3. Start Expo with `npm ci && npx expo start`. In Profile, create or sign in to a test account. If email confirmation is required, open the confirmation email, return to the app, and sign in. No automatic email-link callback is claimed yet; agree and test the exact redirect URL on each platform with Developer B.
4. Choose a public handle, reading language, and optional interests. Save, restart Expo Go, confirm the session and profile return, edit the selections, then sign out. Repeat on Android and iOS with two distinct dedicated accounts. Developer B must independently run the real-account RLS/private-identity checks described in `../supabase/README.md`.

Without the development URL/key, account buttons show an unconfigured state. The P0 sample UI still works, but a successful bundle/typecheck is not a live Auth test. Keep `.env`, passwords, email links, and session tokens out of Git and logs.
