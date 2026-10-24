import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {before,after,test} from 'node:test';
import {createHash,randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {citext} from '@electric-sql/pglite/contrib/citext';
import {storageShim} from './storage-shim.mjs';
const db=new PGlite({extensions:{citext}});
const A='61000000-0000-4000-8000-000000000001',B='61000000-0000-4000-8000-000000000002';
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
  await db.query("insert into public.profiles(user_id,handle) values($1,'demo_test_a'),($2,'demo_test_b')",[A,B]);
  await db.query('insert into samvad_internal.review_admins(user_id) values($1)',[B]);
  post=(await db.query("insert into public.posts(author_id,request_id,request_fingerprint,body,language,is_fixture,manual_hidden) values($1,gen_random_uuid(),'fixture','A fictional bus discussion.','en',true,true) returning id",[A])).rows[0].id;
});
after(async()=>db.close());
async function as(role,actor,action){await db.exec('begin');try{
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
  await db.exec(`set local role ${role}`);return await action();
}finally{await db.exec('rollback');}}
async function fails(action,pattern){await db.exec('savepoint assertion');await assert.rejects(action,pattern);await db.exec('rollback to savepoint assertion');}
const reserve=(changes={})=>db.query('select public.demo_ai_control($1,$2) v',['reserve_translation',{actor:A,characters:20,requests:1,cap:100,...changes}]);
const review=(op,payload={})=>db.query('select public.demo_review($1,$2) v',[op,payload]).then(r=>r.rows[0].v);
const decision=(changes={})=>({entity_type:'post',entity_id:post,request_id:randomUUID(),action:'approve',reason:'Reviewed fixture',
  source_hash:createHash('sha256').update('A fictional bus discussion.').digest('hex'),expected_state:'pending',...changes});
for(const role of ['anon','authenticated'])test(`${role} cannot reserve Sarvam allowance or read private ledgers`,()=>as(role,A,async()=>{
  await fails(()=>reserve(),/permission denied/);
  for(const table of ['sarvam_usage','publication_reviews'])await fails(()=>db.query(`select * from samvad_internal.${table}`),/permission denied/);
}));
test('Sarvam allowance is shared across actors and failed attempts stay charged',()=>as('service_role',A,async()=>{
  await reserve();await reserve({actor:B});
  await fails(()=>reserve({characters:61}),/Translation allowance unavailable/);
  await reserve({characters:60});
  await assert.rejects(()=>reserve({characters:1}),/Translation allowance unavailable/);
}));
test('Sarvam zero budget and unsafe limit fail closed',()=>as('service_role',A,async()=>{
  await fails(()=>reserve({cap:0}),/Translation allowance unavailable/);
  for(const changes of [{cap:10001},{characters:6001},{requests:7},{characters:0}])
    await fails(()=>reserve(changes),/Invalid translation reservation/);
}));
test('ordinary users cannot inspect or decide publication queue',()=>as('authenticated',A,async()=>{
  await fails(()=>review('queue'),/Trusted reviewer required/);
  await assert.rejects(()=>review('decide',decision()),/Trusted reviewer required/);
}));
test('reviewer queue includes fixture provenance but no private identity',()=>as('authenticated',B,async()=>{
  const queue=await review('queue');const row=queue.find(r=>r.entity_id===post);
  assert.equal(row.is_fixture,true);assert.equal(row.handle,'demo_test_a');
  assert.equal(row.email,undefined);assert.equal(row.author_id,undefined);
}));
test('review is idempotent, rejects payload mutation and preserves manual hide',()=>as('authenticated',B,async()=>{
  const payload=decision();const result=await review('decide',payload);
  assert.equal(result.status,'allowed');assert.deepEqual(await review('decide',payload),result);
  await fails(()=>review('decide',{...payload,reason:'Changed'}),/Review request changed/);
  await fails(()=>review('decide',decision()),/Source changed/);
  await db.exec('reset role');
  const row=(await db.query('select moderation_state,manual_hidden from public.posts where id=$1',[post])).rows[0];
  assert.equal(row.moderation_state,'allowed');assert.equal(row.manual_hidden,true);
  assert.equal((await db.query('select count(*) from samvad_internal.publication_reviews')).rows[0].count,1);
}));
test('stale source hash cannot publish content',()=>as('authenticated',B,async()=>{
  await assert.rejects(()=>review('decide',decision({source_hash:'0'.repeat(64)})),/Source changed/);
}));
test('deleted sources are never restored by review',()=>as('authenticated',B,async()=>{
  await db.exec('reset role');await db.query("update public.posts set deleted_at=now(),body='' where id=$1",[post]);
  await db.exec('set local role authenticated');
  assert.ok(!(await review('queue')).find(r=>r.entity_id===post));
  await assert.rejects(()=>review('decide',decision()),/Content unavailable/);
}));
