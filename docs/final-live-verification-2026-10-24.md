# Final merged P0–P3 verification — 24 October 2026

Completed approximately 03:39 IST against main commit
`78e5825cc9d6e11c69eac0781abb4c67b49df4ef` in `C:\Users\Mathews\Documents\Samvad`.
All checks below passed. This closes the final merged-code live rerun gap;
the earlier merge-preparation skips remain historical evidence only.

## Fresh results

| Check | Result |
| --- | --- |
| Full configured Python suite | 36 passed, zero skipped, 53.89 seconds |
| P1 live two-account identity/onboarding/RLS suite | Passed within the 36 tests |
| P2 live discovery/publishing/retry/privacy suite | Passed within the 36 tests |
| P3 live conversation/private-report/ownership suite | Passed within the 36 tests |
| Actual shared mobile discovery SDK adapter | Passed; feed, Unicode, four concurrent retries, actor mismatch |
| Actual shared mobile conversation SDK adapter | Passed; both accounts, nested Unicode, retries, actor mismatch, held visibility, private reports |
| Local database migration/RLS tests | 63 passed, zero skipped |
| Mobile model tests | 8 passed |
| Mobile TypeScript | Passed |
| Backend Ruff and pip consistency | Passed |
| Git whitespace check | Passed |

The total is 107 automated tests plus two standalone live SDK checks. The three
live Python tests are included in the 36, rather than counted again.

## Environment and test effects

Loaded existing ignored `api/.env.p1`, validated the expected development project
`mtgsyjqcoyzijicpydee`, public client key, two distinct dedicated accounts and
explicit write opt-in before running. No privileged credentials were used for
authorization assertions. No migration, Auth configuration or moderation approval
was changed. No credentials or private response bodies were printed.

The identity harness replaces both dedicated accounts' profile/interest test data.
Publishing/conversation harnesses create temporary pending test content and run
owner cleanup. The conversation SDK check exited successfully after its asserted
owner cleanup. Benign verification reports may remain as designed; repeat reports
on an existing target reuse its record. Test sessions use local sign-out, rather
than global sign-out of other sessions. No personal-account cleanup was performed.

## What remains for users

No outstanding automated live rerun remains for P0–P3 on this commit.
Android/iOS acceptance remains based on earlier user confirmations. This run did
not operate phones, retest confirmation email delivery, rebuild native bundles,
or rerun security advisors/dependency audit. Existing documented warnings remain:
Starlette/httpx deprecation, Node module-type warnings, Expo dependency audit debt
and the hosted leaked-password-protection setting warning.

Optional final phone regression: launch this checkout's mobile app with SDK 58,
check sign-in and restart/session restoration, browse/compose, submit a reply,
verify pending author-only visibility, check private reporting and sign out on
both Android and iOS. New content remains pending until individually reviewed;
cross-account visibility before review is not expected. Do not use missing public
visibility as a reason to bulk-approve content.

## Commands used

```powershell
cd api
.venv/Scripts/python -m dotenv -f .env.p1 run -- .venv/Scripts/python -m pytest -q -rs --tb=short
.venv/Scripts/python -m dotenv -f .env.p1 run -- node --experimental-strip-types ../mobile/tests/discovery-client.live.mjs
.venv/Scripts/python -m dotenv -f .env.p1 run -- node --experimental-strip-types ../mobile/tests/conversation-client.live.mjs
.venv/Scripts/python -m ruff check app tools tests
.venv/Scripts/python -m pip check
cd ../supabase
npm.cmd test
cd ../mobile
npm.cmd test
npm.cmd run typecheck
```
