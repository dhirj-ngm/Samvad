# Samvad P0 contract proposal — captain/A review required

P1 update: the integration captain accepted the P0 design baseline in shared
docs/contracts.md (origin/main dbc2d22). P1 uses the agreed direct profile/interest
tables and Supabase Auth, so no new onboarding RPC/view, schema field or server env
name is required. Private identities deny all ordinary client reads as accepted.
Implementation/handoff: ../../supabase/README.md. Email confirmation is enabled in
local Auth defaults; exact hosted/device redirect paths still require A/project
configuration. The SAMVAD_P1_* names in p1-test.env.example are opt-in test-runner
inputs only, not shared app/server settings. API JWT verification remains a plan
for authenticated FastAPI routes; there are no such routes in P1. No new contract
has been silently finalized and no P2/P4 work is implemented.

Original P0 proposal below (now accepted as the baseline above), not a replacement
for `docs/contracts.md`. Root docs/config are untouched. No FastAPI
auth or AI feature exists yet. Implemented API: only GET /health, no bearer token,
HTTP 200 liveness as documented in `../README.md`. No dependency readiness claim.
Schema proposal: `../../supabase/schema-proposal.md`; seed and migration plan live
beside it. Captain should copy agreed decisions into shared contracts/decisions.

## Shared identity/data contract

Both platforms use one Supabase project and one FastAPI base URL. UUID IDs and
UTC ISO-8601 timestamps; languages `en`, `hi`, `ml`. Display original text exactly,
including Unicode/emoji. Public profile select allowlist:
`user_id,handle,display_name,bio,preferred_language,created_at`. Never select/join
private_identities in public queries. Email comes from the user's own Supabase Auth
session/settings, not profile responses. User ID is not legal identity verification.

Supabase operations planned (none implemented in P0): Auth handles sign-up/in/out
and refresh in P1; public profile/interest reads, owner profile edits and
user_interests writes under RLS; public news/visible posts reads and retry-safe
pending post INSERT in P2; controlled conversations, pending replies and private
reports in P3. Writes derive author/reporter identity from the session. Direct
clients cannot set allowed moderation status or mutate protected columns. No
client delete/update grant as a shortcut for soft delete. Trusted review paths
remain separate from ordinary app APIs. Use public publishable/anon keys only.

Proposed exact row fields and RLS are in the schema table. `request_id` is a
client-generated UUID reused for retries, unique per author and table; same key
with changed payload is rejected, identical retry returns the existing ID/state.
Public feed uses only allowed/nondeleted sources, including original posts.
Profile handles are case-insensitive unique; body limit proposed 2000 Unicode code
points (not grapheme clusters). News has a single primary topic in the initial
schema. Stable feed cursors carry timestamp+UUID, server-validated, sorted DESC;
replies sort ASC on `(created_at,id)`. Page size proposed default 20/max 50.

## Bearer validation plan (P1/P4, not a P0 authorization stub)

`Authorization: Bearer <Supabase user access token>` for all future AI endpoints.
Do not authenticate with anon/publishable key, user_id, unverified decoded claims
or a mobile-provided role. Derive UUID actor exclusively from verified `sub`.

Prefer project asymmetric signing keys. Use a maintained JWT library in P1,
configured `SUPABASE_URL` and project-matched JWKS at
`https://<project>.supabase.co/auth/v1/.well-known/jwks.json` (derive when blank).
Pin project issuer `<SUPABASE_URL>/auth/v1`, audience `authenticated` and allowed
signing algorithm matching the project's selected key (RS256/ES256 after actual
key inspection); never choose arbitrary algorithms/URLs from token headers.
Require signature, exp, iss, aud, UUID sub and role authenticated; check nbf when
present with small documented clock skew. Reject expired, malformed, wrong-project,
anon and service-role tokens. Bound header/token length. Do not log bearer values.

Cache JWKS for at most 10 minutes with purge/rotation support; refresh once on
unknown kid under a bounded rate/timeout, never accept an unknown key. Cached
known valid key may verify while within TTL; missing usable keys fails closed with
503, not fake login. Signature/claim failures return 401 with WWW-Authenticate:
Bearer. Offline JWT validation does not prove immediate session revocation; use
Auth user validation for sensitive operations when implemented. With legacy HS256,
use Supabase `GET /auth/v1/user` plus a server-configured publishable key instead
of distributing JWT signing secrets; propose its env name before adding that mode.
No legacy mode or publishable key is silently implemented here.

Fetch content using caller JWT/RLS or explicit equivalent authorization. Service
role queries require deliberate authorization before reads/writes. Moderation may
access only caller-owned pending content or an authorized server worker; ordinary
users cannot read/moderate others' held content. No automatic reviewer authority.

Reference rechecked 2026-10-23:
https://supabase.com/docs/guides/auth/jwts (JWKS and legacy Auth-server validation).

## Planned AI HTTP contracts — NOT registered routes in P0

All requests require bearer auth. Match DPR §7; proposed additive provenance fields
need captain approval. Examples are contract examples, not actual inference.

`POST /v1/translate`

```json
{"entity_type":"reply","entity_id":"11111111-1111-4111-8111-111111111111","target_language":"hi"}
```

```json
{"translated_text":"नमस्ते","original_language":"ml","target_language":"hi","is_cached":false,"label":"Translated by AI","provenance":"live"}
```

Server obtains authorized source by ID, never arbitrary supplied text. Cache key:
entity type/id + original UTF-8 SHA-256 + target language + provider/model + prompt
version. Same-language returns original without inference, label `Original`,
provenance `original`, is_cached false. Never overwrite stored original.

`POST /v1/summarize-news`

```json
{"news_item_id":"22222222-2222-4222-8222-222222222222","target_language":"en"}
```

```json
{"lines":["<grounded line 1>","<grounded line 2>","<grounded line 3>"],"source_url":"https://<actual-publisher>/<actual-story>","generated_by_ai":true,"is_cached":false,"provenance":"live","basis":"headline_excerpt","label":"Headline-based brief"}
```

Exactly 3 bounded nonempty lines. `basis=headline_excerpt|licensed_article`;
licensed article requires actual permitted content. Cache source material hash +
language + provider/model/prompt. Optional briefs remain SHOULD; do after core gates.

`POST /v1/moderate`

```json
{"entity_type":"post","entity_id":"33333333-3333-4333-8333-333333333333"}
```

```json
{"status":"flagged","reason_code":"needs_human_review","needs_review":true,"provenance":"live"}
```

Status allowed/flagged/blocked is triage, not an account ban. New writes default
pending in DB; only restricted server publication transitions after valid screening.
Outage, malformed model output or exhausted free quota leaves content pending.
Reports remain private and counts do not determine guilt. Reject extra request
fields; content UUID, entity types and language enums validated server-side.

Provenance: `live|cache|fixture|original` as applicable. Live caches keep actual
model metadata internally. Fixtures only with DEMO_MODE=true, is_cached false,
provenance fixture and visible label `Demo fixture`; no fake generated live status.
Demo mode enables no inference or fixtures in this P0 scaffold.

Planned error envelope:

```json
{"error":{"code":"ai_unavailable","message":"AI is unavailable. Original text remains available.","retryable":true}}
```

| HTTP | code / behavior |
|---|---|
| 400 | invalid_request; normalize framework validation errors (normally 422) when feature routes exist |
| 401 | unauthenticated; missing/invalid/expired bearer |
| 403 | forbidden; authenticated but disallowed operation |
| 404 | not_found; unavailable/inaccessible content, no existence leak |
| 409 | idempotency_conflict; retry key with different payload |
| 429 | rate_limited; bounded Retry-After if known |
| 503 | ai_unavailable or auth_unavailable; safe retry, original preserved |

No raw provider errors, tokens or source/private identity text in errors/logs.
P0 unknown routes retain framework 404; planned envelopes are not claimed as built.

## Free-tier provider decision and configuration proposal

Groq Free plan + Qwen first, configurable per-task model IDs. The official catalog
and Free plan limits were rechecked 2026-10-23: `qwen/qwen3.8-27b` is listed, free
limits 30 RPM/1000 RPD/8000 TPM/200000 TPD. Account access NOT verified. Sources:
https://console.groq.com/docs/models and https://console.groq.com/docs/rate-limits.
Before live use recheck the authenticated `/openai/v1/models` catalog and the
account console's current free plan/limits/data settings. Do not attach billing,
purchase credits, use trial credits as a durable free tier, or rotate keys to evade
quotas. Flags alone cannot enforce a provider account's billing status.

Server env names/defaults are exactly in `../.env.example`. No model is hardcoded
in Python; the template selects the documented example. Local caps are maxima,
can only be lowered, and are not a quota implementation yet. Future shared task
budget: atomic reservations of requests and estimated input + maximum output
tokens; reconcile actual usage, enforce minute/day/concurrency caps across workers,
moderation/translation before briefs. Initially no retries; later at most one
bounded retry respecting Retry-After/timeouts and remaining budget. No unbounded
retry or automatic provider fallback. Never send private identity/email/tokens.
Review provider data handling with pilot testers before live content processing:
https://console.groq.com/docs/your-data.

Gemma/Google is an evaluated alternative requiring verified free catalog/route and
explicit adapter change; not an automatic fallback. Later language gate requires
12+ reviewed short examples across all six EN/HI/ML directions, code-mixing,
names/slang/emoji; summary factual-support and disagreement/abuse checks. No
quality, live access, quota enforcement or moderation readiness claim in P0.

## Captain-owned changes requested

1. Initialize repository/main/remote and separate dev/backend checkout; do not
   import local `.venv`, `.env` or caches. Root ignore should cover all owners'
   secrets/builds. Original planning documents remain in place.
2. Review/adopt schema names, limits, RLS (private identity stricter client deny),
   request IDs, HTTP examples/additive fields, JWT plan and server env names into
   docs/contracts.md and docs/decisions.md. This draft does not approve itself.
3. Root README should link api/README.md; root env template should list mobile
   public variables only or clearly separate server-only names. Developer A owns
   actual EXPO_PUBLIC_* and Android/iOS redirect configuration.
4. Record Android and iOS P0 outcomes separately in integration checklist. Joint
   gate remains blocked without those results and agreed contracts.
