# Samvad

**Latest verification:** [P5 review/results](docs/p5-verification.md): 256 configured
tests and both native exports pass. Both developers' local code/tooling changes
are implemented; user confirms Android/iPhone work. Detailed acceptance coverage
and human language review remain pending. Audit is down to four high findings in
one unpatched dependency chain.
Follow [P5 closeout steps](docs/P5_NEXT_STEPS.md) for the short post-fix phone
regression, prepared human-review sheet and remaining release gates.
The full social/AI demo requires the local stack in [the current runbook](docs/AI_DEMO_RUNBOOK.md);
the older hosted schema is incompatible. Older handoff snapshots below are historical.

## Current local demo / P5

Docker/local Supabase and the prepared private local fixtures are required. Do
not reset the database or overwrite `.env` files. The complete new build must use
the **local demo launcher**, not plain `npm start` with the old hosted `.env`.

From `api/`, rerun the provider-spend-free local smoke:

```powershell
.venv/Scripts/python -m tools.smoke_p5
```

To start services if they are not already running, use your computer's reachable
private IPv4 address, following the [runbook](docs/AI_DEMO_RUNBOOK.md):

```powershell
.venv/Scripts/python -m tools.start_ai_demo --host <your-LAN-IPv4>
.venv/Scripts/python -m tools.start_ai_demo --host <your-LAN-IPv4> --mobile
```

The launcher refuses occupied ports; reuse existing services rather than killing
unrelated previews. Use `api/.local/ai-demo-preview.html` and the ignored private
login sheet for phone testing. Credentials are not part of this README. Record
Android/iPhone outcomes separately in [the P5 sign-off table](docs/p5-verification.md#phone-sign-off-record--still-unobserved).
Automatic publication stays disabled until documented human language review.

## Earlier P4.5 handoff (historical)

**Current teammate handoff:** `feature/p4-5-social` contains the integrated P0-P4
foundation plus P4.5 profiles/avatars, editable preferences, People, follows,
likes/reposts, mentions and protected manual report review. P4.5 is verified against
a local Docker/Supabase stack. Its two new migrations are **not on hosted Supabase**;
the default old hosted configuration cannot run this branch's social features yet.
Follow [P4.5 setup/verification](docs/p4-5-verification.md) and the
[AI demo preflight](docs/AI_DEMO_PREFLIGHT.md). Device acceptance is still separate.

Samvad is an Expo/React Native app for Android and iOS with shared Supabase data/Auth
and a FastAPI AI gateway. New submissions remain pending until the existing trusted
review or gated screening path approves them. P4 AI exists; the new four-person AI
demo is specified in [the version 2 handoff](docs/AI_PILOT_IMPLEMENTATION_HANDOFF.md)
and has not been implemented by this publication.

## Get the P4.5 code for UI refinement

```bash
git clone --branch feature/p4-5-social --single-branch https://github.com/dhirj-ngm/Samvad.git
cd Samvad
npm ci --prefix mobile
npm run typecheck --prefix mobile
npm test --prefix mobile
```

For existing clones, fetch and check out `origin/feature/p4-5-social` on a local
branch without discarding other work. Create a separate UI branch from this
checkpoint to avoid racing the AI implementation session on shared files.

Use your own local Supabase stack for complete social testing: Docker plus the
pinned Supabase CLI instructions and local account preparation in
[P4.5 verification](docs/p4-5-verification.md). The local-only launcher
`api/tools/start-p45-mobile.ps1 -LanAddress <your-reachable-PC-IP>` uses process-only
public configuration and leaves hosted `.env` files untouched. Local accounts and
secrets are not in Git and cannot be reused from another developer's machine.
Opening a phone requires a reachable LAN path; a bundle export is not a device test.

**Current handoff:** [PROJECT_TRACKER.md](PROJECT_TRACKER.md) shows each owner's progress, open gates, and next actions.

## Mobile setup

The app uses Expo SDK 58. Use Expo Go for SDK 58 on your phone and Node.js
22.13+ (22.x), 24.3+ (24.x), or 26+. Keep your phone and computer on the same Wi-Fi.

```bash
cd mobile
npm ci
npm run typecheck
npx expo start
```

The mobile project is on Expo SDK 58. Open the dev-server address shown by Expo in an SDK 58-compatible Expo Go on an Android phone and an iPhone to validate each platform separately. For a LAN session, both phones must be able to reach the development computer; a successful bundle export is not a phone launch. Device and tool access results are in `docs/build-log-mobile.md`. Do not add provider secrets to any `EXPO_PUBLIC_*` value; those values are bundled into the app.

If Expo Go reports an SDK mismatch, confirm you are running Metro from this
checkout's `mobile/` directory, install dependencies with `npm ci`, and restart
with `npx expo start --clear`. If the phone cannot reach Metro over Wi-Fi, try
`npx expo start --tunnel`.

The product scope, technical specification, and implementation plan are the three `Samvad_*.md` files at the repository root. The proposed shared contract is in `docs/contracts.md`; Developer B's proposal is in `api/docs/contracts-proposal.md`. Developer A owns `mobile/**`, while Developer B owns `api/**` and `supabase/**`.

FastAPI exposes `/health` and P4's authenticated AI routes; see
[api/README.md](api/README.md). Auth, content and P4.5 social actions use Supabase.
The local-only P4.5 launcher intentionally leaves AI unavailable and submissions
pending; use its reviewed fixture for public social testing. Human-language/policy
review still gates automatic AI publication. No new Sarvam pipeline is live yet.

### If Expo Go buffers on a phone

First open `http://<laptop-LAN-IP>:8081/status` in that phone's browser. If the browser cannot show `packager-status:running`, the phone cannot reach Metro; changing app code or SDK versions will not fix that network path. Phone-hosted hotspots and public Wi-Fi can block device-to-laptop traffic.

For a temporary HTTPS preview when LAN access is blocked, start a [Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) to Metro and set `EXPO_PACKAGER_PROXY_URL` to its HTTPS URL **before** starting Expo. The public manifest's `launchAsset.url` must use the tunnel hostname without a local `:8081` port. Scan an `exps://<tunnel-host>` QR in Expo Go; `exps://` selects HTTPS. Quick Tunnel addresses are temporary and public, so use this only for the P0 sample app and recheck the address after any restart. The current session and platform evidence are in `docs/build-log-mobile.md`.
