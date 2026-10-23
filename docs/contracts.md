# Samvad shared contracts — P0 draft

**Status:** Draft by Developer A from the product scope and DPR §§6–7. Developer B must agree to the marked items before P1/P2 integration. `mobile/types/contracts.ts` mirrors the current proposal; changes require coordinated updates.

## Identity and transport

- Supported reading/original language codes: `en`, `hi`, `ml`. Original Unicode body is retained. Public UI shows handle and optional display name; email and verification data stay private.
- Mobile sends the Supabase access token to FastAPI as `Authorization: Bearer <token>`. Server validates it and derives user identity; it never trusts a client-supplied user ID.
- Mobile may use only public Supabase URL/publishable or anon key and public API base URL. Service-role and AI credentials stay server-side.
- **Agree with B:** Supabase client package/key naming, email confirmation/session behavior, and supported JWT validation approach.

## Proposed database shape and visibility

| Entity | Proposed fields | Client visibility |
|---|---|---|
| `profiles` | `user_id`, `handle`, `display_name`, `bio`, `preferred_language`, `created_at` | Public fields only; owner writes |
| `private_identities` | `user_id`, `email`, `verification_status`, `created_at` | Owner/admin only; never joined into public feed |
| `interests` | `id`, `slug`, `label` | Public read |
| `user_interests` | `user_id`, `interest_id` | Owner read/write |
| `news_items` | `id`, `title`, `source_name`, `source_url`, `excerpt`, `language`, `published_at`, `topic`, `summary_3line` | Public read; trusted write |
| `posts` | `id`, `author_id`, `body`, `language`, `created_at`, `deleted_at`, `moderation_state` | Visible posts public; owner create/delete |
| `conversations` | `id`, `news_item_id` or `root_post_id`, `created_at` | Public read; exactly one root type |
| `replies` | `id`, `conversation_id`, `parent_reply_id`, `author_id`, `body`, `language`, `created_at`, `moderation_state`, `deleted_at` | Visible replies public; owner create/delete |
| `reports` | `id`, `reporter_id`, `entity_type`, `entity_id`, `reason`, `status`, `created_at` | Reporter create/read own; reviewer read all |
| `translations` | `id`, `entity_type`, `entity_id`, `target_language`, `translated_text`, `source_hash`, `model_id` | Only when source visible; server write |

All IDs are UUID strings except interest IDs, whose type needs agreement. Server owns timestamps. Handles are unique case-insensitively. Reports never reveal reporter identity to reported users. Feed responses must exclude held/deleted bodies and private identity records.

**Agree with B:** exact table/column names and ID types; public profile shape or view; interest-to-news mapping (DPR says `topic`, playbook says interest tags); moderation visibility values; feed ordering/pagination query shape; create idempotency key; maximum post/reply grapheme count; report reason enum and reviewer path.

## AI HTTP endpoints from DPR §7

`POST /v1/translate` with `{ "entity_type": "post|reply", "entity_id": "uuid", "target_language": "en|hi|ml" }` returns `{ "translated_text": "...", "original_language": "ml", "target_language": "en", "is_cached": false, "label": "Translated by AI" }`.

`POST /v1/summarize-news` with `{ "news_item_id": "uuid", "target_language": "en|hi|ml" }` returns `{ "lines": ["...", "...", "..."], "source_url": "https://...", "generated_by_ai": true, "is_cached": false }`. A brief based only on headline/excerpt must be labeled as such.

`POST /v1/moderate` with `{ "entity_type": "post|reply", "entity_id": "uuid" }` returns `{ "status": "allowed|flagged|blocked", "reason_code": "...", "needs_review": true }`. Moderation enforcement belongs at the server publication boundary, never a client-only call.

HTTP status semantics: `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` inaccessible/not found, `429` rate limited, `503` AI unavailable. Translation failure leaves the original visible.

**Agree with B:** exact error envelope; whether `summarize-news` needs an explicit `brief_basis`/fixture flag so UI can honestly label limited-source or demo output; whether translation responses need a fixture flag; endpoint base path and timeout policy. No live AI claim until provider access is verified.
