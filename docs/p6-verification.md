# P6 actual verification and release gate

24 October 2026. Branch `release/p6-demo`, based on P0–P5 integration `6bb366a`.
**Local P6 preparation implemented; final release gate PENDING.** No P6 push,
main merge, hosted migration, cloud build, deployment or final tag performed.
The user's earlier Android/iOS and P5 functional PASS remains valid user-reported
evidence; it does not supply a new final venue rehearsal or language-policy sign-off.

## Implemented

- A: correct-address Android/iOS Expo preflight, refreshed local QR, timed
  cross-device script, screenshot/venue checklist and Expo Go handoff.
- B: migration-ledger comparison, secret-safe service/configuration preflight,
  source fingerprint, fresh-local four-account provisioning with overwrite and
  account-adoption guards, cache-only no-key restart option, recovery instructions.
- Integration: one local release branch with P0–P5 history preserved. App behavior,
  provider/model/prompt/publication policy, contracts and schema remain unchanged.
  Added launcher options are local operator tooling, not new API contracts.

## Observed in this P6 task

| Check | Actual result |
|---|---|
| Python suite | **135 passed, 3 skipped**. The skips are legacy opt-in P1/P2/P3 hosted-account suites without injected fixture configuration. They are not represented as passes. |
| Database role/migration regressions | **105 passed**, zero skips; complete replay including existing eighth migration. |
| Mobile regressions | **34 passed**, zero skips; TypeScript passes. |
| Ruff / pip consistency | PASS. |
| Expo dependency compatibility | PASS. |
| Android export | PASS, 1,254 modules, Hermes artifact under ignored `api/.local/p6-android`. |
| iOS export | PASS, 1,261 modules, Hermes artifact under ignored `api/.local/p6-ios`. |
| Web export | Not a supported release target. An initial `--platform all` attempt failed on missing react-native-web; corrected separate native exports passed. No web dependency was added. |
| P6 local preflight | Seven checks PASS: current interface, auto-publication-OFF local config, eight ledger versions, gateway, Auth, Android and iOS manifests **and actual compiled Supabase/gateway addresses**. Laptop LAN `192.168.40.199`; not a phone observation. |
| Local SQL lint/advisors | PASS, no schema errors or advisor findings. No hosted query/change made for this check. |
| P5 provider-isolated HTTP smoke | PASS: six persisted translation/summary caches, held-source denial, injected miss → safe 503 with original readable, fourteen fixture hashes, local Auth/private save/retry/non-admin denial/reviewer audit/publication. No provider inference. |
| Ordinary-user social/Storage HTTP | Seven groups PASS: two-account persistence, relationship retries/counts, original/news attribution, Storage ownership/type/size, private identity/reports, mentions and held replies. |
| Fresh-local account bootstrap HTTP | Four temporary dedicated local accounts provisioned twice: credentials/IDs stable, ordinary A/B/C denied reviewer and D authorized using ordinary password-grant JWTs. Only the four new accounts were removed afterward; existing demo accounts preserved. Full fresh-machine install/seed was not rerun. |
| Actual shared mobile Supabase SDK | PASS against local Auth/RPC: desired states, batching, Following and actor pinning. |
| Backend packaging | `docker build -t samvad-p6-local:rc ./api` PASS. Image runs as UID 10001 with networking disabled, returns health HTTP200, has no `.env` and reports AI unconfigured. This is not a configured hosted service. |
| Dependency audit | **4 high**, 0 critical/moderate/low. Existing node-forge dependency chain, still open; no suppression or dependency downgrade. |
| Android native device access | SDK/platform tools present; ADB device list empty. No new device observation claimed. |
| Native signing/build service | No EAS configuration/signing used; no APK/IPA/TestFlight build produced. Expo Go selected as permitted by playbook. |

New regression coverage checks private/RFC1918 targets, stale manifest/bundle
destinations, migration mismatches, automatic-publication safety, private file
exclusion and changing source fingerprints, fresh credential uniqueness/no
overwrite, and cache-only no-key launch isolation. Live social checks use ordinary
user JWTs; privileged keys are used only by fixture provisioning/cleanup.

The source fingerprint, exact commit and current dirty state are regenerated in
ignored `api/.local/p6-preflight.json`. The report deliberately keeps release
sign-off PENDING even when technical preflight passes. Logs and QR artifacts stay
ignored. Secrets were not printed, committed or sent to a provider by P6.

## Outstanding acceptance and ownership

| Requirement | Status / next action |
|---|---|
| Current Android + iPhone venue rehearsal | Tester records model/OS/Expo Go/date/candidate revision and the three-minute story outcome. Earlier general functional acceptance is preserved. |
| Privacy-safe screenshots | Capture actual devices following `demo-script.md`; no synthetic evidence. |
| Human EN/HI/ML/code-mixed policy/translation/summary review | Named fluent reviewers complete `AI_LANGUAGE_REVIEW.md`, including exact generation provenance. Automatic publication stays OFF. |
| Four dependency findings | Owner/security reviewer resolves or explicitly records a limited-demo risk disposition. The earlier choice to leave them open is preserved, not treated as security clearance. |
| Native standalone artifacts | Optional while Expo Go is used. Configure actual app identifiers, signing and approved build target before any later APK/IPA/cloud build. |
| Hosted/full-time availability | Not deployed. Existing hosted schema is older; explicit reviewed migration, backup/restore rehearsal and HTTPS gateway setup are separate work. |
| Release main/tag/push | Deferred under the retained no-push instruction and pending sign-off. Do not create `hackathon-demo-v1` yet. |
| Ten consenting participants | Separate observed acceptance. No invitations or pilot PASS claimed. |

Follow [P6 runbook](P6_RELEASE_RUNBOOK.md) for restart, fresh setup, secure accounts,
fixture verification, migration/recovery and failure handling. No destructive
reset or new inference is necessary to perform the local technical checks.
