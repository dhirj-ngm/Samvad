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

## Remaining

1. Two dedicated test identities and random passwords were generated locally in
   ignored `api/.env.p1` at the user's request. They use reserved `example.com`
   addresses without inboxes. The user must provision them with Dashboard
   Auth > Users > Add user > Create new user and Auto Confirm enabled. They are
   not yet created. No Auth rows were fabricated through SQL. This exercises real
   Auth/password grants and RLS after provisioning, but does not validate signup
   email delivery or confirmation. Those checks need a real tester-owned inbox.
2. Fill ignored `api/.env.p1`; enable its dedicated-account write opt-in and run:

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
