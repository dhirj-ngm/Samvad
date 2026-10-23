"""P3 checks with public keys and two dedicated real users; no privileged RLS claims."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from uuid import NAMESPACE_URL, uuid4, uuid5

import httpx

from tools.check_identity import IdentityCheckError, checked_json, load_config, require


def run_checks(config, prepare_fixtures=False):
    results, sessions, cleanup = [], [], []
    with httpx.Client(base_url=config.url, headers={"apikey": config.public_key},
                      timeout=20, follow_redirects=False, trust_env=False) as client:
        try:
            for email, password in [(config.email_a, config.password_a),
                                    (config.email_b, config.password_b)]:
                data = checked_json(client.post("/auth/v1/token", params={"grant_type": "password"},
                    json={"email": email, "password": password}), {200}, "Dedicated login")
                headers = {"Authorization": f"Bearer {data['access_token']}"}
                user = checked_json(client.get("/auth/v1/user", headers=headers), {200}, "Validate user")
                sessions.append((user["id"], headers))
            a, b = sessions
            require(a[0] != b[0], "Two distinct users required")

            def rpc(name, payload, user=None):
                return client.post(f"/rest/v1/rpc/{name}", json=payload, headers=user[1] if user else {})

            def query(table, params, user=None, statuses=None):
                return checked_json(client.get(f"/rest/v1/{table}", params=params,
                    headers=user[1] if user else {}), statuses or {200}, "Read authorized records")

            feed = checked_json(rpc("get_discovery_feed", {}), {200}, "Discovery")
            thread = next(row["conversation_id"] for row in feed if row["kind"] == "news"
                          and row["news"]["topic"] == "technology")

            def reply(user, key, body, parent=None, cid=thread):
                return checked_json(rpc("submit_reply", {"p_request_id": key, "p_body": body,
                    "p_language": "ml" if user == a else "hi", "p_parent_reply_id": parent,
                    "p_conversation_id": cid}, user), {200}, "Submit reply")

            def listing(user=None, after=None, limit=30):
                return checked_json(rpc("get_replies", {"p_conversation_id": thread,
                    "p_limit": limit, "p_after": after}, user), {200}, "Read replies")

            fixture_key_a = str(uuid5(NAMESPACE_URL, f"samvad-p3-a:{a[0]}:{thread}"))
            fixture_key_b = str(uuid5(NAMESPACE_URL, f"samvad-p3-b:{b[0]}:{thread}"))
            if prepare_fixtures:
                first = reply(a, fixture_key_a, "ഡെമോ മറുപടി: ചന്ദ്രയാൻ ദൗത്യത്തിൽ നിങ്ങൾക്ക് ഏറ്റവും ഇഷ്ടപ്പെട്ടത് എന്താണ്?")
                if first["moderation_state"] != "allowed":
                    return [f"Review labeled demo reply A before continuing: {first['id']}"]
                second = reply(b, fixture_key_b, "डेमो उत्तर: मुझे चंद्रमा पर सफल लैंडिंग सबसे अच्छी लगी।", first["id"])
                return [f"Reviewed demo A: {first['id']}", f"Review labeled nested demo B: {second['id']}"]

            text, key = "P3 development verification: മലയാളം हिन्दी 👋", str(uuid4())
            saved = reply(a, key, text)
            cleanup.append((a, saved["id"]))
            with ThreadPoolExecutor(max_workers=4) as pool:
                attempts = list(pool.map(lambda _: reply(a, key, text), range(8)))
            require(all(row["id"] == saved["id"] for row in attempts), "Retry duplicated replies")
            require(saved["moderation_state"] == "pending", "Reply auto-published without review")
            own = next(row for row in listing(a) if row["id"] == saved["id"])
            require(own["body"] == text, "Original Unicode was changed")
            require(all(row["id"] != saved["id"] for row in listing(b) + listing()), "Held reply leaked")
            require(rpc("submit_reply", {"p_request_id": key, "p_body": "different", "p_language": "ml",
                "p_conversation_id": thread, "p_parent_reply_id": None}, a).status_code == 409,
                "Changed retry was accepted")
            results.append("Unicode pending reply persists; eight concurrent exact retries share ID; changed retry 409")

            blocked_parent = rpc("submit_reply", {"p_request_id": str(uuid4()), "p_body": "test",
                "p_language": "hi", "p_conversation_id": thread, "p_parent_reply_id": saved["id"]}, b)
            require(blocked_parent.status_code == 404, "B replied to A's held content")
            require(rpc("submit_reply", {"p_request_id": str(uuid4()), "p_body": "test", "p_language": "en",
                "p_conversation_id": thread, "p_parent_reply_id": None}).status_code in {401, 403},
                "Anonymous reply accepted")
            require(client.patch("/rest/v1/replies", headers=a[1], json={"moderation_state": "allowed"},
                params={"id": f"eq.{saved['id']}"}).status_code == 403, "Client could publish")
            require(client.post("/rest/v1/replies", headers=b[1], json={"author_id": a[0],
                "conversation_id": thread, "body": "forged", "language": "en"}).status_code == 403,
                "Client could forge author")
            require(checked_json(rpc("delete_own_reply", {"p_reply_id": saved["id"]}, b),
                                 {200}, "Cross-owner delete") is False, "B deleted A's reply")
            results.append("B/anon cannot read held replies; hidden parents, forged authors, self-publication and cross-owner delete denied")

            # Fixture authors used only ordinary sessions. Approval is an explicit separate operator step.
            public = listing()
            fixtures_a = [row for row in public if row["is_fixture"] and row["author"]["user_id"] == a[0]]
            require(bool(fixtures_a), "Prepare and individually review P3 demo fixtures before gate verification")
            first = fixtures_a[0]
            second = next((row for row in public if row["is_fixture"] and
                           row["author"]["user_id"] == b[0] and row["parent_reply_id"] == first["id"]), None)
            require(second is not None, "Reviewed nested B fixture is missing")
            for user in [a, b]:
                visible = listing(user)
                require(all(any(row["id"] == item["id"] for row in visible) for item in [first, second]),
                        "Two-account public thread unavailable")
                require(all(set(row["author"]) == {"user_id", "handle", "display_name", "bio", "preferred_language"}
                            for row in visible), "Private author data exposed")
            results.append("Both real accounts and anon read reviewed ML/HI parent/child replies with public handles only")

            report_key = str(uuid5(NAMESPACE_URL, f"samvad-p3-report:{b[0]}:{first['id']}"))
            payload = {"p_request_id": report_key, "p_entity_type": "reply", "p_entity_id": first["id"],
                       "p_reason": "other", "p_details": "Development verification only; labeled benign demo fixture, no misconduct alleged."}
            report = checked_json(rpc("submit_report", payload, b), {200}, "Persist private report")
            require(checked_json(rpc("submit_report", payload, b), {200}, "Report retry")["id"] == report["id"],
                    "Report retry duplicated")
            params = {"select": "id,entity_type,entity_id,reason,details,status,created_at", "id": f"eq.{report['id']}"}
            require(len(query("reports", params, b)) == 1, "Reporter cannot read saved report")
            require(query("reports", params, a) == [], "Reported author can read private report")
            query("reports", params, statuses={401, 403})
            query("reports", {"select": "reporter_id"}, b, {403})
            require(client.patch("/rest/v1/reports", headers=b[1], json={"status": "resolved"},
                params={"id": f"eq.{report['id']}"}).status_code == 403, "Reporter could review own report")
            require(next(row for row in listing() if row["id"] == first["id"])["moderation_state"] == "allowed",
                    "Report changed publication state")
            results.append("Private report persisted/read by B only; A/anon denied; no reporter column, status write or automatic content action")

            all_ids, after = [], None
            for _ in range(50):
                page = listing(a, after, 2)
                if not page:
                    break
                all_ids.extend(row["id"] for row in page)
                last = page[-1]
                after = {"at": last["created_at"], "id": last["id"]}
            require(all_ids == [row["id"] for row in listing(a, limit=50)], "Reply cursor order mismatch")
            require(checked_json(rpc("delete_own_reply", {"p_reply_id": saved["id"]}, a),
                                 {200}, "Owner removal") is True, "Owner removal failed")
            tombstone = next(row for row in listing(a) if row["id"] == saved["id"])
            require(tombstone["body"] == "" and tombstone["deleted_at"], "Removed body exposed")
            require(reply(a, key, text)["deleted"] is True, "Deleted submission resurrected")
            results.append("Ascending keyset pagination and owner body removal pass; deleted retries cannot resurrect")
        finally:
            for user, reply_id in cleanup:
                response = client.post("/rest/v1/rpc/delete_own_reply", headers=user[1], json={"p_reply_id": reply_id})
                require(response.status_code == 200, "Verification reply cleanup failed")
            for _, headers in sessions:
                response = client.post("/auth/v1/logout", headers=headers, params={"scope": "local"})
                require(response.status_code in {200, 204}, "Test session logout failed")
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare-fixtures", action="store_true")
    args = parser.parse_args()
    try:
        config = load_config()
        if config is None:
            raise IdentityCheckError("Dedicated development credentials are not configured")
        for result in run_checks(config, args.prepare_fixtures):
            print(result)
    except (IdentityCheckError, httpx.HTTPError):
        print("P3 check failed; inspect safe test assertions, project setup or connectivity. No credentials were printed.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
