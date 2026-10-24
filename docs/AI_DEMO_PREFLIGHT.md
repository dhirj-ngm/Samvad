# AI demo preflight and teammate publication - 24 October 2026

This is an observed environment check before final AI development, not a claim
that the new AI demo is already implemented. No keys/passwords are included.
The existing P4.5 build is prepared for publication on `feature/p4-5-social`; main is
not automatically promoted and no hosted migration is performed by this audit.

## Final implementation update — 24 October 2026

The historical preflight below is superseded for the **local attended demo** by
`AI_DEMO_RUNBOOK.md` and `ai-demo-verification.md`.

| # | Current local status |
|---|---|
| 1 | Local Auth/database/gateway aligned; eighth migration applied locally and linted. Hosted environment unchanged. |
| 2 | Groq real English summary and moderation smoke succeeded; no paid fallback. |
| 3 | Saved Sarvam credentials used successfully; authorization ₹50 / 10,000-character maximum enforced by shared persistent reservations. |
| 4 | dolla, nightangel and blackman created; fourth account/password preserved; exact four-person fixtures and local reviewer prepared. |
| 5 | New preview on port 8086, gateway 8775; current Wi-Fi address 192.168.29.101. iOS/Android bundles compiled. Actual phone acceptance pending. |
| 6 | AI feature implementation is on local feature/ai-demo. Human multilingual evaluation and final venue rehearsal remain pending. |

## Historical six-prerequisite audit

| # | Item | Observed status | Remaining action |
|---|---|---|---|
| 1 | Supabase environment | LOCAL READY: Docker stack reachable; all seven migrations present. Hosted project `mtgsyjqcoyzijicpydee` has only the five P1-P4 versions. Existing API `.env` targets hosted; local P4.5 launcher deliberately clears the AI API URL. | Choose one coherent final demo path. Local demo requires an AI gateway configured for the same local Auth/JWKS/database. Remote/demo-phone mobile-data use requires approved hosted P4.5 migration and aligned gateway. Do not mix local JWTs with hosted keys. |
| 2 | Groq access | KEY/CATALOG READY: authenticated model-list HTTP 200; configured summary/moderation model IDs available. AI enabled and Free-plan/data flags set locally. | No inference requested in this audit; quota/performance still need a bounded later live check. `AI_LANGUAGE_REVIEW_PASSED=false`; preserve it until human evaluation passes. |
| 3 | Sarvam access and cap | MISSING: no server SARVAM_API_KEY found; account permission and usable-credit cap not supplied. No calls made. | Owner supplies permitted access/credit cap privately. Stage inputs in ignored `api/.env.ai-demo-inputs`, not the current strict runtime `.env`; new Settings fields are an AI implementation task. |
| 4 | Four personas and reviewer | PARTIAL: four confirmed local Auth users exist. Dedicated A/B local logins and separate R reviewer were revalidated via Auth; A/B are non-admin, R is a reviewer. The four named demo personas/relationships from the handoff are not seeded/mapped. | The AI implementation creates the scoped manifest/account mapping and repeatable seed. No need to invent four public email identities or overwrite personal test profiles. Hosted mappings/confirmations are separate if hosted is selected. |
| 5 | Gateway and presentation devices | PARTIAL: local API `/health` HTTP 200; configured public HTTPS tunnel `/health` HTTP 200; Expo 8085/status and iOS/Android manifests HTTP 200; Expo CLI signed in. | Tunnel is temporary, laptop-dependent and still targets current hosted API config. Phone-to-local-hotspot P4.5 acceptance is not confirmed. Verify presentation phones can reach the preview and local Auth; choose an existing HTTPS/tunnel route or optional approved Cloud Run. |
| 6 | Latest P4.5 work and presentation details | CODE READY FOR SHARING: local feature branch includes social/profile implementation and tests. No final AI implementation started. | Teammate uses this feature branch and their own local config, not older main/hosted schema. Demo date, time allowance, network and phone availability still need confirmation. |

## Fresh evidence from this audit

- Mobile model/client tests: 20 passed; TypeScript passed.
- SQL/PGlite suite: 96 passed; explicit Auth/Storage catalog shims, not a hosted test.
- API pytest: 79 passed, 3 live suites skipped because that test invocation did not
  load live configuration. Ruff and pip dependency check passed.
- Local Docker observed running; SQL read-only aggregate: seven recorded migrations,
  one reviewer membership and four confirmed Auth users. No profile/contact values
  or keys were printed.
- Local A, B, R: password-grant HTTP 200, `/auth/v1/user` HTTP 200, email confirmed;
  A/B admin_status=false, R admin_status=true. Only temporary audit sessions were
  signed out. No profile/social/Storage changes were made by these checks.
- Groq catalog HTTP 200; configured model availability checked without inference.
- Hosted migrations read through Supabase connector: five, ending at
  `20261023225554`. Neither P4.5 migration is deployed there.
- API/public-tunnel health proves liveness only. It does not prove Sarvam, inference,
  a correct local/hosted pairing, or phone reachability on the presentation network.

Existing recorded limitations remain: five high npm findings in the inherited
Expo CLI/code-signing dependency tree, Node module-type warnings and the upstream
Starlette/httpx deprecation warning. These were not silently upgraded during the
publication task. See `p4-5-verification.md` for earlier local HTTP and device gates.

## User setup order

1. Choose **local attended demo** (all phones share a reachable laptop network) or
   **hosted/shared demo** (needs P4.5 hosted schema and matching AI gateway).
   This is an environment choice, not a reason to rewrite UI or enable billing.
2. Provide Sarvam access and an explicit usable-credit/character cap. Keep the key
   in the ignored input file; do not paste it into chat. Template:
   `api/docs/ai-demo-inputs.env.example`. Confirm account-owner permission.
3. Confirm the demo date, approximate presentation length, phones/platforms and
   network. Current intended local phone preview is the laptop hotspot:
   `http://192.168.137.1:8085/status` and `exp://192.168.137.1:8085`.
   IP/URL must be rechecked after network or server changes.
4. The implementation thread prepares four dedicated persona mappings, seeds and
   a private switch-account sheet using the chosen environment. Reuse/provision
   only explicitly dedicated accounts; no real-user data reset.
5. Rehearse the existing P4.5 social UI from the teammate branch. Then perform the
   bounded live provider/evaluation checks and warm valid caches before final AI
   presentation acceptance. No need for Cloud Run/GPU setup just to start coding.

## Publication boundary

User explicitly requested pushing the current work. Publish the reviewed feature
branch, including source, migrations, tests, guides and project skill resources.
Exclude actual `.env`, `.local`, credentials, QR/preview files, node_modules and
venvs. No main merge, hosted migration, paid launch or final AI feature work is
authorized by this preflight/publication step.
