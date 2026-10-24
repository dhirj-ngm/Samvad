// Opt-in LOCAL HTTP integration for the exact SDK adapter used on both phones.
import { createClient } from '@supabase/supabase-js';
import { batchInteractions,conversationId,social } from '../lib/social.ts';
const env=process.env;
const origin=new URL(env.SAMVAD_P1_TEST_URL??'http://invalid.local');
if(origin.protocol!=='http:'||!['127.0.0.1','localhost'].includes(origin.hostname)||env.SAMVAD_P1_ALLOW_WRITES!=='true'){
 console.log('BLOCKED: local-only dedicated account configuration required');process.exit(2);
}
const make=()=>createClient(origin.origin,env.SAMVAD_P1_PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const a=make(),b=make();const restore=[];let failed=false;
const require=(value,message)=>{if(!value)throw new Error(message);};
try{
 const users=[];
 for(const [client,label] of [[a,'A'],[b,'B']]){
  const {data,error}=await client.auth.signInWithPassword({email:env[`SAMVAD_P1_EMAIL_${label}`],password:env[`SAMVAD_P1_PASSWORD_${label}`]});
  require(!error&&data.user,'SDK local login failed');users.push(data.user.id);
 }
 const [actorA,actorB]=users;
 const {data:feed,error}=await a.rpc('get_discovery_feed',{});require(!error&&feed.length,'SDK feed failed');
 const root=feed.find(r=>r.kind==='post'&&r.post.author.user_id===actorA&&r.post.is_fixture);
 require(root,'Reviewed local fixture unavailable');
 const item={kind:'post',id:root.id,post:root.post};const id=conversationId(item);
 const before=(await batchInteractions(b,[item]))[id];
 for(const [action,field] of [['like','liked'],['repost','reposted']]){
  restore.push([b,actorB,action,{id,desired:before[field]}]);
  const result=await social(b,action,{id,desired:true},actorB);
  for(let i=0;i<3;i++)require(JSON.stringify(await social(b,action,{id,desired:true},actorB))===JSON.stringify(result),'SDK desired-state retry mismatch');
 }
 const beforeFollow=(await social(a,'profile',{id:actorB})).is_following;
 restore.push([a,actorA,'follow',{id:actorB,desired:beforeFollow}]);
 await social(a,'follow',{id:actorB,desired:true},actorA);
 const following=await social(a,'feed',{mode:'following'},actorA);
 require(following.some(r=>r.reposter?.user_id===actorB&&r.item.id===root.id),'SDK Following attribution failed');
 const counts=await batchInteractions(b,[item,item]);require(counts[id].liked&&counts[id].reposted,'SDK batched state failed');
 let denied=false;try{await social(b,'like',{id,desired:true},actorA);}catch{denied=true;}require(denied,'SDK account mismatch not rejected');
 console.log('PASS: shared native SDK uses real local Auth/RPC for desired states, batch counts, Following attribution and account pinning');
}catch{
 failed=true;console.log('FAIL: local SDK integration incomplete; no credentials or response bodies logged');
}finally{
 for(const [client,actor,action,payload] of restore.reverse()){
  try{await social(client,action,payload,actor);}catch{failed=true;console.log('FAIL: local SDK state restoration incomplete');}
 }
 for(const client of [a,b])await client.auth.signOut({scope:'local'});
}
if(failed)process.exitCode=1;
