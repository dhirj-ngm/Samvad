# P6 release candidate and demo handoff

24 October 2026. Target: **attended local prototype**, Android and iPhone through
Expo Go. Release branch: `release/p6-demo`, based on integrated P0–P5 `6bb366a`.
This is the current operational handoff; addresses in older phase notes are
historical. The release gate remains open for the evidence in
[P6 verification](p6-verification.md). A public production service is not claimed.

## Existing laptop: start here

Keep Docker Desktop running and the laptop awake. Phones and laptop must share a
network that permits device-to-laptop access. Current verified laptop Wi-Fi address:
`192.168.40.199`. Check it again if the network changes:

```powershell
Set-Location C:\Users\Mathews\Documents\Samvad
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' }
```

From `api/`, run the preflight. It reads local services/configuration and writes
an ignored report, never applies migrations, changes accounts or invokes AI:

```powershell
Set-Location api
.venv/Scripts/python -m tools.prepare_p6 --host 192.168.40.199
.venv/Scripts/python -m tools.smoke_p5
```

The first command validates the current interface, local server configuration,
all applied migration versions, LAN gateway/Auth liveness and Android/iOS Expo
manifest addresses and actual compiled Supabase/gateway addresses. This catches
a correct-looking QR that still bundles an old backend URL. It fingerprints Git-visible source in
`api/.local/p6-preflight.json`; rerun after any source changes. An HTTP health
response alone does not establish Auth, database or provider readiness. The second
command verifies actual local fixtures, cached outputs, authorization and a
temporary private-save/reviewer journey, then cleans up its temporary post.
Provider destinations are blocked by that smoke. Missing caches cause a failure,
never an automatic refill or fabricated result.

The already-running gateway/Metro can be reused when preflight passes. If either
is stopped, use these commands separately (substitute the current address):

```powershell
# api/, gateway; --cache-only disables new provider inference
.venv/Scripts/python -m tools.start_ai_demo --host 192.168.40.199 --cache-only
# api/, Metro; do not repeat if port 8086 is occupied
.venv/Scripts/python -m tools.start_ai_demo --host 192.168.40.199 --mobile
# repository root, after Metro is running
node mobile/scripts/demo-qr.cjs 192.168.40.199
```

Open `api/.local/ai-demo-preview.html`, then scan in compatible Expo Go. Current
preview: `exp://192.168.40.199:8086`. The gateway is on port 8775 and local
Supabase on 54321. On **each phone**, check these in its browser if Expo stalls:

- `http://192.168.40.199:8086/status` → `packager-status:running`
- `http://192.168.40.199:8775/health` → JSON

If the phone cannot reach those URLs, repair Wi-Fi/firewall/network isolation
first. Regenerating the QR alone does not change the compiled backend address.
After a network change, inspect ignored gateway/Metro PID files, verify each PID's
command belongs to this preview, stop only that process tree, and restart with
the new address. Do not kill unrelated Node/Python processes or disable the
firewall. Do not expose local Supabase through a public tunnel.

Use the existing ignored `api/.local/demo-login-sheet.md`; preserve all passwords.
The backing private mapping is `demo-accounts.json`. These are not shared through
Git, screenshots or chat. Local signup mail is captured in Mailpit on the laptop
at `http://127.0.0.1:54324`; it is not delivered to Gmail. Complete confirmation
manually there, then return to the phone to sign in. Prepared demo accounts are
local fixtures, not verified real-world identities.

## New teammate: reproducible local setup

Prerequisites: Git, the Node version supported by this Expo SDK (this run used
24.16.0), Python 3.13, Docker Desktop with a working Linux engine, and an Expo Go
version compatible with the installed SDK on both phones. No signing account or
AI provider key is needed for the cache-only social demo. Use the P6 source
revision supplied by the integration captain; no P6 remote publication occurred
in this task.

From a fresh checkout, in PowerShell:

```powershell
npm.cmd ci --prefix mobile
npm.cmd ci --prefix supabase
python -m venv api/.venv
api/.venv/Scripts/python -m pip install --require-hashes -r api/requirements-dev.lock
npx.cmd --yes supabase@2.122.0 start --help
npx.cmd --yes supabase@2.122.0 start
Set-Location api
.venv/Scripts/python -m tools.demo_accounts --fresh-local
.venv/Scripts/python -m tools.demo_data seed
.venv/Scripts/python -m tools.demo_data verify
.venv/Scripts/python -m tools.start_ai_demo --host <current-private-IPv4> --cache-only
.venv/Scripts/python -m tools.start_ai_demo --host <current-private-IPv4> --mobile
```

`--fresh-local` is **only for a checkout with no private account mapping**. It
creates four random-password local accounts, public Unicode-capable profiles and
an explicitly provisioned local reviewer. It refuses to overwrite any existing
mapping. Interrupted provisioning resumes with `tools.demo_accounts` without the
flag. It verifies managed account passwords before adopting an existing email;
no unrelated account is silently made reviewer. On a fresh install, read the
ignored `api/.local/demo-accounts.json` privately for logins. Three ordinary
participants are in `accounts`; the fourth local operator is in `existing`.

The seed creates only manifest-owned, explicitly labeled fictional content and
audited operator publication decisions. Verify confirms fourteen content hashes
and public/private boundaries. Never delete these fixtures during rehearsal.
The real sourced archive news is initialized by the existing migrations.

Generate the QR from the repository root as above. A fresh stack has **no real
AI cache**: translation/summary requests remain unavailable while originals and
social flows work. The current laptop's real cached outputs do not transfer
through Git. Do not describe a fresh cache-only install as a successful AI demo.
Provider setup, generation provenance, model availability and human language
review follow the existing [AI runbook](AI_DEMO_RUNBOOK.md); no inference or paid
fallback is authorized by these setup steps. Existing provider settings were
preserved by P6.

## Three-minute presentation

See [the timed script](demo-script.md). Before the audience arrives, verify the
four mapped accounts, T1/T2 source hashes, saved cache availability, LAN reachability
from each phone, and the separate reviewer's access. Capture screenshots with no
emails, passwords, tokens, inbox links or private report details. Record device,
OS, Expo Go version, tester, date and candidate commit.

## Freeze, migration and recovery

Stop feature changes. Fix only demo-blocking defects on the release branch, rerun
affected verification and regenerate the fingerprint. P6 adds no schema migration;
all eight existing files remain immutable. Only the local stack has the complete
social/final-AI schema. Do not run this candidate against the older hosted schema.

Do not run `supabase db reset`, rewrite migrations, remove Docker volumes, refill
budgets or overwrite `.env`/private fixtures. Before future hosted migration work,
obtain explicit target authorization, reviewed migration diff and a tested backup
and recovery plan. A bad additive migration gets a reviewed forward fix. Reverting
application source does not roll back the database. Use a separate worktree for a
previous reviewed source revision, and verify its compatibility with the current
schema; retain data and audit history.

`tools.demo_data reset` is a dry run. `reset --apply` changes only exact
manifest-owned publication/manual-hide state and is a deliberate operator action,
not a startup step. It cannot resurrect deleted fixtures or reset quotas. Avoid
using it on a live participant session.

The local image `samvad-p6-local:rc` was built with hash-locked Python dependencies
and tested as UID 10001, with networking disabled and no `.env`. Its health is
unconfigured liveness, not a deployed full backend. Do not mount the laptop's
loopback demo settings into a hosted container. Native APK/TestFlight artifacts
were not built or uploaded: Expo Go is the chosen playbook-compliant demo route.
Optional signed builds require separately configured identifiers, signing and a
reviewed target; do not purchase memberships or create cloud builds implicitly.

After human/security/device sign-off, the captain may integrate the reviewed
candidate into main and create `hackathon-demo-v1` at that exact commit. **The tag,
main merge and push are not performed here.** Keep the tag name available until
the gate is signed off; do not attach it to an unfinished candidate.
