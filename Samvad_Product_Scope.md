# SAMVAD — PRODUCT SCOPE & FEATURE FREEZE

**Version:** 1.1 — Hackathon implementation baseline  
**Date:** 23 October 2026  
**Status:** Proposed freeze for the 24-hour, two-person prototype; product direction established, feature priorities are implementation recommendations  
**Inputs:** Prior Samvad/Varta brainstorming and master brief; teammate's `India_Social_Media_App_Features.md` (planning reference, not a mandatory build checklist).

> **Product:** An India-first, AI-native, open public conversation network. **Pilot:** a small, university-sized set of users to validate the experience. Samvad is **not** a university-specific app and must not be branded as one.

## 1. Product vision and positioning

Samvad is a mobile-first social network where strangers discover and discuss posts, news, and ideas openly. It is inspired by X's fluid public conversation model—not Discord rooms or mandatory Reddit-style community memberships. Its distinctive promise combines **public pseudonyms with private accountability**, **cross-language conversations**, **a nonempty interest-led discovery feed**, and **friction-reducing Indian-first interaction design**.

**Working pitch:** *Samvad lets India talk across languages, without forcing people to reveal their real names to everyone.*  
**Working line:** *Speak freely. Stay accountable.*  
Neither line is finalized marketing copy. Avoid promises of perfect anonymity, zero bias, or guaranteed safety.

### User problem

- New networks feel empty and lack reasons to revisit.
- Many users hesitate to speak under their real names, particularly on controversial domestic topics.
- Language boundaries limit participation even when people share interests.
- News is consumed separately from discussion; users must work to find relevant conversation.
- Many social products optimize attention but do not make starting a thoughtful reply easy.

### What Samvad is not

- Not a campus-only app, news reader with comments, or community-room product.
- Not a platform where users can post harmful content without consequences.
- Not an attempt to reproduce X's complete infrastructure in one hackathon.
- Not a feed dominated by short video/reels.

## 2. Intended users, pilot and launch hypothesis

**Long-term users:** Indian internet users who enjoy public discussion: students, working professionals, creators, researchers, journalists, and everyday readers across languages and regions.  
**Prototype testers:** a manageable, diverse, university-sized group representing multiple language backgrounds. The university is a convenient microcosm of India and a practical test environment, not the product's identity or a mandatory affiliation requirement.

**Core hypothesis:** A person is more likely to contribute when they see relevant topics immediately, can read in their preferred language, and can speak through a public pseudonym while the platform enforces basic accountability.

**Early validation:** observe successful first-session discovery, first reply, cross-language comprehension, and return intent. These are hypotheses to test, not proven outcomes.

## 3. Product principles / guardrails

1. **Open network:** any eligible user can browse public posts and reply without joining a room.
2. **Pseudonymous public identity:** unique handle and display name; email and optional verified legal identity are private.
3. **Honest identity language:** an email account is not proof of a person's legal name. If actual identity verification is not implemented, do not claim it is.
4. **Multilingual by design:** preserve original text; translations are clearly labeled, reversible, and never silently overwrite authors' words.
5. **News seeds, people sustain:** sourced articles initiate discussion; original posts and replies must be first-class content.
6. **Trust and safety:** criticism and disagreement are allowed; harassment, threats, doxxing, impersonation and targeted abuse are not.
7. **Low-friction HCI:** fast feed, one-tap summary, clear reply entry, comfortable text composition, minimal onboarding.
8. **Mobile and low-data conscious:** Support Android and iOS with tolerance of unstable connectivity.
9. **Evidence over claims:** do not fabricate news, users, interactions, or moderation outcomes in a live pilot; label demo fixtures.

## 4. Main navigation and information architecture

**Recommended bottom navigation:** Home · Explore · Compose (+) · Activity · Profile.

- **Home:** blended discovery feed of sourced news conversation cards and original user posts; optional Following tab when follows exist. No compulsory room or group selection.
- **Explore:** topics/interests, search (basic for prototype), people and current conversation prompts.
- **Compose:** short text post in any supported script; show public handle, length feedback, and posting state.
- **Activity:** replies, mentions/follows if built; avoid fake notifications.
- **Profile:** public pseudonym, bio, authored posts and replies; private settings separately.
- **Conversation detail:** article attribution/optional AI brief, original post, replies, translate/show-original actions, report controls.

**Proposed first-session flow:** Sign up → choose public handle → choose preferred reading language and 2–4 interests → populated feed → open story/post → optionally read 3-line AI brief → read or translate replies → publish own reply → see reply in thread.

## 5. Feature map and freeze

Legend: **MUST** = hackathon acceptance-critical; **SHOULD** = build if core stable; **LATER** = future product backlog; **GATE** = safety/privacy requirement whenever relevant capability is enabled.

| Area | MUST — 24h demo | SHOULD — if time | LATER / defer |
|---|---|---|---|
| Accounts | Email auth, private contact details, logout, unique public handle | Profile editing, avatar | Phone OTP, MFA, passkeys, account export |
| Onboarding | Language and interests; skip nonessential steps | Suggested accounts/topics | Deep personalization and onboarding experiments |
| Profiles | Public handle/display name, authored posts | Bio/avatar, follow/unfollow | Private accounts, affiliation badges, organization profiles |
| Posting | Original text posts, Unicode, durable submission, delete own post | Likes, simple hashtags, links | Image/video/audio posts, polls, scheduled posts |
| Discussion | Threaded replies, conversation detail, authors shown by handle | Reply count, reply notifications, repost/quote | Complex reply permissions and multi-post threads |
| Feed | Seeded sourced news + real/demo-labeled posts, interest filter, stable refresh | Following feed, cursor pagination, simple search | Sophisticated ranking, trends, user-selectable algorithms |
| News | Attributed headline, source, link, short excerpt, discussion thread | AI 3-line brief, event grouping of 2–3 related sources | Live multi-publisher ingestion, comprehensive event clustering |
| Multilingual | English/Hindi/Malayalam original posts, read-in-language translation, show original | Tamil, caching, language detection, transliteration | Speech translation, full-language search and semantic discovery |
| Identity & safety | Pseudonymous public profiles; report content; basic rate limits; moderation state | Warning UI, small admin review screen, block user | Appeals workflow, full trust & safety operations, fraud detection |
| HCI | Responsive mobile navigation, clear loading/error states, intuitive reply entry | Quick opinion prompts, save drafts, dark mode | Advanced accessibility/personalization experiments |
| Analytics | Minimal non-sensitive events: onboarding complete, opened thread, replied | Translation use and return visits | Cohort dashboards, A/B experiments |
| Infrastructure | Working app on Android and iOS (Expo Go acceptable for both), database access controls, secure AI API | Realtime replies, basic monitoring | Multi-region scale, caches, queues, ML ranking |

**Important:** The teammate's P0/P1/P2 refer to a **real public launch**. They are not automatically 24-hour MVP priorities. In this document MUST means *prototype-critical*, not *legally sufficient for a public release*.

### The minimum demonstrable product

1. User A registers, picks interests and preferred language, and receives a populated feed.
2. User A sees a real attributed news story, optionally reads its short brief if enabled, and opens the conversation.
3. User A replies in Malayalam using a pseudonymous handle.
4. User B, using a different account and Hindi or English preference, reads the translation, can reveal the original, and replies.
5. User A sees B's reply and can continue the exchange.
6. A user can also publish a standalone original post unrelated to news.
7. A report can be submitted and recorded; unsafe content is not automatically equated with disagreement.
8. No ordinary user can retrieve another user's private email or internal identity record.

## 6. Cold-start strategy

**Content cold start:** seed a small curated set of *genuine, attributed* stories with topic labels; include original user posts and a daily conversation prompt. Multiple reports of the same event may link to one discussion hub when explicitly curated.  
**Social cold start:** invite a small group of real participants and let them start actual conversations; for the judges, use clearly labeled fixture accounts/posts if necessary. Do not fabricate apparent public engagement.

**Feed blending proposal:** interest-relevant story hubs + recent public posts + optional Following. Simple deterministic ranking (recency + interest match) is adequate; do not claim a sophisticated recommendation algorithm.

**News rights:** store headlines, URLs, source names and short permitted excerpts; link out to publisher sites. Summarize only content legitimately available to process. Do not scrape paywalls or republish entire copyrighted articles. News ingestion can be a curated admin seed dataset for the hackathon.

## 7. Pseudonymity and identity trust model

- Public: `@unique_handle`, optional display name/avatar/bio, posts and replies.
- Private: auth user ID, email; any real-name/affiliation fields only if genuinely collected for a stated purpose, never shown publicly.
- Handles must be unique; display names may repeat. Reserve administrative names and provide an impersonation-report path.
- A verified email proves control of that mailbox, not a real-world identity. The pilot may verify affiliation only if necessary and consented to; avoid collecting Aadhaar or other government IDs by default.
- Reports should never expose reporter identity to the reported user.
- Do not permit client reads of the private identity table. Admin access must be narrowly restricted and audited if implemented.
- Define explicit privacy copy: **"Your public handle is visible. Your account email is not displayed. Platform operators may have access to account records under stated rules."**

## 8. Multilingual UX specification

**Initial prototype languages:** English (`en`), Hindi (`hi`), Malayalam (`ml`). Tamil (`ta`) is a stretch, not a promise.  
**Core behavior:** user authors in any supported script; original is stored; readers can request a translation to their preferred language; translated output is marked "Translated by AI" with a "Show original" toggle.  
**Input:** Unicode text, code-mixed Hinglish/Manglish, emojis, Indian-script names. Avoid automatically "correcting" colloquial language.  
**Quality:** test short posts, slang, sarcasm, Malayalam script, mixed Latin/Indic text and harmful content; provide fallback when translation fails.  
**Safety:** moderate original and, where helpful, translated variants; flag uncertainty for human review. A model may miss culturally specific abuse.

## 9. Moderation and safety UX

- Show short community guidelines at first use and accessible report actions on posts/replies/profiles.
- For MVP, use rate limiting and server-side AI-assisted screening with a conservative action policy: allow, flag for review, or block only clearly prohibited high-severity content.
- Record report reason, target, reporter and status; prevent duplicate mass reports from being treated as proof.
- Do not equate unpopular viewpoints, political criticism, or disagreement with harassment.
- Show understandable feedback when content is held; retain a minimal moderator/admin path to inspect flags. Do not claim a fully staffed moderation program.
- Before real public launch, implement comprehensive reporting, appeal, age, grievance and privacy requirements and review current legal obligations.

## 10. HCI focus and acceptance criteria

**Research question:** Can a culturally familiar, pseudonymous and multilingual experience reduce the friction between discovering an issue and joining a public conversation?

**Design patterns:**
- Feed populated on first entry; distinguish news cards from user posts.
- Summary is optional, never forced; one tap to expand a three-line brief.
- Comment CTA visible near story context; show existing replies and composer without excessive navigation.
- Public handle visible at composition time to reinforce pseudonymity without promising untraceability.
- One-tap translation/original toggle at post level.
- No required groups, rooms, or excessive onboarding categories.
- Visible retry and saved draft behavior on unstable connections.

**Quick test (3–5 multilingual testers):** Can each find a relevant topic, understand a different-language reply, publish a response, identify their public identity, and explain how to report abuse? Record friction and failures, not just positive feedback.

## 11. Explicit exclusions for this hackathon

DMs, group rooms, video/reels, audio rooms, payments/ads, premium badges, AI chat companions, full recommendation ML, phone OTP infrastructure, government-ID verification, advanced private accounts, live news crawling, nationwide rollout, automated bans based solely on report count, comprehensive legal compliance certification.

These exclusions **do not remove** them from a future roadmap where justified; they simply prevent scope creep.

## 12. Acceptance gates and measurable outcomes

**Must pass:** end-to-end journey verified separately on Android and iOS; two-account reply loop; original text preservation; cross-language toggle; news source attribution; standalone post; reports persisted; private contact data inaccessible to other users; no secret API keys embedded in app; graceful AI failure.

**Suggested observational measures:** onboarding completion, first discussion opened, first reply completed, translation usage, median time from article open to first reply, and qualitative willingness to return. Do not claim retention without actual longitudinal data.

## 13. Team division and prioritization

- **Mobile/HCI owner:** design tokens, navigation, onboarding, feed, conversation, compose, multilingual toggle and usability checks.
- **Backend/AI owner:** Supabase schema/RLS, auth integration, seeded news, posts/replies, translation/summarization endpoints, moderation and fixtures.
- **Both:** integration checkpoints, tests, Android and iOS builds/demos, demo story and fallback plan.

**Priority rule:** working cross-language conversation > reliable posting and privacy > attractive UI > additional social features. A polished broken app is not a successful demo.

## 14. Decision register

| Item | Decision |
|---|---|
| Name | **Samvad** (replaces Varta) |
| Vision | Nationwide India-first open social network |
| Deployment | University-sized pilot only; no campus-specific product branding |
| Social model | X-style open posts/replies; no mandatory communities/rooms |
| Core differentiators | Pseudonymity, multilingual conversation, seeded discovery, Indian-first HCI |
| News | Seed conversation, do not become only a news aggregator |
| Original posts | Essential |
| Languages | Recommend EN/HI/ML for MVP; TA stretch |
| Mobile | Android and iOS from one React Native/Expo codebase |
| Backend | Supabase + FastAPI recommended, subject to team familiarity |
| Full public launch | **Not** the 24-hour deliverable |

## 15. Future roadmap from teammate checklist

**After validated pilot:** follow graph and chronological Following feed; likes/reposts/quote posts; bookmarks; search; stronger notifications; richer profiles; low-data mode; moderation dashboard and appeals; account deletion/export; optional affiliations.  
**Later if demanded:** media formats, richer personalization, transliteration/voice typing, region-level discovery, public web previews, organization accounts.  
**Only after separate product/security design:** DMs, private accounts, communities, payments, subscriptions, extensive live news aggregation, sophisticated anti-manipulation, multi-region architecture.

**Public launch gate:** The teammate's checklist rightly includes account recovery, legal/age review, data retention/deletion, appeals, moderation capacity, security audits, observability and recovery. These are not waived by their exclusion from the hackathon build.

## 16. Platform delivery and free-tier AI policy (revision 1.1)

**Platform commitment:** Android and iOS are equal MVP targets using one React Native/Expo/TypeScript codebase, shared Supabase project and shared FastAPI service. Both platforms must support the same signup, onboarding, feed, post, reply, translate/show-original and report flow. Test keyboard behavior, safe areas, Indic fonts, session restoration and external links on each platform. Prefer an Android-to-iPhone two-account conversation for the final demo.

**Hackathon delivery:** Expo Go on Android and iPhone is an acceptable demonstration path when the chosen dependencies support it. A signed Android APK and an iOS development/TestFlight build are optional packaging improvements when existing tooling and credentials permit. Store publication is outside scope. Windows developers can test on a physical iPhone; the local Apple iOS Simulator requires macOS. Missing iOS hardware must be recorded as BLOCKED, never as a passing iOS test.

**AI budget is zero:** All app AI features (translation, optional briefs and moderation triage) must use hosted free-tier inference only. No paid AI subscription, pay-as-you-go use, paid fallback or automatic billing upgrade. Open model weights do not imply free hosted inference. Self-hosting is not the default because it adds hardware and deployment work.

**Recommended starting point:** Qwen through the Groq Free plan, subject to account availability and language evaluation. The checked model example is `qwen/qwen3.8-27b`; keep all model IDs configurable and recheck before use. Gemma through Google AI Studio is an alternative if a currently available free-tier model performs better on our test set. Neither is assumed best for Malayalam without testing. See DPR section 9.5 for provider selection, official sources and quota handling.

**Acceptance:** Test EN/HI, EN/ML and HI/ML with native-script and code-mixed examples; retain original text. On quota exhaustion, serve valid application-cached results, otherwise return a clear unavailable/rate-limited result. Use fixtures only in explicit labeled demo mode. Unscreened new content stays pending if moderation is unavailable. No private identity records are sent to AI providers; document provider data handling for testers.

## 17. Source mapping and reconciliation

- **Prior Samvad discussion/master brief:** national-scale vision; university as test population; open X-style stranger conversations; news-led cold start; optional three-line summaries; pseudonymous expression; AI moderation; multilingual India-first HCI; mobile delivery.
- **Teammate feature checklist:** comprehensive social product categories, reliability and privacy/security gates, Indian-script support, Android/iOS low-data behavior, metrics, and post-launch roadmap.
- **Resolved tension:** checklist proposes optional communities, private accounts, DMs, media and many P0 launch requirements. We **do not** add these to the 24-hour build or alter the no-rooms vision; we retain relevant items as future options and launch gates.
- **Resolved tension:** checklist labels translation P1 for general launch planning; for **Samvad**, cross-language conversation is a **prototype MUST** because it is central to the agreed USP.
- **Resolved tension:** checklist's real-world verification suggestion is optional. Samvad's prototype can securely verify an email account, but must not claim verified legal identities without actual checks.

---

**Scope freeze statement:** Build a working X-style public conversation loop on Android and iOS seeded by sourced news, enabling original posts and pseudonymous multilingual replies. Everything else supports that demonstration or waits.
