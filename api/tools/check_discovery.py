"""Ordinary-user P2 acceptance, using the existing dedicated development accounts."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from uuid import NAMESPACE_URL, uuid4, uuid5

import httpx

from tools.check_identity import IdentityCheckError, checked_json, load_config, require


def run_checks(config, prepare_fixtures=False):
    sessions = []
    cleanup = []
    results = []
    with httpx.Client(base_url=config.url, headers={"apikey": config.public_key},
                      timeout=20, follow_redirects=False, trust_env=False) as client:
        try:
            for email, password in [(config.email_a, config.password_a),
                                    (config.email_b, config.password_b)]:
                data = checked_json(client.post("/auth/v1/token", params={"grant_type": "password"},
                    json={"email": email, "password": password}), {200}, "Dedicated account login")
                headers = {"Authorization": f"Bearer {data['access_token']}"}
                user = checked_json(client.get("/auth/v1/user", headers=headers), {200}, "Session validation")
                sessions.append((user["id"], headers))
            a, b = sessions
            require(a[0] != b[0], "Two distinct accounts required")

            def rpc(name, payload, user=None):
                return client.post(f"/rest/v1/rpc/{name}", json=payload,
                                   headers=user[1] if user else {})

            def submit(user, key, text, language="ml"):
                return checked_json(rpc("submit_post", {"p_request_id": key, "p_body": text,
                    "p_language": language}, user), {200}, "Submit post")

            if prepare_fixtures:
                examples = [
                    (a, "Demo fixture: Which public transport improvement would help your daily commute?", "en"),
                    (a, "ഡെമോ പോസ്റ്റ്: നിങ്ങളുടെ നാട്ടിൽ മെച്ചപ്പെടുത്തേണ്ട പൊതുസൗകര്യം ഏതാണ്?", "ml"),
                    (b, "डेमो पोस्ट: आपको कौन-सी नई तकनीक उपयोगी लगती है?", "hi"),
                ]
                return [{"id": submit(user, str(uuid5(NAMESPACE_URL,
                    f"samvad-p2-fixture:{user[0]}:{index}")), text, language)["id"]}
                    for index, (user, text, language) in enumerate(examples)]

            public = checked_json(rpc("get_discovery_feed", {}), {200}, "Public discovery")
            require(sum(row["kind"] == "news" for row in public) == 6, "Expected six attributed source items")
            require(any(row["kind"] == "post" and row["post"]["is_fixture"] for row in public),
                    "Trusted review of demo fixtures is required before mixed-feed acceptance")
            require(all(row["news"]["source_url"].startswith("https://")
                        for row in public if row["kind"] == "news"), "Invalid publisher link")
            results.append("Public cold-start mixed feed: six attributed sources and reviewed labeled fixtures")

            key, text = str(uuid4()), "P2 development verification: മലയാളം हिन्दी 👋"
            saved = submit(a, key, text)
            cleanup.append((a, saved["id"]))
            require(saved["moderation_state"] == "pending", "New posts must remain pending")
            require(bool(saved["conversation_id"]), "Missing stable conversation root")
            with ThreadPoolExecutor(max_workers=4) as pool:
                retries = list(pool.map(lambda _: submit(a, key, text), range(8)))
            require(all(row["id"] == saved["id"] and
                        row["conversation_id"] == saved["conversation_id"] for row in retries),
                    "Concurrent retries produced multiple records")
            response = rpc("submit_post", {"p_request_id": key, "p_body": "changed text", "p_language": "en"}, a)
            error = checked_json(response, {409}, "Idempotency conflict")
            require(error.get("code") == "PT409", "Expected normalized conflict status")
            results.append("Durable Unicode submission: eight concurrent retries share one post/root; changed retry rejected")

            def read_post(user):
                return checked_json(client.get("/rest/v1/posts", headers=user[1] if user else {},
                    params={"id": f"eq.{saved['id']}", "select": "id,body,language,moderation_state"}),
                    {200}, "Post visibility")
            owner_rows = read_post(a)
            require(len(owner_rows) == 1 and owner_rows[0]["body"] == text, "Unicode was not preserved")
            require(read_post(b) == [] and read_post(None) == [], "Unscreened text leaked")
            owner_feed = checked_json(rpc("get_discovery_feed", {}, a), {200}, "Owner public feed")
            require(not any(row["id"] == saved["id"] for row in owner_feed), "Held post entered public discovery")
            results.append("Pending content: author-only read, excluded from public feed, B and anon denied")

            response = client.patch("/rest/v1/posts", headers=a[1], params={"id": f"eq.{saved['id']}"},
                json={"moderation_state": "allowed", "is_fixture": True})
            require(response.status_code == 403, "Client publication was allowed")
            response = client.post("/rest/v1/posts", headers=b[1], json={"author_id": a[0],
                "request_id": str(uuid4()), "body": "forged", "language": "en"})
            require(response.status_code == 403, "Direct forged author insert was allowed")
            require(rpc("submit_post", {"p_request_id": str(uuid4()), "p_body": "anon", "p_language": "en"}).status_code
                    in {401, 403}, "Anonymous submit was allowed")
            require(checked_json(rpc("delete_own_post", {"p_post_id": saved["id"]}, b),
                                 {200}, "Cross-owner removal") is False, "B deleted A's post")
            results.append("Write protection: no self-publication, forged author, anonymous submission or cross-owner removal")

            collected, after = [], None
            for _ in range(20):
                page = checked_json(rpc("get_discovery_feed", {"p_limit": 2, "p_after": after}),
                                    {200}, "Cursor page")
                collected.extend(row["id"] for row in page)
                if not page:
                    break
                last = page[-1]
                after = {"matched": last["interest_match"], "at": last["sort_at"],
                         "id": last["id"], "kind": last["kind"]}
            require(collected == [row["id"] for row in public] and len(set(collected)) == len(collected),
                    "Pagination has omissions/duplicates")
            topic = checked_json(rpc("get_discovery_feed", {"p_topic": "culture"}, a), {200}, "Topic feed")
            require(all(row["news"]["topic"] == "culture" for row in topic if row["kind"] == "news"),
                    "Topic filter failed")
            require(any(row["kind"] == "post" for row in topic), "Topic discovery lost original posts")
            results.append("Stable keyset pages and topic filters: no duplicates; original posts retained")

            require(checked_json(rpc("delete_own_post", {"p_post_id": saved["id"]}, a),
                                 {200}, "Owner removal") is True, "Owner removal failed")
            require(read_post(a) == [] and read_post(b) == [], "Removed text remains readable")
            replay = submit(a, key, text)
            require(replay["id"] == saved["id"] and replay["deleted"] is True, "Deleted retry created another post")
            results.append("Owner soft deletion and deleted-request replay: no body leak or duplicate resurrection")
            return results
        finally:
            for user, post_id in cleanup:
                try:
                    client.post("/rest/v1/rpc/delete_own_post", json={"p_post_id": post_id}, headers=user[1])
                except httpx.HTTPError:
                    pass
            for _, headers in sessions:
                try:
                    client.post("/auth/v1/logout", params={"scope": "local"}, headers=headers)
                except httpx.HTTPError:
                    pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prepare-fixtures", action="store_true")
    args = parser.parse_args()
    try:
        config = load_config()
        if config is None:
            print("BLOCKED: dedicated development credentials are required")
            return 2
        results = run_checks(config, args.prepare_fixtures)
        if args.prepare_fixtures:
            print("Prepared pending demo fixture IDs: " + ",".join(row["id"] for row in results))
            print("Trusted operator review required; no client published these records")
        else:
            for result in results:
                print(f"PASS: {result}")
        return 0
    except IdentityCheckError as error:
        print(f"FAIL: {error}")
        return 1
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        print("FAIL: development discovery verification did not complete; no sensitive response logged")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
