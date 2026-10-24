import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AVATAR_LIMIT,
  appendSocial,
  batchInteractions,
  insertMention,
  mentionQuery,
  social,
  socialCursor,
  validateAvatar,
} from "../lib/social.ts";
import { languages } from "../lib/languages.ts";
import { parseProfileDraft, parseReviewDraft } from "../lib/profile-model.ts";

function client(
  actor = "A",
  response = { data: { liked: true }, error: null },
) {
  const calls = [];
  return {
    calls,
    auth: {
      getSession: async () => ({
        data: {
          session: {
            user: { id: actor },
            access_token: "synthetic-test-token",
          },
        },
        error: null,
      }),
    },
    rpc(name, payload) {
      const query = {
        setHeader(key, value) {
          calls.push({ key, value });
          return query;
        },
        then(resolve, reject) {
          calls.push({ name, payload });
          return Promise.resolve(response).then(resolve, reject);
        },
      };
      return query;
    },
  };
}
test("desired-state adapter pins initiating actor and sends exact desired state for retries", async () => {
  const c = client();
  for (let i = 0; i < 2; i++)
    await social(c, "like", { id: "source", desired: true }, "A");
  assert.deepEqual(
    c.calls.filter((c) => c.payload).map((c) => c.payload),
    Array(2).fill({
      p_action: "like",
      p_payload: { id: "source", desired: true },
    }),
  );
  assert.ok(
    c.calls
      .filter((c) => c.key)
      .every((c) => c.value === "Bearer synthetic-test-token"),
  );
});
test("account switch prevents social mutation and no fake success on missing migration", async () => {
  const c = client("B");
  await assert.rejects(
    () => social(c, "follow", { id: "target", desired: true }, "A"),
    /Account changed/,
  );
  assert.equal(c.calls.length, 0);
  await assert.rejects(
    () =>
      social(
        client("A", { data: null, error: { code: "PGRST202" } }),
        "like",
        {},
        "A",
      ),
    /migration is not installed/,
  );
});
test("feed state uses one deduplicated batch for news and original conversation identities", async () => {
  const c = client("A", {
    data: [
      { id: "thread", likes: 3, reposts: 2, liked: true, reposted: false },
    ],
    error: null,
  });
  const items = [
    { kind: "news", id: "article", conversation_id: "thread" },
    { kind: "post", id: "post", post: { conversation_id: "other" } },
    { kind: "news", id: "article", conversation_id: "thread" },
  ];
  const result = await batchInteractions(c, items);
  assert.equal(result.thread.likes, 3);
  assert.equal(c.calls.length, 1);
  assert.deepEqual(c.calls[0].payload.p_payload.ids, ["thread", "other"]);
});
test("mention suggestions preserve Unicode text, cursor suffix and unknown handles", () => {
  const text = "ഹലോ @rea suffix";
  const cursor = text.indexOf(" suffix");
  assert.equal(mentionQuery(text, cursor), "rea");
  assert.equal(
    insertMention(text, cursor, "reader_b").text,
    "ഹലോ @reader_b  suffix",
  );
  assert.equal(mentionQuery("mail@example.com", 16), null);
  assert.equal(
    mentionQuery("@too_long_handle_with_over_thirty_chars", 38),
    null,
  );
  assert.equal(
    insertMention("Hello @unknown", 14, "not-valid").text,
    "Hello @unknown",
  );
});
test("social pagination preserves timestamp precision and replaces duplicate events only", () => {
  const a = {
    id: "event-a",
    at: "2026-10-24T00:00:00.123456Z",
    item: { kind: "news" },
  };
  assert.equal(socialCursor(a).at, a.at);
  assert.deepEqual(
    appendSocial([a], [a, { ...a, id: "event-b" }]).map((r) => r.id),
    ["event-a", "event-b"],
  );
});
test("avatar bytes reject disguised formats, empty and oversized inputs; supported magic validated", () => {
  assert.throws(
    () => validateAvatar(new TextEncoder().encode("<svg/>")),
    /JPEG/,
  );
  assert.throws(
    () => validateAvatar(new Uint8Array(AVATAR_LIMIT + 1)),
    /2 MiB/,
  );
  assert.throws(() => validateAvatar(new Uint8Array()), /2 MiB/);
  assert.equal(
    validateAvatar(Uint8Array.of(255, 216, 255, 0)).mime,
    "image/jpeg",
  );
  assert.equal(
    validateAvatar(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]))
      .extension,
    "png",
  );
  assert.equal(
    validateAvatar(new TextEncoder().encode("RIFF0000WEBP")).extension,
    "webp",
  );
});
test("language registry contains exactly supported native-script labels", () => {
  assert.deepEqual(
    languages.map((l) => [l.code, l.label]),
    [
      ["en", "English"],
      ["hi", "हिन्दी"],
      ["ml", "മലയാളം"],
    ],
  );
});
test("profile drafts preserve original P1 retries, Unicode edits and avatar reference; corrupt data fails closed", () => {
  const old = { handle: "reader_a", language: "ml", interestIds: [] };
  assert.deepEqual(parseProfileDraft(JSON.stringify(old)), old);
  const edited = {
    ...old,
    displayName: "അനു",
    bio: "नमस्ते",
    avatarPath: "actor/version.png",
  };
  assert.deepEqual(parseProfileDraft(JSON.stringify(edited)), edited);
  for (const value of [
    "{}",
    "null",
    "{broken",
    JSON.stringify({ ...old, interestIds: [123] }),
  ])
    assert.throws(() => parseProfileDraft(value));
});
test("review draft preserves exact action and request key across ambiguous saves", () => {
  const draft = {
    id: "report",
    request_id: "retry-key",
    action: "hide",
    reason: "Reviewed manually",
  };
  assert.deepEqual(parseReviewDraft(JSON.stringify(draft)), draft);
  assert.throws(() =>
    parseReviewDraft(JSON.stringify({ ...draft, action: "ban_account" })),
  );
});
