# Database baseline — P1 identity and later-phase schema proposals

P1 update: the captain accepted this baseline in docs/contracts.md on origin/main
dbc2d22. Identity/interests are now implemented by
`migrations/202610230001_identity_interests.sql`; see README.md for exact grants,
onboarding saves and deployment status. Display name/bio use empty-string defaults;
no new public RPC/view or schema fields are introduced. All later entities below
remain design only. No shared Supabase migration or real-account pass is claimed.

Later-phase tables remain design, not applied migrations. Exact names below align with
DPR §6. `uuid` primary IDs default `gen_random_uuid()`; foreign keys explicitly
reference listed keys. All times use UTC `timestamptz`, server default `now()`.
Required fields are non-null unless `?` is shown. Languages: `en|hi|ml` CHECK.
Public UUIDs identify profiles/content, not private legal identity.

| Table | Planned columns and constraints |
|---|---|
| profiles | user_id uuid PK FK auth.users(id); handle citext UNIQUE; display_name text; bio text default ''; preferred_language text default 'en'; created_at timestamptz |
| private_identities | user_id uuid PK FK auth.users(id); email text; verification_status text CHECK unverified/email_verified; created_at timestamptz |
| interests | id uuid PK; slug text UNIQUE; label text |
| user_interests | user_id uuid FK profiles(user_id); interest_id uuid FK interests(id); PK(user_id,interest_id) |
| news_items | id uuid PK; title text; source_name text; source_url text UNIQUE (HTTPS); excerpt text; language text; published_at timestamptz; topic text FK interests(slug); summary_3line jsonb? (exactly 3 strings); summary_language text?; summary_provenance text?; summary_basis text? CHECK headline_excerpt/licensed_article; created_at timestamptz |
| posts | id uuid PK; author_id uuid FK profiles(user_id); request_id uuid; body text; language text; created_at timestamptz; deleted_at timestamptz?; moderation_state text default 'pending'; is_fixture boolean default false; UNIQUE(author_id,request_id) |
| conversations | id uuid PK; news_item_id uuid? UNIQUE FK news_items(id); root_post_id uuid? UNIQUE FK posts(id); created_at timestamptz; CHECK num_nonnulls(news_item_id,root_post_id)=1 |
| replies | id uuid PK; conversation_id uuid FK conversations(id); parent_reply_id uuid?; author_id uuid FK profiles(user_id); request_id uuid; body text; language text; created_at timestamptz; deleted_at timestamptz?; moderation_state text default 'pending'; is_fixture boolean default false; UNIQUE(author_id,request_id); UNIQUE(id,conversation_id); composite FK(parent_reply_id,conversation_id) to replies(id,conversation_id) |
| translations | id uuid PK; entity_type text CHECK post/reply; entity_id uuid; target_language text; original_language text; translated_text text; source_hash text; provider text; model_id text; prompt_version text; provenance text CHECK live/fixture; created_at timestamptz; UNIQUE(entity_type,entity_id,source_hash,target_language,provider,model_id,prompt_version,provenance) |
| reports | id uuid PK; reporter_id uuid FK profiles(user_id); entity_type text CHECK post/reply; entity_id uuid; reason text CHECK threat/harassment/hate/doxxing/impersonation/scam/spam/other; details text default ''; status text default 'open' CHECK open/reviewed/resolved; request_id uuid; created_at timestamptz; UNIQUE(reporter_id,request_id); UNIQUE(reporter_id,entity_type,entity_id) |
| moderation_events | id uuid PK; entity_type text CHECK post/reply; entity_id uuid; decision text CHECK allowed/flagged/blocked; reason text; provider text; model_id text; prompt_version text; created_at timestamptz |

Handles: lowercase ASCII `[a-z0-9_]{3,30}`; reserve admin, administrator, samvad,
support, moderator, system; CITEXT uniqueness enforces case collisions. Display
names may duplicate, proposed max 80 code points, bio 280. Post/reply body must
contain non-whitespace text and be <=2000 PostgreSQL Unicode code points
(`char_length`, not bytes/graphemes); UI counter must match. Preserve original
Unicode and emoji, never normalize/replace body with translation. Excerpt max 600
code points, title 300, report details 1000. These limits need A's agreement.

News has one primary `topic` for P0 agreement; optional many-topic join deferred.
Summary fields are nullable and server-only; ungenerated seed content stays null.
Moderation storage CHECK: pending/allowed/flagged/blocked. Public visible predicate:
`deleted_at IS NULL AND moderation_state='allowed'`. Owner may inspect their own
pending content; no deleted body is returned. Public conversation and reply reads
also require visible root; reply visibility requires visible conversation.

## RLS/grants proposal (default deny, all tables RLS enabled)

| Table | anon/authenticated SELECT | Authenticated mutation | Trusted server/reviewer |
|---|---|---|---|
| profiles | Public fields only | Owner updates handle/display_name/bio/preferred_language, immutable user_id/created_at | Restricted provisioning |
| private_identities | No client SELECT, including owner (scope §7 stricter than DPR owner-read suggestion) | None | Private operator path only; derive email/verification from Auth, never client claims |
| interests | Public | None | Seed/admin write |
| user_interests | auth.uid()=user_id only | Owner insert/delete only | No public join exposure |
| news_items | Public | None | Curated trusted writes |
| posts | Visible public or own nondeleted pending/flagged/blocked | Owner INSERT, WITH CHECK author_id=auth.uid(), pending, deleted_at null, is_fixture false; no direct UPDATE/DELETE | Atomic screening transition; restricted soft-delete own RPC |
| conversations | Visible root only | No direct writes | Atomic get-or-create with root authorization and uniqueness |
| replies | Visible root and (visible reply or own nondeleted reply) | Owner INSERT pending only, visible authorized conversation, parent belongs to same conversation; no direct UPDATE/DELETE | Screening transition; restricted soft-delete own RPC |
| translations | Source visibility and matching current body hash; live provenance only for ordinary mode | None | Server validates source, cache writes; explicit demo-only fixture retrieval |
| reports | Reporter reads own only; no reported-author access | Insert reporter_id=auth.uid(), status=open, valid accessible target; no update/delete | Restricted reviewer path reads/changes status |
| moderation_events | None | None | Reviewer/server only; no raw private content |

RLS alone does not restrict mutable columns: use column grants and immutable-field
triggers. No client may change moderation_state, author, created_at, fixture flags,
cached text, report status or verification. Client soft deletion uses a narrow RPC
that verifies auth.uid(), sets deleted_at and clears/redacts body atomically;
public reads then exclude it. Do not grant arbitrary UPDATE for delete UX.
Any security-definer RPC must pin search_path, qualify references, revoke PUBLIC
execute and explicitly validate identity/ownership. Prefer invoker functions for
ordinary reads. Never put service-role or reviewer authority in editable user metadata.
Private identity is not joined into public views/RPCs; owner email comes from Auth.

Polymorphic entity IDs in translations/reports/events require a constrained server
function/trigger to validate target existence/type; plain UUID is not a foreign key.
Visibility predicates must use invoker-safe nonrecursive queries; test actual RLS
execution to avoid recursive policy loops. Reply self-parent/cycle insertion is
rejected; parent ID must already exist in same conversation. Root ownership and
pending state must be enforced on conversation creation.

Index posts(created_at DESC,id DESC) filtered visible; replies(conversation_id,
created_at,id); news_items(published_at DESC,id DESC); user_interests PK;
reports(reporter_id,created_at); translations composite cache key. Feed/reply cursor
uses timestamp + UUID with a documented consistent sort direction. Same request_id
and identical payload returns existing content; reused key with changed payload
returns conflict. Content/request-id comparison is atomic, including concurrent retries.

At P4 use a restricted server worker for publication: pending -> allowed only after
validated screening; flagged/blocked remain private; failure remains pending.
Soft-deleted sources invalidate cache visibility. No arbitrary client publication
or paid fallback. Reports never auto-ban based on counts.

## Migration acceptance (deferred, not run)

Anon, A, B and reviewer matrix; A/B cannot read private_identities, mutate each
other, publish pending content, set fixture flags, change report status, retrieve
another reporter or stale/deleted-source translation. Verify case-folded handles,
Unicode round trips, root XOR, same-thread parents, request retry concurrency,
cache uniqueness, grant restrictions and no service-role key in client paths.
