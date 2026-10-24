"""Local-only P4.5 HTTP checks. Auth/RLS assertions use ordinary user credentials."""

import base64
import os
from uuid import uuid4

import httpx

from tools.check_identity import IdentityCheckError, checked_json, load_config, require
from tools.prepare_local_p45 import local_origin

PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPgzE4AAAFVANWmXr03AAAAAElFTkSuQmCC"
)
PUBLIC = {"user_id", "handle", "display_name", "bio", "preferred_language", "avatar_path"}


def run_checks(config):
    local_origin(config.url)  # Hard guard: this harness cannot mutate hosted accounts.
    sessions, profiles, states, uploads, submissions, restores = [], [], [], [], [], []
    replies = []
    results, cleanup_failed = [], False
    with httpx.Client(base_url=config.url, headers={"apikey": config.public_key}, timeout=25,
                      follow_redirects=False, trust_env=False) as client:
        def rpc(action, payload, user=None, statuses=None):
            response = client.post("/rest/v1/rpc/social", headers=user[1] if user else {},
                                   json={"p_action": action, "p_payload": payload})
            return checked_json(response, statuses or {200}, f"Social {action}")

        def profile_payload(profile, interests):
            return {"handle": profile["handle"], "display_name": profile["display_name"],
                    "bio": profile["bio"], "language": profile["preferred_language"],
                    "interests": interests, "avatar_path": profile.get("avatar_path")}

        def legacy(name, payload, user, statuses=None):
            return checked_json(client.post(f"/rest/v1/rpc/{name}", headers=user[1], json=payload),
                                statuses or {200}, f"Local {name}")

        try:
            for label in ("a", "b"):
                data = checked_json(client.post("/auth/v1/token", params={"grant_type": "password"},
                    json={"email": getattr(config, f"email_{label}"),
                          "password": getattr(config, f"password_{label}")}), {200}, "Local user login")
                user = (data["user"]["id"], {"Authorization": f"Bearer {data['access_token']}"})
                sessions.append(user)
                verified = checked_json(client.get("/auth/v1/user", headers=user[1]), {200}, "Validate user")
                require(verified["id"] == user[0], "User validation mismatch")
                profile = rpc("profile", {"id": user[0]}, user)["profile"]
                choices = checked_json(client.get("/rest/v1/user_interests", headers=user[1],
                    params={"select": "interest_id", "user_id": f"eq.{user[0]}"}), {200}, "Own interests")
                original = profile_payload(profile, [r["interest_id"] for r in choices])
                profiles.append((user, original))
                interests = checked_json(client.get("/rest/v1/interests", params={"select": "id"}),
                                         {200}, "Available interests")
                desired_language = "hi" if original["language"] == "ml" else "ml"
                desired_interests = [interests[-1]["id"]]
                saved = rpc("save_profile", {**original, "display_name": "അനു हिन्दी",
                            "language": desired_language, "interests": desired_interests}, user)
                require(saved["display_name"] == "അനു हिन्दी", "Unicode profile save failed")
                relogin = checked_json(client.post("/auth/v1/token", params={"grant_type": "password"},
                    json={"email": getattr(config, f"email_{label}"),
                          "password": getattr(config, f"password_{label}")}), {200}, "Local user relogin")
                fresh = (user[0], {"Authorization": f"Bearer {relogin['access_token']}"})
                try:
                    require(rpc("profile", {"id": user[0]}, fresh)["profile"]["preferred_language"] ==
                            desired_language, "Reading language did not persist across login")
                    selected = checked_json(client.get("/rest/v1/user_interests", headers=fresh[1],
                        params={"select": "interest_id", "user_id": f"eq.{user[0]}"}), {200}, "Reload interests")
                    require({row["interest_id"] for row in selected} == set(desired_interests),
                            "Interests did not persist across login")
                finally:
                    client.post("/auth/v1/logout", params={"scope": "local"}, headers=fresh[1])
            a, b = sessions
            require(a[0] != b[0], "Two distinct accounts required")
            public = rpc("profile", {"id": a[0]})["profile"]
            require(set(public) == PUBLIC, "Unexpected public profile fields")
            other_interests = checked_json(client.get("/rest/v1/user_interests", headers=b[1],
                params={"select": "interest_id", "user_id": f"eq.{a[0]}"}), {200}, "Other user interests")
            require(other_interests == [], "Private interest selections exposed")
            changed = checked_json(client.patch("/rest/v1/profiles", headers={**b[1], "Prefer": "return=representation"},
                params={"user_id": f"eq.{a[0]}"}, json={"bio": "forbidden cross-user edit"}),
                {200}, "Cross-user profile update")
            require(changed == [], "Cross-user profile write succeeded")
            for user in (None, a, b):
                response = client.get("/rest/v1/private_identities", headers=user[1] if user else {})
                require(response.status_code in {401, 403}, "Private identity exposure")
            rpc("review_queue", {}, a, {403})
            rpc("review_queue", {}, b, {403})
            rpc("follow", {"id": a[0], "desired": True}, a, {400})
            rpc("follow", {"id": b[0], "desired": True, "actor": b[0]}, a, {400})
            rpc("save_profile", {**profiles[1][1], "handle": profiles[0][1]["handle"].upper()}, b, {409})
            results.append("Two local Auth accounts: Unicode/preferences persist across login; public/private/admin boundaries")

            feed = checked_json(client.post("/rest/v1/rpc/get_discovery_feed", json={}), {200}, "News feed")
            news = next(row["conversation_id"] for row in feed if row["kind"] == "news")
            original_follow = rpc("profile", {"id": b[0]}, a)["is_following"]
            states.append(("follow", b[0], original_follow, a))
            for _ in range(3):
                require(rpc("follow", {"id": b[0], "desired": True}, a)["is_following"], "Follow not saved")
            initial = rpc("interactions", {"ids": [news]}, a)[0]
            for action, field in (("like", "liked"), ("repost", "reposted")):
                states.append((action, news, initial[field], a))
                first = rpc(action, {"id": news, "desired": True}, a)
                require(rpc(action, {"id": news, "desired": True}, a) == first, "Retry changed counts/state")
                require(rpc("interactions", {"ids": [news]}, a)[0][field], "State did not persist")
            results.append("News likes/reposts/follows persist; repeated desired states preserve counts")

            public_post = next(row for row in feed if row["kind"] == "post" and
                               row["post"]["author"]["user_id"] == a[0] and row["post"].get("is_fixture"))
            post_thread = public_post["conversation_id"]
            initial_post = rpc("interactions", {"ids": [post_thread]}, b)[0]
            for action, field in (("like", "liked"), ("repost", "reposted")):
                states.append((action, post_thread, initial_post[field], b))
                first = rpc(action, {"id": post_thread, "desired": True}, b)
                require(rpc(action, {"id": post_thread, "desired": True}, b) == first,
                        "Original-post retry changed counts")
            following = rpc("feed", {"mode": "following"}, a)
            require(any(row["reposter"] and row["reposter"]["user_id"] == b[0] and
                        row["item"]["id"] == public_post["id"] for row in following),
                    "Following missed attributed repost")
            results.append("Original-post likes/reposts and Following preserve original conversation/attribution")

            paths = [f"{a[0]}/{uuid4()}.png", f"{a[0]}/{uuid4()}.png"]
            for path in paths:
                response = client.post(f"/storage/v1/object/avatars/{path}", headers={**a[1], "Content-Type": "image/png"}, content=PNG)
                checked_json(response, {200, 201}, "Owner avatar upload")
                uploads.append(path)
            rpc("save_profile", {**profiles[0][1], "avatar_path": paths[0]}, a)
            rpc("save_profile", {**profiles[1][1], "avatar_path": paths[0]}, b, {400})
            denied = client.post(f"/storage/v1/object/avatars/{a[0]}/{uuid4()}.png",
                                 headers={**b[1], "Content-Type": "image/png"}, content=PNG)
            require(denied.status_code in {400, 401, 403}, "Cross-owner avatar upload allowed")
            for mime, content in (("image/svg+xml", b"<svg/>"), ("image/png", PNG + b"0" * (2 * 1024 * 1024))):
                probe = f"{a[0]}/{uuid4()}.png"
                uploads.append(probe)
                response = client.post(f"/storage/v1/object/avatars/{probe}",
                                       headers={**a[1], "Content-Type": mime}, content=content)
                require(response.status_code in {400, 413, 415}, "Storage MIME/size restriction failed")
            rpc("save_profile", {**profiles[0][1], "avatar_path": paths[1]}, a)
            results.append("Real Storage HTTP: owner upload/replacement; cross-owner, MIME and size denials")

            reviewer_data = checked_json(client.post("/auth/v1/token", params={"grant_type": "password"},
                json={"email": os.environ["SAMVAD_P1_EMAIL_R"],
                      "password": os.environ["SAMVAD_P1_PASSWORD_R"]}), {200}, "Local reviewer login")
            reviewer = (reviewer_data["user"]["id"],
                        {"Authorization": f"Bearer {reviewer_data['access_token']}"})
            sessions.append(reviewer)
            require(rpc("admin_status", {}, reviewer) is True, "Separate reviewer not authorized")
            require(rpc("admin_status", {}, a) is False, "Ordinary A must not be admin")
            require(rpc("admin_status", {}, b) is False, "Ordinary B must not be admin")
            public_report = legacy("submit_report", {"p_request_id": str(uuid4()),
                "p_entity_type": "post", "p_entity_id": public_post["id"], "p_reason": "other",
                "p_details": "Benign local public visibility test"}, b)
            restore = {"id": public_report["id"], "request_id": str(uuid4()), "action": "restore",
                       "reason": "Restore benign local fixture after visibility verification"}
            restores.append((restore, reviewer))
            rpc("review", {**restore, "request_id": str(uuid4()), "action": "hide"}, reviewer)
            require(rpc("interactions", {"ids": [post_thread]}, b) == [], "Hidden-source counters leaked")
            hidden_reposts = rpc("feed", {"mode": "reposts", "id": b[0]}, a)
            require(not any(row["item"]["id"] == public_post["id"] for row in hidden_reposts),
                    "Hidden original leaked via repost")
            rpc("review", restore, reviewer)
            restores.pop()
            # This benign local fixture is explicitly reviewed via the human-review
            # route, without changing the pending AI publication decision.
            request_id = str(uuid4())
            body = f"Local P4.5 verification: hello @{profiles[1][1]['handle']} and @unknown_handle."
            saved = legacy("submit_post", {"p_request_id": request_id, "p_body": body, "p_language": "en"}, a)
            submissions.append((saved["id"], a))
            require(legacy("submit_post", {"p_request_id": request_id, "p_body": body, "p_language": "en"}, a)["id"] == saved["id"], "Post retry changed ID")
            require(not any(row["item"]["id"] == saved["id"] for row in
                            rpc("feed", {"mode": "posts", "id": a[0]}, b)), "Pending post leaked publicly")
            mentions = rpc("mentions", {"type": "post", "ids": [saved["id"]]}, a)
            require(len(mentions) == 1 and mentions[0]["target_id"] == b[0], "Mention UUID resolution failed")
            require(rpc("mentions", {"type": "post", "ids": [saved["id"]]}, b) == [], "Pending mention leaked")
            rpc("save_profile", {**profiles[1][1], "handle": f"mention_b_{uuid4().hex[:8]}"}, b)
            require(rpc("mentions", {"type": "post", "ids": [saved["id"]]}, a)[0]["target_id"] == b[0],
                    "Handle edit redirected an existing mention")
            report = legacy("submit_report", {"p_request_id": str(uuid4()), "p_entity_type": "post",
                            "p_entity_id": saved["id"], "p_reason": "other", "p_details": "Benign local verification fixture"}, a)
            decision = {"id": report["id"], "request_id": str(uuid4()), "action": "hide",
                        "reason": "Local human-review path verification; benign fixture"}
            first = rpc("review", decision, reviewer)
            queue = rpc("review_queue", {"status": "resolved"}, reviewer)
            require(all("reporter_id" not in row for row in queue), "Review queue exposed reporter IDs")
            require(rpc("review", decision, reviewer) == first, "Review retry changed audit ID")
            rpc("review", {**decision, "action": "restore"}, reviewer, {409})
            rpc("review", {**decision, "request_id": str(uuid4()), "action": "restore"}, reviewer)
            require(not any(row["item"]["id"] == saved["id"] for row in
                            rpc("feed", {"mode": "posts", "id": a[0]}, b)), "Restore improperly published pending content")
            rpc("review", {**decision, "request_id": str(uuid4()), "action": "dismissed"}, reviewer)
            results.append("Real reviewer JWT: protected queue/actions, hide/restore audit retry and no pending publication")
            results.append("Real user post retries and stable mention UUIDs; held content/mentions remain private")
            reply_request = str(uuid4())
            reply_body = f"Local reply verification: hello @{profiles[1][1]['handle']}."
            # B's handle was edited above; use its persisted current handle for a
            # new reply, while the earlier post's old token keeps its stable UUID.
            current_handle = rpc("profile", {"id": b[0]}, a)["profile"]["handle"]
            reply_body = f"Local reply verification: hello @{current_handle}."
            reply_args = {"p_request_id": reply_request, "p_conversation_id": news,
                          "p_parent_reply_id": None, "p_body": reply_body, "p_language": "en"}
            reply = legacy("submit_reply", reply_args, a)
            replies.append((reply["id"], a))
            require(legacy("submit_reply", reply_args, a)["id"] == reply["id"], "Reply retry duplicated record")
            tags = rpc("mentions", {"type": "reply", "ids": [reply["id"]]}, a)
            require(len(tags) == 1 and tags[0]["target_id"] == b[0], "Reply mention failed")
            require(rpc("mentions", {"type": "reply", "ids": [reply["id"]]}, b) == [],
                    "Pending reply mention leaked")
            visible = legacy("get_replies", {"p_conversation_id": news}, b)
            require(not any(row["id"] == reply["id"] for row in visible), "Pending reply body leaked")
            results.append("Real reply retries and mention targets persist; another account cannot read pending reply")
        finally:
            for decision, reviewer in restores:
                try:
                    rpc("review", decision, reviewer)
                except (IdentityCheckError, httpx.HTTPError):
                    cleanup_failed = True
            for post_id, user in submissions:
                try:
                    legacy("delete_own_post", {"p_post_id": post_id}, user)
                except (IdentityCheckError, httpx.HTTPError):
                    cleanup_failed = True
            for reply_id, user in replies:
                try:
                    legacy("delete_own_reply", {"p_reply_id": reply_id}, user)
                except (IdentityCheckError, httpx.HTTPError):
                    cleanup_failed = True
            for user, payload in reversed(profiles):
                try:
                    rpc("save_profile", payload, user)
                except (IdentityCheckError, httpx.HTTPError):
                    cleanup_failed = True
            for action, target, desired, user in reversed(states):
                try:
                    rpc(action, {"id": target, "desired": desired}, user)
                except (IdentityCheckError, httpx.HTTPError):
                    cleanup_failed = True
            if uploads and sessions:
                response = client.request("DELETE", "/storage/v1/object/avatars", headers=sessions[0][1], json={"prefixes": uploads})
                if response.status_code != 200:
                    cleanup_failed = True
            for user in sessions:
                client.post("/auth/v1/logout", params={"scope": "local"}, headers=user[1])
    require(not cleanup_failed, "Temporary local state cleanup incomplete; inspect before another run")
    return results


if __name__ == "__main__":
    try:
        config = load_config()
        require(config is not None, "Load api/.env.p45-local first")
        for result in run_checks(config):
            print(f"PASS: {result}")
    except IdentityCheckError as error:
        print(f"BLOCKED: {error}")
        raise SystemExit(1) from None
    except (ValueError, httpx.HTTPError, KeyError, StopIteration):
        print("BLOCKED: local P4.5 HTTP checks incomplete; verify Docker, migrations and local fixture setup.")
        raise SystemExit(1) from None
