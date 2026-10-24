# P0 decisions — 23 October 2026

## P6 local demo release candidate — 24 October 2026

- Combined A/B implementation continues from integrated P0–P5 on `release/p6-demo`.
  Preserve earlier functional acceptance; no P6 remote push, hosted migration,
  deployment or final release tag. Feature work is frozen for the candidate.
- Expo Go on Android/iPhone is the selected permitted demo route. Exports and
  manifests do not count as new device observations. Native signing/cloud builds
  and store distribution remain separate.
- Reproducible fresh-local accounts use private random credentials and explicit
  operator provisioning; initialization refuses existing mappings. Cache-only
  runtime is available without provider credentials and never fabricates outputs.
- Existing providers/models/prompts and gated publication policy remain intact.
  No new provider inference or paid fallback in P6. Automatic publication stays OFF.
- Final language/policy provenance, dependency risk disposition and venue rehearsal
  precede sign-off. Do not create `hackathon-demo-v1` until these are reviewed.
  [Evidence](p6-verification.md) · [operational handoff](P6_RELEASE_RUNBOOK.md).

## P4.5 local implementation — 24 October 2026

- Combined A/B work stays on `feature/p4-5-social`; main unchanged. No push, hosted
  migration/deployment, invitations or P5/P6. User planning edits/config preserved.
- Atomic preferences, optional versioned avatars, private unique social graph,
  stable mentions, batched state and real Following. Public profile projection
  excludes email/private identity/interests; existing handles and en/hi/ml retained.
- Private authorized dispatcher behind invoker wrapper; human review requires
  operator-controlled membership, reason and retry-safe audit. Separate hiding
  never changes P4 AI decisions or auto-punishes by report count. No new AI work.
- Docker absence blocks full local Auth/Storage/ledger/lint/advisors. PGlite roles
  and adapter integration are distinct from real JWT/account/device evidence.
  [P4.5 acceptance remains pending](p4-5-verification.md); this supersedes earlier
  planning-only status while preserving its non-AI scope override.

## P4.5 non-AI scope alignment — 24 October 2026

- User requested review/planning of the supplied polishing vision, assigned both
  mobile/backend roles, and explicitly excluded AI work from this build. The
  [execution plan](p4-5-plan.md) supersedes AI priorities in the imported change
  request for this phase; the original Downloads file remains untouched.
- Refine existing language/interest onboarding instead of claiming it is absent.
  Registry initially includes only actually supported en/hi/ml; no new provider
  coverage, UI localization or automatic rewriting is promised.
- Build full self/public profiles and then durable social actions/People/mentions.
  Use original conversation IDs for news/post interactions, avoiding copied news
  posts or fake human authors. Preserve publication visibility, drafts and reports.
- Keep existing handle syntax stable; support Indic display names/content. Any
  handle-grammar expansion needs separate uniqueness and mention-resolution work.
- Manual protected report review is non-AI work. Model/provider/summary/translation
  upgrades and fine-tuning are deferred. Ten real consenting participants and
  hosted/device checks remain observed gates, never inferred from local fixtures.
- This is planning/contract alignment, not a feature completion claim. No push,
  hosted migration, invitations, deployment or paid service authorized/executed here.

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
