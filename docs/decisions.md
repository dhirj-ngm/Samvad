# P0 decisions — 23 October 2026

- Product scope is authoritative. One Expo/TypeScript/Expo Router app targets Android and iOS. The university-sized group is a pilot, not app branding.
- P0 UI is visibly labeled sample content; actions that need auth, storage, or AI are shown as unavailable rather than appearing functional.
- Developer A owns `mobile/**` and shared integration files as integration captain. Developer B owns `api/**` and `supabase/**`; both P0 workstreams are now present in the repository.
- `docs/contracts.md` is a draft from DPR §§6–7 and requires Developer B's review before either side implements persistence or AI calls.
- Use Expo SDK 57 with Expo Router's documented SDK 57 line. Dependency installation and native launches are subject to the access recorded in `build-log-mobile.md`.
- Developer A's original workspace had an unusable empty `.git` directory. This mobile branch was created from the existing GitHub `main`, preserving Developer B's committed files.
