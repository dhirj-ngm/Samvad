# P0 decisions — 23 October 2026

- Product scope is authoritative. One Expo/TypeScript/Expo Router app targets Android and iOS. The university-sized group is a pilot, not app branding.
- P0 UI is visibly labeled sample content; actions that need auth, storage, or AI are shown as unavailable rather than appearing functional.
- Developer A owns `mobile/**` and shared integration files as integration captain. Developer B owns `api/**` and `supabase/**`; both P0 workstreams are now present in the repository.
- The integration captain accepted Developer B's P0 schema/API proposals as the design baseline in `docs/contracts.md`. This records planned shapes and security rules; migrations, Auth and AI routes are not implemented. Both owners review later contract changes before coding.
- The P0 scaffold initially used Expo SDK 57. On 23 October 2026, Developer A upgraded only `mobile/**` to SDK 58 after the user reported that the SDK 57 Expo Go APK would not install. This aligns the project with Expo's SDK 58 package line and keeps one Android/iOS codebase. Device launches still require observation; neither platform is passed by a bundle export.
- Developer A's original workspace had an unusable empty `.git` directory. This mobile branch was created from the existing GitHub `main`, preserving Developer B's committed files.
- Fresh `npm ci` exposed an optional React DOM peer version conflict; pin `react-dom` to the app's React version `19.2.3` for reproducible installs.
- Integrate the P0 code into `main` at the user's request after passing local checks, while keeping the P0 device/app-connectivity gate marked blocked until real Android and iOS launches are recorded. Do not claim the mobile app is connected to the API or Supabase.
