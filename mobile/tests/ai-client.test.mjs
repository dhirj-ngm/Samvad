import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requestAI, validAPIBase } from '../lib/ai-client.ts';
const client={auth:{getSession:async()=>({data:{session:{user:{id:'A'},access_token:'test-user-token'}}})}};
test('AI base requires an HTTPS origin without embedded credentials',()=>{
  assert.equal(validAPIBase('https://example.org'),true);
  for(const value of [undefined,'http://localhost:8000','https://user:secret@example.org','https://example.org/?key=secret','https://example.org/v1','bad'])assert.equal(validAPIBase(value),false);
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
