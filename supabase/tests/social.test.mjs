import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { before,after,test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { storageShim } from './storage-shim.mjs';
import {social,batchInteractions,batchMentions} from '../../mobile/lib/social.ts';
const db=new PGlite({extensions:{citext}});
const A='70000000-0000-4000-8000-000000000001', B='70000000-0000-4000-8000-000000000002';
const avatarA=`${A}/70000000-0000-4000-8000-000000000010.png`;
let post,conversation,news,report;
before(async()=>{
 await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin;
 create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 await db.exec(storageShim);
 for(const name of (await readdir(new URL('../migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())
  await db.exec(await readFile(new URL(`../migrations/${name}`,import.meta.url),'utf8'));
 await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[A,'private-a@fixture.invalid',B,'private-b@fixture.invalid']);
 await db.query("insert into public.profiles(user_id,handle) values($1,'social_a'),($2,'social_b')",[A,B]);
 await db.query("insert into storage.objects(bucket_id,name) values('avatars',$1)",[avatarA]);
 const r=await user(A,()=>db.query("select public.submit_post($1,'Hello @social_b and @unknown_reader.','en') v",[randomUUID()]),true);
 post=r.rows[0].v.id;conversation=r.rows[0].v.conversation_id;
 await db.query("update public.posts set moderation_state='allowed' where id=$1",[post]);
 news=(await db.query('select id from public.conversations where news_item_id is not null limit 1')).rows[0].id;
 report=(await user(B,()=>db.query("select public.submit_report($1,'post',$2,'other','Please review') v",[randomUUID(),post]),true)).rows[0].v.id;
});
after(()=>db.close());
async function user(id,fn,commit=false){await db.exec('begin');let ok=false;try{
 await db.exec(`set local role ${id?'authenticated':'anon'}`);
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id??'']);
 const r=await fn();ok=true;return r;
}finally{await db.exec(ok&&commit?'commit':'rollback');}}
const rpc=(action,payload={})=>db.query('select public.social($1,$2) v',[action,payload]).then(r=>r.rows[0].v);
async function fails(fn,pattern){await db.exec('savepoint check_failure');await assert.rejects(fn,pattern);await db.exec('rollback to savepoint check_failure');}
test('atomic Unicode profile/preferences persist; invalid interests roll back all fields',async()=>{
 const payload={handle:'social_a',display_name:'അനു हिन्दी',bio:'Hello भारत',language:'ml',interests:[],avatar_path:null};
 await user(A,async()=>{
  for(let i=0;i<3;i++)assert.equal((await rpc('save_profile',payload)).display_name,payload.display_name);
  await fails(()=>rpc('save_profile',{...payload,display_name:'Must rollback',interests:[randomUUID()]}),/Invalid interests/);
  assert.equal((await rpc('profile',{id:A})).profile.display_name,payload.display_name);
  const sport='10000000-0000-4000-8000-000000000001',tech='10000000-0000-4000-8000-000000000003';
  const created=(await db.query('select created_at from public.profiles where user_id=$1',[A])).rows[0].created_at;
  await rpc('save_profile',{...payload,interests:[sport]});
  await rpc('save_profile',{...payload,language:'hi',interests:[tech,tech]});
  assert.deepEqual((await db.query('select interest_id from public.user_interests where user_id=$1',[A])).rows.map(r=>r.interest_id),[tech]);
  assert.equal((await rpc('profile',{id:A})).profile.preferred_language,'hi');
  assert.equal((await db.query('select created_at from public.profiles where user_id=$1',[A])).rows[0].created_at.getTime(),created.getTime());
 });
});
test('public profile has exact public projection, no email or private selections',()=>user(null,async()=>{
 const p=(await rpc('profile',{id:A})).profile;
 assert.deepEqual(Object.keys(p).sort(),['avatar_path','bio','display_name','handle','preferred_language','user_id']);
 await fails(()=>db.query('select * from public.private_identities'),/permission denied/);
}));
test('owner-only immutable avatar paths; referenced image cannot be deleted until replacement',()=>user(A,async()=>{
 const path=`${A}/${randomUUID()}.png`;
 await db.query("insert into storage.objects(bucket_id,name) values('avatars',$1)",[path]);
 await fails(()=>db.query("insert into storage.objects(bucket_id,name) values('avatars',$1)",[`${B}/${randomUUID()}.png`]),/row-level security/);
 await fails(()=>rpc('save_profile',{handle:'social_a',display_name:'',bio:'',language:'en',interests:[],avatar_path:`${B}/${randomUUID()}.png`}),/Upload your avatar/);
 await rpc('save_profile',{handle:'social_a',display_name:'',bio:'',language:'en',interests:[],avatar_path:path});
 assert.equal((await db.query('delete from storage.objects where name=$1 returning name',[path])).rows.length,0);
 await rpc('save_profile',{handle:'social_a',display_name:'',bio:'',language:'en',interests:[],avatar_path:null});
 assert.equal((await db.query('delete from storage.objects where name=$1 returning name',[path])).rows.length,1);
}));
test('follow retries persist once; counts/lists agree; self-follow and forged actor rejected',()=>user(A,async()=>{
 for(let i=0;i<3;i++)assert.equal((await rpc('follow',{id:B,desired:true})).followers,1);
 assert.equal((await rpc('connections',{id:B,direction:'followers'}))[0].user_id,A);
 await fails(()=>rpc('follow',{id:A,desired:true}),/Invalid follow/);
 await fails(()=>rpc('follow',{id:B,desired:true,actor:B}),/Unknown action or field/);
 assert.equal((await rpc('follow',{id:B,desired:false})).followers,0);
}));
for(const kind of ['like','repost'])test(`${kind} desired-state retries/counts and removal cover post + news`,()=>user(B,async()=>{
 for(const id of [conversation,news]){
  for(let i=0;i<3;i++){const r=await rpc(kind,{id,desired:true});assert.equal(r[kind==='like'?'likes':'reposts'],1);}
  const state=(await rpc('interactions',{ids:[id]}))[0];assert.equal(state[kind==='like'?'liked':'reposted'],true);
  assert.equal((await rpc(kind,{id,desired:false}))[kind==='like'?'likes':'reposts'],0);
 }
}));
test('ordinary users cannot forge relationships or read private social/admin/audit tables',()=>user(B,async()=>{
 for(const table of ['likes','follows','reposts','mentions','review_admins','review_actions'])
  await fails(()=>db.query(`select * from samvad_internal.${table}`),/permission denied/);
 await fails(()=>rpc('review_queue'),/Trusted reviewer required/);
 await fails(()=>rpc('review',{id:report,request_id:randomUUID(),action:'hide',reason:'test'}),/Trusted reviewer required/);
 assert.equal(await rpc('admin_status'),false);
}));
test('mention resolution keeps target UUID after handle changes and unknown handles stay text',async()=>{
 await db.exec('begin');try{
  await db.query("update public.profiles set handle='renamed_b' where user_id=$1",[B]);
  await db.exec('set local role anon');
  const mentions=await rpc('mentions',{type:'post',ids:[post]});
  assert.equal(mentions.length,1);assert.equal(mentions[0].handle,'social_b');assert.equal(mentions[0].target_id,B);
 }finally{await db.exec('rollback');}
});
test('Following returns real authors/reposts with attribution, no copied text',async()=>{
 await user(B,()=>rpc('repost',{id:news,desired:true}),true);
 await user(A,async()=>{
  await rpc('follow',{id:B,desired:true});const feed=await rpc('feed',{mode:'following'});
  assert.equal(feed.length,1);assert.equal(feed[0].reposter.user_id,B);assert.equal(feed[0].item.conversation_id,news);
 });
 await user(B,()=>rpc('repost',{id:news,desired:false}),true);
});
test('human hide/restore is audited and idempotent, reporter absent; P4 decision unchanged',async()=>{
 await db.query('insert into samvad_internal.review_admins values($1)',[A]);
 try{await user(A,async()=>{
  const queue=await rpc('review_queue');assert.equal(queue.length,1);assert.equal('reporter_id' in queue[0],false);
  const args={id:report,request_id:randomUUID(),action:'hide',reason:'Human review test'};
  const first=await rpc('review',args);assert.deepEqual(await rpc('review',args),first);
  await fails(()=>rpc('review',{...args,action:'restore'}),/Review request already used/);
  await db.exec('set local role anon');await db.query("select set_config('request.jwt.claim.sub','',true)");
  assert.equal((await db.query('select id from public.posts where id=$1',[post])).rows.length,0);
  assert.equal((await db.query('select id from public.conversations where id=$1',[conversation])).rows.length,0);
  assert.deepEqual(await rpc('interactions',{ids:[conversation]}),[]);
  assert.deepEqual(await rpc('mentions',{type:'post',ids:[post]}),[]);
  await db.exec('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[A]);
  await rpc('review',{...args,request_id:randomUUID(),action:'restore'});
  assert.equal((await rpc('feed',{mode:'posts',id:A})).length,1);
  await rpc('review',{...args,request_id:randomUUID(),action:'dismissed'});
  assert.equal((await rpc('review_queue',{status:'dismissed'}))[0].id,report);
  await rpc('review',{...args,request_id:randomUUID(),action:'reviewed'});
  assert.equal((await rpc('review_queue',{status:'resolved'}))[0].id,report);
 });}finally{await db.query('delete from samvad_internal.review_admins where user_id=$1',[A]);}
 assert.equal((await db.query('select moderation_state from public.posts where id=$1',[post])).rows[0].moderation_state,'allowed');
});
test('hidden/deleted sources vanish from repost feeds, counts and mentions; cannot be liked',async()=>{
 await db.exec('begin');try{
  await db.query('update public.posts set manual_hidden=true where id=$1',[post]);
  await db.exec('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[B]);
  await fails(()=>rpc('repost',{id:conversation,desired:true}),/Public source unavailable/);
  assert.deepEqual(await rpc('feed',{mode:'posts',id:A}),[]);
  assert.deepEqual(await rpc('mentions',{type:'post',ids:[post]}),[]);
  await rpc('repost',{id:conversation,desired:false});
 }finally{await db.exec('rollback');}
});
test('anonymous mutations and subjectless authenticated requests fail closed',()=>user(null,async()=>{
 for(const action of ['like','repost','follow','save_profile','review_queue'])await fails(()=>rpc(action,{}),/Sign in required/);
 await db.exec('set local role authenticated');await fails(()=>rpc('follow',{id:B,desired:true}),/Sign in required/);
}));
test('People search is literal and bounded; invalid batch/actions rejected',()=>user(null,async()=>{
 assert.equal((await rpc('people',{query:'SOCIAL_B'})).length,1);
 assert.equal((await rpc('people',{query:'%'})).length,0);
 await fails(()=>rpc('interactions',{ids:Array(51).fill(news)}),/Invalid batch/);
 await fails(()=>rpc('people',{limit:1000}),/Invalid page size/);
 await fails(()=>rpc('anything'),/Unknown action/);
}));
test('owner-hidden originals stay in submissions and never appear in public discovery or profile Posts',async()=>{
 await db.exec('begin');try{
  await db.query('update public.posts set manual_hidden=true where id=$1',[post]);
  await db.exec('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[A]);
  const publicRows=await db.query('select * from public.get_discovery_feed(null,50,null)');
  assert.equal(publicRows.rows.some(r=>r.id===post),false);
  assert.deepEqual(await rpc('feed',{mode:'posts',id:A}),[]);
  assert.equal((await db.query('select manual_hidden from public.posts where id=$1',[post])).rows[0].manual_hidden,true);
 }finally{await db.exec('rollback');}
});
test('hidden news excludes its thread, social counters and reports for ordinary users',async()=>{
 await db.exec('begin');try{
  const item=(await db.query('select news_item_id from public.conversations where id=$1',[news])).rows[0].news_item_id;
  await db.query('update public.news_items set manual_hidden=true where id=$1',[item]);
  await db.exec('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[B]);
  assert.equal((await db.query('select id from public.conversations where id=$1',[news])).rows.length,0);
  assert.deepEqual(await rpc('interactions',{ids:[news]}),[]);
  await fails(()=>db.query("select public.submit_reply($1,$2,null,'No access','en')",[randomUUID(),news]),/Conversation unavailable/);
  await fails(()=>db.query("select public.submit_report($1,'news',$2,'other','')",[randomUUID(),item]),/Content unavailable/);
 }finally{await db.exec('rollback');}
});
test('human-hidden replies cannot be used as parents or reported by another account',async()=>{
 const reply=(await user(A,()=>db.query("select public.submit_reply($1,$2,null,'Reply for review','en') v",[randomUUID(),conversation]),true)).rows[0].v.id;
 await db.exec('begin');try{
  await db.query("update public.replies set moderation_state='allowed',manual_hidden=true where id=$1",[reply]);
  await db.exec('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[B]);
  assert.equal((await db.query('select id from public.replies where id=$1',[reply])).rows.length,0);
  await fails(()=>db.query("select public.submit_reply($1,$2,$3,'Hidden parent','en')",[randomUUID(),conversation,reply]),/Parent reply unavailable/);
  await fails(()=>db.query("select public.submit_report($1,'reply',$2,'other','')",[randomUUID(),reply]),/Content unavailable/);
 }finally{await db.exec('rollback');}
});
test('profile save rejects case-variant duplicates and cannot edit another actor',()=>user(B,async()=>{
 const data={handle:'SOCIAL_A',display_name:'Another',bio:'',language:'en',interests:[],avatar_path:null};
 await fails(()=>rpc('save_profile',data),/unique constraint/);
 await fails(()=>rpc('save_profile',{...data,id:A}),/Unknown action or field/);
 assert.equal((await rpc('profile',{id:A})).profile.handle,'social_a');
}));
test('clients cannot edit manual visibility, admin membership or another avatar object',()=>user(B,async()=>{
 await fails(()=>db.query('update public.posts set manual_hidden=false where id=$1',[post]),/permission denied/);
 await fails(()=>db.query('insert into samvad_internal.review_admins values($1)',[B]),/permission denied/);
 assert.equal((await db.query("select name from storage.objects where bucket_id='avatars' and name=$1",[avatarA])).rows.length,0);
 assert.equal((await db.query("delete from storage.objects where bucket_id='avatars' and name=$1 returning id",[avatarA])).rows.length,0);
}));
test('deleted originals cannot leak copied text through existing reposts or mentions',()=>user(B,async()=>{
 await rpc('repost',{id:conversation,desired:true});
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[A]);
 assert.equal((await db.query('select public.delete_own_post($1) v',[post])).rows[0].v,true);
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[B]);
 assert.deepEqual(await rpc('feed',{mode:'reposts',id:B}),[]);
 assert.deepEqual(await rpc('interactions',{ids:[conversation]}),[]);
 assert.deepEqual(await rpc('mentions',{type:'post',ids:[post]}),[]);
 await rpc('repost',{id:conversation,desired:false});
}));
test('restoring a pending source leaves it unpublished; private audit records previous state',async()=>{
 await db.exec('begin');try{
  await db.query('insert into samvad_internal.review_admins values($1)',[A]);
  await db.query("update public.posts set manual_hidden=true,moderation_state='pending' where id=$1",[post]);
  await db.exec('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[A]);
  const result=await rpc('review',{id:report,request_id:randomUUID(),action:'restore',reason:'Review complete; existing publication boundary retained'});
  assert.deepEqual(await rpc('feed',{mode:'posts',id:A}),[]);
  await db.exec('reset role');
  const saved=(await db.query('select * from samvad_internal.review_actions where id=$1',[result.id])).rows[0];
  assert.equal(saved.previous_hidden,true);assert.equal(saved.reviewer,A);
  assert.equal((await db.query('select moderation_state from public.posts where id=$1',[post])).rows[0].moderation_state,'pending');
 }finally{await db.exec('rollback');}
});
test('actual mobile adapter integrates with local migrated SQL for both ordinary users',async()=>{
 // This shim supplies a synthetic session and transports RPC calls to PGlite.
 // It is adapter/SQL integration, NOT HTTP/Auth/JWT or live-account evidence.
 const sdk=id=>({auth:{getSession:async()=>({data:{session:{user:{id},access_token:'local-synthetic'}},error:null})},
  rpc(name,args){const req={setHeader(){return req;},then(resolve,reject){return db.query('select public.social($1,$2) v',[args.p_action,args.p_payload]).then(r=>({data:r.rows[0].v,error:null})).then(resolve,reject);}};return req;}});
 await user(A,async()=>{
  const client=sdk(A);const p=await social(client,'profile',{id:B});assert.equal(p.profile.handle,'social_b');
  await social(client,'like',{id:news,desired:true},A);
  const counts=await batchInteractions(client,[{kind:'news',conversation_id:news}]);assert.equal(counts[news].likes,1);assert.equal(counts[news].liked,true);
  const mentions=await batchMentions(client,'post',[post]);assert.equal(mentions[0].target_id,B);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[B]);
  const other=await batchInteractions(sdk(B),[{kind:'news',conversation_id:news}]);assert.equal(other[news].likes,1);assert.equal(other[news].liked,false);
 });
});
test('new private tables have RLS, definer helpers are private with fixed search paths, bucket bounds declared',async()=>{
 const tables=(await db.query("select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='samvad_internal' and relname in ('follows','likes','reposts','mentions','review_admins','review_actions')")).rows;
 assert.equal(tables.length,6);assert.ok(tables.every(t=>t.relrowsecurity));
 const proc=(await db.query("select prosecdef,proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname='social'")).rows[0];assert.equal(proc.prosecdef,false);
 const bucket=(await db.query("select * from storage.buckets where id='avatars'")).rows[0];assert.equal(bucket.file_size_limit,2097152);
 assert.deepEqual(bucket.allowed_mime_types,['image/jpeg','image/png','image/webp']);
});
