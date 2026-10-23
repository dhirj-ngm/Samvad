# Samvad shared contracts — P0 draft

**Status:** P0/P1 are integrated and accepted; P1 migration is deployed to the agreed development project. On 24 October the user assigned both P2 workstreams and integration to one agent. The P2 contracts below are the shared implementation baseline. Authenticated FastAPI/AI routes remain deferred.

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

P1 uses direct profile tables; P2 feed cursor and soft-delete contracts are below. A future reviewer UI/API remains deferred. Auth redirects retain the accepted P1 setup.

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

## AI HTTP endpoints from DPR §7

`POST /v1/translate` with `{ "entity_type": "post|reply", "entity_id": "uuid", "target_language": "en|hi|ml" }` returns `{ "translated_text": "...", "original_language": "ml", "target_language": "en", "is_cached": false, "label": "Translated by AI", "provenance": "live" }`.

`POST /v1/summarize-news` with `{ "news_item_id": "uuid", "target_language": "en|hi|ml" }` returns `{ "lines": ["...", "...", "..."], "source_url": "https://...", "generated_by_ai": true, "is_cached": false, "provenance": "live", "basis": "headline_excerpt", "label": "Headline-based brief" }`. A brief based only on headline/excerpt must be labeled as such.

`POST /v1/moderate` with `{ "entity_type": "post|reply", "entity_id": "uuid" }` returns `{ "status": "allowed|flagged|blocked", "reason_code": "...", "needs_review": true, "provenance": "live" }`. Moderation enforcement belongs at the server publication boundary, never a client-only call. These routes do not exist in P0.

HTTP status semantics: `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` inaccessible/not found, `409` idempotency conflict, `429` rate limited, `503` AI/auth unavailable. Planned error envelope: `{ "error": { "code": "ai_unavailable", "message": "...", "retryable": true } }`. Translation failure leaves the original visible.

Provenance is `live`, `cache`, `fixture`, or `original` as applicable. Fixtures require explicit demo mode and a visible `Demo fixture` label; they cannot be presented as live inference. API base path is `/v1`; timeout and rate limits remain server-configurable. No live AI claim until provider access is verified. The full planned validation and failure rules are in `api/docs/contracts-proposal.md`.
