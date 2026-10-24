# P5 closeout: what to do next

**Latest update:** the user has confirmed all test cases pass after the fixes.
The functional retest in steps 1–2 below is now **PASS by user report**; keep the
steps as a repeatable checklist, not as an outstanding demand to rerun them.
Next address step 3's documented human language/policy evidence and step 4's
unwaived dependency risk. Neither gate is automatically cleared by the general
functional confirmation.

## Current status

The P5 code review and automated verification are complete for this working tree:
**117 API + 105 database + 34 mobile = 256 tests passed, zero skips**. TypeScript,
Expo compatibility, Ruff, pip consistency and both native exports pass. Local
Auth/save/retry/review, seven social/Storage HTTP groups, the local discovery SDK,
hosted legacy conversation SDK and provider-isolated cache smoke pass.

The user confirmed both phones worked before this final bug-fix pass. That evidence
is retained; it does not independently verify the newly changed failure/recovery
paths. **Joint P5 is still awaiting the observations and security disposition below.**

## 1. Reload the reviewed app on both phones

- Keep Docker and the laptop awake. Join the same reachable Wi-Fi as the laptop.
- Current preview: `exp://192.168.40.199:8086`.
- Open `api/.local/ai-demo-preview.html` for the QR. Use the ignored login sheet;
  never send credentials in a screenshot or test report.
- Close/reopen or reload Samvad in Expo Go. Metro was restarted with a cleared
  cache; both actual platform bundles were checked for the newly reviewed modules.
- If networking changes again, check the laptop's current Wi-Fi IPv4. Regenerating
  the QR alone is insufficient: Metro's public API/database environment must use
  that same current address. Follow `AI_DEMO_RUNBOOK.md` to restart only this preview.
- Browser diagnostics from each phone: `http://192.168.40.199:8086/status` should
  show `packager-status:running`; `http://192.168.40.199:8775/health` should return JSON.

## 2. Run this short regression separately on Android and iPhone

Record tester/date, model, OS, Expo Go version and PASS/FAIL for each item. The
reviewed source is the working tree based on `18b54e4`; it is not yet committed.

1. Sign in; open Profile and Compose. Reload/restart and confirm the same account.
2. With a feed already loaded, disable networking and refresh. Existing feed text
   should stay visible and a retry error should appear. Reconnect and refresh.
3. Enter a benign Unicode post/reply, disable networking and submit. Keep the
   original draft/request; reconnect and retry **the same submission**. Confirm
   exactly one saved item. Pending content is expected until human approval.
4. Sign out on one phone. Confirm the other phone remains signed in. Switch to
   another account on the first phone; previous private drafts/reviewer state
   must not appear. This is session-scoped logout, not global logout.
5. Search People using `@nightangel`; confirm the expected public profile. Follow,
   refresh and check the confirmed state does not jump back after a delayed read.
6. Open the prepared T1 bus discussion: English readers can use the cached English
   translations of the Malayalam root and first Hindi reply; Hindi readers can
   use the cached Hindi translation of the English nested reply. Check Show original.
7. Open T2 (the longer English bus-information proposal). Check English/native
   summaries and labels. If native translation is unavailable, English must remain
   readable. Avoid arbitrary cache misses while conserving provider allowance.
8. Check keyboard dismissal by dragging, text wrapping at larger font size,
   screen-reader announcements and small-screen button wrapping. Open a publisher
   source link and return to Samvad.
9. With the separate trusted reviewer, approve only an exact benign test submission;
   see it on the other phone and exchange a reviewed reply. Confirm an ordinary
   account cannot open reviewer actions or read someone else's report details.

Send the results in this format (no credentials):

```text
Android: model / OS / Expo Go / tester / date
Steps 1–9: PASS or step number + failure + screenshot without private data
iPhone: model / OS / Expo Go / tester / date
Steps 1–9: PASS or step number + failure + screenshot without private data
```

## 3. Complete human language/policy review

An offline comparison sheet is prepared at **`api/.local/p5-language-review.html`**.
Open it on the laptop. A reader fluent in the relevant languages must compare
source text with each actual saved output and record meaning, negation, names,
numbers, tone, native script and summary grounding.

The sheet is generated without inference:

```powershell
# From api/
.venv/Scripts/python -m tools.prepare_p5_review
```

Record outcomes in `docs/AI_LANGUAGE_REVIEW.md`, including the remaining EN/HI/ML
and code-mixed moderation cases. The old saved output file does not independently
record exact generation-time model/prompt versions; do not invent those values or
substitute current settings as proof. Additional model evaluations need explicit
quota authorization and accurate generation metadata. The six prepared examples
alone do not establish moderation quality. **Automatic publication stays OFF.**

## 4. Resolve the still-open dependency risk

The Zod finding is fixed. Four high npm findings remain in the single node-forge
dependency chain. The latest registry release checked is 1.4.0 and the advisory
has no patched release. The user chose to keep this risk open; that choice remains
in force. Track the upstream fix or commission a separately reviewed remediation.
Do not downgrade Expo or suppress the audit just to obtain a green result.

## 5. Close P5, then move to P6

After the remaining evidence and security disposition are recorded, update
`PROJECT_TRACKER.md` and `docs/integration-checklist.md` with the actual outcome.
Then rehearse the three-minute cross-device story, capture screenshots, freeze
the reviewed changes, and prepare the release/handoff. Commit/push/tag and hosted
deployment are separate actions. The full build currently targets **local Docker
Supabase**; the older hosted schema is still incompatible with social/final AI.

Repeatable backend smoke from `api/`:

```powershell
.venv/Scripts/python -m tools.smoke_p5
```

It uses local Auth/database and existing real cache entries, blocks provider
destinations, and cleans up its temporary post. It never fills missing caches or
resets fixtures automatically. See `p5-verification.md` for the complete evidence.
