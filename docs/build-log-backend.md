# Developer B build log

## 2026-10-24 — P2 discovery/publishing, combined A/B ownership

User authorized both workstreams and phase integration. Inspected main 7e6d25d,
contracts/specs and live P1 evidence. P0/P1 already integrated and accepted. Created
integrate/p2, preserving unrelated untracked .agents/ and skills-lock.json. Loaded
Supabase/Postgres skills before SQL work. No sub-agents were delegated.

**Implemented:** deployed CLI-generated, ledger-aligned migrations
20261023210206_discovery_posts and 20261023210636_consolidate_post_read_policy.
News/posts/conversation roots; indexed interest/recency discovery; public/owner
visibility; private request fingerprints; retry-safe submit with conflict detection;
owner soft delete/body removal; fixed-search-path internal definer helpers and
public invoker wrappers. Actor derives from auth.uid(); clients cannot choose
author/status/time/fixture flags. Pending content stays private until trusted review.
No replies, reports, translation, AI inference or paid service added.

Six real sourced historical items were checked against official ISRO/RBI/ICC/PIB/
UNESCO pages and seeded with visible dates and short editorial descriptions. Three
dedicated-account demo posts in en/ml/hi were created pending, individually reviewed
as benign questions, labeled is_fixture and approved using operator MCP. No personal
account content was read or changed.

**Tested:** SQL suite **41 passed**; configured Python suite **35 passed**, no skips,
including live P1/P2 account tests; Ruff and pip check passed. Actual shared mobile
SDK smoke check passed against Supabase. P2 HTTP checks passed: eight concurrent
retries share one ID/root; changed retry 409; Unicode persistence; pending author-only
visibility; no self-publication/forged owner/anonymous write/cross-owner deletion;
keyset/topic correctness; soft delete clears text and replay cannot resurrect it.
Temporary verification posts were removed through their ordinary owner sessions.
Privilege was used for migration/review only, not to claim ordinary-user RLS passes.

P1 migration 20261023201908 was not reapplied. Both new migrations applied to the
agreed development project mtgsyjqcoyzijicpydee. No reset or destructive migration.
Hosted policy advisor warning was fixed in a separate migration; performance now
has only unused-index INFO. Security advisor retains intentional private identity
no-policy INFO and existing leaked-password-protection setting WARN. See
docs/p2-verification.md for full evidence and source provenance.

**Blocked / next:** new P2 Android/iPhone interaction checks remain pending; P0/P1
acceptance is not reused as a P2 pass. Verify sources/topics/refresh, Indic compose,
offline/double-tap/relaunch retry, private pending, trusted review then cross-account
public visibility, and owner removal. Supabase MCP is connected; no new MCP needed.
Native acceptance needs Expo Go/devices. Stop after P2. Code integration at the
user's request does not sign off the joint device gate. Exact commit/push SHAs are
reported in the final handoff; staged secrets/ownership/whitespace are reviewed.

## 2026-10-24 — Live dedicated-account acceptance

User created both generated dedicated accounts in Dashboard Auth and reported an
additional personal test account. The harness used only dedicated credentials in
ignored `api/.env.p1`; personal profile/interests were not read or changed.
`tools.check_identity` passed all eight result groups against real Supabase Auth
and PostgREST: password login/server validation, onboarding/retry persistence,
duplicate and case-variant handle rejection, intended public fields, private
identity denial, cross-owner profile/interest read/write denial, and anonymous
write denial. Live pytest integration selection: **1 passed, 33 deselected**.
Additional HTTP checks for both users passed session refresh, server validation,
local logout and rejection of refresh after logout. Dedicated accounts were
admin-confirmed; signup email delivery/confirmation was not verified by these tests.

Fresh configured P1 Metro preview is running from Documents/Samvad/mobile on 8083;
8081 belongs to an older P0 checkout. Host-side LAN manifest passed. Android/iOS
P1 UI/session restoration/logout and real signup confirmation are still pending.

## 2026-10-24 — Hosted P1 identity deployment

User authorized completing P1 in development project `mtgsyjqcoyzijicpydee`.
After OAuth access was corrected, verified an empty public schema/migration ledger
and zero existing Auth users. Applied the reviewed identity migration through
Supabase MCP; hosted version `20261023201908`, name `identity_interests`.
Renamed the repository migration to match the hosted ledger and updated references
and local SQL tests; SQL content is unchanged. Do not reapply the previous filename.

Verified four tables with RLS, seven policies, six seeded interests, denied private
table SELECT and trigger-function EXECUTE privileges. Real public REST reads
returned all topics and private reads returned HTTP 401. Hosted public Auth settings
require email confirmation and enable email/password while disabling anonymous
and other external providers. Advisors report only intentional private-table
no-policy and an unused new FK index. Local env files are Git-ignored; no privileged
key is in mobile. Local SQL tests: 22 passed; backend: 33 passed, 1 live test skipped;
Ruff, mobile TypeScript and Expo dependency checks passed.

Two local test credentials generated at the user's request await Dashboard Auth
provisioning. Live password-grant/cross-account checks, signup email delivery and
Android/iOS acceptance remain pending. See [live evidence](p1-live-verification.md).
The earlier log below describes initial implementation and its earlier blockers.

## 2026-10-23 — P1 Identity & onboarding

**Integration audit:** workspace started clean on local main b59e4e5. Fetched the
configured origin (`https://github.com/dhirj-ngm/Samvad.git`); origin/main dbc2d22
contains both P0 workstreams. Shared docs/contracts.md and docs/decisions.md record
captain acceptance of B's schema/API baseline. Joint P0 device gate remains blocked
in docs/integration-checklist.md, which is distinct from code/contract integration.
Created dev/backend from the existing local history and fast-forwarded it to
origin/main dbc2d22. No discards, rebases, force pushes or edits to main/mobile/shared
files. A final fetch confirmed origin/main unchanged. Remote dev/mobile subsequently
recorded additional blocked P0 device evidence; it was inspected read-only.

**Implemented (local P1):**
- supabase/migrations/202610230001_identity_interests.sql: transactional additive
  identity migration. Public profiles have Auth-owned UUID PKs, CITEXT unique
  lowercase handles, reserved-name/length/language constraints, immutable IDs and
  server timestamps. RLS + column grants restrict creation/edits to the owner.
- Private identities are mirrored/backfilled only from Auth-owned email and
  email_confirmed_at. No ordinary client can read/write them, including the owner.
  Restricted trigger execution, fixed search_path; user metadata cannot forge email
  verification. No custom credential store, signup-generated handles or legal-ID claim.
- Six stable UUID interests seeded in the migration; public taxonomy read, no client
  writes. Owner-only user_interests read/insert/delete; composite PK prevents retry
  duplicates. Profile upsert uses user_id; creation timestamp survives retry.
- supabase/config.toml: local email/password Auth configuration, email confirmation,
  refresh rotation, no anonymous/SMS signup. Exact device redirects remain unset.
  Local config does not apply hosted project settings.
- supabase/tests/identity.test.mjs and locked PGlite dev dependency: execute actual
  SQL in isolated PostgreSQL/WASM. Auth catalog/uid are explicit test shims; ordinary
  SET ROLE anon/authenticated for authorization assertions. Owner privilege is used
  only for fixture setup/cleanup and Auth-trigger/migration inspection, never to
  claim user authorization. These are not real Supabase account tests.
- api/tools/check_identity.py: opt-in real-account Auth/password-grant + PostgREST
  verifier using public client key and ordinary access tokens only. Rejects privileged
  keys; logs no passwords/tokens/response bodies. Dedicated-account mutations require
  explicit opt-in; test data is retained and harness sessions logged out locally.
  api/docs/p1-test.env.example documents ignored local test configuration.
- api/tests/test_identity_harness.py and test_identity_live.py: verifier guards and
  actual external acceptance path; external test skips without credentials.
- supabase/README.md: migration/recovery, hosted/local Auth settings, two-account
  verification, Android/iOS handoff and retry-safe onboarding operations. No new
  public view/RPC, schema column or app/server env contract. Updated owned P0 docs
  to reflect accepted baseline/P1 status. Later-phase entities remain proposals.

**Tested:**
- `cd supabase; npm.cmd ci --ignore-scripts --no-audit --no-fund`: passed, one
  pinned dev dependency installed from package-lock.json (Node v24.16.0).
- `npm.cmd test`: **22 passed / 0 failed**. Clean migration execution; two ordinary
  owner roles; Unicode; case-variant duplicate handle rejection; reserved/invalid
  handles and unsupported language rejection; retry-safe profile and interest
  writes; created_at preserved across separate transactions; immutable ownership;
  cross-user updates/inserts blocked or affect zero rows; private identity reads/
  writes/function access denied; public shape only; anon policy behavior; Auth-owned
  backfill/verification changes/email removal; deletion cascades; duplicate migration
  attempt rolls back without overwriting existing data. No network Auth/JWT or
  multi-connection concurrency claim is made by these local tests.
- `cd api; .venv/Scripts/python -m pytest -q`: **33 passed / 1 skipped**, one
  preexisting Starlette httpx TestClient deprecation warning. Skip is the required
  two-real-development-account test, not a passing RLS claim.
- `.venv/Scripts/python -m ruff check app tools tests`: all checks passed.
- `.venv/Scripts/python -m pip check`: no broken requirements found; no Python
  dependency changes required.
- `.venv/Scripts/python -m tools.check_identity`: exit **2 / BLOCKED**, missing
  development project/public client key and two account credentials; no live requests.
- Python tomllib parsed supabase/config.toml and verified email confirmations enabled,
  anonymous Auth disabled. dotenv CLI is available from existing locked environment.
- Git diff whitespace review passed; owned changes only, runtime env/test secrets,
  node_modules and Python caches are ignored. Public/secret-key credential-pattern
  review of staged content records no real credentials.

Checks corrected during work: PowerShell blocked npm.ps1; used npm.cmd without
changing execution policy. A read command used an incorrect package-lock path from
api/; reread the correct root-relative file. No implementation test failures occurred.
Official Supabase Auth/data/RLS/config/CLI documentation was consulted; links are
in supabase/README.md. No AI inference or provider changes made.

**Migration status:** implemented and executed in local in-memory SQL checks only.
No full local Supabase stack or hosted development migration applied. Existing
tables are never silently adopted/overwritten; preflight checks require unused
identity table/trigger names and citext absent or installed in extensions. Actual
apply requires reviewed SQL, agreed development project and B's secure project access.

**Blocked / gate status:** no Supabase URL/client key/account credentials in the
workspace environment or api/.env; Supabase CLI, Docker and psql unavailable. No
agreed development project reference/access, email delivery, Auth redirect setup or
two real confirmed accounts were supplied. Required real-account auth/onboarding,
PostgREST/public field/RLS checks are NOT RUN. Local SQL passing is not backend P1
external acceptance. Android/iOS integrated onboarding/session/redirect verification
is NOT RUN. Backend external acceptance and joint P1 gate remain BLOCKED.

**Next / Developer A handoff:** see supabase/README.md. Captain reviews this branch;
B applies the reviewed migration only to the agreed development project, then runs
the opt-in real-user harness and logs actual evidence. A uses the same Supabase
project on both platforms: signUp/confirm/signInWithPassword/session restore;
profile upsert by session user_id; add missing/remove deselected interest pairs and
reread before reporting saved. Each operation is retry-safe; no cross-table atomic
save is claimed. Agree exact platform callback URLs and record Android/iOS outcomes.
Do not start P2/P4. P1 local work is ready for review; external gates are not passed.

**Git:** only owned paths are staged/committed on dev/backend. Commit SHA and push
result are reported in the task handoff (a commit cannot contain its own SHA).
No push to main or changes to captain/mobile files.

## 2026-10-23 — P0 Bootstrap & contracts

Scope: backend P0 only, Android and iOS share backend. Read all three root planning
documents, including full Developer B prompt. No AGENTS.md or docs/contracts.md
found. Initial workspace had only the three root documents; no existing code.
Git status/remotes both returned `fatal: not a git repository`. Preserved documents
in place; did not initialize Git, invent a remote or edit captain/mobile files.

Tool audit: Windows PowerShell; Python 3.13.5/pip 25.1.1, Git 2.50.1.windows.1,
Node v24.16.0. Supabase CLI, Docker and uv not found. Local isolated api/.venv
created; no cloud credentials or private account records collected.

Implemented:
- api/app/main.py: FastAPI app factory, typed GET /health, explicit CORS origins.
  Liveness only: cloud unconfigured/unchecked; inference disabled_p0.
- api/app/config.py and api/.env.example: validated HTTPS/JWKS project settings,
  Groq-only skeleton config, per-task IDs, mandatory free-only/no-paid flags,
  conservative bounded quotas/timeouts, DEMO_MODE=false. No live calls.
- api/app/services/ai_provider.py: typed provider boundary and fail-closed Groq
  skeleton; never returns fake inference success.
- api/requirements*.in and hash locks; api/.gitignore; api/pyproject.toml;
  api/tests/test_bootstrap.py; api/README.md local setup and check instructions.
- api/docs/contracts-proposal.md: exact API/auth/data/env proposals, verified JWT
  plan, future provenance/errors, request idempotency and pending publication.
- api/docs/connectivity-checklist.md: separate Android/iOS HTTPS and future auth
  redirect/session checklist for Developer A, no fabricated device pass.
- supabase/schema-proposal.md, supabase/seed-format.md,
  supabase/migrations/README.md: complete table/constraint/RLS design and ordered
  later migration/test plan. No executable/applied schema or real news seeds yet.

Tested (commands from api unless stated):
- `.venv/Scripts/python -m pytest -q`: 28 passed, 1 dependency deprecation warning
  (Starlette's httpx TestClient support; upstream recommends httpx2). Tests cover
  absent credentials, configured-not-ready, no secret echo, prohibited paid config,
  limits, JWT URL mismatch, env parsing/template, CORS and provider fail-closed.
- `.venv/Scripts/python -m ruff check app tests`: all checks passed.
- `.venv/Scripts/python -m pip check`: no broken requirements found.
- Uvicorn factory started at 127.0.0.1:8765; PowerShell
  `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/health`: HTTP 200,
  `{"status":"ok","service":"samvad-api","phase":"P0","checks":{"settings":"valid","supabase":"not_configured","ai":"disabled_p0"}}`.
  `/openapi.json` listed only `/health`. Temporary server stopped after check.
- Runtime lock generation succeeded; pip `--require-hashes --dry-run
  --ignore-installed -r requirements.lock` succeeded for all 17 runtime packages.
- Dev lock generated with `--allow-unsafe` to also pin/hash pip and setuptools
  (required by pip-tools). `pip install --require-hashes --force-reinstall
  -r requirements-dev.lock` succeeded for all 32 packages, including isolated
  venv pip 26.2.2. Post-install pytest/Ruff/pip-check results remained passing.
- Fallback whitespace/conflict-marker scan checked all 20 owned deliverable files:
  zero issues. Git diff check remained unavailable without repository metadata.
- Targeted credential-pattern scan over owned source/config/docs excluding local
  venv/caches: no matches. No .env was created. This is a scoped check, not a
  comprehensive public-launch security audit.

Corrections during checks: template exposed Literal[bool] dotenv parsing issue;
changed to parsed booleans with mandatory free-only/no-paid validator, reran all
tests successfully. Ruff import formatting fixed. An initial dev-lock compile
started before runtime lock existed and failed; rerun after runtime lock finished.
PowerShell Invoke-WebRequest without UseBasicParsing failed locally; corrected
command returned actual HTTP 200. These failures were not recorded as passes.

Provider verification: official Groq model and Free plan limit pages rechecked
2026-10-23, list qwen/qwen3.8-27b and 30 RPM / 1000 RPD / 8000 TPM / 200000 TPD.
Actual account/free-route access is UNVERIFIED; no inference requested. Supabase
JWT docs rechecked for asymmetric JWKS and legacy Auth-server validation.
Sources and required pre-live checks are recorded in contracts-proposal.md.

Blocked:
- Git repository/remote/captain bootstrap missing: no branch, commit SHA or push.
  `git diff --check` cannot run without a repository; no staged changes exist.
- Shared contracts and configuration require captain/A agreement. Private identity
  proposal denies all client table reads, following stricter Product Scope §7;
  DPR's owner read suggestion is recorded as a reconciliation for review.
- Supabase project/keys, asymmetric signing setup and database tooling absent;
  DB connectivity, migration execution and two-user RLS tests NOT RUN (later phase).
- Android/iOS app/device launches, HTTPS device connectivity and redirect evidence
  NOT RUN; both platforms BLOCKED, not PASS.
- Groq account free-plan/model access, data settings and language evaluation absent;
  live inference and quality NOT RUN. Quota enforcement is configuration/design,
  not implemented in P0. No paid or fixture fallback enabled.

Next (handoff only; do not start P1 in this task): captain initializes main/remote
and separate dev/backend checkout, reviews/adopts contract proposal and root ignore
rules, Developer A records each device's launch/connectivity, then agree P0 gate.
Supply development Supabase URL/signing config for P1 after explicit instruction.
Before eventual live AI, verify actual Groq Free plan/model visibility with no
billing upgrades and complete EN/HI/ML evaluation. Joint P0 gate remains BLOCKED.
