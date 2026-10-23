# Identity migration and later-phase plan

P1 `202610230001_identity_interests.sql` implements the captain-accepted P0 identity
baseline: profiles, private identities, interests, user_interests, Auth-owned private
sync, grants/RLS and six seeded topics. SQL has been tested in an isolated in-memory
PostgreSQL engine, not applied to a full local/shared Supabase project. See
`../README.md` for setup, real-account checks and migration/recovery steps.

Developer B alone applies reviewed migrations to the agreed development project.
Future files below are planning only and do not exist:

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
