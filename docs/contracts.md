# Samvad shared contracts

## P4.5 additive social contract — combined A/B, 24 October 2026

Local Docker execution now verifies these contracts through actual Auth/Storage
HTTP and the shared SDK. Forward migration `20261024005128` fixes an inherited
feed array-type lint warning without changing DTOs/order or AI behavior. Hosted
P4.5 migration and Android/iPhone acceptance remain unperformed/pending.

P4 AI providers, prompts, publication policy and HTTP contracts remain unchanged.
The local forward migration introduces `social(p_action text,p_payload jsonb={})`,
an invoker wrapper over a private, explicitly authorized implementation. Unknown
actions/fields are rejected. Writes derive the actor from auth.uid(), serialize
per actor and accept desired state, never toggle. No caller-supplied actor is used.

- `save_profile`: `{handle,display_name,bio,language,interests:uuid[],avatar_path}`;
  atomic profile/interest replacement, preserving created_at. Returns public profile.
  Names/bios keep Unicode, max 80/280 code points; existing ASCII handle rules remain.
- `profile`: `{id}` returns `{profile,followers,following,is_following}`; public
  projection includes avatar_path, never Auth/email/private identity or interests.
- `people`: `{query?,after?:uuid,limit?:20}`; bounded case-insensitive literal search
  over handle/name, UUID keyset order. `connections`: `{id,direction,after?,limit?}`
  returns public profiles in UUID order, direction followers/following.
- `follow`: `{id,desired:boolean}` returns confirmed profile/counts/state; no self
  follow. `like` / `repost`: `{id:conversation_uuid,desired:boolean}` returns
  `{id,likes,reposts,liked,reposted}`. Unique actor/target, timestamps server-owned.
  Creation requires a public allowed, nondeleted, non-hidden root. Removal is allowed
  even after a source disappears. Hidden-source state/counts never leak publicly.
- `interactions`: `{ids:conversation_uuid[]}` (max 50) returns visible public roots'
  counts and caller state in one batch. No per-card count requests in feed pages.
- `feed`: `{mode:'following'|'posts'|'reposts',id?:profile_uuid,after?:{at,id},limit?}`
  returns `{item:FeedItem,at,id,reposter:PublicProfile|null}` rows ordered timestamp,
  event UUID DESC. Following includes followed authors' public originals and followed
  users' attributed reposts, preserving original conversation/source identity.
  Posts/Reposts exclude held/pending own records; those stay in My submissions.
- Mentions resolve on first durable post/reply INSERT only. Text/request keys stay
  unchanged. Canonical handle tokens have stable target UUIDs; authored spelling stays in original text.
  `mentions`: `{type:'post'|'reply',ids:uuid[]}` (max 50) returns visible-source
  `{entity_id,handle,target_id}`. Unknown handles stay text; retries/handle changes
  never redirect an existing mention. Suggestions use People search, not private data.
- Avatars: public `avatars` bucket, <=2 MiB JPEG/PNG/WebP, owner UUID/versioned UUID
  filename paths. Immutable uploads (no upsert); owner SELECT/INSERT/DELETE only.
  Profile path must refer to an existing own object; replacement saves profile before
  deleting superseded image. Cancellation/failure retains the previous avatar.
- Human review: private trusted `review_admins` membership, provisioned only by an
  operator, never user_metadata. `admin_status` returns own membership boolean.
  `review_queue` returns bounded reports without reporter_id or private identity.
  `review`: `{id:report_uuid,request_id:uuid,action:'reviewed'|'dismissed'|'hide'|'restore',reason}`
  requires membership, nonempty <=500-character reason; exact retries reuse audit ID,
  changed payload conflicts. Status maps reviewed/hide/restore to resolved. Hide/restore
  applies to post/reply/news only, uses a separate manual-hidden flag and never changes
  AI moderation_state. Restore cannot publish a pending/blocked/deleted source.
  Private audit records reviewer/action/reason/previous state. No account punishment.

Anonymous users may read public profiles/people/connections/feed/interactions/mentions;
all mutations and Following require a real subject. Public RLS and internal source
checks both enforce manual hiding. No hosted application is authorized in this thread.

**Status:** P0-P4 code is merged on main `4d6c321`; P0-P3 accepted, P4 quality/device acceptance pending. P4.5 non-AI changes are implemented locally on `feature/p4-5-social`; hosted migration and joint acceptance remain pending. No push/deployment in this thread.

## Identity and transport

- Supported reading/original language codes: `en`, `hi`, `ml`. Original Unicode body is retained. Public UI shows handle and optional display name; email and verification data stay private.
- Mobile sends the Supabase access token to FastAPI as `Authorization: Bearer <token>`. Server validates it and derives user identity; it never trusts a client-supplied user ID.
- Mobile may use only public Supabase URL/publishable or anon key and public API base URL. Service-role and AI credentials stay server-side.
- Mobile environment names are `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_BASE_URL`. Server-only names stay in `api/.env.example`; never place server secrets in `EXPO_PUBLIC_*` values.
- Auth uses Supabase sign-up/sign-in/session refresh in P1. The server verifies access tokens against the configured project, issuer and audience as detailed in `api/docs/contracts-proposal.md`; no caller-supplied user ID is trusted. Exact email confirmation and redirect configuration depend on the development Supabase project and device tests.

## Proposed database shape and visibility

| Entity | Proposed fields | Client visibility |
|---|---|---|
| `profiles` | `user_id`, `handle`, `display_name`, `bio`, `preferred_language`, `created_at` | Public fields only; owner writes |
| `private_identities` | `user_id`, `email`, `verification_status`, `created_at` | No direct client read, including owner; own email comes from Auth; never joined into public feed |
| `interests` | `id` (UUID), `slug`, `label` | Public read |
| `user_interests` | `user_id`, `interest_id` | Owner read/write |
| `news_items` | `id`, `title`, `source_name`, `source_url`, `excerpt`, `language`, `published_at`, `topic`, `summary_3line` | Public read; trusted write |
| `posts` | `id`, `author_id`, `request_id`, `body`, `language`, `created_at`, `deleted_at`, `moderation_state`, `is_fixture` | Allowed/nondeleted posts public; owner creates pending posts; restricted soft-delete path |
| `conversations` | `id`, `news_item_id` or `root_post_id`, `created_at` | Public read; exactly one root type |
| `replies` | `id`, `conversation_id`, `parent_reply_id`, `author_id`, `request_id`, `body`, `language`, `created_at`, `moderation_state`, `deleted_at`, `is_fixture` | Allowed/nondeleted replies public within visible roots; owner creates pending replies; restricted soft-delete path |
| `reports` | `id`, `reporter_id`, `entity_type`, `entity_id`, `reason`, `details`, `status`, `request_id`, `created_at` | Reporter create/read own; restricted reviewer path reads all |
| `translations` | `id`, `entity_type`, `entity_id`, `target_language`, `translated_text`, `source_hash`, `model_id` | Only when source visible; server write |

All IDs are UUID strings, including interest IDs. Server owns timestamps. Handles are lowercase ASCII `[a-z0-9_]{3,30}` and unique case-insensitively. Post/reply bodies are limited to 2000 Unicode code points. `request_id` is a client-generated UUID reused on retries; the same ID with different content is a conflict. News has one primary `topic` equal to an interest slug. Feed pages default to 20/max 50, sorted by timestamp and UUID descending; replies sort ascending. Reports never reveal reporter identity to reported users. Feed responses exclude held/deleted bodies and private identity records. Full proposed constraints and RLS are in `supabase/schema-proposal.md`.

P1 uses direct profile tables; P4.5 adds atomic profile saves and protected human review locally. P2 feed/soft-delete and historical phase contracts remain below. Auth redirects retain the accepted P1 setup.

## P2 discovery and publishing — 24 October 2026

The user assigned both P2 workstreams and integration to one agent. The following
contracts are implemented together by the mobile and backend owners:

- Six real, attributed source items form a curated historical archive, with visible
  dates and publisher links. Short descriptions are editorial paraphrases, not AI
  briefs or full article reproductions. They are not presented as live news.
- `submit_post(p_request_id uuid,p_body text,p_language text)` returns
  `{id,conversation_id,moderation_state,deleted}`. Actor comes only from auth.uid().
  Exact retries return the same ID; changed body/language with the same author/key
  fails HTTP 409 (`PT409`). Original Unicode is preserved, 1–2000 code points,
  non-whitespace, en/hi/ml. Clients cannot set author, time, fixture flag or status.
- Posts start pending. Trusted operator review is required for publication; no AI
  screening or client-controlled publication is implemented. Public discovery
  excludes held/deleted posts. Author-only inspection is separate in Profile → My
  submissions and clearly labeled. A public-post acceptance test requires review.
- `delete_own_post(p_post_id uuid)` clears the owner's post body and soft-deletes
  it. No cross-user deletion, direct table mutation or undelete. Private request
  fingerprints survive deletion; retrying an original deleted submission returns
  its same ID with deleted=true, without exposing or recreating its body.
- `get_discovery_feed(p_topic text|null,p_limit int=20,p_after jsonb|null)` is a
  security-invoker RPC returning rows
  `{kind,id,sort_at,interest_match,conversation_id,news,post}`. Public news/post
  objects match the client DTOs; post adds is_fixture. Matching interest news ranks
  first, then items sort by timestamp, UUID and kind DESC. A topic filters news
  only; public original posts remain included. No selected interests falls back
  to all sources and posts, keeping a nonempty cold-start feed.
- Cursor: last row's exact `{matched:boolean,at:string,id:uuid,kind:'news'|'post'}`.
  Preserve timestamp microseconds. Keyset order matches these four fields DESC;
  limit 1–50, invalid cursor/topic/limit fails 400. Reset after topic, preferences
  or account changes; no snapshot across changing preferences is promised.
- Conversations are stable root associations only in P2. Source visibility
  controls their reads; held roots remain author-only. Replies/reports/translation
  are deferred and do not appear functional.
- Mobile persists each account's draft and request key before sending. Failed or
  unresolved saves retain the exact body/language/key for retry, with editing
  locked. Double taps share one in-flight attempt. Success clears a draft only
  after confirmation of the persisted ID. Starting a different draft after an
  unresolved save is an explicit action with a duplicate warning.

## P3 conversation and safety — 24 October 2026

- Migration `20261023213814_conversation_safety` adds replies, private reports and
  internal write budgets. All author/reporter identities derive from `auth.uid()`.
  No direct client INSERT/UPDATE/DELETE or control of moderation/fixture/timestamp.
- `submit_reply(p_request_id uuid,p_conversation_id uuid,p_parent_reply_id uuid|null,
  p_body text,p_language text)` returns `{id,conversation_id,moderation_state,deleted}`.
  Pending by default; 1–2000 original Unicode code points, en/hi/ml. Exact retries
  return the same record, including a deletion tombstone; changed payload is 409.
  Parent must belong to the same visible conversation and be nondeleted and
  allowed or owned by the actor. Parent references are immutable and acyclic.
- `get_replies(p_conversation_id uuid,p_limit int=30,p_after jsonb|null)` returns
  `{id,conversation_id,parent_reply_id,body,language,created_at,deleted_at,
  moderation_state,is_fixture,author}`. Author contains only PublicProfile fields.
  Sort `(created_at,id)` ASC; cursor `{at:string,id:uuid}`, max 50. Preserve exact
  server timestamp precision. Refresh resets pagination. An unavailable root
  hides its complete thread. Approved replies are public, held replies owner-only.
  A hidden/unloaded parent is shown as unavailable without exposing its text.
- `delete_own_reply(p_reply_id uuid)` returns bool, owner only, clears the body.
  Allowed deleted replies retain blank tombstones so children keep their place.
- `submit_report(p_request_id uuid,p_entity_type text,p_entity_id uuid,p_reason text,
  p_details text='')` returns `{id,status,already_reported}`. Targets: post, reply,
  profile, news. Reasons: threat, harassment, hate, doxxing, impersonation, scam,
  spam, other. Details max 1000 code points; empty permitted. Target must be visible.
  Reports start submitted. One record per reporter/target; an alternate request key
  returns the existing report (first reason/details retained), already_reported=true.
  Original-key payload changes fail 409. Exact retries work after target removal.
- Reporter can SELECT only own report's id/target/reason/details/status/created_at.
  No client receives reporter_id, request_id or fingerprint columns. Other users,
  reported authors and anonymous sessions cannot read those reports. Trusted review
  currently uses the development operator's SQL/MCP access; no reviewer client role
  or review UI is claimed. Report counts never modify content or account status.
- Fixed server-clock budgets per account: 5 new posts/minute, 10 new replies/minute,
  5 new reports/minute and 30/hour. Account advisory locks serialize checks; exact
  retries and duplicate-target reports consume no budget. Exceeding a budget is
  HTTP 429/PT429; rejected transactions roll back. These are prototype account
  controls, not IP/Sybil protection. A window boundary can allow a short burst.
- Mobile persists reply drafts per account/conversation/parent and reports per
  account/target, including reason, original text/language and request UUID before
  networking. Ambiguous writes lock editing and retain the exact retry payload;
  double taps share one in-flight operation. Outgoing writes pin the initiating
  account's session and reject an account mismatch. Storage failure prevents send.
- Trusted review remains necessary before another account can read a new reply.
  No automatic moderation, bans, translation or AI provider calls are added in P3.

## P4 implementation boundaries — 24 October 2026

- FastAPI P4 implements all three `/v1` routes below. Bearer JWTs are verified with
  the configured project's JWKS, ES256/RS256 allowlist, issuer, audience, expiry,
  UUID subject and authenticated role. Unknown signing keys refresh once. HS256,
  unsigned, expired, wrong-project/audience/role tokens are rejected. Routes never
  accept caller-supplied source text or actor IDs. Public-key + caller-token source
  reads enforce RLS; server service-role reads are not used to obtain source text.
- Migration `20261023225554_multilingual_ai` adds private `samvad_internal.ai_cache`,
  `ai_reservations` and `moderation_events`, with no ordinary client read/write or
  RPC execution. The service-role-only `ai_control` invoker wrapper calls the
  protected internal implementation. Public translations table remains proposed;
  P4 actually uses this server-only cache rather than exposing translated held text.
- Cache key hashes entity type/ID, original content, target language, configured
  model and prompt version; provider is fixed Groq. Entries expire after seven days.
  Authorization/source rechecked on every cache hit and again before returning.
  Changed/deleted/hidden sources cannot retrieve old cached results. Originals are
  never overwritten. Same-language requests return exact original, provenance original.
- Shared transactional database reservations span translation/briefs/moderation and
  all workers: caps 10 requests/minute, 100/day UTC, 4000 tokens/minute, 50000/day,
  one leased concurrent call and five reservations/user/minute. Config may lower
  ceilings only. Full prompt UTF-8 bytes + output cap + overhead are conservatively
  charged; failed/truncated calls remain charged. No automatic retry/fallback.
  Briefs leave request headroom for core tasks; a busy lease returns 429. External
  provider use by other applications is not tracked locally; provider 429 is honored.
- Groq adapter verifies configured models against authenticated `/models` before
  first inference per service instance. Official docs/catalog/Free-plan limits were
  rechecked, but actual account availability is unverified until keys are configured.
  Mandatory enabled/free-plan/data-policy flags default false; none can upgrade billing.
- Translation JSON is validated; UI labels target language, AI, cache and experimental
  status when language review is pending. Show original restores the exact body.
  Briefs require three nonempty single-line strings, use headline/excerpt only and
  include source URL. Automated shape checks do not prove linguistic/factual quality.
- Only the author may request moderation. New posts/replies remain pending until
  successful validated screening plus the explicit language/policy review gate.
  Missing credentials/quota, timeout, unknown model, malformed/truncated output or
  failed evaluation leaves pending. Ambiguity/low confidence flags for review; only
  clear high-severity threat/hate/doxxing can block. Ordinary disagreement/political
  criticism is permitted. Reports never auto-ban. No account bans are implemented.
- Publication and a private moderation event are committed atomically by service-only
  RPC using actor, original body hash, pending state and deletion checks. Concurrent
  delete/state changes reject stale decisions. Direct client writes remain denied.
  Existing reviewed decisions return provenance original, never fabricated live AI.
- Mobile attempts screening after confirmed durable creation; failure does not undo
  the saved post/reply or create another submission. Pending owners have Retry AI
  screening; held decisions require trusted review. Text processing disclosures
  appear before submission/translation/brief actions. Reports are never sent to AI.

## AI HTTP endpoints from DPR §7

`POST /v1/translate` with `{ "entity_type": "post|reply", "entity_id": "uuid", "target_language": "en|hi|ml" }` returns `{ "translated_text": "...", "original_language": "ml", "target_language": "en", "is_cached": false, "label": "Translated by AI", "provenance": "live" }`.

`POST /v1/summarize-news` with `{ "news_item_id": "uuid", "target_language": "en|hi|ml" }` returns `{ "lines": ["...", "...", "..."], "source_url": "https://...", "generated_by_ai": true, "is_cached": false, "provenance": "live", "basis": "headline_excerpt", "label": "Headline-based brief" }`. A brief based only on headline/excerpt must be labeled as such.

`POST /v1/moderate` with `{ "entity_type": "post|reply", "entity_id": "uuid" }` returns `{ "status": "allowed|flagged|blocked", "reason_code": "...", "needs_review": true, "provenance": "live" }`. Moderation enforcement belongs at the server publication boundary, never a client-only call. These routes do not exist in P0.

HTTP status semantics: `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` inaccessible/not found, `409` idempotency conflict, `429` rate limited, `503` AI/auth unavailable. Planned error envelope: `{ "error": { "code": "ai_unavailable", "message": "...", "retryable": true } }`. Translation failure leaves the original visible.

Provenance is `live`, `cache`, `fixture`, or `original` as applicable. Fixtures require explicit demo mode and a visible `Demo fixture` label; they cannot be presented as live inference. API base path is `/v1`; timeout and rate limits remain server-configurable. No live AI claim until provider access is verified. The full planned validation and failure rules are in `api/docs/contracts-proposal.md`.
# Final bounded AI demo additions

Enabled explicitly with server `AI_DEMO_ENABLED=true` and mobile
`EXPO_PUBLIC_AI_DEMO=true`. Existing P4 routes remain available.

| Route | Auth / contract |
|---|---|
| POST `/v1/submit-and-screen` | Caller JWT; entity_type post/reply, stable request_id, original body, EN/HI/ML language, reply conversation/optional parent. Saves using caller-authorized RPC before screening. HTTP 202 means saved privately with retryable screening; HTTP 200 means confirmed terminal/existing result. IDs remain stable on exact retry. |
| POST `/v1/summarize` | Caller JWT; entity_type post/news, entity_id, target_language. Returns english_lines (4–5), native_lines/status/language, source basis/URL, independent English/native provenance and overall provenance. Inadequate source returns 400 insufficient_source. |
| POST `/v1/review-queue` | Caller JWT plus protected DB reviewer membership; returns held nondeleted source/hash/state and fixture provenance, without contact identity. |
| POST `/v1/review` | Reviewer only; stable request_id, source_hash, expected_state, entity_type/id, approve/reject and reason. Atomic audited idempotent transition; stale source/state conflicts. Does not modify manual_hidden. |

Demo translation uses Sarvam with private persisted lifetime character reservations;
moderation and English summaries use the configured Groq model. Every cache read
retains caller source authorization. No client controls actor, model, budgets or
publication state. See `AI_DEMO_RUNBOOK.md` for limits and human approval gates.
