"""Opt-in P1 checks against dedicated real Supabase development accounts.

Uses only a public client key and user password grants. Never provisions accounts,
applies migrations, prints credentials, or uses service-role authorization.
"""

import base64
import json
import os
from dataclasses import dataclass, field
from urllib.parse import urlsplit
from uuid import UUID, uuid4

import httpx


class IdentityCheckError(RuntimeError):
    """Safe diagnostic: must never include HTTP bodies or account details."""


@dataclass(repr=False)
class LiveConfig:
    url: str
    public_key: str = field(repr=False)
    email_a: str = field(repr=False)
    password_a: str = field(repr=False)
    email_b: str = field(repr=False)
    password_b: str = field(repr=False)


REQUIRED_ENV = (
    "SAMVAD_P1_TEST_URL", "SAMVAD_P1_PUBLIC_KEY", "SAMVAD_P1_EMAIL_A",
    "SAMVAD_P1_PASSWORD_A", "SAMVAD_P1_EMAIL_B", "SAMVAD_P1_PASSWORD_B",
)
PUBLIC_COLUMNS = {"user_id", "handle", "display_name", "bio", "preferred_language", "created_at"}


def is_public_key(value: str) -> bool:
    if value.startswith("sb_publishable_"):
        return True
    try:
        payload = value.split(".")[1]
        claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        # Reject privileged keys. This decode is NOT authentication/verification;
        # the actual Auth server validates all keys and user access tokens.
        return isinstance(claims, dict) and claims.get("role") == "anon"
    except (ValueError, IndexError, TypeError):
        return False


def load_config() -> LiveConfig | None:
    if any(not os.environ.get(name) for name in REQUIRED_ENV):
        return None
    if os.environ.get("SAMVAD_P1_ALLOW_WRITES") != "true":
        raise IdentityCheckError("Dedicated-development-account write opt-in is required")
    url, key, email_a, password_a, email_b, password_b = (
        os.environ[name] for name in REQUIRED_ENV
    )
    parts = urlsplit(url)
    local = parts.scheme == "http" and parts.hostname in {"localhost", "127.0.0.1"}
    if (not parts.hostname or (parts.scheme != "https" and not local)
            or parts.username or parts.password or parts.query or parts.fragment
            or parts.path not in {"", "/"}):
        raise IdentityCheckError("Test project must be an HTTPS origin or loopback Supabase origin")
    if not is_public_key(key):
        raise IdentityCheckError("Use a publishable or anon key; privileged keys are prohibited")
    if email_a.casefold() == email_b.casefold():
        raise IdentityCheckError("Two different development accounts are required")
    return LiveConfig(url.rstrip("/"), key, email_a, password_a, email_b, password_b)


def require(condition: bool, label: str) -> None:
    if not condition:
        raise IdentityCheckError(label)


def checked_json(response: httpx.Response, statuses: set[int], label: str):
    require(response.status_code in statuses, f"{label}: unexpected HTTP {response.status_code}")
    try:
        return response.json()
    except ValueError:
        raise IdentityCheckError(f"{label}: expected JSON response") from None


def run_checks(config: LiveConfig) -> list[str]:
    """Mutates onboarding on two dedicated accounts; see handoff for recovery."""
    results: list[str] = []
    # Disallow redirects and environment proxies; never forward keys elsewhere.
    with httpx.Client(base_url=config.url, headers={"apikey": config.public_key},
                      timeout=15, follow_redirects=False, trust_env=False) as client:
        sessions = []
        try:
            for label, email, password in [
                ("A", config.email_a, config.password_a),
                ("B", config.email_b, config.password_b),
            ]:
                data = checked_json(client.post("/auth/v1/token", params={"grant_type": "password"},
                                    json={"email": email, "password": password}), {200},
                                    f"Account {label} password login")
                token = data.get("access_token")
                require(isinstance(token, str), "Auth did not return a user session")
                headers = {"Authorization": f"Bearer {token}"}
                user = checked_json(client.get("/auth/v1/user", headers=headers), {200},
                                    f"Account {label} server validation")
                try:
                    user_id = str(UUID(user["id"]))
                except (ValueError, KeyError, TypeError):
                    raise IdentityCheckError("Auth returned an invalid user ID") from None
                require(user.get("email_confirmed_at") is not None,
                        "Use email-confirmed dedicated test accounts")
                sessions.append((user_id, headers))
                results.append(f"Account {label}: authenticated and validated by Supabase Auth")
            a, b = sessions
            require(a[0] != b[0], "Auth returned the same user for both accounts")

            def rest(method, table, user=None, *, params=None, payload=None, prefer=None):
                headers = dict(user[1]) if user else {}
                if prefer:
                    headers["Prefer"] = prefer
                return client.request(method, f"/rest/v1/{table}", params=params,
                                      json=payload, headers=headers)

            interests = checked_json(rest("GET", "interests", params={"select": "id,slug,label"}),
                                     {200}, "Public interests")
            require({row["slug"] for row in interests} ==
                    {"sports", "business", "technology", "infrastructure", "politics", "culture"},
                    "Expected exactly the six P1 seeded interests")
            suffix = uuid4().hex[:12]
            handles = [f"p1_a_{suffix}", f"p1_b_{suffix}"]
            for user, handle, language in [(a, handles[0], "ml"), (b, handles[1], "hi")]:
                payload = {"user_id": user[0], "handle": handle, "display_name": "പേര് 👋",
                           "bio": "P1 development check", "preferred_language": language}
                first = None
                for _ in range(2):
                    rows = checked_json(rest("POST", "profiles", user,
                        params={"on_conflict": "user_id"}, payload=payload,
                        prefer="resolution=merge-duplicates,return=representation"),
                        {200, 201}, "Owner profile upsert")
                    require(len(rows) == 1 and set(rows[0]) == PUBLIC_COLUMNS,
                            "Unexpected public profile shape")
                    require(rows[0]["handle"] == handle and rows[0]["preferred_language"] == language,
                            "Onboarding data did not round-trip")
                    if first:
                        require(first["created_at"] == rows[0]["created_at"],
                                "Retry changed profile creation time")
                    first = rows[0]
                checked_json(rest("DELETE", "user_interests", user,
                    params={"user_id": f"eq.{user[0]}"}, prefer="return=representation"),
                    {200}, "Owner selection reset")
                selected = [{"user_id": user[0], "interest_id": item["id"]}
                            for item in interests[:2]]
                for _ in range(2):
                    response = rest("POST", "user_interests", user,
                        params={"on_conflict": "user_id,interest_id"}, payload=selected,
                        prefer="resolution=ignore-duplicates,return=minimal")
                    require(response.status_code in {200, 201, 204}, "Owner interest retry failed")
                rows = checked_json(rest("GET", "user_interests", user,
                    params={"user_id": f"eq.{user[0]}", "select": "user_id,interest_id"}),
                    {200}, "Owner selections")
                require(len(rows) == 2, "Interest retries produced duplicate/missing selections")
            results.append("Both owners: onboarding saved; profile/interest retries created no duplicates")

            for handle in [handles[0], handles[0].upper()]:
                error = checked_json(rest("PATCH", "profiles", b,
                    params={"user_id": f"eq.{b[0]}"}, payload={"handle": handle}),
                    {409}, "Duplicate handle rejection")
                require(error.get("code") == "23505", "Duplicate handle did not fail uniqueness")
            results.append("Duplicate handles and uppercase variants: rejected")

            for user in [None, a, b]:
                response = rest("GET", "private_identities", user,
                    params={"user_id": f"eq.{a[0]}", "select": "*"})
                require(response.status_code in {401, 403}, "Private identity was not denied")
            results.append("Private identity: denied to anon, A and B")

            public_rows = checked_json(rest("GET", "profiles",
                params={"user_id": f"in.({a[0]},{b[0]})", "select": "*"}),
                {200}, "Public profile query")
            require(len(public_rows) == 2 and all(set(row) == PUBLIC_COLUMNS for row in public_rows),
                    "Public profiles exposed unexpected fields or were inaccessible")
            results.append("Unauthenticated public profiles: intended fields only")

            rows = checked_json(rest("PATCH", "profiles", b,
                params={"user_id": f"eq.{a[0]}"}, payload={"bio": "cross-user attempt"},
                prefer="return=representation"), {200}, "Cross-user profile update")
            require(rows == [], "B altered A profile")
            rows = checked_json(rest("GET", "user_interests", b,
                params={"user_id": f"eq.{a[0]}", "select": "*"}), {200}, "Cross-user interest read")
            require(rows == [], "B read A private interest selections")
            rows = checked_json(rest("DELETE", "user_interests", b,
                params={"user_id": f"eq.{a[0]}"}, prefer="return=representation"),
                {200}, "Cross-user selection delete")
            require(rows == [], "B deleted A selections")
            response = rest("POST", "user_interests", b,
                payload={"user_id": a[0], "interest_id": interests[2]["id"]})
            require(response.status_code == 403, "B inserted an A interest selection")
            response = rest("POST", "profiles", b,
                payload={"user_id": a[0], "handle": "forged_owner"},
                params={"on_conflict": "user_id"}, prefer="resolution=merge-duplicates")
            require(response.status_code == 403, "B upserted A profile")
            results.append("Cross-user profile writes and interest reads/writes: denied or zero affected rows")

            response = rest("PATCH", "profiles",
                params={"user_id": f"eq.{a[0]}"}, payload={"bio": "anon attempt"})
            require(response.status_code in {401, 403}, "Unauthenticated profile write was allowed")
            response = rest("GET", "user_interests", params={"select": "*"})
            require(response.status_code in {401, 403}, "Unauthenticated private interests were allowed")
            results.append("Unauthenticated writes/private selection reads: denied")
            return results
        finally:
            # End only sessions created by this harness; account data is retained
            # for review. Dedicated accounts only; see handoff for mutation details.
            for _, headers in sessions:
                try:
                    client.post("/auth/v1/logout", params={"scope": "local"}, headers=headers)
                except httpx.HTTPError:
                    pass


def main() -> int:
    try:
        config = load_config()
        if config is None:
            print("BLOCKED: configure two dedicated development accounts and public project access")
            return 2
        for result in run_checks(config):
            print(f"PASS: {result}")
        return 0
    except IdentityCheckError as error:
        print(f"FAIL: {error}")
        return 1
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        # No tracebacks/provider bodies: these can contain credential-adjacent data.
        print("FAIL: identity checks did not complete; verify development setup without logging secrets")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
