"""Prepare dedicated LOCAL Auth fixtures without changing existing .env files.

Only local Auth account setup uses the local admin key. Verification tools use
ordinary password-grant sessions. Never run against a hosted project.
"""

import json
import secrets
import subprocess
from pathlib import Path
from urllib.parse import urlsplit
from uuid import NAMESPACE_URL, UUID, uuid5

import httpx
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[2]
ENV = ROOT / "api" / ".env.p45-local"


def local_origin(url):
    parts = urlsplit(url)
    if (parts.scheme != "http" or parts.hostname not in {"127.0.0.1", "localhost"}
            or parts.username or parts.password or parts.path not in {"", "/"}
            or parts.query or parts.fragment):
        raise ValueError("Only loopback local Supabase is permitted")
    return url.rstrip("/")


def prepare():
    # Capture CLI output because status contains local keys; never print it.
    result = subprocess.run(
        ["npx.cmd", "--yes", "supabase@2.122.0", "status", "--output", "json"],
        cwd=ROOT, capture_output=True, text=True, timeout=60, check=False,
    )
    if result.returncode:
        raise ValueError("Local Supabase is not running. Start Docker, then supabase start.")
    status = json.loads(result.stdout)
    url = local_origin(status["API_URL"])
    public, admin = status["ANON_KEY"], status["SERVICE_ROLE_KEY"]
    if ENV.exists():
        config = dict(dotenv_values(ENV))
        if config.get("SAMVAD_P1_TEST_URL") != url:
            raise ValueError("Existing local configuration has a different origin; kept unchanged")
    else:
        config = {
            "SAMVAD_P1_TEST_URL": url, "SAMVAD_P1_PUBLIC_KEY": public,
            "SAMVAD_P1_EMAIL_A": "p45-a@samvad.test",
            "SAMVAD_P1_EMAIL_B": "p45-b@samvad.test",
            "SAMVAD_P1_PASSWORD_A": secrets.token_urlsafe(24),
            "SAMVAD_P1_PASSWORD_B": secrets.token_urlsafe(24),
            "SAMVAD_P1_EMAIL_R": "p45-reviewer@samvad.test",
            "SAMVAD_P1_PASSWORD_R": secrets.token_urlsafe(24),
            "SAMVAD_P1_ALLOW_WRITES": "true", "SAMVAD_P45_LOCAL_ONLY": "true",
        }
        # Persist before account creation so interruptions can safely reuse credentials.
        with ENV.open("x", encoding="utf8") as stream:
            stream.write("# LOCAL dedicated fixtures only. Never paste or commit this file.\n")
            for key, value in config.items():
                stream.write(f"{key}='{value}'\n")
    with httpx.Client(base_url=url, timeout=20, follow_redirects=False, trust_env=False) as client:
        for label in ("A", "B", "R"):
            email, password = config[f"SAMVAD_P1_EMAIL_{label}"], config[f"SAMVAD_P1_PASSWORD_{label}"]
            response = client.post("/auth/v1/admin/users",
                                  headers={"apikey": admin, "Authorization": f"Bearer {admin}"},
                                  json={"email": email, "password": password, "email_confirm": True})
            if response.status_code not in {200, 201, 422}:
                raise ValueError("Local fixture creation failed; saved configuration retained")
            response = client.post("/auth/v1/token", params={"grant_type": "password"},
                                   headers={"apikey": public}, json={"email": email, "password": password})
            if response.status_code != 200:
                raise ValueError("Local fixture password login failed; no account reset performed")
            token = response.json()["access_token"]
            actor = str(UUID(response.json()["user"]["id"]))
            headers = {"apikey": public, "Authorization": f"Bearer {token}"}
            try:
                interests = client.get("/rest/v1/interests", headers=headers).json()
                payload = {"handle": f"local_p45_{label.lower()}", "display_name": f"Local tester {label}",
                           "bio": "Local verification account", "language": "ml" if label == "A" else "hi",
                           "interests": [interests[0]["id"]], "avatar_path": None}
                response = client.post("/rest/v1/rpc/social", headers=headers,
                                       json={"p_action": "save_profile", "p_payload": payload})
                if response.status_code != 200:
                    raise ValueError("Local P4.5 profile setup failed; check migration status")
                if label == "A":
                    # Reviewed benign LOCAL fixture, labeled in the UI. This is
                    # privileged test setup, not an ordinary-client publication.
                    body = "Local verification fixture: a respectful conversation about Samvad."
                    submitted = client.post("/rest/v1/rpc/submit_post", headers=headers, json={
                        "p_request_id": str(uuid5(NAMESPACE_URL, f"samvad-local-p45:{actor}")),
                        "p_body": body, "p_language": "en",
                    })
                    if submitted.status_code != 200 or submitted.json().get("deleted"):
                        raise ValueError("Local public fixture unavailable; deleted fixtures are not resurrected")
                    post_id = str(UUID(submitted.json()["id"]))
                    reviewed = subprocess.run([
                        "npx.cmd", "--yes", "supabase@2.122.0", "db", "query", "--local",
                        ("update public.posts set moderation_state='allowed',is_fixture=true "
                         f"where id='{post_id}'::uuid and author_id='{actor}'::uuid "
                         "and body='Local verification fixture: a respectful conversation about Samvad.' "
                         "and deleted_at is null and moderation_state in ('pending','allowed')"),
                    ], cwd=ROOT, capture_output=True, text=True, timeout=60, check=False)
                    if reviewed.returncode:
                        raise ValueError("Local reviewed fixture setup failed")
                if label == "R":
                    # Explicit privileged LOCAL fixture setup only. A/B stay ordinary.
                    grant = subprocess.run([
                        "npx.cmd", "--yes", "supabase@2.122.0", "db", "query", "--local",
                        ("insert into samvad_internal.review_admins(user_id) "
                         f"values ('{actor}'::uuid) on conflict do nothing"),
                    ], cwd=ROOT, capture_output=True, text=True, timeout=60, check=False)
                    if grant.returncode:
                        raise ValueError("Local reviewer fixture membership setup failed")
            finally:
                client.post("/auth/v1/logout", params={"scope": "local"}, headers=headers)
    print("PASS: two ordinary local Auth fixtures and a separate local reviewer fixture prepared")
    print("Keys/passwords were not printed; admin credentials used for local fixture setup only.")
    print("Configuration: api/.env.p45-local (ignored). Existing .env files untouched.")


if __name__ == "__main__":
    try:
        prepare()
    except (ValueError, KeyError, OSError, subprocess.SubprocessError, httpx.HTTPError):
        print("BLOCKED: local setup unavailable. Start Docker/Supabase and apply local migrations first.")
        raise SystemExit(1) from None
