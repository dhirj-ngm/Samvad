import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requestAI, validAPIBase } from '../lib/ai-client.ts';
const client={auth:{getSession:async()=>({data:{session:{user:{id:'A'},access_token:'test-user-token'}}})}};
test('AI base requires an HTTPS origin without embedded credentials',()=>{
  assert.equal(validAPIBase('https://example.org'),true);
  for(const value of [undefined,'http://localhost:8000','https://user:secret@example.org','https://example.org/?key=secret','https://example.org/v1','bad'])assert.equal(validAPIBase(value),false);
});
test('local HTTP requires explicit opt-in and cannot address public hosts or URL paths',()=>{
  assert.equal(validAPIBase('http://192.168.29.101:8775',true),true);
  assert.equal(validAPIBase('http://192.168.29.101:8775'),false);
  for(const value of ['http://example.org','http://8.8.8.8','http://192.168.1.2/v1','http://user:pass@127.0.0.1'])
    assert.equal(validAPIBase(value,true),false);
});
test('a confirmed 202 save is returned intact for pending-screening recovery',async()=>{
  const previous=globalThis.fetch;let calls=0;
  const saved={id:'stable-id',saved:true,moderation_state:'pending',retryable:true};
  globalThis.fetch=async()=>{calls++;return {ok:true,status:202,json:async()=>saved};};
  try{assert.deepEqual(await requestAI(client,'A','submit-and-screen',{},'https://example.org'),saved);assert.equal(calls,1);}
  finally{globalThis.fetch=previous;}
});
test('account mismatch prevents any network call',async()=>{
  const previous=globalThis.fetch;globalThis.fetch=()=>{throw new Error('Should not send');};
  try{await assert.rejects(()=>requestAI(client,'B','translate',{},'https://example.org'),/Sign in/);}finally{globalThis.fetch=previous;}
});
test('adapter pins bearer, normalizes free-quota failure and sends only entity contract',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async(url,init)=>{
    assert.equal(url,'https://example.org/v1/translate');assert.equal(init.headers.Authorization,'Bearer test-user-token');
    assert.deepEqual(JSON.parse(init.body),{entity_type:'reply',entity_id:'ID',target_language:'hi'});
    return {ok:false,status:429};
  };
  try{await assert.rejects(()=>requestAI(client,'A','translate',{entity_type:'reply',entity_id:'ID',target_language:'hi'},'https://example.org'),/Free AI quota/);}finally{globalThis.fetch=previous;}
});
test('offline submissions retain an explicit uncertain-save warning, without an automatic retry',async()=>{
  const previous=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;throw new TypeError('Network request failed');};
  try{
    await assert.rejects(()=>requestAI(client,'A','submit-and-screen',{request_id:'same-id'},'https://example.org'),/draft is kept; retry the same submission/);
    assert.equal(calls,1);
    await assert.rejects(()=>requestAI(client,'A','translate',{},'https://example.org'),/Original text remains available/);
  }finally{globalThis.fetch=previous;}
});
test('aborted submissions preserve ambiguity while translations retain original and retry guidance',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>{const e=new Error('aborted');e.name='AbortError';throw e;};
  try{
    await assert.rejects(()=>requestAI(client,'A','submit-and-screen',{},'https://example.org'),/Retry the same submission; do not start another copy/);
    await assert.rejects(()=>requestAI(client,'A','translate',{},'https://example.org'),/Original text remains available. Retry/);
  }finally{globalThis.fetch=previous;}
});
