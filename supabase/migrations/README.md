# Identity migration and later-phase plan

P4.5 **LOCAL ONLY**: `20261024000335_social_experience.sql` and forward
`20261024005128_p45_feed_array_type.sql` are recorded in the Docker local ledger.
The latter makes feed array initialization explicit to clear the local lint
warning, preserving behavior. Seven versions total locally; no recorded SQL was
rewritten and no reset performed. Local Auth/Storage HTTP, ordinary-account SDK,
lint/advisors and SQL checks pass. Neither P4.5 file is applied to the hosted
project. See [actual evidence](../../docs/p4-5-verification.md).

P4: `20261023225554_multilingual_ai.sql` deployed to agreed development project.
Creates private server-only cache, global budget reservations and moderation events
with service-only ai_control operations. Original user tables/policies preserved;
no reset or destructive migration. SQL role tests verify clients cannot call the
server operations or read private cache/events. P4 setup and gate: docs/p4-verification.md.

P3 deployment (24 October): `20261023213814_conversation_safety.sql` is applied to
the agreed development project. Adds replies, private reports, controlled RPCs and
account write budgets; preserves all P1/P2 data. File created by CLI then aligned
with hosted ledger. No reset or destructive rollback. Forward fixes use a new
migration; do not drop populated tables or rewrite applied SQL. Restore only with
an explicitly agreed backup/recovery procedure. See docs/p3-verification.md.

P2 deployment (24 October): `20261023210206_discovery_posts.sql` and
`20261023210636_consolidate_post_read_policy.sql` are applied to the agreed
development project. Filenames match the hosted ledger. The first creates P2
content/RLS/RPCs plus six sourced archive records; the second consolidates
equivalent read policies after advisor feedback. See docs/p2-verification.md at
repository root for actual checks and the remaining phone gate. P1 is not reapplied.

P1 `20261023201908_identity_interests.sql` implements the captain-accepted P0 identity
baseline: profiles, private identities, interests, user_interests, Auth-owned private
sync, grants/RLS and six seeded topics. SQL passed 22 isolated PostgreSQL tests
and is applied to development project `mtgsyjqcoyzijicpydee`. The filename matches
the hosted MCP migration ledger version; do not reapply the old filename. See
`../README.md` for setup, real-account checks and migration/recovery steps.

Developer B alone applies reviewed migrations to the agreed development project.
P1–P3 files now exist; only AI below remains future work:

1. News/posts (P2): news, posts, root conversations, visibility and
   request-id uniqueness, controlled write boundaries.
2. Replies/reports (P3): replies, parent constraints, protected reports,
   reviewer-only audit path, write limits.
3. AI (P4): translations, moderation events, cache indexes.

Before shared apply: use a disposable Supabase database, test clean install and
repeatable seed import, inspect effective grants, then run anon/A/B/reviewer
negative-access checks. Test attempts to self-publish, mutate ownership, cross-thread
reply, forge verification, read deleted bodies and read another reporter's data.
Include rollback/recovery notes and backups before any destructive change. Do not
run reset against shared data. SQL-role tests are not real-user Auth/RLS evidence.
