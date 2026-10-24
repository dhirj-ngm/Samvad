# P5 smoke verification — 24 October 2026

## Publication closeout

The user confirmed "everything is complete till p5" and requested publication
through P5. Record functional acceptance by user report and integrate the final
uncommitted P5 fixes, tests and review/smoke tools with the latest main history.
Fresh publication checks: **114 Python passed, 3 live tests skipped**, **105 SQL
passed**, **34 mobile passed**; TypeScript, Ruff and pip dependency checks passed.
This run did not load dedicated live configuration or invoke the AI provider.
The earlier 256 configured passes retain their original scope. Existing explicit
dependency-risk and human language/policy-review follow-ups remain documented;
automatic publication remains off. Publishing source does not perform a hosted
database or production deployment, or start P6.

**Latest post-fix confirmation:** user reports “all test case is passed
sucessfully.” Post-fix functional acceptance is **PASS by user report**; this
supersedes pending phone-regression notes below. No individual traces, updated
device/runtime details or human language reviewer/model evidence were supplied.
The 256 automated passes remain the last recorded run. The explicit decision to
keep dependency risk open is unchanged; automatic publication remains OFF.
Full joint security/language sign-off is not inferred from this general confirmation.

## Final code-review pass — latest evidence

Reviewed the mobile routes/components/client models, gateway/auth/AI paths,
migration grants/RLS/RPCs and local verification tooling through P5. Fixed these
concrete defects on top of the existing uncommitted hardening work:

- Profile refreshes now belong to an account and request generation. Late responses
  and errors cannot replace a newer profile or cross an account/logout boundary.
  Offline profile loading has a visible retry and no longer masquerades as missing
  onboarding. Initial session restoration cannot overwrite a later Auth event.
- Auth submission is guarded against simultaneous taps. Logout uses local-session
  scope and recovers from thrown network errors instead of remaining busy or signing
  out the user's other phone.
- Same-feed refresh keeps displayed content until replacement succeeds. Overlapping
  discovery pages update stale rows without duplicates or reordering. People accepts
  the displayed `@handle` syntax, bounds search input and resets stale pagination.
- A pre-mutation profile read cannot overwrite a completed follow. Long author names
  and native-summary/review action rows wrap on narrower screens.
- Native-summary retry selects the successfully recovered native version. Client
  validation rejects malformed, misaligned or wrong-target results. Backend fallback
  clears partial native lines and reports the provenance of the usable English result.
- Publication-review recovery fully validates the saved decision, offers storage-read
  retry and validates the server confirmation before clearing it. Queue errors no
  longer claim an empty queue; the bounded queue has an explicit refresh action.
  Report-review reads are generation-scoped and overlapping pages deduplicate.
- Malformed database source responses become normalized API failures, not uncaught
  errors. Blank translations and malformed/wrong-script cached output are rejected.
  Combined Sarvam chunks cannot exceed the output ceiling and poison the cache.
  Blank reviewer reasons are rejected by request validation.
- Added an escaped, offline-only human review sheet generator. It exports only
  selected source/output fields, not account passwords or arbitrary response fields.
  It marks missing generation-time model metadata and human review as pending.

### Fresh checks on the reviewed working tree

| Check | Result |
|---|---|
| Configured Python, including hosted legacy P1/P2/P3 regressions | **117 PASS**, zero skips (52.29 seconds) |
| Database migration/RLS/budget/reviewer suite | **105 PASS**, zero skips |
| Mobile model, concurrency, recovery and Expo-tooling tests | **34 PASS**, zero skips |
| Total | **256 PASS**; live Python regressions counted once |
| TypeScript, Expo compatibility, Ruff, pip consistency | PASS |
| Android/iOS exports | Both PASS; `samvad-p5-reviewed-android-20261024` / `samvad-p5-reviewed-ios-20261024` in approved temp directory |
| Local social/Storage/reviewer HTTP | All seven groups PASS |
| Actual discovery SDK (local) / conversation SDK (hosted legacy regression) | Both PASS |
| Provider-isolated local P5 smoke | PASS: six cache results, source privacy, injected cache miss/original recovery, fixtures, submission/retry/review |
| Restarted real local gateway submission/review HTTP smoke | PASS; temporary submission owner-deleted |
| npm audit | Four high findings remain in the unpatched node-forge chain; not waived |
| Targeted secret scan / whitespace check | Zero findings in 208 working source files, 28 Android export files, 25 iOS export files and the offline review sheet; `git diff --check` PASS |

The running gateway was restarted with its existing saved local configuration;
automatic publication stays OFF. Initial Metro inspection detected older modules
in the running preview even though exports were fresh. Only the verified demo
Metro tree was restarted with `--clear`. Both actual Android/iOS manifest/bundle
requests now return HTTP 200 with new profile/summary/review modules and aligned
`192.168.40.199` database/gateway URLs. Host LAN `/status` and `/health` pass.

All checks are on the working tree based on `18b54e4`; no new commit, push, hosted
migration, deployment or external AI inference was performed. The earlier
Android/iOS working confirmation remains user evidence for the prior baseline.
New recovery/UI behavior needs the short phone regression in
**[P5 next steps](P5_NEXT_STEPS.md)**. Human language/policy review and the security
risk explicitly kept open are still unresolved. **Joint P5 is not signed off.**

**Latest user acceptance:** after the network-address correction, the user reports
“andriod and ios is working properly.” Both-platform working smoke is **PASS by
user report**. No per-step traces, current device/OS/Expo Go details or specific
offline/accessibility/cross-device outcomes were supplied. This is not human
language/policy approval or acceptance of the still-open dependency risk. Earlier
unobserved basic device status below is superseded only to this extent.

## Hardening follow-up — Developer A and Developer B

**Latest preview address:** `exp://192.168.40.199:8086`. Both phones initially
could not load the old LAN `/status` address. Diagnostics found the laptop had
switched to Wi-Fi `Conference` and IPv4 `192.168.40.199`; the old QR/bundle still
used `192.168.29.101`. Only the verified demo Metro process tree was restarted,
using the existing local launcher; QR regenerated. Fresh Android/iOS manifests
and actual bundles return HTTP 200 with aligned `192.168.40.199:54321` database
and `192.168.40.199:8775` gateway URLs. New LAN `/status` passes from the laptop.
No firewall/network trust change, gateway restart or secret-file rewrite occurred.
The user subsequently confirmed both platforms work; detailed acceptance coverage
remains unreported, as noted above.

The user requested resolving the blockers and completing both P5 workstreams.
The code/tooling work below is implemented and verified against the **local demo**.
The joint gate remains BLOCKED; it is not possible to replace actual phone or
human language observations with another automated run.

| Workstream | Implemented and freshly verified | Remaining acceptance |
|---|---|---|
| Developer A — mobile | Explicit offline/aborted-save guidance preserves retry identity; keyboard dismissal on drag; Android resize configuration; busy/disabled announcements on post/reply submit; larger Auth link tap targets; indexed parent/mention lookup instead of repeated whole-thread scans | Actual Android/iPhone keyboard, safe-area, typography, accessibility, responsiveness and network-recovery observations |
| Developer B — backend/security | Repeatable provider-isolated `tools.smoke_p5`; 11 new safety tests; real Auth/RLS/source/cache/submission/review checks; SQL quota/negative tests; scoped patched-Zod override with actual Expo CLI schema compatibility test | Four inherited high audit findings from one unpatched node-forge advisory need an upstream fix or explicit owner risk decision; human language/policy evaluation remains pending |

**Fresh follow-up results: 235 tests PASS, zero skips** — 105 configured Python
(including three hosted legacy regressions), 105 database and 25 mobile tests.
TypeScript, Expo compatibility, Ruff, pip consistency and separate Android/iOS
exports pass. Seven local social/Storage HTTP groups and the new complete local
P5 smoke command pass. Export directories use `samvad-p5-hardened-android-20261024`
and `samvad-p5-hardened-ios-20261024` under the approved OpenCode temp directory.
Fresh targeted scans found no configured private values or recognizable provider/
service-role/private-key patterns in 201 tracked/untracked working files, 28 new
Android export files and 25 new iOS export files. Local discovery SDK passed again.

**User decision:** both phones are available for guided acceptance; the user chose
to **keep the dependency risk open**, not accept or waive it. Phone availability
is not a test pass. The existing preview QR was refreshed for
`exp://192.168.29.101:8086`; both platform manifests and actual Metro bundles returned
HTTP 200 with the current P5 recovery code and aligned local Supabase/gateway
addresses. LAN `/status` and `/health` also returned 200 from the laptop only.

### Blocker disposition

- **Zod finding resolved:** pin `@expo/cli`'s Zod to **4.6.7**, with the lockfile
  updated. This is a scoped major-version override, not a blanket dependency bump.
  Tests import the actual Expo CLI plugin/command/output schemas and verify valid
  and invalid inputs. Metro/native exports and Expo compatibility also pass.
- **Four high findings remain**, not waived: `node-forge`,
  `@expo/code-signing-certificates`, `@expo/cli` and `expo` are one transitive chain
  for [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv).
  The registry's latest node-forge is 1.4.0; the advisory affects `<=1.4.0` and
  lists **no patched version**. No audit suppression, forced Expo downgrade or
  unverified cryptography fork was introduced. Treat the development server as
  trusted-local tooling; do not accept untrusted signing certificates or expose
  it publicly. This mitigation is not a vulnerability fix or owner risk acceptance.
- **Hosted mismatch remains explicitly out of the verified local target.** No
  hosted migration/deployment or secret-file switch was performed. The local
  app launcher and local SDK are the tested path. Hosted readiness requires
  separately approved migrations, compatible gateway deployment and validation;
  it is not fixed by hiding missing-column errors in the client.
- **Web export is not a supported-platform P5 blocker.** Android/iOS exports pass;
  web support was not added to a native-only scope.
- **Phone and human review remain BLOCKED.** See the sign-off table below and
  `AI_LANGUAGE_REVIEW.md`. Android resize is native configuration; Expo Go controls
  its own host window behavior, so the configuration does not prove a phone fix.

### Repeatable P5 smoke without provider spending

From `api/`, run:

```powershell
.venv/Scripts/python -m tools.smoke_p5
```

This checks six persisted AI cache results, real held-source authorization,
forced cache-miss recovery with the original still readable, all fourteen fixture
hashes/visibility boundaries, and an owner-cleaned temporary submission with
retry/reviewer/public-release checks. The API runs **in-process** with inference
and automatic publication disabled and a transport allowlisting only the exact
loopback database origin. It does not change the running gateway configuration.
Tests prove other hosts, ports, credentials and provider destinations are rejected,
and environment variables cannot enable inference/publication in this harness.
The cache-miss case injects only a missing cache read; Auth/source reads stay real.
Private local fixture credentials are required. Cache misses do not trigger
prewarm, reseeding, fixture resets or external provider requests.

### Phone sign-off record — working confirmed, detailed results pending

Use the existing local runbook/QR and ignored login sheet. Supply observations,
not credentials, in these fields before closing P5:

| Evidence | Android | iPhone |
|---|---|---|
| App working properly after network correction | PASS by user report | PASS by user report |
| Tester / date / source revision | Pending | Pending |
| Model / OS / Expo Go version | Pending | Pending |
| Local backend / reachable preview address | Pending | Pending |
| Login / restart / logout / account isolation | BLOCKED | BLOCKED |
| Feed / People / social actions persist | BLOCKED | BLOCKED |
| Malayalam/Hindi layout / keyboard / safe areas / scroll | BLOCKED | BLOCKED |
| Translate / original / English and native summaries | BLOCKED | BLOCKED |
| Offline compose / reconnect / exact retry / no duplicate | BLOCKED | BLOCKED |
| Report privacy / reviewer denial for ordinary account | BLOCKED | BLOCKED |
| Cross-device reviewed benign post/reply exchange | BLOCKED | BLOCKED |
| Tap targets / busy announcements / screen reader | BLOCKED | BLOCKED |

## Initial smoke checkpoint (historical)

**Outcome: automated/local smoke PASS; overall P5 BLOCKED on device and human
acceptance.** No Android/iPhone interaction or human language pass is inferred.

Tested source: `18b54e4222ef3dce274c795c723b7a593166871f`, clean working tree
before verification. Windows, Node 24.16.0, Python 3.13.5; completed approximately
09:35 IST. This initial checkpoint added documentation only; the follow-up above
includes code changes.

## Fresh results

| Check | Actual result |
|---|---|
| Configured full Python suite | **94 passed, zero skipped**, 43.92 seconds; includes hosted dedicated-account P1/P2/P3 regressions |
| Migration replay / database security suite | **105 passed** against isolated PGlite, including all eight migrations, RLS negatives, private reports, write budgets, retries, reviewer boundaries and AI quotas |
| Mobile model/client suite | **22 passed**, zero skipped |
| TypeScript / Expo dependency compatibility | PASS |
| Ruff / pip dependency consistency | PASS |
| Android and iOS exports | Both PASS separately; compilation only, not installed native builds |
| Running local gateway `/health` | HTTP 200; liveness only, not proof of provider readiness |
| Metro status and Android/iOS manifests | HTTP 200; launch host `192.168.29.101`, port 8086; computer-originated checks only |
| Local AI submission/review HTTP smoke | PASS: actual Auth, anonymous denial, ordinary-user reviewer denial, private durable save, exact retry, trusted approval/retry and public release; temporary post owner-deleted, verification sessions signed out |
| Local social HTTP suite | All **seven check groups PASS**: Unicode/preferences and privacy, follows/news interactions, original-post interactions/Following, actual avatar Storage and negative cases, protected report review, stable mentions/post retries, reply retries/private visibility |
| Local fixture verification | All **14** source hashes, fixture labels and public/private boundaries PASS; no reseed/reset performed |
| Actual mobile discovery SDK, local | PASS: mixed feed, Unicode, four simultaneous retry calls, initiating-account mismatch denial |
| Actual mobile conversation SDK, hosted regression | PASS: two dedicated accounts, nested Unicode replies, retries, private held replies/reports and owner cleanup |
| Real local AI cache with inference disabled | Three translations and EN/HI/ML summaries PASS; four/five aligned summary lines; another user's held reply denied; uncached translation returns normalized 503 and original remains readable |
| Targeted secret scan | Zero findings in 197 tracked working files, 408 reachable Git history blobs, 28 Android export files and 25 iOS export files |
| Mobile dependency audit | **FAIL: five high findings**, zero critical; existing Expo CLI/node-forge/zod dependency chain; not repaired or waived |

Total configured automated tests: **221** (94 + 105 + 22). Standalone HTTP/SDK/cache
checks above are additional and are not counted again as unit tests.

The initial Python invocation without live configuration passed 91 and skipped
three; the configured 94-test result supersedes those skips. Tests cover mocked
provider outage/quota/policy cases, not human assessment of actual AI meaning.

## Failures and limits discovered or reconfirmed

1. **Default hosted configuration cannot run this complete build.** The discovery
   SDK check using `.env.p1` failed; a read-only hosted probe returned HTTP 400,
   PostgreSQL `42703`, confirming `posts.manual_hidden` does not exist. The same
   adapter passed using `.env.p45-local`. Hosted lacks the documented P4.5/final AI
   migrations; the old Python regressions and conversation SDK passing do not
   prove hosted social/AI compatibility. Use the local demo runbook. No hosted
   schema change or deployment was attempted.
2. `expo export --platform all` also attempts **web**, which fails because
   `react-native-web` is not installed. The supported Android and iOS exports
   both passed when selected separately. No web support or new dependency was
   added. Export outputs are under the approved OpenCode temporary directory,
   not committed to Git. Exports loaded existing mobile `.env`; they prove
   compilation, not correctness of a deployable environment configuration.
3. `npm audit` reports five high vulnerabilities through Expo tooling, including
   node-forge signature verification and zod memory-exhaustion advisories. Its
   suggested major Expo downgrade is not a safe smoke-test fix; no automatic
   `audit fix --force` or SDK downgrade was run.
4. No accessible Android ADB/emulator command was found; this Windows environment
   cannot run an iOS Simulator. No actual phone UI was operated in this run.
5. Human EN/HI/ML/code-mixed meaning and moderation evaluation, confirmation-email
   delivery and venue/network rehearsal remain unobserved. Automatic publication
   stays OFF. A new post staying private until human approval is intended behavior.
6. Existing Node module-type and Starlette/httpx deprecation warnings remain.

The six cache requests used an in-process copy of the real API with the existing
local run configuration, `ai_enabled=False`, Sarvam authorization disabled and an
HTTP transport that rejects every non-loopback destination. Local Auth, source
authorization and persisted cache reads remained real. No provider inference or
new provider spending was performed; the running gateway's settings were not
changed. Cached content is not fresh language-quality approval.

Secret scanning compared locally configured private passwords/provider/service
values and recognizable provider-token, service-role JWT and private-key patterns.
It did not print secret values. This is a bounded check, not proof that every
possible secret format or remote Git ref is clean.

## Reproduction commands

From the repository root, with the existing venv, dependencies and local Docker
Supabase/gateway running. Configurations below are ignored private files; do not
copy credentials into reports. Run the live suites serially because they mutate
dedicated test fixtures.

```powershell
npm.cmd test --prefix supabase
npm.cmd test --prefix mobile
npm.cmd run typecheck --prefix mobile
```

From `api/`:

```powershell
.venv/Scripts/python -m dotenv -f .env.p1 run -- .venv/Scripts/python -m pytest -q -rs --tb=short
.venv/Scripts/python -m ruff check app tools tests
.venv/Scripts/python -m pip check
.venv/Scripts/python -m tools.smoke_ai_demo
.venv/Scripts/python -m tools.demo_data verify
.venv/Scripts/python -m dotenv -f .env.p45-local run -- .venv/Scripts/python -m tools.check_social
.venv/Scripts/python -m dotenv -f .env.p45-local run -- node --experimental-strip-types ../mobile/tests/discovery-client.live.mjs
.venv/Scripts/python -m dotenv -f .env.p1 run -- node --experimental-strip-types ../mobile/tests/conversation-client.live.mjs
```

From `mobile/`:

```powershell
npx expo install --check
npx expo export --platform android --output-dir C:\Users\Mathews\AppData\Local\Temp\opencode\samvad-p5-android-20261024
npx expo export --platform ios --output-dir C:\Users\Mathews\AppData\Local\Temp\opencode\samvad-p5-ios-20261024
npm.cmd audit --json
```

Live harnesses modify dedicated test profiles/content and restore or owner-delete
their temporary state. Soft-deletion tombstones, legitimate test reports and audit
history may remain by design. No personal-account reset, fixture reset, migration,
commit, push, provider call or publication-gate change was performed.

## Remaining per-device smoke checklist

Use [the local demo runbook](AI_DEMO_RUNBOOK.md) and the ignored login sheet.
Record device model, OS, Expo Go version, date, backend and observed outcome
**separately for Android and iOS** in `integration-checklist.md`.

- [ ] Sign in; restart the app and confirm session/profile/preferences restore.
- [ ] Open Home/Explore/People/Profile; confirm cold-start discovery is nonempty.
- [ ] Open T1, read Malayalam/Hindi/emoji, translate and show the original again.
- [ ] Open T2; show English/native summary with honest cache/AI labels.
- [ ] Compose a benign Unicode post/reply; double-tap/retry. Confirm one saved
      submission; another account must not see it before explicit human approval.
- [ ] Have the trusted reviewer approve only the exact benign smoke submission;
      verify it appears to the other phone and exchange a reviewed reply.
- [ ] Follow, like and repost; refresh/relogin and check state/attribution persists.
- [ ] Submit a benign verification report; verify another ordinary account cannot
      read report details or open reviewer actions.
- [ ] Disable phone networking mid-compose/save/translation; confirm input is
      retained, errors are clear and original text remains readable. Reconnect
      and retry the same draft without duplication.
- [ ] Check keyboard avoidance, safe areas, scrolling, native-script wrapping,
      tap targets and screen-reader labels on each phone.
- [ ] Switch accounts and sign out; no previous user's drafts/private state leak.

**Android P5: BLOCKED/unobserved. iOS P5: BLOCKED/unobserved. Joint P5: BLOCKED.**
Complete [human language review](AI_LANGUAGE_REVIEW.md) and explicitly triage the
audit findings before claiming broader security/AI acceptance.
