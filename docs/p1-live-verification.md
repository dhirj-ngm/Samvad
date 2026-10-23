# P1 live verification — 24 October 2026

Project: `mtgsyjqcoyzijicpydee` (development). **P1 PASS**: automated backend/live
account checks passed and the user confirmed completion of the remaining testing.

## User acceptance closeout

On 24 October 2026, after being asked to complete the remaining Android/iPhone,
session/profile persistence, logout and signup confirmation checks, the user
reported: "ok everything is working now the testing verfication is done."
Record the joint P1 gate as PASS based on that user acceptance plus the automated
evidence below. No new device versions, per-step results, firewall-change details
or runtime logs were supplied; do not describe the device checks as agent-observed.
The earlier phone/network blocker below is historical and superseded by this
confirmation. Developers A and B can proceed to the planned P2 handoff.

## Latest combined recheck

Fetched GitHub and confirmed both `origin/dev/mobile` (`0de54e0`) and
`origin/dev/backend` (`d107843`) are ancestors of integrated main (`1dc10a3`
at verification). No developer branch work is missing from that integration.

- Full backend suite with dedicated live configuration: **34 passed**, no skips.
  One preexisting Starlette/httpx dependency deprecation warning is non-failing.
- Local SQL migration suite: **22 passed**, 0 failed.
- Configured mobile TypeScript and Android/iOS exports: **PASS**.
- Actual temporary Uvicorn HTTP `/health`: **200**, status `ok`, settings `valid`,
  Supabase `not_checked`, AI `disabled_p0`. The health route deliberately does not
  test Supabase; the live account suite independently verifies Auth/PostgREST.
- Android Expo Go showed its generic load-failure screen; the user reported that
  the phone browser could not reach the preview's LAN `/status` address. The host
  successfully fetched that status, SDK 58 manifest, and Android bundle (HTTP 200).
- Windows Firewall has enabled explicit inbound Node.js TCP/UDP block rules for
  Public networks, and current Wi-Fi `Conference` is classified Public. This is a
  confirmed host firewall obstacle; Wi-Fi client isolation has not been ruled out.
  This process is not elevated. No firewall rules were changed.

At the time of this recheck, phone acceptance was blocked. The later user
acceptance closeout above supersedes that status.

## Completed

- Supabase MCP access verified; initial public schema, migration ledger and Auth
  user count were empty. No existing app data was overwritten.
- Reviewed identity migration applied successfully using MCP `apply_migration`.
  Hosted version is `20261023201908`, name `identity_interests`. The repository
  SQL file was renamed to match that version; SQL content is unchanged.
- All four P1 tables have RLS enabled. Seven intended policies are installed.
  Authenticated clients cannot SELECT `private_identities`; anonymous clients
  cannot execute the privileged identity-sync trigger function.
- Public HTTP REST request returned the six expected interests. Anonymous HTTP
  request to `private_identities` returned 401.
- Public Auth settings: signup allowed, email provider enabled, email confirmation
  required, anonymous/phone/other external providers disabled.
- Security advisor: informational no-policy notice on `private_identities` is
  intentional denial of all client access. Performance advisor: the new interest
  FK index is unused before account traffic; retain it for FK operations.
  Advisor references: [no-policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
  [unused index](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
- Local `mobile/.env`, `api/.env`, and `api/.env.p1` are ignored by Git. Mobile has
  only public client configuration; test credentials are not in source control.
- Local migration tests after ledger filename alignment: 22 passed, 0 failed.
- Backend checks with configured project origin: 33 passed, 1 live test skipped;
  Ruff passed. Mobile TypeScript and Expo dependency compatibility passed with
  the public configuration loaded.
- The user provisioned both dedicated test users through Dashboard Auth and also
  added a personal test account. The live harness used only the dedicated A/B
  credentials. It did not read or modify the personal account's profile/interests.
- Live `tools.check_identity`: all eight result groups PASS. Both users obtained
  real password-grant sessions and passed Auth `/user` validation; onboarding and
  retry-safe writes persisted through PostgREST; duplicate/case-variant handles
  were rejected; anon/A/B private-identity reads were denied; public profiles
  exposed only intended fields; cross-user profile/interest writes and private
  interest reads were denied or affected zero rows; anonymous writes were denied.
- Live pytest integration marker: 1 passed, 33 deselected (no live-test skip).
  One preexisting Starlette/httpx deprecation warning was non-failing.
- Additional ordinary-user HTTP session checks passed for both dedicated accounts:
  password login, refresh-token grant, server validation of the refreshed session,
  local logout, and refusal to refresh after that logout. This verifies backend
  refresh revocation, not immediate expiry of already-issued access tokens or
  mobile session persistence across app restarts.
- A fresh Metro preview serves the configured P1 checkout on port 8083. The older
  port 8081 serves a separate P0 checkout and is not the P1 test preview. Host-side
  LAN manifest verified the correct project root and Android bundle URL. Phone
  reachability is unobserved; LAN addresses may change with the network.

## Verification procedure and repeat checks

The user has confirmed remaining verification complete. Retain this procedure
for regression testing; device/email acceptance is user-reported.

1. Verify real signup email delivery/confirmation using a tester-owned inbox.
   The dedicated `example.com` users are admin-confirmed test accounts without
   inboxes; successful password grants do not establish signup email delivery.
2. To repeat the already-passing live checks, run only with the dedicated test
   accounts configured in ignored `api/.env.p1`:

   ```powershell
   cd api
   .venv/Scripts/python -m dotenv -f .env.p1 run -- .venv/Scripts/python -m tools.check_identity
   .venv/Scripts/python -m dotenv -f .env.p1 run -- .venv/Scripts/python -m pytest -q -m integration
   ```

   This replaces only the selected test accounts' profile/interests. It tests real
   password grants and PostgREST with ordinary user tokens, handle uniqueness,
   retries, public field shape, and cross-account private read/write denial.
3. Restart Expo from `C:\Users\Mathews\Documents\Samvad\mobile` to load `.env`.
   On Android and iOS separately: create/confirm an account, sign in, choose a
   handle/language/interests, retry an interrupted save, reject a taken handle,
   edit selections, restart the app and check session/profile persistence, and
   sign out. Confirmation currently uses the manual return-and-sign-in flow;
   email delivery and redirect behavior require observation when repeating tests.
4. Record exact account-test results and each device outcome on future regression
   runs. Prior P0 navigation and bundle checks do not prove live P1 behavior.
