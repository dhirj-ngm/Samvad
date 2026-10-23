import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendFeed, codePointLength, feedCursor, parseDraft, postDraftKey, validPost } from '../lib/post-model.ts';

test('Unicode limits count code points, not UTF-16 units or bytes', () => {
  assert.equal(codePointLength('😀'), 1);
  assert.equal(validPost('😀'.repeat(2000)), true);
  assert.equal(validPost('😀'.repeat(2001)), false);
  assert.equal(validPost('   \n\t'), false);
  assert.equal(validPost('മലയാളം हिन्दी 👋'), true);
});
test('an unresolved draft retains exactly its request key, original text and language', () => {
  const draft = { requestId: '50000000-0000-4000-8000-000000000001', body: 'नमस्ते 👋', language: 'hi', attempted: true };
  assert.deepEqual(parseDraft(JSON.stringify(draft)), draft);
  assert.notEqual(postDraftKey('A'), postDraftKey('B'));
});
test('corrupted drafts are not silently converted into new submissions', () => {
  for (const value of ['{', '{}', 'null', JSON.stringify({ requestId: 'bad', body: 'hello', language: 'en', attempted: true })]) {
    assert.equal(parseDraft(value), null);
  }
});
test('cursor preserves server microseconds and interest priority exactly', () => {
  const row = { kind: 'news', id: 'id', interest_match: true, sort_at: '2026-10-24T01:02:03.123456+00:00' };
  assert.deepEqual(feedCursor(row), { matched: true, at: row.sort_at, id: row.id, kind: row.kind });
});
test('overlapping feed pages render each stable kind/ID once', () => {
  const previous = [{ kind: 'news', id: 'a' }];
  const incoming = [{ kind: 'news', id: 'a' }, { kind: 'post', id: 'b' }, { kind: 'post', id: 'b' }];
  assert.deepEqual(appendFeed(previous, incoming), [previous[0], incoming[1]]);
});
