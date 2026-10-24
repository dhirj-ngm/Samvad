import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { before,after,test } from 'node:test';
import { createHash,randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { storageShim } from './storage-shim.mjs';
const db=new PGlite({extensions:{citext}});
const A='60000000-0000-4000-8000-000000000001',B='60000000-0000-4000-8000-000000000002';
let post;
before(async()=>{
  await db.exec(`create role service_role nologin;create role anon nologin;create role authenticated nologin;
    create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(storageShim);
  for(const name of (await readdir(new URL('../migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())
    await db.exec(await readFile(new URL(`../migrations/${name}`,import.meta.url),'utf8'));
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[A,'a@fixture.invalid',B,'b@fixture.invalid']);
  await db.query("insert into public.profiles(user_id,handle) values($1,'ai_test_a'),($2,'ai_test_b')",[A,B]);
  post=(await db.query("insert into public.posts(author_id,request_id,request_fingerprint,body,language,is_fixture) values($1,gen_random_uuid(),'fixture','I disagree with this policy.','en',true) returning id",[A])).rows[0].id;
});
after(async()=>db.close());
async function as(role,action){await db.exec('begin');try{await db.exec(`set local role ${role}`);return await action();}finally{await db.exec('rollback');}}
const control=(op,data)=>(db.query('select public.ai_control($1,$2) v',[op,data])).then(r=>r.rows[0].v);
const reserve=(changes={})=>control('reserve',{actor:A,task:'translation',tokens:1000,rpm:10,rpd:100,tpm:4000,tpd:50000,timeout:25,...changes});
async function fails(action,pattern){await db.exec('savepoint assertion');await assert.rejects(action,pattern);await db.exec('rollback to savepoint assertion');}
for(const role of ['anon','authenticated'])test(`${role} cannot reserve, cache, commit or inspect AI internals`,()=>as(role,async()=>{
  for(const op of ['reserve','cache_get','cache_put','moderate_commit','release'])await fails(()=>control(op,{}),/permission denied/);
  for(const table of ['ai_cache','ai_reservations','moderation_events'])await fails(()=>db.query(`select * from samvad_internal.${table}`),/permission denied/);
}));
test('server cache round trip is private and exact-key scoped',()=>as('service_role',async()=>{
  const key='a'.repeat(64);assert.equal(await control('cache_get',{key}),null);
  await control('cache_put',{key,result:{translated_text:'नमस्ते 👋'}});
  assert.deepEqual(await control('cache_get',{key}),{translated_text:'नमस्ते 👋'});
  assert.equal(await control('cache_get',{key:'b'.repeat(64)}),null);
}));
test('global concurrency is shared across actors; release permits next reservation',()=>as('service_role',async()=>{
  const first=await reserve();await fails(()=>reserve({actor:B}),/Free AI budget unavailable/);
  await control('release',{id:first.id});assert.ok((await reserve({actor:B})).id);
}));
test('released and failed requests remain charged to request and token budgets',()=>as('service_role',async()=>{
  const first=await reserve({rpm:1});await control('release',{id:first.id});
  await fails(()=>reserve({rpm:1}),/Free AI budget unavailable/);
  await assert.rejects(()=>reserve({tokens:3500}),/Free AI budget unavailable/);
}));
test('daily request limit and token limit reject new reservations',()=>as('service_role',async()=>{
  const first=await reserve();await control('release',{id:first.id});
  await fails(()=>reserve({rpd:1}),/Free AI budget unavailable/);
  await assert.rejects(()=>reserve({tpd:1500}),/Free AI budget unavailable/);
}));
test('briefs leave request headroom for core translation and moderation',()=>as('service_role',async()=>{
  await fails(()=>reserve({task:'summary',rpm:2}),/Free AI budget unavailable/);
  assert.ok((await reserve({task:'moderation',rpm:2})).id);
}));
test('unsafe reservation settings cannot lift hard ceilings',()=>as('service_role',async()=>{
  for(const changes of [{rpm:11},{tpm:4001},{tokens:4001},{rpd:101},{tpd:50001},{timeout:100},{task:'other'}])
    await fails(()=>reserve(changes),/Invalid AI reservation/);
}));
const decision=(changes={})=>control('moderate_commit',{entity_type:'post',id:post,actor:A,
  source_hash:createHash('sha256').update('I disagree with this policy.').digest('hex'),decision:'allowed',reason_code:'none',model_id:'test-model',prompt_version:'test-v1',...changes});
test('moderation commit rejects another actor or stale text hash',()=>as('service_role',async()=>{
  await fails(()=>decision({actor:B}),/Content unavailable/);
  await assert.rejects(()=>decision({source_hash:'changed'}),/Content changed/);
}));
test('screening atomically publishes and logs once; repeated stale transition rejected',()=>as('service_role',async()=>{
  assert.deepEqual(await decision(),{status:'allowed'});
  await fails(()=>decision(),/Content changed/);
  await db.exec('reset role');
  assert.equal((await db.query('select moderation_state from public.posts where id=$1',[post])).rows[0].moderation_state,'allowed');
  assert.equal((await db.query('select count(*) from samvad_internal.moderation_events')).rows[0].count,1);
}));
test('unknown operations and invalid moderation states fail closed',()=>as('service_role',async()=>{
  await fails(()=>control('ban_user',{id:randomUUID()}),/Invalid AI operation/);
  await assert.rejects(()=>decision({decision:'public'}),/Invalid decision/);
}));
