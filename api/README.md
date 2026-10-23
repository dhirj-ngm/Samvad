# Samvad backend — P0 service and P1 identity database

FastAPI implements only unauthenticated `GET /health`. P1 identity and onboarding
use Supabase Auth and RLS-protected tables, not custom FastAPI password endpoints.
The [P1 setup/handoff](../supabase/README.md) covers the migration, Auth configuration,
retry-safe onboarding and real-account checks. The development migration is applied;
live Auth/onboarding/privacy checks passed with two dedicated admin-confirmed
accounts. Signup email delivery and mobile device acceptance remain pending.
No AI or publishing is implemented.
No cloud credentials are required to start FastAPI.
Run commands from `api/` using Python 3.13 (verified on Windows 3.13.5).

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install --require-hashes -r requirements-dev.lock
Copy-Item .env.example .env
.venv/Scripts/python -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
```

On macOS/Linux use `.venv/bin/python` and `cp .env.example .env`. Runtime-only
installation uses `requirements.lock`; dev lock includes runtime and checks.
Do not overwrite an existing `.env`. No activation is required.

In a second terminal: `Invoke-RestMethod http://127.0.0.1:8000/health` (or curl).
Expected HTTP 200:

```json
{"status":"ok","service":"samvad-api","phase":"P0","checks":{"settings":"valid","supabase":"not_configured","ai":"disabled_p0"}}
```

This is process liveness. Setting SUPABASE_URL changes its check to `not_checked`,
never `ready`. AI remains `disabled_p0` even when keys/models are configured.
Invalid settings fail startup. `/docs` and `/openapi.json` document only health.
Health never echoes secrets or attempts external calls.

```powershell
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m ruff check app tools tests
.venv/Scripts/python -m pip check
```

`ALLOWED_ORIGINS` is a JSON list of explicit origins, default `[]`. Loopback HTTP
is allowed for local web development; remote origins require HTTPS. CORS is not
native authorization. Supabase URL must be an HTTPS project origin; optional JWKS
must match that project's `/auth/v1/.well-known/jwks.json`. Audience is authenticated.
Blank cloud values are deliberate. The provider is restricted to Groq in P0;
Gemma requires evaluation and a later explicit adapter/configuration change.

Dependencies are fully pinned with hashes. To deliberately refresh using installed
pip-tools 7.6.2, regenerate both locks, review and rerun checks:

```powershell
.venv/Scripts/python -m piptools compile --generate-hashes --strip-extras --output-file requirements.lock requirements.in
.venv/Scripts/python -m piptools compile --allow-unsafe --generate-hashes --strip-extras --constraint requirements.lock --output-file requirements-dev.lock requirements-dev.in
```

Locks were resolved on Windows/Python 3.13; other platforms need their own install
verification. Root configuration belongs to the captain; local `.gitignore` protects
the API venv, `.env` and caches. Review staged paths before any later commit.

See [contract proposals](docs/contracts-proposal.md),
[device checklist](docs/connectivity-checklist.md) and
[schema baseline](../supabase/schema-proposal.md). Stop after P1; P2/P4 are not implemented.
