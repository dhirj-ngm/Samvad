// Opt-in shared native adapter verification. No privileged credentials or token logging.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { actorRpc, loadReplies, submitReply, submitReport } from '../lib/conversation.ts';
const env=process.env;
function isPublic(value='') {
  if(value.startsWith('sb_publishable_'))return true;
  try{return JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString()).role==='anon';}catch{return false;}
}
if(env.SAMVAD_P1_ALLOW_WRITES!=='true'||!env.SAMVAD_P1_TEST_URL||!isPublic(env.SAMVAD_P1_PUBLIC_KEY)||
  !env.SAMVAD_P1_EMAIL_A||!env.SAMVAD_P1_PASSWORD_A||!env.SAMVAD_P1_EMAIL_B||!env.SAMVAD_P1_PASSWORD_B){
  console.log('BLOCKED: public-key dedicated development configuration required');process.exit(2);
}
const clients=[0,1].map(()=>createClient(env.SAMVAD_P1_TEST_URL,env.SAMVAD_P1_PUBLIC_KEY,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
}));
const saved=[];
try{
  const actors=[];
  for(const [i,suffix] of ['A','B'].entries()){
    const {data,error}=await clients[i].auth.signInWithPassword({email:env[`SAMVAD_P1_EMAIL_${suffix}`],password:env[`SAMVAD_P1_PASSWORD_${suffix}`]});
    if(error||!data.user)throw new Error('Dedicated login failed');actors.push(data.user.id);
  }
  assert.notEqual(actors[0],actors[1]);
  const {data:feed,error}=await clients[0].rpc('get_discovery_feed');if(error)throw new Error('Feed unavailable');
  const thread=feed.find(row=>row.kind==='news'&&row.news.topic==='technology').conversation_id;
  const visible=await loadReplies(clients[0],thread,null);
  const first=visible.find(row=>row.is_fixture&&row.author.user_id===actors[0]&&!row.deleted_at);
  assert.ok(first);
  for(const [index,client] of clients.entries()){
    const draft={requestId:randomUUID(),body:'SDK P3 verification: മലയാളം हिन्दी 👋',language:index?'hi':'ml',attempted:true,reason:'other'};
    const copies=await Promise.all(Array.from({length:4},()=>submitReply(client,actors[index],thread,first.id,draft)));
    saved.push([index,copies[0].id]);
    assert.ok(copies.every(row=>row.id===copies[0].id&&row.moderation_state==='pending'));
    assert.equal((await loadReplies(client,thread,null)).find(row=>row.id===copies[0].id).body,draft.body);
    assert.ok(!(await loadReplies(clients[1-index],thread,null)).some(row=>row.id===copies[0].id));
    await assert.rejects(()=>submitReply(client,actors[1-index],thread,null,draft),/Sign in again/);
  }
  const report=await submitReport(clients[1],actors[1],{type:'reply',id:first.id},{
    requestId:randomUUID(),body:'SDK development verification only; no misconduct alleged.',language:'en',attempted:true,reason:'other',
  });
  assert.ok(report.id);
  const {data:privateRows,error:privateError}=await clients[0].from('reports').select('id,status').eq('id',report.id);
  assert.equal(privateError,null);assert.deepEqual(privateRows,[]);
  console.log('PASS: both shared SDK sessions persist Unicode nested replies, deduplicate retries, deny account mismatch, hide held text and keep reports private');
}catch{
  console.log('FAIL: shared conversation adapter verification failed; no credentials or response bodies logged');process.exitCode=1;
}finally{
  for(const [index,id] of saved){
    try{assert.equal(await actorRpc(clients[index],(await clients[index].auth.getUser()).data.user.id,'delete_own_reply',{p_reply_id:id}),true);}
    catch{console.log('FAIL: owner cleanup not confirmed');process.exitCode=1;}
  }
  for(const client of clients)await client.auth.signOut({scope:'local'});
}
