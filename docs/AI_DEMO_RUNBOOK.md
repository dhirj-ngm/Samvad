# Final local AI prototype rehearsal

Implementation branch: `feature/ai-demo`, based on the shared P4.5 branch.
This build retains P4.5 profile, discovery, conversation, mention, follow, like,
repost and manual-review flows. Android and iOS use the same Expo application.
This is a laptop-attended prototype; hosted migrations/deployment are separate.

## Accounts and fixtures

The three requested accounts were created in **local Docker Auth**, email-confirmed
without sending email. Passwords are generated and stored only in the ignored
`api/.local/demo-login-sheet.md` and backing `demo-accounts.json`.
The pre-existing fourth account and its password are preserved. That fourth
account has local trusted-reviewer membership; ordinary participants do not.

| Manifest role | Local public handle | Default reading language |
|---|---|---|
| A | dolla | Malayalam |
| B | nightangel | Hindi |
| C | blackman | English |
| D | Preserved existing handle in the private sheet | Preserved preference |

`api/demo/manifest.json` contains fictional public content, never credentials.
T1 is a multilingual bus discussion with nested replies; T2 is a longer original
English proposal suitable for summarization; T3 attaches discussion to an existing
sourced news item. T4 is a private synthetic threat held by the operator.
There are two original posts, eleven public replies and one held reply, plus
persisted follows, likes and reposts. All new content has `is_fixture=true`.
Operator publication decisions are audited as human fixture review, not presented
as live AI classification. Seeded news remains attributed to its real source.

## Start and reconnect

Docker/local Supabase must already be running. Do not reset the database.
From the repository root, run the following with the computer's **current** private
IPv4 address; `192.168.29.101` was observed during verification:

```powershell
Push-Location api
& .venv/Scripts/python.exe -m tools.start_ai_demo --host 192.168.29.101
& .venv/Scripts/python.exe -m tools.start_ai_demo --host 192.168.29.101 --mobile
Pop-Location
node mobile/scripts/demo-qr.cjs 192.168.29.101
```

These services are already running at the end of implementation. The launcher
refuses occupied ports and stale/disconnected interface addresses. Reuse running
services instead of launching duplicates. To stop a service, inspect its ignored
`api/.local/ai-demo-gateway.pid` or `ai-demo-metro.pid`, verify that PID belongs to
this preview, then stop that process tree. Do not kill unrelated previews.

Open `api/.local/ai-demo-preview.html`. The new preview is
`exp://192.168.29.101:8086`; gateway port is 8775 and local Supabase port is 54321.
Use the same Wi-Fi on phones and computer, allow existing application network
access if Windows asks, and keep Docker/computer awake. iPhone uses Camera to open
the QR in Expo Go; Android can scan in Expo Go. Sign in with the private sheet.
The hosted app's accounts/configuration are a separate environment.

The launcher supplies only public Supabase config and API URL to Expo. Groq,
Sarvam and service-role keys stay in the gateway. Existing `api/.env` and
`mobile/.env` are preserved; ignored `.env.ai-demo-run` records aligned local
server settings. Phone sessions are verified by local Auth itself; the gateway
never trusts an unverified JWT subject. HTTP exceptions require explicit local
mode and are restricted to the local project/private network.

## AI behavior and limits

- Groq's configured Qwen model handles English summaries and moderation. The
  current configured model was accepted by the actual account. No model training,
  subscription or paid fallback is added.
- Sarvam `sarvam-translate:v1` handles EN/HI/ML translation. Unicode input is
  chunked at 2,000 code points without dropping text. Originals stay available.
- Summaries contain four or five English lines, with an optional aligned Hindi
  or Malayalam version. They cover the original post or supplied headline/excerpt,
  not an entire conversation or an unread publisher article. Short excerpts
  return insufficient-source rather than fabricated padding. The old three-line
  news endpoint stays compatible outside the new UI path.
- Real AI cache entries are source/model/version scoped. Every retrieval checks
  caller visibility again. Responses distinguish live, cache and original;
  unavailable native translation retains the English summary. No preset response
  masquerades as a live result.
- Sarvam is authorized up to ₹50 and at most 10,000 reserved characters for this
  rehearsal, including a 32-character conservative prior speech allowance.
  Persistent shared reservations are charged before requests; failures stay
  charged, restarts do not refill the allowance. The ₹3/1,000-character budget
  conversion is conservative, not an actual billing statement. Other external
  use of the same account must also be watched in its dashboard.
- Existing Groq ceilings remain 10 requests/minute, 100/day, 4,000 token budget
  per minute, 50,000/day and one concurrent generation. Long multilingual inputs
  can exceed the conservative UTF-8 token estimate and remain pending.

## Human approval gate

**Automatic AI publication remains disabled:** `AI_LANGUAGE_REVIEW_PASSED=false`.
New submissions are saved privately even if screening fails. The author can retry
the same submission/screening and the trusted reviewer can approve/reject it in
the protected publication queue. A separate manual hide is never undone by AI or
publication approval. No account bans are performed.

Before enabling automatic publication, a human reviewer must document tests of
EN, Hindi, Malayalam and code-mixed inputs: benign disagreement and criticism,
threats, hate, harassment, doxxing, scams/spam, sexual extortion and intimate abuse,
plus instructions trying to override the classifier. Check meaning, names,
negation, numbers and native scripts in translations and grounded summaries.
Review `api/.local/demo-language-outputs.json` alongside the manifest originals.
`demo-evaluation.json` is one real English smoke result, not multilingual approval.
Record reviewer/date/model and failures in `docs/AI_LANGUAGE_REVIEW.md`.
Only after that documented review passes may the operator restart the gateway
with `--review-approved`. The implementation did not use that switch.

## Seed, verify and rehearse

From `api`, using the existing venv:

```powershell
& .venv/Scripts/python.exe -m tools.demo_data seed
& .venv/Scripts/python.exe -m tools.demo_data verify
& .venv/Scripts/python.exe -m tools.demo_data prewarm
& .venv/Scripts/python.exe -m tools.smoke_ai_demo
```

Seed retries retain stable IDs and desired social relationships. They refuse to
resurrect deleted fixtures or adopt changed source text. Prewarm can spend the
bounded allowance on cache misses; successful repeats use real cache entries.
It prepares English T1/root and Hindi-reply translation, a Hindi translation of
the English nested reply, and the T2 summary in EN/HI/ML. Inspect the private
prewarm report before presenting. No broad arbitrary-text fixture fallback exists.

Rehearsal: show D reading T1 in English and switching to the original; B reading
the English reply in Hindi; T2's English/native summary controls; persisted social
interactions; then D's protected held-publication queue. Use an ordinary account
to demonstrate that private held content is absent. Optional new live posts stay
private until human approval while the language gate is off. Keep the audience
around ten participants and serialize live AI requests to avoid quota contention.

`demo_data reset` is a dry run. `reset --apply` restores only exact manifest-owned
fixture publication/manual-hide states; it never resets accounts, deleted sources,
provider budgets, audit history or unrelated content. It does not erase
participant-added social interactions. Rerun seed to restore intended baseline
relationships to true. Rehearse without deleting fixtures.

## Acceptance still requiring people/devices

For optional later hosting, `api/Dockerfile` prepares a non-root port-8080 gateway
with hash-locked dependencies and an allowlisted build context excluding secrets.
Build from the repository root using `docker build -t samvad-ai-demo ./api`.
This container was prepared but not built/deployed in this local run. Hosting
requires HTTPS Supabase/gateway configuration, the matching hosted migrations,
server-side secret injection and an explicitly approved target/cost policy.
Do not copy loopback local-demo configuration into a hosted container.

Automated bundles are not phone interaction tests. Confirm login, native-script
layout, keyboard, scroll, switching languages, native-summary toggles, account
switching, reviewer actions and network recovery on the actual iPhone and Android.
Confirm venue Wi-Fi/device reachability and remaining provider dashboard credits
before presenting. This prototype does not promise availability after laptop,
network, preview model, temporary free allowance or credits stop being available.
