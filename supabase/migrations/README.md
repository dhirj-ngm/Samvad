# P0 migration plan — no executable migrations yet

No schema has been applied locally or to a shared project. Draft design is in
`../schema-proposal.md`; seed structure is in `../seed-format.md`.

After captain/A agreement, Developer B alone should author and test ordered SQL:
1. `001_identity_interests.sql` (P1): extensions, public profiles, private identity,
   interest tables, constraints, grants, RLS, restricted provisioning.
2. `002_news_posts.sql` (P2): news, posts, root conversations, visibility and
   request-id uniqueness, controlled write boundaries.
3. `003_replies_reports.sql` (P3): replies, parent constraints, protected reports,
   reviewer-only audit path, write limits.
4. `004_ai_cache_events.sql` (P4): translations, moderation events, cache indexes.

Before shared apply: use a disposable Supabase database, test clean install and
repeatable seed import, inspect effective grants, then run anon/A/B/reviewer
negative-access checks. Test attempts to self-publish, mutate ownership, cross-thread
reply, forge verification, read deleted bodies and read another reporter's data.
Include rollback/recovery notes and backups before any destructive change. Do not
run reset against shared data. P0 has no database/RLS passing claim.
