import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
const db = new PGlite({ extensions: { citext } });
const A = '50000000-0000-4000-8000-000000000001';
const B = '50000000-0000-4000-8000-000000000002';
let thread, other, post, allowed, held, heldThread, hiddenChild, deletedThread;
before(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  for (const file of (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort())
    await db.exec(await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)', [A,'a@fixture.invalid',B,'b@fixture.invalid']);
  await db.query("insert into public.profiles(user_id,handle) values($1,'thread_a'),($2,'thread_b')", [A,B]);
  [thread,other] = (await db.query('select id from public.conversations order by id limit 2')).rows.map(r => r.id);
  // Privileged setup of labeled fixtures only; authorization assertions use SET ROLE.
  post = (await db.query("insert into public.posts(author_id,request_id,request_fingerprint,body,language,is_fixture) values($1,gen_random_uuid(),'fixture','Held root','en',true) returning id",[A])).rows[0].id;
  allowed = (await db.query("insert into public.replies(conversation_id,author_id,request_id,request_fingerprint,body,language,moderation_state,is_fixture) values($1,$2,gen_random_uuid(),'fixture','Demo reply','en','allowed',true) returning id",[thread,A])).rows[0].id;
  held = (await db.query("insert into public.replies(conversation_id,author_id,request_id,request_fingerprint,body,language,is_fixture) values($1,$2,gen_random_uuid(),'fixture','Held reply','en',true) returning id",[thread,A])).rows[0].id;
  heldThread=(await db.query('select id from public.conversations where root_post_id=$1',[post])).rows[0].id;
  hiddenChild=(await db.query("insert into public.replies(conversation_id,author_id,request_id,request_fingerprint,body,language,moderation_state,is_fixture) values($1,$2,gen_random_uuid(),'fixture','Hidden by root','en','allowed',true) returning id",[heldThread,A])).rows[0].id;
  const deleted=(await db.query("insert into public.posts(author_id,request_id,request_fingerprint,body,language,moderation_state,deleted_at,is_fixture) values($1,gen_random_uuid(),'fixture','','en','allowed',now(),true) returning id",[A])).rows[0].id;
  deletedThread=(await db.query('select id from public.conversations where root_post_id=$1',[deleted])).rows[0].id;
});
after(async () => db.close());
async function as(uid, action) {
  await db.exec('begin');
  try { await db.exec(`set local role ${uid ? 'authenticated' : 'anon'}`); await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid??'']); return await action(); }
  finally { await db.exec('rollback'); }
}
const rpc = async (name,args) => (await db.query(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) v`,args)).rows[0].v;
const reply = (key=randomUUID(),cid=thread,parent=null,body='മലയാളം हिन्दी 👋',lang='ml') => rpc('submit_reply',[key,cid,parent,body,lang]);
const report = (key=randomUUID(),entity='reply',id=allowed,reason='spam',details='') => rpc('submit_report',[key,entity,id,reason,details]);
const list = (cid=thread,limit=30,after=null) => db.query('select * from public.get_replies($1,$2,$3)',[cid,limit,after]).then(r=>r.rows);
async function rejectsThenContinue(action, pattern) {
  await db.exec('savepoint assertion');
  await assert.rejects(action,pattern);
  await db.exec('rollback to savepoint assertion');
}
test('pending Unicode reply persists; exact retry same ID, changed content conflicts',()=>as(A,async()=>{
  const key=randomUUID(),saved=await reply(key);
  assert.equal(saved.moderation_state,'pending'); assert.deepEqual(await reply(key),saved);
  assert.equal((await list()).find(r=>r.id===saved.id).body,'മലയാളം हिन्दी 👋');
  await assert.rejects(()=>reply(key,thread,null,'different'),/different content/);
}));
test('B and anonymous see approved only; author sees held status',async()=>{
  for(const uid of [B,null]) await as(uid,async()=>assert.deepEqual((await list()).map(r=>r.id),[allowed]));
  await as(A,async()=>assert.equal((await list()).length,2));
});
test('parent references must be visible, same-thread and not deleted',()=>as(B,async()=>{
  assert.ok((await reply(randomUUID(),thread,allowed)).id);
  await rejectsThenContinue(()=>reply(randomUUID(),other,allowed),/Parent reply unavailable/);
  await assert.rejects(()=>reply(randomUUID(),thread,held),/Parent reply unavailable/);
}));
test('held/deleted post roots hide whole reply tree and reject writes by B',()=>as(B,async()=>{
  const cid=(await db.query('select id from public.conversations where root_post_id=$1',[post])).rows;
  assert.equal(cid.length,0);
  assert.deepEqual(await list(heldThread),[]);
  assert.equal((await db.query('select id from public.replies where id=$1',[hiddenChild])).rows.length,0);
  await rejectsThenContinue(()=>reply(randomUUID(),heldThread),/Conversation unavailable/);
  await rejectsThenContinue(()=>reply(randomUUID(),deletedThread),/Conversation unavailable/);
  await assert.rejects(()=>reply(randomUUID(),randomUUID()),/Conversation unavailable/);
}));
test('report minute budget rejects sixth new target but repeated target remains free',()=>as(B,async()=>{
  const sources=(await db.query('select id from public.news_items order by id')).rows;
  for(const row of sources.slice(0,5))await report(randomUUID(),'news',row.id);
  await rejectsThenContinue(()=>report(randomUUID(),'news',sources[5].id),/Too many submissions/);
  assert.ok((await report(randomUUID(),'news',sources[0].id)).id);
}));
test('reply accepts 2000 emoji code points without altering text',()=>as(A,async()=>{
  const saved=await reply(randomUUID(),thread,null,'😀'.repeat(2000),'en');
  assert.equal((await list()).find(row=>row.id===saved.id).body,'😀'.repeat(2000));
}));
test('report hourly cap is enforced independently of the minute budget',async()=>{
  // Privileged fixture setup only: simulate this account reaching its hourly budget.
  await db.query(`insert into samvad_internal.write_budgets(actor_id,action,window_start,used)
    values($1,'report_hour',to_timestamp(floor(extract(epoch from statement_timestamp())/3600)*3600),30)`,[A]);
  try { await as(A,()=>assert.rejects(()=>report(),/Too many submissions/)); }
  finally { await db.query("delete from samvad_internal.write_budgets where actor_id=$1 and action='report_hour'",[A]); }
});
test('owner removal clears body, leaves tombstone, cannot resurrect; B cannot delete',()=>as(A,async()=>{
  const key=randomUUID(),saved=await reply(key);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[B]);
  assert.equal(await rpc('delete_own_reply',[saved.id]),false);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[A]);
  assert.equal(await rpc('delete_own_reply',[saved.id]),true);
  assert.equal((await list()).find(r=>r.id===saved.id).body,'');
  assert.equal((await reply(key)).deleted,true);
}));
test('report retry and alternate request for same target reuse one private report',()=>as(B,async()=>{
  const key=randomUUID(),saved=await report(key);
  assert.equal(saved.status,'submitted'); assert.equal((await report(key)).id,saved.id);
  assert.equal((await report()).id,saved.id);
  assert.equal((await db.query('select id,reason,status from public.reports')).rows.length,1);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[A]);
  assert.equal((await db.query('select id,reason,status from public.reports')).rows.length,0);
}));
test('report payload conflict rejected and no reporter/fingerprint columns granted',()=>as(B,async()=>{
  const key=randomUUID(); await report(key);
  await rejectsThenContinue(()=>report(key,'reply',allowed,'hate'),/different content/);
  await assert.rejects(()=>db.query('select reporter_id from public.reports'),/permission denied/);
}));
test('report cannot target invisible or nonexistent content',()=>as(B,async()=>{
  await rejectsThenContinue(()=>report(randomUUID(),'reply',held),/Content unavailable/);
  await assert.rejects(()=>report(randomUUID(),'post',post),/Content unavailable/);
}));
test('ordinary clients cannot forge author, publish replies, change reports or read budgets',()=>as(B,async()=>{
  for(const sql of ["update public.replies set moderation_state='allowed'", "delete from public.replies", "update public.reports set status='resolved'", 'select * from samvad_internal.write_budgets', 'select request_id from public.replies', "select samvad_internal.consume_budget('x',999,60)","select samvad_internal.submit_post_unlimited(gen_random_uuid(),'bypass','en')"])
    await rejectsThenContinue(()=>db.exec(sql),/permission denied/);
}));
test('anonymous cannot write replies or read reports',()=>as(null,async()=>{
  await rejectsThenContinue(()=>reply(),/permission denied/);
  await rejectsThenContinue(()=>report(),/permission denied/);
  await assert.rejects(()=>db.query('select id from public.reports'),/permission denied/);
}));
for(const [body,lang] of [[' ','en'],['x'.repeat(2001),'en'],['hello','ta'],[null,'ml']])
  test(`reject invalid reply ${lang}/${body?.length}`,()=>as(A,()=>assert.rejects(()=>reply(randomUUID(),thread,null,body,lang),/Invalid reply/)));
test('reply budget rejects eleventh new reply while exact retry remains free',()=>as(B,async()=>{
  const key=randomUUID(); await reply(key);
  for(let n=0;n<9;n++) await reply();
  await rejectsThenContinue(()=>reply(),/Too many submissions/);
  assert.ok((await reply(key)).id);
}));
test('post budget cannot be bypassed via public P2 wrapper',()=>as(B,async()=>{
  const key=randomUUID(); await rpc('submit_post',[key,'test','en']);
  for(let n=0;n<4;n++) await rpc('submit_post',[randomUUID(),'test','en']);
  await rejectsThenContinue(()=>rpc('submit_post',[randomUUID(),'test','en']),/Too many submissions/);
  assert.ok((await rpc('submit_post',[key,'test','en'])).id);
}));
test('reports do not change moderation state; per-target dedup prevents mass-vote effects',()=>as(B,async()=>{
  for(let n=0;n<8;n++) await report();
  assert.equal((await list()).find(r=>r.id===allowed).moderation_state,'allowed');
  assert.equal((await db.query('select id from public.reports')).rows.length,1);
}));
test('reply keyset pages preserve ascending order and IDs without duplicates',()=>as(A,async()=>{
  for(let n=0;n<4;n++) await reply();
  const all=await list(),collected=[]; let cursor=null;
  for(let n=0;n<10;n++) { const page=await list(thread,2,cursor); if(!page.length) break;
    collected.push(...page.map(r=>r.id)); const last=page.at(-1); cursor={at:last.created_at.toISOString(),id:last.id}; }
  assert.deepEqual(collected,all.map(r=>r.id));
}));
test('invalid reply pagination rejected',()=>as(A,async()=>{
  await rejectsThenContinue(()=>list(thread,51),/Invalid reply parameters/);
  await assert.rejects(()=>list(thread,20,{}),/Invalid reply cursor/);
}));
