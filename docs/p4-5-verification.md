# P4.5 verification and local handoff

## Phone QR connectivity follow-up

The user reported Expo Go could not connect and confirmed the phone browser could
not reach `192.168.40.199:8085/status` on the original Wi-Fi. The PC itself reached
that endpoint, and enabled Node firewall rules were present. The exact upstream
network blocker was not proven. Windows Mobile Hotspot capability was available;
the agent enabled it without changing SSID/password, opened its Settings and the
user confirmed joining the phone to it. No firewall was disabled and no local
Supabase service was put on a public tunnel.

Preview was restarted on `exp://192.168.137.1:8085`, with local Supabase at
`http://192.168.137.1:54321`. QR regenerated as ignored
`api/.local/p45-hotspot-qr.png`; the preview page was reopened. PC checks: Metro and
Auth health both HTTP 200; Android/iOS manifests and bundles HTTP 200 with hotspot
URLs and old backend address absent. Phone status/app launch confirmation remains
pending until the user reports it. Keep the PC hotspot enabled while testing;
turn it off in Windows Settings when finished.

## Local Docker/Auth/Storage verification ? 24 October 2026

The user installed Docker and explicitly chose **local-only verification**. Docker
Engine 29.9.2 is running. Local Supabase started successfully; all seven migration
versions are recorded locally, including P4.5 `20261024000335` and forward lint fix
`20261024005128_p45_feed_array_type.sql`. No hosted migration, data change, deployment,
push or invitation occurred. Existing hosted `.env` files remain untouched.

**Actual local service checks passed:**

- Two dedicated ordinary Auth accounts authenticated and reauthenticated through
  the actual local service. Unicode names, changed reading languages and interests
  persisted across login; private interests/identity and cross-owner profile writes
  were denied. Case-variant duplicate handles were rejected.
- News and a reviewed/labeled local original support persisted likes/reposts/follows,
  desired-state retries, correct counts, and attributed Following entries.
- Actual Storage HTTP accepted owner PNG upload/replacement and rejected cross-owner
  upload/profile assignment, unsupported MIME and oversized images.
- A separate LOCAL reviewer fixture authenticated with an ordinary user JWT and
  exercised protected review/hide/restore/dismiss actions, audit retry/conflict,
  hidden-source counts/reposts and protection against publishing pending content.
  A/B remained non-admin. Queue responses omit reporter IDs.
- Actual post/reply request retries and stable mention targets passed; pending body
  and mention reads were denied to the other account. Handle edits did not redirect
  existing mentions.
- The exact shared mobile SDK adapter passed local Auth/RPC checks for desired
  states, batch counts, Following attribution and account pinning.
- Temporary profile/preferences/social state was restored. An independent local
  aggregate query observed zero remaining avatar objects/likes/reposts/follows.
  One approved, labeled benign fixture and one dedicated reviewer membership remain
  for phone testing. Private local test report/audit records and deletion tombstones
  are retained, not fabricated real pilot participation.

**Validation:** 96 SQL and 20 mobile tests passed; API 79 passed/3 legacy live tests
skipped in that pytest invocation. Separate P4.5 HTTP checks above actually ran.
TypeScript and Ruff passed. Local database lint and advisors returned empty issue
lists after an explicit empty-array initialization fixed the inherited lint warning.
No recorded migration was rewritten. No AI inference/provider/prompt/policy changes.

**Preview:** local Expo runs on port 8085, `exp://192.168.137.1:8085`. Both platform
manifests/bundles returned HTTP 200 from the PC, use the correct LAN bundle host,
and contain the local Supabase URL rather than the hosted project. This is not
phone evidence. QR page: ignored `api/.local/p45-preview.html`, opened on the PC.
Phones must share the reachable Wi-Fi; first check `http://192.168.137.1:8085/status`.
The launcher sets process-only environment and disables dotenv loading so hosted
API configuration cannot bleed into this preview. AI remains unavailable locally;
new submissions intentionally stay pending. Use the approved local fixture for
public social testing. Keep Docker and the laptop running.

**Tools/reproduction:**

- `api/tools/prepare_local_p45.py` is loopback-only. The local admin key is used
  only to provision admin-confirmed test accounts; local privileged SQL provisions
  the separate R reviewer and labels/reviews a single benign original fixture.
  Those are setup operations, never privileged credentials used to claim RLS passes.
- `api/tools/check_social.py` uses only public key/ordinary user sessions for every
  authorization assertion. Restores state and removes temporary uploads/submissions.
- `mobile/tests/social-client.live.mjs` exercises the actual shared SDK adapter.
- `api/tools/start-p45-mobile.ps1` handles per-user Docker installs, starts an isolated
  LAN preview and preserves existing configuration. Passwords stay in ignored
  `api/.env.p45-local`; never paste them or CLI keys into chat.

```powershell
cd C:\Users\Mathews\Documents\Samvad\api
.venv\Scripts\python -m dotenv -f .env.p45-local run -- .venv\Scripts\python -m tools.check_social
.venv\Scripts\python -m dotenv -f .env.p45-local run -- node --experimental-strip-types ../mobile/tests/social-client.live.mjs
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/start-p45-mobile.ps1 -LanAddress 192.168.137.1 -Port 8085
```

The preview is already running: do not launch a second copy on port 8085. If Wi-Fi
changes, update the PC LAN address and regenerate the QR. Studio is local only.
Fixture accounts are admin-confirmed, **not evidence of completing email confirmation**.
Actual Android/iPhone UI gestures, photo permission/cancellation/offline behavior,
email confirmation and ten consenting participants remain unobserved. The checklist
below remains the joint device/pilot acceptance requirement.

24 October 2026. Local branch `feature/p4-5-social`, based on merged P0–P4
`4d6c321`. Combined Developer A/B implementation. No push, hosted migration,
deployment, invitations or P5/P6 work. Existing ignored configuration is preserved.

## Implemented scope

- Atomic profile/language/interest save; optional Unicode display name/bio, stable
  existing handle grammar, account-scoped retry draft, central EN/HI/ML registry.
  Feed personalization resets after confirmed saves. Public visitor and owner
  profiles, public Posts/Reposts, counts and paginated follower/following lists.
  Email, preferences management, logout and own status submissions are in Settings.
- Optional avatar picker/crop/preview/upload/replace/remove with initials fallback,
  permission/cancel/error states. Client checks bytes/2 MiB; Storage bucket enforces
  MIME allowlist/size, versioned owner paths, no overwrite or cross-owner mutation.
  Referenced current avatars cannot be deleted. A profile save must succeed before
  old-object cleanup. Upload does not imply a completed profile change.
- Retry-safe desired-state likes/reposts/follows. Actor derives from authenticated
  identity, unique rows, no self-follow, persisted counts and caller state. Feed
  pages batch interaction/mention reads. News and originals use conversation UUIDs.
- People search and profile navigation from posts/replies/reposts; mention
  suggestions and server-resolved stable target UUIDs, original text unchanged.
  Unknown handles remain text. Existing post/reply request keys and drafts remain.
  Following reads followed users' actual originals and attributed reposts.
- Human report queue and review/dismiss/hide/restore with required reasons and
  private retry-safe audit. Trusted membership is operator-controlled, never user
  metadata. Reporter identifiers are excluded. Separate manual hiding never changes
  P4 AI decisions or publishes pending/blocked/deleted content on restore.
- Scrollable profile headers, common 48-point social actions, system Indic glyphs,
  readable line heights, loading/errors/empty states and safe-area/keyboard wrappers.
  Activity stays honest; optional notifications are deferred.

Existing P4 provider/model/prompt/configuration, translation/brief HTTP contracts,
AI screening policy and quality gate are unchanged. This phase does not certify
AI quality, change billing or expand supported languages.

## Actual automated evidence

| Check | Observed result |
|---|---|
| Database tests | **96 passed**, zero skips, PGlite/PostgreSQL-in-WASM |
| Mobile tests | **20 passed**, zero skips |
| Shared mobile adapter → migrated SQL | Included in database suite, two synthetic ordinary-role subjects; no HTTP/Auth server |
| TypeScript | Passed |
| Expo SDK dependency compatibility | Passed after compatible Expo 58.0.19 / Router 58.0.26 patch alignment; ImagePicker 58.0.10 |
| API pytest | **79 passed, 3 skipped** after local-verification tooling; live config not loaded, no new live inference |
| Ruff / pip check | Passed |
| Android/iOS Metro exports | Both passed; bundle exports are not device launches |
| npm audit | **5 high**, existing Expo CLI/code-signing/node-forge/zod tree; not a clean dependency audit |
| Local Supabase ledger/lint/advisors | **Passed** after Docker install; seven local migrations, no lint/advisor issues |
| Local Auth/Storage HTTP + SDK | **Passed** with two ordinary local accounts and separate local reviewer fixture |
| Hosted migration / hosted P4.5 tests | **Not performed**, user chose local-only |
| Android/iPhone P4.5 acceptance | **Not observed**; no adb/emulator/iOS simulator available |
| Ten consenting participants | **Not observed**, separate future acceptance |

The database suite applies every migration to a fresh in-memory PostgreSQL, then
SET ROLEs to ordinary `authenticated`/`anon` roles and sets synthetic subjects.
Only fixture setup/admin provisioning is privileged. Storage tests use a catalog
shim and test SQL ownership policies, not Storage HTTP MIME/size enforcement or
real JWTs. The live-account skips are not passing authorization evidence.

Regressions include atomic rollback, duplicate/case-variant handles, no private
identity exposure, avatar path ownership/referenced-object protection, duplicate
desired-state retries, exact counts, no actor forging, stable mentions after handle
changes, original/news targets, hidden parents/threads/reports, owner-hidden content
excluded from public discovery, ordinary reviewer denial, audit retry conflicts,
and restore retaining pending publication state. Existing P0–P4 SQL/API/model tests
remain in the suites.

## Local setup and run

Fast checks need no Docker or cloud credentials:

```powershell
cd C:\Users\Mathews\Documents\Samvad
npm.cmd ci --prefix supabase
npm.cmd test --prefix supabase
npm.cmd ci --prefix mobile
npm.cmd test --prefix mobile
npm.cmd run typecheck --prefix mobile
cd api
.venv\Scripts\python -m pytest -q
```

For the complete local Auth/Storage/Data API stack, keep Docker Desktop running.
Docker is now installed; the commands below reproduce the local setup. CLI **2.122.0** was discovered through `--help`; no global CLI is needed.
From repository root, on a local stack only:

```powershell
npx.cmd --yes supabase@2.122.0 start
npx.cmd --yes supabase@2.122.0 migration list --local
npx.cmd --yes supabase@2.122.0 migration up --local
npx.cmd --yes supabase@2.122.0 db lint --local --schema public,samvad_internal
npx.cmd --yes supabase@2.122.0 db advisors --local --type all
```

These local start/ledger/migration/lint/advisor commands now ran successfully.
No reset was used. Migration files were CLI-created and replayed in both PGlite
and the Docker local stack. No hosted ledger entry exists for P4.5.

Create a separate ignored mobile env file (do not overwrite the existing `.env`)
with only the **local** public URL/key. Start Expo with that file's values exported
in your shell, or intentionally configure the ignored `.env` after backing it up:

```powershell
cd C:\Users\Mathews\Documents\Samvad\mobile
npm.cmd start -- --port 8085
```

On a phone, the local Supabase URL must use the computer's reachable LAN address,
not phone `localhost`; phone and computer need a network that allows this traffic.
Local email confirmation is viewed through the local mail catcher shown by the CLI.
For Internet/mobile-data testing, a later approved hosted migration and HTTPS setup
are required. The existing hosted project still lacks this migration: the P4.5 app
must not be treated as ready against that old schema. Missing RPCs fail explicitly.
Existing FastAPI launcher/configuration remain documented in `api/README.md`;
P4.5 social/profile/review persistence uses Supabase, adding no new FastAPI route.
Local-only P4.5 checks may leave AI unavailable and new submissions pending. Any
separately configured local API must validate tokens and use server keys from the
same local project. Keep the existing hosted configuration backed up and untouched;
P4 AI acceptance remains its separate workstream.

## Migration and reviewer handoff — not applied here

New forward migration:
`supabase/migrations/20261024000335_social_experience.sql`.
It preserves recorded migrations, records and original UUIDs. It adds the avatar
bucket/path, private relationships/mentions/reviewer/audit tables, manual-hidden
flags and restrictive policies, additive RPCs, and updates public DTOs/visibility
queries in forward definitions. It does not change AI functions or state policy.

Before any later hosted application, the database captain must review the diff,
confirm the development project and ledger, check existing Storage policies for
unexpected permissive access, replay locally with real Auth/Storage, run lint and
advisors, then obtain authorization in a separate thread. Do not reset shared data,
rewrite a recorded migration or run these instructions against production.

For a later hosted setup, an operator may explicitly provision a consenting reviewer using
their verified profile UUID, through a privileged SQL session only:

```sql
insert into samvad_internal.review_admins(user_id)
values ('REPLACE_WITH_VERIFIED_REVIEWER_PROFILE_UUID') on conflict do nothing;
-- Revoke when no longer needed:
-- delete from samvad_internal.review_admins where user_id='VERIFIED_UUID';
```

A separate LOCAL reviewer fixture R was explicitly provisioned for verification.
No hosted reviewer was provisioned. Ordinary accounts cannot self-enroll. Reviewer
goes to Profile → Private settings → Human report review. Direct `/review` navigation
also checks membership and the database repeats authorization for every action.
Details and content are sensitive: use a dedicated reviewer device/account.
Superseded-image cleanup is best effort; abandoned uploaded previews may leave
unreferenced objects. Inspect and clean those through Storage only after checking
current profile references and unresolved local drafts; do not delete Storage
metadata rows directly.
Storage checks the configured declared MIME type and byte-size limit; the client
also checks image signatures. Full image decoding/server-side transcoding is not
implemented or claimed by this phase.

## Two-account Android/iPhone checklist

Record device model, OS, Expo Go/build version, account A/B, exact result and errors.
Repeat on **each** platform and exchange actions between the two phones.

- [ ] Confirm email/login; first-run handle, native language and optional interests.
  Choose Malayalam, log out/in, verify preference and interests remain persisted.
- [ ] Edit Indian-script display name/bio; change to Hindi and different interests.
  Confirm saved UI and reloaded data; feed resets its personalization. Existing
  translation actions use the new preference, retaining original content.
- [ ] B visits A: public fields/counts/posts only, no email/private identity or My
  submissions. A's pending/held/manual-hidden posts stay out of public Posts/feed.
- [ ] Avatar: cancel/deny permission; reject unsupported/oversized images; upload,
  preview, save, relaunch, replace/remove. Simulate upload/profile-save failure:
  prior avatar remains current, draft/error permits retry. Verify fallback/offline.
- [ ] Real ordinary client credentials: B cannot upload/list/delete A's owner path,
  assign A's avatar, read private identity, forge A's writes or access reviewer data.
  Exercise Storage MIME/size limits via actual HTTP, including spoofed input.
- [ ] Both accounts like/unlike news **and** an approved original, then refresh and
  relogin. Repeat desired-state requests: one relationship, accurate counts/state
  in both accounts. Simulate timeout and retry the same desired state.
- [ ] Follow/unfollow B, no self-follow; verify counts and paginated lists. Following
  shows real followed originals/reposts; new accounts get useful People navigation.
- [ ] People search by handle/name; tap post/reply/reposter authors to correct profile.
  Type @handle in middle/end of Unicode drafts, insert a suggestion, preserve suffix,
  cursor, keyboard and existing draft/request UUID. Unknown handles stay text.
- [ ] Review a benign pending mention post/reply through the existing trusted
  publication process; B sees the saved target link. Change that target's handle:
  old mention still opens the same UUID, never a new owner of its old handle.
- [ ] Repost/unrepost an original and news; show both reposter and original attribution,
  publisher link and original thread. Hide/delete original: body, thread, mentions,
  repost/feed entry and count query disappear for B/anonymous. Undo remains safe.
- [ ] Ordinary A/B denied `/review` and review RPCs. Explicit trusted reviewer can
  review/dismiss and hide/restore with reason, see audit/status persistence and
  retry exact actions. Reporter ID stays unavailable. Restore cannot publish
  pending/blocked/deleted content; report counts never alter accounts.
- [ ] VoiceOver/TalkBack, large font, contrast, Indic glyphs, 48-point actions,
  notch/bottom bar, keyboard/scroll, pull-to-refresh, pagination and slow/offline retry.
- [ ] Regression: P0–P4 login, source links, original posts, reply parents/reports,
  drafts/account switch, translation/Show original, brief and screening error paths.

## Pilot preparation, separate acceptance

After a separately approved hosted setup: stable HTTPS, correct public client
configuration, server-only secrets, email confirmation/redirect configuration,
reviewer coverage and a documented feedback/incident contact. Invite nobody in
this thread. Ten real consenting participants must each be observed signing in,
reading, posting/replying and using social actions; note device/language, task
completion and usability issues without collecting unnecessary identity data.
Synthetic fixtures, bundle exports or two test accounts do not pass that gate.

P4.5 local implementation is reviewable; the **joint P4.5 acceptance gate remains
pending** on separate Android/iPhone observations and remaining email/pilot gates.
Local Auth/Storage/ordinary-account HTTP passed; hosted work remains prohibited. The earlier P4 language/policy/device gates
also remain as previously recorded. Optional notifications and all new AI proposals
are deferred. No P5/P6 has begun.

References used: [Storage access policies](https://supabase.com/docs/guides/storage/security/access-control),
[Storage upload/ArrayBuffer](https://supabase.com/docs/reference/javascript/storage-from-upload),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/).
