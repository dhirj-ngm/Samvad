# P3 conversation and safety handoff

Both A/mobile and B/backend implemented together at the user's request, starting
from merged P2 `a4a7623`. User confirmed Android/iOS complete through P2 on
24 October 2026. **P3 joint gate PASS by user acceptance**: the user confirmed P3
testing is complete and it works, then requested integration of all phases into
main. This closeout supplements the recorded automated/live evidence below; no
new per-device logs or runtime versions were supplied. Earlier pending statuses
in the historical handoff are superseded. No P4 work or AI inference is included.

## Deployed backend and actual evidence

- Development project: `mtgsyjqcoyzijicpydee`. Non-destructive migration
  `20261023213814_conversation_safety.sql` applied once via connected Supabase MCP.
  CLI created the file first; filename aligned with hosted ledger afterward without
  rewriting SQL. Prior migrations/data preserved; no database reset.
- Reply parent references enforce same conversation. RPCs derive actor, enforce
  original Unicode/language/length, private pending review, exact retry fingerprints,
  owner body removal and bounded keyset reads. Clients cannot self-publish or choose
  author/time/fixture. Deleted roots hide their complete thread.
- Reports are private to reporter and trusted operators. First report per target
  wins, preventing repeated votes. Reports never automatically ban/remove content.
  No email/verification fields are joined into public reply authors.
- Database account budgets: posts 5/min, replies 10/min, reports 5/min and 30/hour.
  Exact retries bypass quota. Limits are fixed windows, not a public-launch abuse
  system. Internal counters have no client grants or policies; old counters expire
  on subsequent writes by that account. No account deletion/retention workflow added.
- Local SQL **63 passed** against actual migrations with PGlite PostgreSQL/WASM,
  minimal Auth shim and ordinary anon/authenticated roles for assertions. Tests cover
  held roots/replies, parents, tombstones, 2000 emoji, conflicts, private reporting,
  direct privilege denial, keyset order, post/reply/report minute limits and report hourly cap. These
  isolated role tests do not prove hosted Auth or true concurrent transactions.
- Configured Python **36 passed, zero skips**, including hosted P1/P2/P3 tests using
  the two dedicated accounts and only public/user credentials. Eight concurrent HTTP
  reply retries return one ID; changed retry 409; B/anon held-content denial, parent
  rejection, no self-publication/forged author/cross-delete, reviewed ML/HI two-user
  thread, reporter-only record, no automatic content action, pagination and deletion
  pass. Temporary verification reply text removed by its owner.
- Actual shared mobile Supabase SDK adapter passed two-account Unicode/nested reply,
  four-concurrent-retry, account-mismatch rejection, held visibility and report
  privacy checks. Both SDK verification replies removed through their owners.
- Mobile TypeScript, **8 model tests**, Expo dependency check and both Android/iOS
  exports pass. Ruff/pip check pass. No new runtime dependency added.
- Existing non-failing warnings: Starlette/httpx deprecation, Node module-type warning,
  Expo color environment warning. P2's five Expo CLI dependency audit findings remain
  P5 debt; no forced SDK downgrade or billing upgrade performed.
- Hosted security advisor: intentional deny-all INFO on private identities and
  internal budgets; existing leaked-password-protection-disabled WARN. Performance:
  unused-index INFO only. No new security WARN/ERROR from P3.

## Two labeled fixtures and trusted review

Technology/Chandrayaan source discussion includes:

1. Malayalam demo reply A `5172a1cb-ef3f-4b7e-8148-e9139c1ddb14` asks what people
   liked about the mission.
2. Hindi demo reply B `b6ec4986-28a5-435e-8be9-4bf3ed837c0d` replies to A about
   the successful Moon landing.

Both were submitted through ordinary dedicated-account credentials, read by the
operator, individually approved by exact ID/body and marked is_fixture=true. These
are demo content, not claimed organic engagement or machine moderation. A retained
development report on A's fixture explicitly says verification only/no misconduct.
The reported author cannot read its details. Do not delete personal/pilot data.

For new device submissions, **pending is expected**. A trusted operator must read
each exact submitted ID/body and approve it in Dashboard SQL/MCP before cross-user
visibility. Do not bulk-approve pending content or give mobile privileged credentials.
Operator example, after review:

```sql
-- Substitute the individually reviewed ID and preserve the author's actual text.
select id,body,language,moderation_state from public.replies where id='<reviewed UUID>';
update public.replies set moderation_state='allowed'
where id='<reviewed UUID>' and moderation_state='pending';
```

Review report records through trusted Dashboard/SQL only. No admin UI, appeals or
staffing promise. Changing report status is a separate operator action and does
not itself change content visibility. Full RPC shapes are in [contracts](contracts.md).

## Test next on Android AND iPhone

Use the current checkout's `mobile/` with SDK 58-compatible Expo Go; reload the
running preview after switching phases. Use two separate real accounts, ideally
Android A and iPhone B. Repeat platform-specific compose/recovery steps on each.

1. Open Home → Chandrayaan technology source → conversation. Confirm source link,
   archive context, the two labeled ML/HI demo replies, public handles, dates and
   B's "Reply to @handle" context. Also open an original-post conversation.
2. A submits a new Malayalam/emoji reply. It appears once with pending/author-only
   status and survives refresh/reopening. B refreshes and cannot see it yet.
3. Trusted operator reviews that exact reply. B refreshes and sees original Unicode;
   B taps Reply on A's reply and submits a Hindi/English child. Review that exact
   child, then A refreshes and sees B's reply associated with the right parent.
4. Turn connectivity off while submitting; type stays saved. Leave/reopen/relaunch,
   restore network and retry the locked submission. Double-tap retry: one record,
   no duplicate. Switching reply target preserves the other target's draft. Repeat
   draft restoration with a private report, including its selected reason/details.
5. B reports A's reply using a reason and benign test details. Confirm a saved
   reference; repeat for the same target and confirm it returns the existing report.
   Operator checks persistence; A must not see reporter identity or details, and
   the reported reply remains visible until an explicit review action changes it.
   Also exercise root post/source and author report controls.
6. A removes their own reply; its text clears and B's child retains parent context.
   Refresh B. B cannot remove A's reply. A deleted/held root hides the entire thread.
7. Logout/switch accounts while a draft/save is pending: no other-account draft or
   private held text appears; signed-out users can browse allowed replies but cannot
   submit replies/reports. Return to the original account to recover its draft.
8. On both devices check keyboard clearance, scrolling to reply/report controls,
   safe areas, Hindi/Malayalam shaping, emoji counts, readable error/retry states,
   refresh and navigation. Translation is explicitly unavailable until P4.

Record device/OS, result/failure and tested SHA in the integration checklist.
Only after these pass should P3 be merged to main and its joint gate accepted.

## Reproduce checks and migration setup

No new MCP needed: connected Supabase MCP handles migration/advisors/trusted review.
Git CLI handles branches. Native behavior requires physical Expo Go devices; a
browser MCP cannot replace Android/iPhone verification.

For a fresh local Supabase development database, apply all migrations in sorted
order using the supported CLI workflow (see supabase/README). For the existing
agreed project, check its ledger and do not reapply or reset. The PGlite suite runs
clean migration installs without cloud credentials or Docker.

```powershell
cd supabase
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd test
cd ../api
# Uses existing ignored .env.p1 dedicated test credentials + write opt-in.
.venv/Scripts/python -m dotenv -f .env.p1 run -- .venv/Scripts/python -m pytest -q
.venv/Scripts/python -m ruff check app tools tests
.venv/Scripts/python -m pip check
.venv/Scripts/python -m dotenv -f .env.p1 run -- node --experimental-strip-types ../mobile/tests/conversation-client.live.mjs
cd ../mobile
npm.cmd run typecheck
npm.cmd test
npx.cmd expo install --check
npx.cmd expo export --platform android --platform ios
```

Missing dedicated credentials cause live pytest checks to skip, not pass. The
standalone check fails with a safe configuration message. Never print passwords,
tokens, private report details or enable verbose HTTP/pytest locals logging.
On another development project, `tools.check_conversation --prepare-fixtures`
creates only A pending first; review/label it, rerun to create B child, review/label
B, then run ordinary checks. Never use fixtures to claim live AI behavior.
