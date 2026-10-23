# Samvad shared contracts — P0 draft

**Status:** P0 design baseline accepted by the integration captain from Developer B's `api/docs/contracts-proposal.md` and `supabase/schema-proposal.md`. No database migration or authenticated/AI API is implemented yet. Both owners must review changes to this contract before coding against them. `mobile/types/contracts.ts` reflects the planned client shapes.

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

Pending implementation details: public profile view/RPC, exact feed cursor encoding, restricted soft-delete/reviewer RPCs, and device-tested Auth redirects. These require owner review before their phase is implemented.

## AI HTTP endpoints from DPR §7

`POST /v1/translate` with `{ "entity_type": "post|reply", "entity_id": "uuid", "target_language": "en|hi|ml" }` returns `{ "translated_text": "...", "original_language": "ml", "target_language": "en", "is_cached": false, "label": "Translated by AI", "provenance": "live" }`.

`POST /v1/summarize-news` with `{ "news_item_id": "uuid", "target_language": "en|hi|ml" }` returns `{ "lines": ["...", "...", "..."], "source_url": "https://...", "generated_by_ai": true, "is_cached": false, "provenance": "live", "basis": "headline_excerpt", "label": "Headline-based brief" }`. A brief based only on headline/excerpt must be labeled as such.

`POST /v1/moderate` with `{ "entity_type": "post|reply", "entity_id": "uuid" }` returns `{ "status": "allowed|flagged|blocked", "reason_code": "...", "needs_review": true, "provenance": "live" }`. Moderation enforcement belongs at the server publication boundary, never a client-only call. These routes do not exist in P0.

HTTP status semantics: `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` inaccessible/not found, `409` idempotency conflict, `429` rate limited, `503` AI/auth unavailable. Planned error envelope: `{ "error": { "code": "ai_unavailable", "message": "...", "retryable": true } }`. Translation failure leaves the original visible.

Provenance is `live`, `cache`, `fixture`, or `original` as applicable. Fixtures require explicit demo mode and a visible `Demo fixture` label; they cannot be presented as live inference. API base path is `/v1`; timeout and rate limits remain server-configurable. No live AI claim until provider access is verified. The full planned validation and failure rules are in `api/docs/contracts-proposal.md`.
