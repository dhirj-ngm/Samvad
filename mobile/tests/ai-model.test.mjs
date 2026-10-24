import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDemoSummary } from '../lib/ai-model.ts';
import { parsePublicationDraft, confirmPublicationDecision } from '../lib/profile-model.ts';

const summary = {
  english_lines: ['Trial', 'Feedback', 'Privacy', 'Compare'], native_lines: [],
  native_language: 'hi', native_status: 'unavailable', is_cached: true, label: 'Author post summary',
};
test('English fallback remains usable but incomplete or wrong-language native summaries are refused', () => {
  assert.deepEqual(parseDemoSummary(summary, 'hi'), summary);
  const available = { ...summary, native_status: 'available', native_lines: ['एक', 'दो', 'तीन', 'चार'] };
  assert.deepEqual(parseDemoSummary(available, 'hi'), available);
  for (const bad of [null, { ...available, native_lines: ['एक'] }, { ...available, native_language: 'ml' },
    { ...summary, native_lines: ['Partial'] }, { ...summary, english_lines: ['a', 'b', 'c', ' '] },
    { ...summary, english_lines: ['a\rb', 'b', 'c', 'd'] }]) {
    assert.throws(() => parseDemoSummary(bad, 'hi'), /not valid/);
  }
});
const decision = { entity_id: '50000000-0000-4000-8000-000000000001', entity_type: 'reply',
  request_id: '50000000-0000-4000-8000-000000000002', action: 'approve', reason: 'Reviewed benign content',
  source_hash: 'a'.repeat(64), expected_state: 'pending' };
test('publication recovery retains the exact decision and rejects corrupt or incomplete drafts', () => {
  assert.deepEqual(parsePublicationDraft(JSON.stringify(decision)), decision);
  for (const bad of [{ ...decision, entity_id: 'bad' }, { ...decision, reason: null },
    { ...decision, reason: ' ' }, { ...decision, source_hash: 'short' },
    { ...decision, expected_state: 'allowed' }, { ...decision, entity_type: 'news' },
    { ...decision, actor: 'forged' }, { request_id: decision.request_id, source_hash: decision.source_hash, action: 'approve' }]) {
    assert.throws(() => parsePublicationDraft(JSON.stringify(bad)), /unreadable/);
  }
});
test('publication draft is not cleared for malformed or conflicting success responses', () => {
  confirmPublicationDecision({ id: decision.request_id, status: 'allowed' }, decision);
  for (const bad of [null, {}, { id: 'bad', status: 'allowed' }, { id: decision.request_id, status: 'blocked' }])
    assert.throws(() => confirmPublicationDecision(bad, decision), /not confirmed/);
});
