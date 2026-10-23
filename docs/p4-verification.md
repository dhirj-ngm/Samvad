# P4 implementation and verification handoff

**Main integration (24 October):** User requested publication of all phases through
P4. P4 includes accepted P0–P3, and merges cleanly. Fresh checks: Python 70 passed,
3 live tests skipped; SQL 74 passed; mobile 11 passed; TypeScript, Ruff and pip
check passed. This merge run did not invoke the live AI provider. Recorded prior
live samples and configured checks below retain their original scope. Human
language/policy review and Android/iOS P4 acceptance remain pending after merge.

**Malayalam correction:** initial live EN→ML samples 2/3 failed language quality
(Latin text/unchanged English). Revised prompts name English/Hindi/Malayalam and
native script explicitly; wrong-script output now fails safely before caching.
Prompt/cache version is samvad-p4-v2-native-script. A real rerun generated Malayalam
for both samples, still requiring human semantic review. Review all directions
under the revised prompt before setting the publication gate; old v1 reviews do
not establish v2 quality. Evaluation records now include prompt_version.

**Live follow-up:** keys and enabled/Free-plan/data confirmation flags are now
configured locally. User supplied a passing live translation/cache checker result;
agent subsequently verified model-catalog access and generated evaluation samples
0/1 with actual Qwen inference. The first generic evaluation failure was transient
and not reproducible; CLI now reports safe normalized diagnostics. Results are in
ignored api/.local/ai-evaluation.json. Semantic/policy review remains pending and
AI_LANGUAGE_REVIEW_PASSED stays false. Earlier missing-key statements describe the
original implementation checkpoint, not the current configuration.

Both mobile and backend implemented on `integrate/p4`, descending from accepted
P0–P3 main `78e5825`. All previous phases were already merged; no merge conflict
existed. Existing uncommitted final-verification notes were reviewed/preserved in
`b2fa66d` before P4 changes. Untracked `.agents/` and `skills-lock.json` untouched.

## Implemented

- Authenticated FastAPI translation, three-line headline briefs and moderation.
  ES256/RS256 JWT verification, strict request/output validation, normalized errors,
  caller-token source access, authorized cache hits and original preservation.
- Groq-only configurable Qwen model IDs. Account model-catalog check before first
  live inference; zero paid fallback, upgrades, retries or fixture impersonation.
  Inference disabled until enabled/Free-plan/data-policy configuration is confirmed.
- Private cache, shared conservative request/token/concurrency budgets, and private
  moderation events deployed in migration `20261023225554_multilingual_ai` to
  development project `mtgsyjqcoyzijicpydee`. No reset/destructive migration.
- Translation/Show original on feed/root posts and replies; preferred language,
  visible AI/cache/experimental labels. Optional headline-based three-line brief
  keeps publisher attribution/link. No full-article fetching or summary claim.
- Screening after confirmed saves, owner retry controls, pending/held fallback and
  atomic service-controlled publication after evaluation. Reports remain private;
  neither report counts nor model output can ban an account.

Full semantics: [contracts](contracts.md). Server runtime dependencies/locks now
include httpx and PyJWT with cryptography. Mobile adds no runtime dependency.

## Actual checks

- SQL: **74 passed** against the actual migrations in isolated PostgreSQL/WASM,
  including ordinary-role denial of cache/reservations/moderation and server-only
  publication, stale hash/actor/state guards, shared concurrency, minute/day request
  and token budgets, hard caps and brief headroom. Privileged test fixture setup is
  separate from ordinary-role authorization assertions.
- Python configured suite: **69 passed, zero skips** including existing real P1–P3
  account regressions. New AI tests use signed test JWTs and explicitly mocked
  provider/REST responses. They prove request handling/failure logic, not live Qwen
  quality. Tests cover cache authorization/deleted sources, invalid tokens/claims,
  model unavailability, malformed/truncated output, quota/provider failures,
  three-line validation and evaluation-gated publication.
- Separate P4 check passed using both real account JWTs against the actual Supabase
  JWKS and caller-RLS source read through the FastAPI app. Same-language exact
  original returned with no inference. This is real Auth evidence, not live AI.
- The running temporary HTTPS API also passed a real user JWT/original request
  over its public tunnel and returned expected 503 for unavailable inference. This
  is host HTTP evidence, not a phone interaction or live translation.
- Mobile: **11 tests**, TypeScript, Expo dependency check and Android/iOS exports
  pass. Shared native adapter legacy regressions run separately; results logged.
  Exports are not physical-device or signed native-build acceptance.
- Ruff/pip checks pass. Existing non-failing Starlette/httpx deprecation, Node
  module-type and Expo color warnings remain. Existing P2 Expo CLI audit findings
  remain P5 debt; no forced SDK downgrade.
- Hosted advisors: intentional private deny-all RLS INFO, existing disabled leaked
  password protection WARN, unused-index performance INFO. No new P4 security WARN.

**Not yet verified:** live Groq account/model availability, provider outputs,
six-direction language quality, live automatic moderation/publication or P4 native
UI on either device. Credentials were absent during the checks above. No fixture
output, mocked output or existing P3 acceptance is treated as a live P4 pass.

## Server configuration and restart

In ignored `api/.env`, keep the existing Supabase URL/JWKS and add:

```dotenv
SUPABASE_PUBLIC_KEY=<development publishable-or-anon key>
SUPABASE_SERVICE_ROLE_KEY=<server-only development service-role key>
GROQ_API_KEY=<Groq Free-plan key>
AI_ENABLED=true
AI_FREE_PLAN_CONFIRMED=true
AI_DATA_POLICY_CONFIRMED=true
AI_LANGUAGE_REVIEW_PASSED=false
AI_TRANSLATION_MODEL=qwen/qwen3.8-27b
AI_SUMMARY_MODEL=qwen/qwen3.8-27b
AI_MODERATION_MODEL=qwen/qwen3.8-27b
```

Never commit these values or place private keys in mobile. Only confirm flags
after verifying actual Free plan and reviewing provider data controls. No billing
upgrade is authorized. Public database/model configuration was prepared locally;
secret keys and approval flags were not silently filled or enabled.

Start/restart after configuration changes:

```powershell
cd api
.venv/Scripts/python -m pip install --require-hashes -r requirements-dev.lock
.venv/Scripts/python -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8774
```

On Windows, `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/start-local.ps1`
safely restarts only this checkout's existing
Uvicorn on port 8774 as a hidden helper, refusing to stop another process. It reads
the updated .env; startup logs/PID go to ignored api/.local. This is useful when the
current session's hidden preview API is already using that port.
The execution-policy flag applies only to that process; no machine/user policy is
changed. The helper was run successfully and its local `/health` returned HTTP 200.

For physical phones, tunnel the API to a reachable HTTPS origin; use that origin
as `EXPO_PUBLIC_API_BASE_URL` in ignored `mobile/.env`, then restart Metro. Phone
localhost is not the PC. A temporary P4 API tunnel was started in this session;
its current URL/logs are under `%TEMP%/samvad-p4-preview/`. Existing Expo preview
was restarted from the correct checkout and points to this API. Temporary URLs
may expire; do not commit them as deployment configuration. `/health` phase P4
reports configuration, never provider readiness or linguistic quality.

## Live checks and language/policy release gate

Use existing ignored api/.env.p1 dedicated accounts + write opt-in; never print
passwords/tokens or use service-role credentials to claim user authorization.

```powershell
cd api
# Actual JWT/RLS checks, no inference:
.venv/Scripts/python -m dotenv -f .env.p1 run -- .venv/Scripts/python -m tools.check_ai
# Opt in only after Free-plan/data configuration:
.venv/Scripts/python -m dotenv -f .env.p1 run -- .venv/Scripts/python -m tools.check_ai --live-inference
# Small resumable synthetic evaluation batches (indexes 0..20):
.venv/Scripts/python -m dotenv -f .env.p1 run -- .venv/Scripts/python -m tools.evaluate_ai --start 0 --count 2
```

Wait for shared quota availability between batches; do not bypass reservations or
rotate credentials. Continue at indexes 2,4,...20. The first 12 samples cover all
six EN/HI/ML directions twice, including code-mix, names/numbers and emoji. Other
samples cover criticism, multilingual threats, negation, prompt injection and a
source-limited brief. Outputs go to ignored `.local/ai-evaluation.json`; each starts
human-review pending. Rate limits stop safely and preserve completed samples.

Have native-language reviewers assess meaning, tone, negation, names/numbers,
script and emoji. Verify ordinary criticism is allowed, threats held/blocked,
uncertainty held, and the brief adds no unsupported facts. Record actual verdicts.
Only after the language/policy gate passes set AI_LANGUAGE_REVIEW_PASSED=true and
restart API. Until then automatic publication is intentionally disabled; live
translations are visibly experimental. If quality fails, keep the gate false.

## Verify after build on BOTH Android and iPhone

1. Sign into separate accounts; choose Hindi/English for B and Malayalam for A.
   Open the same source and original-post conversation. Existing text remains
   readable and source links still open correctly.
2. Translate A's Malayalam reply to B's language. Confirm target language and AI
   label; Show original must restore the exact Malayalam/emoji. Reverse direction
   for B's reply. Check preference/account changes reset translated views correctly.
3. Repeat translation: identical text with cached status, no new quota reservation.
   Verify all six directions using the reviewed examples. Do not infer quality from
   fluent appearance. Same-language text should remain original without inference.
4. Request a news brief: exactly three statements, headline-based/AI disclosure,
   actual source link retained, no invented facts or full-article implication.
5. After the release gate, submit benign original posts/replies from both accounts:
   save once, screening publishes, other account refreshes and sees them. Test owner
   Retry AI screening on an older pending submission. Confirm held/uncertain content
   stays private and reports remain private without automatic bans.
6. Simulate provider outage/disabled key and free quota 429: readable originals,
   useful error, no fallback charge; new content stays pending. Offline/relaunch and
   double-tap still preserve one durable submission. Restore provider and retry.
7. Attempt another user's pending/deleted content IDs, invalid/expired bearer,
   arbitrary input/user_id and anonymous requests: deny access with normalized
   errors. Confirm cached translations cannot reveal now-inaccessible content.
8. Both devices: keyboard/safe areas, Indic shaping, long translation wrapping,
   tap targets, scrolling, loading/cancel/navigation and account-switch isolation.

Record per-device OS/runtime, tested SHA and actual pass/fail. P0–P3 remain accepted;
P4 joint gate and main merge wait for live/provider/language/device evidence.
No P5/P6 work or public launch is included.

## Official provider references checked

[Groq models](https://console.groq.com/docs/models),
[Free-plan limits](https://console.groq.com/docs/rate-limits),
[structured/JSON output](https://console.groq.com/docs/structured-outputs),
[Qwen reasoning controls](https://console.groq.com/docs/reasoning),
[data handling](https://console.groq.com/docs/your-data).
These do not establish this account's plan or model access. Gemma remains an
evaluated alternative requiring explicit implementation/configuration; no fallback.
