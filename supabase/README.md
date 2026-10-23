# P1 identity backend

**P4:** private AI cache/shared reservations/moderation event migration is deployed.
Client access denied; source reads stay caller-RLS. Server configuration/live and
device gates: [P4 verification](../docs/p4-verification.md). Older status notes below
are historical. Do not reapply hosted migrations or reset shared data.

**Current phase: P3.** Identity, discovery, replies, private reports and write
budgets are deployed. [P3 setup/tests](../docs/p3-verification.md) supersede earlier
phase status notes below. P0–P2 Android/iOS accepted; P3 device gate pending.

## Current P2 handoff — 24 October 2026

P1 and both P2 migrations are deployed to development project
mtgsyjqcoyzijicpydee. The older P1 setup notes below are retained for reproducibility;
their original missing-project status is superseded by the live evidence.
P2 adds news_items/posts/conversations, six real dated archive sources, scoped
submit/delete functions and an invoker feed. See
[P2 verification and operator review](../docs/p2-verification.md). Do not reapply
the identity migration or reset the shared project. All new posts remain pending.

## Hosted development status — 24 October 2026

The identity migration is applied to development project `mtgsyjqcoyzijicpydee`.
Supabase MCP recorded version `20261023201908`; the repository migration filename
matches that ledger entry so a later CLI push will not attempt a duplicate apply.
All four tables have RLS, the seven intended policies are present, six topics are
seeded, and ordinary clients cannot execute the identity trigger or SELECT private
identities. Public REST topic reads passed; anonymous private-identity reads returned
HTTP 401. Email/password signup and email confirmation are enabled; anonymous
signup and other providers are disabled. The advisor's informational no-policy
notice for `private_identities` is intentional denial of all client access.

Local mobile/API configuration is populated in ignored env files. Two dedicated
admin-confirmed accounts passed the live Auth/PostgREST onboarding and privacy
harness. Signup email delivery and Android/iOS P1 observations are still required. The older setup
notes below describe implementation-time prerequisites, not a second migration.

The captain-approved P0 baseline is in `../docs/contracts.md` (origin/main
dbc2d22). This directory implements only identity/interests. No posting/feed/AI.
Credentials stay in Supabase Auth. FastAPI still exposes only P0 liveness; it is
not an email/password proxy and no API JWT authorization is claimed as deployed.

## What is implemented

`migrations/20261023201908_identity_interests.sql` creates:

- `profiles`: six intended public columns; case-insensitive unique lowercase
  handles, reserved-name/length checks; `en|hi|ml` language CHECK; owner insert/update.
- `private_identities`: email/verification mirrored from Auth-owned fields;
  no ordinary client grants or RLS read/write policies, including for the owner.
- `interests`: public read of six seeded UUID-backed topics, no client writes.
- `user_interests`: owner select/insert/delete; composite PK prevents duplicates.

Owner creation/update uses direct RLS-protected Supabase tables. There are no public
views or onboarding RPCs to approve. Trigger functions have no client EXECUTE grant;
the private sync function has a fixed empty search_path and uses qualified names.
The migration does not create users or infer verification from user metadata.
Account creation can finish before handle selection; no signup-trigger-generated
handle collides. Users without a profile resume onboarding after login.

Optional display_name/bio default to empty strings. Lengths are PostgreSQL Unicode
code points: 80/280. Only the six profile columns are granted SELECT. No private
Auth fields, auth metadata or hidden identity joins are in the public table.
Profile user_id and created_at are immutable, including on upsert. Profile delete
is not granted; full account deletion remains a later operational flow.

## Development Auth configuration

`config.toml` supplies local defaults: email/password signup, email confirmation,
refresh-token rotation, no anonymous/SMS signup. `site_url` is loopback for local
browser testing only; no device redirect is invented. Local config does not modify
a hosted project's Auth settings. For the agreed hosted DEVELOPMENT project:

1. In the Supabase dashboard enable email/password, confirmation, and email change
   double confirmation; disable anonymous and unused providers. Use Auth's own
   password settings/rate limits. Verify delivery limits before account testing;
   no paid service is required by this implementation.
2. Agree with A the exact Expo Go/native redirect paths for each platform, add
   those exact URLs to Auth's allowlist and configure their callback handlers.
   Browser localhost is not a phone callback. Test confirmation/session restore
   on Android and iOS separately. Do not disable transport security.
3. Configure the same project URL and public publishable/anon key in A's existing
   `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`. No service-role key
   belongs in mobile. Use the SDK's persisted sessions and refresh handling.
4. Provision two dedicated development accounts through ordinary Auth signup and
   confirm their email links. Supabase SDK `auth.signUp({email,password,options:
   {emailRedirectTo: agreedCallback}})` may return session=null until confirmed;
   treat that as awaiting confirmation, not onboarding success. Sign in via
   `auth.signInWithPassword`, sign out with `auth.signOut`; show Auth errors safely.
   Read own email/confirmation from Auth, never from `private_identities`.

No project or credentials were present during initial implementation. The hosted
status above records the later deployment and passing dedicated-account checks.
Email delivery and confirmation-return behavior still require observation.
Official references checked 2026-10-23:
[password Auth](https://supabase.com/docs/guides/auth/passwords),
[Auth-managed data](https://supabase.com/docs/guides/auth/managing-user-data),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[CLI settings](https://supabase.com/docs/guides/local-development/cli/config).

## Apply only after review, in the agreed development project

The reviewed migration has now been applied to the development project through
Supabase MCP. Do not rerun it manually. These instructions remain for future
development environments; inspect the ledger before any CLI deployment.

Database captain B performs the following once the migration is reviewed:

1. Verify project reference and development designation with the captain. Inspect
   existing tables, functions, triggers and migration history. This migration
   expects the four table names and `samvad_*` trigger/function names to be unused.
   Ensure `citext` is absent or installed in `extensions`; do not relocate a
   conflicting extension or overwrite an existing schema silently. Migration errors
   roll back instead of adopting unknown objects.
2. On a disposable full Supabase stack, install the team's chosen CLI and Docker,
   run `supabase start` from repository root, then `supabase migration up --local`.
   Inspect local Auth/email confirmation and run the real-user checks below.
   CLI/Docker installation and full-stack execution are not yet verified here.
3. With secure CLI authentication: `supabase link --project-ref <agreed-dev-ref>`;
   `supabase migration list --linked`; `supabase db push --linked --dry-run`.
   Review the pending list (this one P1 file only), then
   `supabase db push --linked`. Never put passwords/tokens in command arguments or
   paste command output containing local keys into logs. Check CLI help for the
   installed version. Only B applies; A does not race the migration.
4. Confirm recorded migration version `20261023201908`, table grants/RLS, seeded
   topics, signup/verification trigger and real-account checks. Record project
   reference (not credentials), migration result and test evidence in backend log.

The file is transactional and intended once through Supabase's migration ledger;
do not manually rerun it as a seed script. It includes the six stable taxonomy rows.
There is no separate seed.sql or P2 content. Backfill reads only Auth-owned email
and confirmation columns. Trigger errors can block Auth operations, which is why
full-stack development verification is required before calling deployment complete.

Recovery: a SQL failure before COMMIT rolls back the transaction. After a successful
apply do not drop identity tables or reset shared data. Stop writes and investigate;
use a reviewed forward correction. If the Auth trigger itself is the blocker, B
may disable only `samvad_sync_private_identity` on the agreed development project's
auth.users after review, repair it, backfill from Auth and rerun authorization checks.
No automated rollback/reset command is supplied. Preserve existing records.

## Developer A: save onboarding without duplicates

Use a session-validated `user.id` (never a caller-selectable identity). Serialize
onboarding saves per session; keep the draft and retry the same desired state on
network failure. Do not show a completed save until all steps succeed.

```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) throw new Error('Sign in again');
const { error: profileError } = await supabase.from('profiles').upsert({
  user_id: user.id,
  handle: draft.handle.toLowerCase(),
  display_name: draft.displayName ?? '',
  bio: draft.bio ?? '',
  preferred_language: draft.language, // en | hi | ml
}, { onConflict: 'user_id' });
if (profileError) throw profileError;
```

The server independently normalizes/validates the handle, validates language and
checks owner identity. A pre-check does not reserve a handle. Treat SQLSTATE 23505
as a handle conflict and preserve the draft; 23514/23502 are invalid values. Do not
send created_at, email or verification_status. A successful retry updates the same
row; it never creates a second public profile or changes its creation timestamp.

Interests use separate row operations; cross-table atomicity is NOT claimed. Read
the six public `interests(id,slug,label)` first. Persist a complete desired ID set:

1. Fetch only current user's `user_interests(user_id,interest_id)`.
2. Add missing desired pairs using `.upsert(pairs, {onConflict:
   'user_id,interest_id', ignoreDuplicates: true})`; skip empty arrays.
3. Delete deselected pairs with `.delete().eq('user_id', user.id)
   .in('interest_id', removedIds)`; skip empty arrays. RLS independently enforces
   ownership even if a malicious client changes the filter.
4. Reread the owner's selections; show saved only when they equal the desired set.
   Retrying these set operations converges without duplicate rows. An interrupted
   save can temporarily retain old selections; reload/resume instead of clearing
   all selections first. Concurrent devices have last-write behavior; no revision
   or global transaction contract has been introduced.

On login query the owner profile; missing row means onboarding needed. A profile
can exist before interest saving finishes, so do not use profile existence alone
to claim an interrupted onboarding save completed. Empty interests are permitted;
they are optional. No new onboarding_completed column/RPC is introduced.

Public reads: anonymous/authenticated may read profiles/interests. Private identity
reads fail even for the owner. user_interests are owner-only; unauthenticated read
is denied. Unauthorized profile UPDATE may succeed with zero affected rows because
RLS hides the target: reread owner results or request RETURNING to confirm saves.

## Run reproducible local checks (no cloud, no Docker)

```powershell
cd supabase
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd test
```

The one locked dev dependency, PGlite, executes the actual migration in in-memory
PostgreSQL/WASM. Tests bootstrap a minimal Auth table/uid shim and SET ROLE to
ordinary anon/authenticated for authorization assertions. Only fixture setup and
Auth-trigger inspection use the database owner. This tests SQL/constraints/grants/
RLS, not GoTrue, PostgREST, JWT validation, mail, actual accounts or concurrent
transactions. It is NOT the required two-real-development-account acceptance gate.

## Real-account checks (blocked until configured)

From api, copy `docs/p1-test.env.example` to ignored `.env.p1` and fill it locally
with the agreed project/public key and two email-confirmed dedicated account
credentials. Set SAMVAD_P1_ALLOW_WRITES=true only for that development test project.
The harness logs in through Auth's password grant, verifies each session via
`/auth/v1/user`, then calls PostgREST with the ordinary user access tokens. It
rejects service-role/secret keys and never uses admin credentials to claim RLS.

**Test effects:** profiles and interests of both dedicated accounts are replaced
with labeled P1 test data and retained for review; test login sessions are logged
out locally. Do not use personal/pilot accounts. No accounts are auto-created and
no emails are printed. Use Auth UI for authorized cleanup; profile DELETE is denied.

```powershell
# From api/, using the existing hash-locked dev environment (dotenv CLI has click).
.venv/Scripts/python -m dotenv -f .env.p1 run -- .venv/Scripts/python -m tools.check_identity
# Optional pytest invocation with exactly the same local configuration:
.venv/Scripts/python -m dotenv -f .env.p1 run -- .venv/Scripts/python -m pytest -q -m integration
```

Without config, the CLI exits 2/BLOCKED and pytest skips the integration test.
Configured but failing checks exit nonzero; no response bodies, tokens or passwords
are printed. Don't enable verbose HTTP logging or pytest --showlocals for live
credential tests. User sessions test auth, retries, handles/case collisions, public
shape, private identity denial, cross-user ownership and anonymous policy behavior.
Record the actual results before marking backend P1 complete. Integrated mobile
login/onboarding/session/redirect checks on Android AND iOS remain a separate joint gate.
# P3 conversation/safety deployment

`20261023213814_conversation_safety.sql` is applied to development project
`mtgsyjqcoyzijicpydee`. Replies/reports RLS, controlled writes, parent validation,
retry fingerprints, tombstones and internal budgets are implemented. No direct
client mutation or publication. Reports are reporter-only and never auto-ban.
See [P3 contracts](../docs/contracts.md) and [setup, review and verification](../docs/p3-verification.md).
Do not reapply migrations already in the hosted ledger or reset shared data.
All local SQL checks run with `npm.cmd test`; live checks use dedicated accounts
with the existing ignored api/.env.p1 configuration. No privileged key is used to
claim RLS success. Native P3 acceptance remains pending on both platforms.
