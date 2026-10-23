# P0 decisions — 23 October 2026

## P4 combined implementation — 24 October 2026

- User assigned both P4 workstreams and previous-phase conflict handling. Main
  already contains accepted P0–P3; no conflict to resolve. Prior local verification
  notes preserved separately before new changes. Do not rewrite published history.
- P4 uses private server-only cache/reservation/event tables and caller-token RLS
  reads rather than exposing translations from held content in a client table.
- Actual account plan/access and data acceptance are explicit configuration gates;
  bilingual/policy review separately gates automated publication. Credentials missing
  means disabled/blocked, never fixture or paid fallback success.
- Shared SQL reservations enforce one concurrent inference across workers; failures
  stay charged. No auto retry. Briefs leave request headroom for core tasks.
- Main stays at accepted P3 until live/provider/language/native P4 gate passes.

## P3 combined ownership — 24 October 2026

- User assigned both P3 workstreams to one agent and confirmed Android/iOS complete
  through P2. P2 accepted by user report; earlier pending device entries superseded.
- Replies keep P2's conservative pending/trusted-review boundary; P3 does not bypass
  screening to produce an apparent two-user demo. Two individually reviewed benign
  ML/HI fixtures are visibly labeled. No AI or paid inference introduced.
- Reports deduplicate per reporter/target, are private, and never affect publication
  or account status by count. Trusted SQL/MCP review only, no new admin client role.
- SQL account budgets serialize new writes; exact retries remain free. No IP/Sybil
  protection or full public-launch moderation promise. Shared P3 contracts updated
  before handoff; exact checklist/evidence in p3-verification.md.
- P3 stays on integrate/p3 until Android and iPhone device gate passes, following
  the playbook. No P4 work begins in this task.

## P2 takeover and integration — 24 October 2026

- The user authorized one agent to own both Developer A/B P2 work and merge P0/P1/P2.
  Existing P0/P1 main integration and acceptance are preserved. P2 code integration
  does not automatically pass the new device gate.
- Use six real historical source records with visible archive/source dates; no
  unsupported live-news freshness or AI brief claims. Original posts remain first-class.
- P2 submits content as author-only pending, with trusted manual review for public
  visibility until later screening. No paid inference or automatic publication.
- Shared contracts define submit/delete/feed RPCs, exact retry/cursor semantics and
  owner-only status display. Internal privileged helpers live outside exposed schemas;
  clients cannot control author/status/time. No P3/P4 feature implementation.
- P2 verification and remaining Android/iOS checklist: [p2-verification.md](p2-verification.md).

- Product scope is authoritative. One Expo/TypeScript/Expo Router app targets Android and iOS. The university-sized group is a pilot, not app branding.
- P0 UI is visibly labeled sample content; actions that need auth, storage, or AI are shown as unavailable rather than appearing functional.
- Developer A owns `mobile/**` and shared integration files as integration captain. Developer B owns `api/**` and `supabase/**`; both P0 workstreams are now present in the repository.
- The integration captain accepted Developer B's P0 schema/API proposals as the design baseline in `docs/contracts.md`. This records planned shapes and security rules; migrations, Auth and AI routes are not implemented. Both owners review later contract changes before coding.
- The P0 scaffold initially used Expo SDK 57. On 23 October 2026, Developer A upgraded only `mobile/**` to SDK 58 after the user reported that the SDK 57 Expo Go APK would not install. This aligns the project with Expo's SDK 58 package line and keeps one Android/iOS codebase. Device launches still require observation; neither platform is passed by a bundle export.
- Developer A's original workspace had an unusable empty `.git` directory. This mobile branch was created from the existing GitHub `main`, preserving Developer B's committed files.
- Fresh `npm ci` exposed an optional React DOM peer version conflict; pin `react-dom` to the app's React version `19.2.3` for reproducible installs.
- Integrate the P0 code into `main` at the user's request after passing local checks, while keeping the P0 device/app-connectivity gate marked blocked until real Android and iOS launches are recorded. Do not claim the mobile app is connected to the API or Supabase.
