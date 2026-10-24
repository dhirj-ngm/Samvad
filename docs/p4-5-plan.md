# P4.5 implementation plan: profiles and social experience

Execution update: non-AI vertical slices are implemented locally on
`feature/p4-5-social`. The planning scope below is retained. 96 SQL/20 mobile tests,
TypeScript, Expo compatibility, both platform exports and 79 API tests (3 legacy
live skips), Ruff/pip check pass. Docker local Auth/Storage HTTP and shared SDK
checks now pass; seven local migrations, lint/advisors clear. Hosted migration,
device/email/pilot gates remain pending; no push or hosted changes.
See [verification](p4-5-verification.md).
This supersedes the historical planning-only/next-slice status below.

Date: 24 October 2026. Planning baseline: main `4d6c321`.
Ownership: one implementation session acting as Developer A, Developer B and
integration owner, as requested. This document records the next implementation
steps; features below are not claimed implemented or tested.

The user's latest instruction excludes AI work. It overrides AI priorities and
kickoff prompts in the supplied [change request](Samvad_P4_5_Polishing_Decisions.md).
The Downloads original is preserved. Existing product principles remain: one
Android/iOS Expo app, open conversations, public pseudonyms, private account data,
news attribution and a university-sized pilot without campus-only branding.

## Current app and gaps

- Existing onboarding already stores preferred_language and interests and retains
  an unfinished save for retry. Native-script labels exist for en/hi/ml.
- Profile currently shows handle, reading language, setup/edit entry, logout and
  own submissions. It has no avatar, public visitor route, editable name/bio,
  follow graph, social lists or repost collection.
- Home and Explore share the existing mixed news/post feed. Explore currently
  filters topics only. Cards link to context/publisher; they have no social actions.
- Replies, reports, durable account-scoped drafts and publication visibility rules
  already work. Keep their retry and authorization behavior when adding mentions.
- Existing P4 AI translation/brief/screening UI and API remain unchanged. Prior
  human-language/policy and P4 device gates are not erased by this plan.

## 4.5A: scope and contract alignment

Deliverable: this execution plan and an additive design, reviewed against existing
profile/feed/thread DTOs and migrations before changing implementation.

- Preserve existing UUIDs, profile handles, source URLs, conversations, posts,
  reply parents and request keys. Use forward migrations, never schema resets.
- News is not a fake human post: reuse its conversation identity for social actions
  so news and original posts support the same action row without copying content.
- Derive the actor from the authenticated session/server identity for every write.
  Never accept an arbitrary follower/liker/reposter/mention-author identity.
- Define exact RPC/DTO contracts together when implementing each slice. Keep P4
  endpoints unchanged. Batch interaction counts/state for a feed page rather than
  querying separately for every card.
- Keep the existing handle grammar stable to avoid breaking accounts and mention
  lookup. Indian-script display names, bios and content remain supported. Any
  future expansion of handle syntax needs its own uniqueness/mention migration.
- Canonical language registry starts with the actually supported en/hi/ml choices,
  labeled English, हिन्दी, മലയാളം. A registry is not a promise of extra translation
  coverage or full UI localization. Expanded provider/model coverage is deferred.

## 4.5B: onboarding and complete personal/public profiles

Mobile changes:

1. Make handle, native reading language and interests clear first-run steps.
   Explain that the reading language applies to supported on-demand translation;
   retain the original text. Optional avatar and interests never block signup.
2. Build one profile presentation reused for self and public visitors: avatar or
   initials, display name, @handle, bio, follower/following counts and content tabs.
   Show Edit Profile/settings to the owner and Follow/Unfollow to other users.
3. Add editable display name/bio, language and My Interests with save progress,
   success confirmation, draft preservation on error and reload after persistence.
   Refresh feed personalization after preferences change; keep pending post/reply
   drafts in their authored language rather than rewriting them.
4. Add avatar select, crop/preview, upload/replace/remove and fallback. Provide
   permission-denied, cancel, oversized/unsupported image and network error states.
5. Put logout and private account information in owner-only settings. Public routes
   never fetch or render email, verification records or other private identity data.
6. Profile Posts/Reposts show public content; pending/held own submissions remain a
   separate owner-only status section rather than appearing published to visitors.

Backend changes:

- Add an optional storage path on profiles using a forward migration and narrow
  owner-write grants; return only intended public profile fields.
- A dedicated avatar bucket accepts only bounded JPEG/PNG/WebP images. Validate
  type/size on client and storage bucket, restrict paths to the actor's UUID, and
  test upload/replacement/removal with ordinary user credentials. No SVG, arbitrary
  remote avatar URL or credentials in paths. Profile images are explicitly public.
- Use unique versioned object paths for replacements to avoid stale caches. Keep
  the old avatar until the new upload/profile save succeeds; delete superseded
  objects after confirmation. Failed saves must not erase a working avatar.
- Preserve existing preference and interest ownership rules; serialize local saves
  and verify the desired set before confirming a completed multi-request save.

Acceptance: A selects Malayalam, logs out/in and retains it; edits name/bio/avatar
and interests; changes language to Hindi. B sees only public fields. Subsequent
existing translation actions use Hindi without changing original text or invoking
any newly implemented provider. A failed save retains the user's draft/avatar.

## 4.5C: durable social actions

- Add unique likes and reposts per user/conversation and follows per user pair;
  reject self-follow. A conversation points to the existing original post or news
  source, preserving attribution. Never create orphaned repost text copies.
- Prefer explicit desired-state writes (liked=true/false, following=true/false,
  reposted=true/false), not a toggle RPC whose retry might undo the first request.
  Return confirmed state and counts; serialize taps and preserve state on failure.
- Enforce RLS, narrow grants, target visibility and server timestamps. Index reverse
  follower and target-count lookups as well as unique actor/target pairs.
- Public social reads may expose public handles/relationships, never private email,
  report metadata or hidden/deleted root content. Reposts of removed/held sources
  become unavailable, and likes/reposts must not bypass publication decisions.
- Add a consistent feed/conversation action row: Like, Reply, Repost and accessible
  overflow/report. Clearly distinguish News/Source from a person's original post.
- Follower/following counts open paginated public-handle lists. Counts come from
  actual stored relationships, not fixture numbers or client-only increments.

Acceptance: A/B follow/unfollow, like/unlike and repost/unrepost survive refresh and
relogin; repeated taps/retries do not duplicate rows; B cannot forge A's actions;
counts agree across both accounts. Both news and original posts are covered.

## 4.5D: people discovery, mentions and feeds

- Extend Explore with Topics and People, searchable public handles/display names,
  loading/empty/error states, bounded pagination and public profile navigation.
- Link author avatars/handles from feed cards and replies to the same public
  profile. Avoid a second inconsistent profile implementation.
- Add @mention suggestions and resolve valid handles on the server when posts or
  replies are durably created. Store stable target UUIDs; later handle edits must
  not silently redirect an old mention to a different person. Unknown handles
  remain ordinary text. Preserve original authored content and retry behavior.
- Mention rendering uses stored valid targets; respect source visibility and
  deletion. Mentions do not grant access to held content or private identity data.
- Reposts appear with reposter and original author/source attribution, linking to
  the original conversation. Add Following only once the real follow graph is
  queryable; provide a useful empty state and People discovery for new accounts.
- Notifications remain optional. Do not fabricate Activity items to fill the tab.

Acceptance: People search finds B; A can visit/follow B and insert a valid mention;
the saved mention opens B's profile; a repost opens the original thread. A removed
or held root never leaks its content via reposts, search, counts or mentions.

## 4.5E: manual review, polish and pilot preparation

- Build a separately protected manual report-review path, backed by trusted
  server-controlled admin membership and recorded reviewer actions. Reuse the
  existing reports; never grant ordinary users a cross-account report listing.
- Human actions can dismiss/mark reviewed or hide/restore content with a reason
  and audit record. Warn notices must be factual and non-accusatory. Sensitive
  account suspension requires explicit human confirmation and separate tests;
  report count alone never triggers punishment. No AI triage upgrade in this slice.
- Verify Android/iOS safe areas, keyboard handling, scroll behavior, readable Indic
  glyphs, contrast, screen-reader labels, touch targets and slow-network recovery.
  Use original Samvad styling inspired by familiar social interactions, not Koo
  assets/branding or a pixel-for-pixel clone. No framework rewrite.
- Prepare hosted HTTPS/mobile-data/email-confirmation/pilot instructions and an
  aggregate feedback checklist. Preserve the current environment and secrets.
  No email invitations, store publication or new paid service is implied.
- Ten-user acceptance requires ten real consenting participants and observed
  sign-in/post/reply/social activity. Automated fixtures are not ten real users.
  Translation/AI validation belongs to the later AI workstream and must not block
  the non-AI P4.5 implementation or be marked passed here.

## Explicitly deferred

Sarvam and any metered credits, new AI providers/models, expanded translation
coverage, new/long-thread summaries, AI moderation/model/policy changes, fine-tuning,
GPU/Colab/Hugging Face hosting, paid upgrades and AI benchmarking. Existing P4 AI
paths remain regression-tested and unchanged. Also defer DMs, general media posts,
recommendation ML and optional notifications until the core social loop is stable.

## Validation and handoff

- Run baseline and slice-relevant mobile model tests, TypeScript, database migration/
  RLS tests and API tests. Add meaningful cross-account/visibility/retry regressions.
- Use the Supabase/Postgres skills and current docs before implementation. Discover
  the installed CLI and its migration commands; do not invent migration versions.
  Separate local checks from hosted migration and device verification evidence.
- Preserve P0-P4 flows and current AI source files. Record actual pass/fail/blocked
  in both owner logs and a P4.5 verification checklist. Never equate a bundle export
  with an Android/iPhone launch or a fixture with a real pilot account.
- Keep changes on a local feature branch, with reviewed combined A/B contracts.
  Prior no-push instruction remains in force; no remote push, deployment or hosted
  migration is performed by this planning step. P5/P6 remain separate phases.

Planning completed: source reviewed, current app inspected, non-AI scope reconciled
and implementation sequence recorded. Next implementation slice is 4.5B profile/
onboarding and the supporting profile/storage contracts, followed by social graph.

Implementation references: [Storage policies](https://supabase.com/docs/guides/storage/security/access-control),
[React Native upload guidance](https://supabase.com/docs/reference/javascript/storage-from-upload),
[Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/).
