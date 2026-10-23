# Seed format — P1 interests and later content proposals

P1 update: six stable interest UUID rows are now part of
`migrations/202610230001_identity_interests.sql`, exercised only in local SQL tests.
No news, account or fixture content has been imported; the rest remains a proposal.

No live news, fake engagement, accounts or credentials have been seeded. Later
admin import accepts UTF-8 JSON with `schema_version: 1`, arrays `interests`,
`news_items`, `fixture_posts`, `fixture_replies`. IDs are stable UUIDs. Upsert
interests by slug, news by source_url, fixtures by fixed ID; payload conflicts must
be reviewed rather than silently overwriting authors' original text.

Interest slugs: sports, business, technology, infrastructure, politics, culture.
`politics` covers public policy; no campus membership fields. Each interest row:
`{"id":"<uuid>","slug":"technology","label":"Technology"}`.

Each news row must supply id, title, source_name, source_url, excerpt, language,
published_at (ISO-8601 UTC), topic, plus import-only rights_note and reviewed_at.
Use 6–12 genuine publisher links and permitted short excerpts, no paywall scraping.
Validate HTTPS, source attribution, topic FK and deduplicate source_url. Summary
fields default null; do not fabricate AI summaries. Store rights metadata in the
reviewed seed artifact; not in public content unless contract is extended.

Fixtures (3–5 posts and a few replies in P2/P3) require authorized demo account IDs
provisioned separately, `is_fixture=true`, visible demo labeling, supported language,
stable id/request_id and original Unicode body. Replies also need conversation_id
and optional parent_reply_id. News conversations require exactly one root.
Import through a trusted reviewed path, never through relaxed public RLS. Do not
seed private emails, passwords, access tokens or service keys. A fixture must not
impersonate a publisher or a real user. No fabricated URLs or article quotations.

AI fixture file (P4, separate from DB seed) additionally records entity/source hash,
target_language, provider/model/prompt_version and provenance=fixture. It is served
only with DEMO_MODE=true and an explicit fixture label. A live cache entry uses
provenance=live in storage and cache in the response. Model failure never promotes
unscreened seed/user content to public automatically.
