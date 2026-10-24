# Local AI prototype verification — 24 October 2026

Implementation branch `feature/ai-demo`, based on published P4.5 commit `b5b1a8c`.
The user authorized merging this work with all earlier phases and publishing it
to GitHub. This source integration does not apply hosted migrations or deploy
the gateway. See `AI_DEMO_RUNBOOK.md` for environment setup and commands.

## Final integration checks

- Full configured API suite: **94 passed, zero skipped**, including the three
  hosted P1/P2/P3 two-account regression tests (46.74 seconds). An initial run
  without live configuration passed 91 and skipped three; the configured result
  closes that rerun gap.
- Database suite: **105 passed**. Mobile model suite: **22 passed**. Total:
  **221 tests**, with the live suites included in the API count.
- TypeScript, Expo dependency compatibility, Ruff, pip consistency and Git
  whitespace checks passed. Both iOS and Android bundle exports passed.
- Fresh local HTTP smoke passed actual Auth, ordinary-user reviewer denial,
  private pending save, exact retry, scoped reviewer approval and public release;
  its temporary post was owner-deleted and verification sessions signed out.
- Changed/new source files were checked against locally configured private
  credential values and private-key/provider-token patterns; no matches found.
  Ignored account sheets, provider secrets and runtime configuration stay local.
- No new paid/provider inference, hosted migration, automatic publication,
  human language acceptance or device acceptance was performed by this rerun.
  Outstanding acceptance and existing warnings below remain unchanged.

## Completed evidence

- Created the three requested local Auth accounts and profiles: dolla, nightangel,
  blackman. Preserved the fourth existing account/password and granted it local
  reviewer membership. No emails sent. Credentials remain in ignored local files.
- Applied migration `20261024025928` only to local Docker Supabase. Local database
  lint: no schema errors. All eight migrations replay in the SQL suite.
- SQL/PGlite: 105 tests passed, including new private budget/review permissions,
  shared character ceiling, stable decision retries, stale/deleted source rejection
  and preservation of manual hiding. An existing fixed-minute post-budget test
  crossed a clock bucket in one invocation; a complete rerun passed unchanged.
- API pytest before the last provenance-only adjustment: 91 passed, three opt-in
  hosted integration suites skipped. Final focused rerun recorded below.
- Mobile typecheck and original 20 tests passed; iOS and Android Metro bundles
  returned HTTP 200, approximately 7.75/7.73 MB, with the correct local API address.
- Real local HTTP smoke passed: Auth validation, ordinary-user reviewer denial,
  private durable save, identical submission retry, trusted approval/idempotent
  decision and public release. Temporary smoke post was owner-deleted afterward.
- Seed executed twice without duplicating identities. All fourteen fixture hashes
  and ordinary-user public/private visibility boundaries passed verification.
- Live Sarvam calls succeeded for three conversation translations and Hindi/
  Malayalam versions of the English summary. Live Groq produced the English
  four/five-line summary. Successful results were stored in the private AI cache.
- Real Groq moderation diagnostic classified the synthetic English threat as
  blocked/threat, confidence 0.95. It did not publish or approve any content.
- At the last budget query, five Sarvam reservations totaled 1,585 characters;
  including the conservative 32 prior speech characters, 8,383 remain under the
  10,000-character cap. This is reserved usage, not a provider billing statement.
- Python dependency consistency passed. Scoped Ruff checks passed before the
  final small launcher/report edits; final results are recorded below.

## Runtime and limits

Preview `exp://192.168.29.101:8086`; gateway `http://192.168.29.101:8775`;
local Auth/database `http://192.168.29.101:54321`. All three LAN endpoints returned
HTTP 200 from this computer. This proves local interface access, not phone/venue
reachability. Old 8085 preview was left alone. Current QR is the ignored local
`api/.local/ai-demo-preview.html`.

Automatic publication remains OFF until documented human language/policy review.
Prepared content was approved/rejected by an operator as labeled fictional
fixtures. Arbitrary new posts remain privately saved and can be human-reviewed.
Real cache misses require the configured providers and remaining shared quotas.
No GPU, training, subscription or paid fallback was introduced.

## Outstanding acceptance and known limitations

- Human EN/HI/ML/code-mixed policy and translation/summary evaluation remains
  pending; use `AI_LANGUAGE_REVIEW.md`. One English smoke does not clear this gate.
- Actual iPhone/Android interactions and ten-person venue rehearsal remain pending.
- Hosted project still lacks P4.5 and final AI migrations. Existing hosted config
  was preserved. This build is a laptop-attended local demonstration.
- Local reset restores only exact fixture visibility, not participant-added social
  interactions or deleted source text. Budgets and audits are never reset.
- Long inputs/concurrent requests can hit conservative quotas; previews/free
  allowance, laptop uptime and network remain external dependencies.
- Inherited Expo dependency audit debt, Node module-type warnings and upstream
  Starlette/httpx deprecation remain as previously documented.

## Final focused checks

- Final AI-specific API rerun: 12 passed after the provenance adjustment.
- Final mobile suite: 22 passed; TypeScript passed.
- Final scoped backend Ruff and Git whitespace checks passed.
- All three generated account passwords authenticated successfully; only the
  temporary verification sessions were signed out.
- After gateway restart, all six prepared translation/summary requests returned
  HTTP 200 from real cache, including available Hindi/Malayalam native summaries.
- Optional non-root gateway container files are prepared, not build/deploy tested.

No claim of human, phone, hosted or production acceptance is implied by these checks.
