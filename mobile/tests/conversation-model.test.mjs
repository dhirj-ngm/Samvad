import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendReplies, parseConversationDraft, replyCursor, replyDraftKey, reportDraftKey } from '../lib/conversation-model.ts';
test('reply drafts isolate accounts, conversations and parent targets',()=>{
  assert.notEqual(replyDraftKey('A','T',null),replyDraftKey('B','T',null));
  assert.notEqual(replyDraftKey('A','T',null),replyDraftKey('A','U',null));
  assert.notEqual(replyDraftKey('A','T',null),replyDraftKey('A','T','P'));
  assert.notEqual(reportDraftKey('A',{type:'post',id:'X'}),reportDraftKey('A',{type:'reply',id:'X'}));
});
test('report retry restores exact reason, details and request ID; corrupt data rejected',()=>{
  const draft={requestId:'50000000-0000-4000-8000-000000000009',body:'മലയാളം हिन्दी 👋',language:'ml',attempted:true,reason:'harassment'};
  assert.deepEqual(parseConversationDraft(JSON.stringify(draft)),draft);
  assert.equal(parseConversationDraft(JSON.stringify({...draft,reason:'disagreement'})),null);
  assert.equal(parseConversationDraft('{'),null);
});
test('reply pages deduplicate without losing updates; cursor retains microseconds',()=>{
  const a={id:'A',created_at:'2026-10-24T01:02:03.123456Z',body:'old'},b={id:'B'};
  assert.deepEqual(appendReplies([a],[{...a,body:'new'},b]),[{...a,body:'new'},b]);
  assert.equal(replyCursor(a).at,a.created_at);
});
