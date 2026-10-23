# Developer B build log

## 2026-10-23 — P0 Bootstrap & contracts

Scope: backend P0 only, Android and iOS share backend. Read all three root planning
documents, including full Developer B prompt. No AGENTS.md or docs/contracts.md
found. Initial workspace had only the three root documents; no existing code.
Git status/remotes both returned `fatal: not a git repository`. Preserved documents
in place; did not initialize Git, invent a remote or edit captain/mobile files.

Tool audit: Windows PowerShell; Python 3.13.5/pip 25.1.1, Git 2.50.1.windows.1,
Node v24.16.0. Supabase CLI, Docker and uv not found. Local isolated api/.venv
created; no cloud credentials or private account records collected.

Implemented:
- api/app/main.py: FastAPI app factory, typed GET /health, explicit CORS origins.
  Liveness only: cloud unconfigured/unchecked; inference disabled_p0.
- api/app/config.py and api/.env.example: validated HTTPS/JWKS project settings,
  Groq-only skeleton config, per-task IDs, mandatory free-only/no-paid flags,
  conservative bounded quotas/timeouts, DEMO_MODE=false. No live calls.
- api/app/services/ai_provider.py: typed provider boundary and fail-closed Groq
  skeleton; never returns fake inference success.
- api/requirements*.in and hash locks; api/.gitignore; api/pyproject.toml;
  api/tests/test_bootstrap.py; api/README.md local setup and check instructions.
- api/docs/contracts-proposal.md: exact API/auth/data/env proposals, verified JWT
  plan, future provenance/errors, request idempotency and pending publication.
- api/docs/connectivity-checklist.md: separate Android/iOS HTTPS and future auth
  redirect/session checklist for Developer A, no fabricated device pass.
- supabase/schema-proposal.md, supabase/seed-format.md,
  supabase/migrations/README.md: complete table/constraint/RLS design and ordered
  later migration/test plan. No executable/applied schema or real news seeds yet.

Tested (commands from api unless stated):
- `.venv/Scripts/python -m pytest -q`: 28 passed, 1 dependency deprecation warning
  (Starlette's httpx TestClient support; upstream recommends httpx2). Tests cover
  absent credentials, configured-not-ready, no secret echo, prohibited paid config,
  limits, JWT URL mismatch, env parsing/template, CORS and provider fail-closed.
- `.venv/Scripts/python -m ruff check app tests`: all checks passed.
- `.venv/Scripts/python -m pip check`: no broken requirements found.
- Uvicorn factory started at 127.0.0.1:8765; PowerShell
  `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/health`: HTTP 200,
  `{"status":"ok","service":"samvad-api","phase":"P0","checks":{"settings":"valid","supabase":"not_configured","ai":"disabled_p0"}}`.
  `/openapi.json` listed only `/health`. Temporary server stopped after check.
- Runtime lock generation succeeded; pip `--require-hashes --dry-run
  --ignore-installed -r requirements.lock` succeeded for all 17 runtime packages.
- Dev lock generated with `--allow-unsafe` to also pin/hash pip and setuptools
  (required by pip-tools). `pip install --require-hashes --force-reinstall
  -r requirements-dev.lock` succeeded for all 32 packages, including isolated
  venv pip 26.2.2. Post-install pytest/Ruff/pip-check results remained passing.
- Fallback whitespace/conflict-marker scan checked all 20 owned deliverable files:
  zero issues. Git diff check remained unavailable without repository metadata.
- Targeted credential-pattern scan over owned source/config/docs excluding local
  venv/caches: no matches. No .env was created. This is a scoped check, not a
  comprehensive public-launch security audit.

Corrections during checks: template exposed Literal[bool] dotenv parsing issue;
changed to parsed booleans with mandatory free-only/no-paid validator, reran all
tests successfully. Ruff import formatting fixed. An initial dev-lock compile
started before runtime lock existed and failed; rerun after runtime lock finished.
PowerShell Invoke-WebRequest without UseBasicParsing failed locally; corrected
command returned actual HTTP 200. These failures were not recorded as passes.

Provider verification: official Groq model and Free plan limit pages rechecked
2026-10-23, list qwen/qwen3.8-27b and 30 RPM / 1000 RPD / 8000 TPM / 200000 TPD.
Actual account/free-route access is UNVERIFIED; no inference requested. Supabase
JWT docs rechecked for asymmetric JWKS and legacy Auth-server validation.
Sources and required pre-live checks are recorded in contracts-proposal.md.

Blocked:
- Git repository/remote/captain bootstrap missing: no branch, commit SHA or push.
  `git diff --check` cannot run without a repository; no staged changes exist.
- Shared contracts and configuration require captain/A agreement. Private identity
  proposal denies all client table reads, following stricter Product Scope §7;
  DPR's owner read suggestion is recorded as a reconciliation for review.
- Supabase project/keys, asymmetric signing setup and database tooling absent;
  DB connectivity, migration execution and two-user RLS tests NOT RUN (later phase).
- Android/iOS app/device launches, HTTPS device connectivity and redirect evidence
  NOT RUN; both platforms BLOCKED, not PASS.
- Groq account free-plan/model access, data settings and language evaluation absent;
  live inference and quality NOT RUN. Quota enforcement is configuration/design,
  not implemented in P0. No paid or fixture fallback enabled.

Next (handoff only; do not start P1 in this task): captain initializes main/remote
and separate dev/backend checkout, reviews/adopts contract proposal and root ignore
rules, Developer A records each device's launch/connectivity, then agree P0 gate.
Supply development Supabase URL/signing config for P1 after explicit instruction.
Before eventual live AI, verify actual Groq Free plan/model visibility with no
billing upgrades and complete EN/HI/ML evaluation. Joint P0 gate remains BLOCKED.
