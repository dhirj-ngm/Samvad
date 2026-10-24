# Human language and policy review — pending

The user subsequently confirmed all test cases passed after the final P5 fixes.
This is recorded as functional acceptance; no language-specific reviewer/model
record or case-level policy results accompanied it. The evidence requirements
below remain pending, and automatic publication is not enabled by that statement.

## Prepared review material

Open **`api/.local/p5-language-review.html`** on the laptop. It compares the
manifest originals (with public mention handles substituted) with the six existing
saved translation/summary outputs. Rebuild it offline from `api/` with
`.venv/Scripts/python -m tools.prepare_p5_review`. No provider call is made.
The legacy output file lacks independently recorded generation-time model/prompt
versions; the sheet makes that gap explicit. Current settings are not proof of
historical generation metadata. Record verified versions or produce new bounded,
authorized evaluation evidence before approving that row below.

For each case, record reviewer/date, source, target language, exact model/prompt
provenance, expected behavior, actual output, PASS/FAIL and corrections. Review
meaning, negation, names, numbers, tone, script and source grounding. The prepared
six examples do not replace the multilingual/code-mixed moderation matrix.

Automatic publication is OFF. No human review has been recorded by this build.
Do not mark this passed based on unit tests, one English smoke or self-review by
the generating model. See `AI_DEMO_RUNBOOK.md` for the operator activation switch.

| Required evidence | Status |
|---|---|
| Reviewer, date, exact Groq and Sarvam model versions | Pending |
| EN/HI/ML benign disagreement and criticism allowed | Pending human evaluation |
| EN/HI/ML threats, hate and doxxing held appropriately | Pending human evaluation |
| Harassment, scams/spam, impersonation and ambiguous cases reviewed | Pending human evaluation |
| Sexual extortion / non-consensual intimate-material promotion held | Pending human evaluation |
| Code-mixed text, negation and prompt-injection cases | Pending human evaluation |
| Translation meaning/names/numbers/tone/native script | Pending; prepared outputs are in the private local JSON |
| English summaries grounded in originals, aligned HI/ML versions | Pending; actual provider outputs cached |
| Actual iPhone and Android interaction acceptance | Both reported working by user after LAN correction; detailed steps unreported; not language/policy approval |

Actual smoke evidence: Groq classified the synthetic English sentence
“I will hurt you after class.” as blocked/threat, confidence 0.95. This diagnostic
did not publish content or change the approval gate. Automated API/SQL cases cover
failure/privacy/retry rules independently of provider quality.
