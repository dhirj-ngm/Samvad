# P2 discovery and publishing — verification and handoff

24 October 2026. Both workstreams implemented together at the user's request.
P0/P1 are already integrated and accepted; their evidence remains in the logs.
P2 backend/SDK checks pass. Actual P2 Android/iOS interaction checks are pending.

## Deployed development backend

Project: `mtgsyjqcoyzijicpydee`; same HTTPS Supabase project on both platforms.
Migrations, matched to the hosted ledger:

- `20261023201908_identity_interests`: existing P1, not reapplied.
- `20261023210206_discovery_posts`: source metadata, posts, conversation roots,
  RLS/grants, retry-safe submit, owner removal and invoker discovery feed.
- `20261023210636_consolidate_post_read_policy`: same visibility, one SELECT
  policy per role to address the advisor's duplicate-policy evaluation warning.

No destructive reset, personal-account mutations or paid services were used.
Only the existing dedicated A/B credentials in ignored api/.env.p1 were used for
Auth/PostgREST/SDK authorization tests. Privileged MCP access applied reviewed
migrations, ran advisors and reviewed exactly three known benign demo fixture
posts. It was not used to claim ordinary-user authorization passes.

New submissions stay pending and author-only. There is no automatic moderation
in P2. Do not treat pending persistence as public publication or auto-approve all
content to make a demo pass. Profile → My submissions shows saved state honestly.

## Actual automated evidence

- Local PostgreSQL/WASM migration/RLS suite: **41 passed**, including P1 regression.
- Full configured Python suite: **35 passed**, no skips, including real P1 and P2
  account tests. One existing Starlette/httpx TestClient deprecation warning.
- Mobile TypeScript: passed. Pure mobile model tests: **5 passed** (Unicode limits,
  draft recovery, exact cursor precision and duplicate page removal).
- Actual shared mobile SDK adapter against Supabase: passed. Loads mixed feed,
  round-trips original Indic/emoji text, deduplicates four simultaneous retries,
  and rejects a changed-account submission. Ephemeral verification post removed
  by its own ordinary account; no personal posts touched.
- Real backend P2 checks passed six groups: cold-start source/post feed; eight
  concurrent retries return one post/root; changed retry gives 409; held text is
  author-only and absent from public discovery; no self-publication/forged author/
  anonymous write/cross-user delete; keyset pages and topic filter; owner deletion
  clears text and preserves idempotency on replay.
- Both Android and iOS native bundles exported successfully. Exports and the Node
  SDK smoke check do not establish actual native screen/keyboard/device behavior.
- Ruff and pip consistency checks passed. Fresh mobile npm ci and Expo dependency
  compatibility checks passed. Source/config/secrets and Git whitespace reviewed.
- Post-deployment security advisor: intentional private_identities no-policy INFO
  (all client access denied), plus existing leaked-password-protection setting WARN.
  No new P2 security warning. Performance advisor after policy consolidation:
  only unused-index INFO on new/low-traffic indexes. No indexes removed just to
  hide notices.
- npm audit reports five existing high advisories in the Expo CLI dependency tree
  (node-forge/zod and dependants). No force downgrade of the working SDK was made.
  Review supported upstream fixes during P5; this is not a clean audit claim.

## Content provenance

`supabase/seeds/news-archive.json` contains six reviewed real publisher/source links
across sports, business, technology, infrastructure, politics and culture. The
archive intentionally spans 2020–2024 and is labeled historical in the UI. Dates
are day-precision UTC placeholders for source dates; the undated ISRO mission
archive uses its landing event date. No current-news or exact publication-time
claim is made. Descriptions are short editorial paraphrases; no full article body,
paywall scraping or generated summary is stored. Sources were checked against
their official pages/search results on 24 October 2026. Device browser opening of
all six links remains a manual check; publisher availability can change.

Three public original posts are explicitly marked is_fixture=true and labeled
Demo fixture in feed/profile. They ask benign questions about transport, public
facilities and useful technology, in en/ml/hi. They were submitted as pending via
ordinary account tokens, inspected individually, then approved through trusted
operator access. They are not presented as real public engagement.

## What to verify next — run separately on Android AND iPhone

Use the merged checkout's mobile directory and SDK 58-compatible Expo Go. Restart
Metro from that checkout, not an older P0/P1 worktree. `npm ci`, then
`npx expo start --clear`; use a reachable existing LAN/tunnel path. P2 data calls
go directly to the shared HTTPS Supabase backend; FastAPI remains health-only.

| Step | Android | iOS |
|---|---|---|
| Sign in on separate accounts; Home shows six dated source items and labeled public fixture posts | Pending | Pending |
| Pull to refresh; Explore topics change news while keeping original posts | Pending | Pending |
| Open every Read publisher link in the platform browser; return to app | Pending | Pending |
| Compose Hindi/Malayalam/emoji; counter follows Unicode code points; reject empty/over-2000 input | Pending | Pending |
| Double tap Submit; one pending post appears in Profile → My submissions after refresh/relaunch | Pending | Pending |
| Interrupt networking during save; draft survives restart and retries the same submission once | Pending | Pending |
| Other account cannot see that pending post, by feed or guessed context ID | Pending | Pending |
| After trusted review, both accounts refresh and see exactly one public original with unchanged text | Pending | Pending |
| Owner removes that post; other account cannot remove it; removed body disappears after refresh | Pending | Pending |
| Sign out/switch accounts; drafts/submissions never appear under another account; keyboard/safe areas work | Pending | Pending |

Record model, OS, Expo Go version, account aliases A/B, exact outcomes and errors
without passwords/tokens. P2 joint gate remains pending until these are observed.
Do not begin P3 replies/reports or P4 AI under this P2 task.

## Trusted review for a real P2 phone test

1. Have the author submit a benign test post. Note its ID via the author's
   Supabase row or an operator's scoped query. Never send account tokens/passwords.
2. A trusted development operator inspects that exact post's original body and
   language through the Supabase dashboard/MCP. Review ordinary safety rules;
   political disagreement alone is not a violation.
3. If appropriate, update only that exact nondeleted pending row to allowed. Use
   an ID-scoped condition; do not grant clients UPDATE or add a public approve RPC.
   Held/uncertain content remains pending/flagged. Public fixture approval does not
   mean AI screening is implemented or all new posts are safe.
4. Both devices refresh Home and verify the same stable ID/original text. Run owner
   removal and retry checks. Operator review remains necessary until later screening.

## Reproduce checks

```powershell
# From repository root
cd supabase
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd test
cd ../mobile
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd run typecheck
npm.cmd test
npx.cmd expo install --check
npx.cmd expo export --platform android --platform ios
cd ../api
.venv/Scripts/python -m dotenv -f .env.p1 run -- .venv/Scripts/python -m pytest -q
.venv/Scripts/python -m ruff check app tools tests
.venv/Scripts/python -m pip check
.venv/Scripts/python -m dotenv -f .env.p1 run -- .venv/Scripts/python -m tools.check_discovery
.venv/Scripts/python -m dotenv -f .env.p1 run -- node --experimental-strip-types ../mobile/tests/discovery-client.live.mjs
```

The dedicated-account mutation opt-in is required. Live verification creates and
soft-deletes labeled temporary verification posts; P1 tests replace only dedicated
account onboarding. Never run those tests with personal/pilot account credentials.
Without config, the integration tests skip and live scripts report BLOCKED.

## MCP/tool access

Supabase MCP is already connected and sufficient for development migrations,
schema inspection, advisors and trusted review. Git CLI already authenticates to
the repository, so no GitHub MCP is required for merging/pushing. No additional MCP
is needed to finish P2. Actual native verification needs Android/iPhone access with
Expo Go (or appropriate emulators), not a browser-only MCP. Browser automation may
help web previews but cannot substitute for the two platform checks above.
