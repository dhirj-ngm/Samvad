# Integration gates

| Gate | Android | iOS | Other dependencies | Overall |
|---|---|---|---|---|
| P0 | Bundle export passed; device launch not tested | Bundle export passed; device launch not tested | API tests 28 passed, lint and pip check passed, local `/health` returned 200; contract design baseline recorded, Supabase unconfigured | Blocked: device launch and app-to-API connectivity remain unverified |

P0 checks on 23 October 2026: `npm ci`, `npm run typecheck`, and `npx expo export --platform android|ios` passed; `api/.venv/bin/python -m pytest -q` passed 28 tests, Ruff and pip check passed; an actual local Uvicorn `/health` request returned HTTP 200 with Supabase `not_configured` and AI `disabled_p0`. Bundle exports do not prove a device launch. No authenticated flow, database migration, or app-to-API connection was tested.
