# P1 live verification — 24 October 2026

Project: `mtgsyjqcoyzijicpydee` (development). P1 remains BLOCKED until the
real-account and Android/iOS checks below pass.

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

## Remaining

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
   email delivery and redirect behavior still need observation.
4. Record exact account-test results and each device outcome before marking P1
   PASS. Prior P0 navigation and bundle checks do not prove live P1 behavior.
