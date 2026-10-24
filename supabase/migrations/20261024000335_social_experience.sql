-- P4.5 additive/non-AI only. Never reset data or alter recorded P4 decisions.
begin;
grant usage on schema samvad_internal to anon,authenticated;
alter table public.profiles add column avatar_path text;
alter table public.profiles add constraint avatar_owner_path check (avatar_path is null or
    avatar_path ~ ('^'||user_id::text||'/[0-9a-f-]{36}\.(jpg|png|webp)$'));
grant select(avatar_path) on public.profiles to anon,authenticated;
-- Profile avatar writes use the RPC, which verifies object existence.
alter table public.posts add column manual_hidden boolean not null default false;
alter table public.replies add column manual_hidden boolean not null default false;
alter table public.news_items add column manual_hidden boolean not null default false;
grant select(manual_hidden) on public.posts to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,2097152,array['image/jpeg','image/png','image/webp']);
create policy avatars_insert on storage.objects for insert to authenticated with check (
    bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text
    and name ~ ('^'||(select auth.uid())::text||'/[0-9a-f-]{36}\.(jpg|png|webp)$'));
create policy avatars_select on storage.objects for select to authenticated using (
    bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy avatars_delete on storage.objects for delete to authenticated using (
    bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text
    and not exists(select 1 from public.profiles p where p.avatar_path=name));

create table samvad_internal.follows(
    actor uuid not null references public.profiles(user_id) on delete cascade,
    target uuid not null references public.profiles(user_id) on delete cascade,
    created_at timestamptz not null default now(), primary key(actor,target),check(actor<>target));
create index follows_target_idx on samvad_internal.follows(target,actor);
create table samvad_internal.likes(
    actor uuid not null references public.profiles(user_id) on delete cascade,
    target uuid not null references public.conversations(id) on delete cascade,
    created_at timestamptz not null default now(),primary key(actor,target));
create index likes_target_idx on samvad_internal.likes(target);
create table samvad_internal.reposts(
    id uuid not null unique default gen_random_uuid(),
    actor uuid not null references public.profiles(user_id) on delete cascade,
    target uuid not null references public.conversations(id) on delete cascade,
    created_at timestamptz not null default now(),primary key(actor,target));
create index reposts_target_idx on samvad_internal.reposts(target);
create index reposts_actor_order_idx on samvad_internal.reposts(actor,created_at desc,id desc);
create table samvad_internal.mentions(
    entity_type text not null check(entity_type in ('post','reply')),entity_id uuid not null,
    handle text not null,target_id uuid not null references public.profiles(user_id) on delete cascade,
    primary key(entity_type,entity_id,handle));
create index mentions_target_idx on samvad_internal.mentions(target_id);
create table samvad_internal.review_admins(
    user_id uuid primary key references public.profiles(user_id) on delete cascade);
create table samvad_internal.review_actions(
    id uuid primary key default gen_random_uuid(),reviewer uuid not null references public.profiles(user_id),
    request_id uuid not null,report_id uuid not null references public.reports(id),
    action text not null check(action in ('reviewed','dismissed','hide','restore')),
    reason text not null check(char_length(btrim(reason)) between 1 and 500),
    previous_hidden boolean,created_at timestamptz not null default now(),unique(reviewer,request_id));
create index review_actions_report_idx on samvad_internal.review_actions(report_id);
create index reports_queue_idx on public.reports(status,created_at,id);

alter table samvad_internal.follows enable row level security;
alter table samvad_internal.likes enable row level security;
alter table samvad_internal.reposts enable row level security;
alter table samvad_internal.mentions enable row level security;
alter table samvad_internal.review_admins enable row level security;
alter table samvad_internal.review_actions enable row level security;
revoke all on samvad_internal.follows,samvad_internal.likes,samvad_internal.reposts,
    samvad_internal.mentions,samvad_internal.review_admins,samvad_internal.review_actions from public,anon,authenticated;

create function samvad_internal.public_root(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.conversations c
 left join public.posts p on p.id=c.root_post_id left join public.news_items n on n.id=c.news_item_id
 where c.id=p_id and ((p.id is not null and p.deleted_at is null and p.moderation_state='allowed' and not p.manual_hidden)
 or (n.id is not null and not n.manual_hidden)));
$$;
revoke all on function samvad_internal.public_root(uuid) from public,anon,authenticated;
create or replace function samvad_internal.root_visible(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.conversations c
 left join public.posts p on p.id=c.root_post_id left join public.news_items n on n.id=c.news_item_id
 where c.id=p_id and ((n.id is not null and not n.manual_hidden) or (p.deleted_at is null
 and (p.author_id=auth.uid() or (p.moderation_state='allowed' and not p.manual_hidden)))));
$$;
-- Restrictive policies combine with existing publication/ownership policies.
create policy posts_manual_visibility on public.posts as restrictive for select to anon,authenticated
 using(not manual_hidden or author_id=(select auth.uid()));
create policy news_manual_visibility on public.news_items as restrictive for select to anon,authenticated using(not manual_hidden);
create policy conversations_manual_visibility on public.conversations as restrictive for select to anon,authenticated using(
 exists(select 1 from public.news_items n where n.id=news_item_id) or
 exists(select 1 from public.posts p where p.id=root_post_id));
create policy replies_manual_visibility on public.replies as restrictive for select to anon,authenticated
 using(not manual_hidden or author_id=(select auth.uid()));

create function samvad_internal.public_profile(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('user_id',user_id,'handle',handle,'display_name',display_name,
 'bio',bio,'preferred_language',preferred_language,'avatar_path',avatar_path) from public.profiles where user_id=p_id;
$$;
revoke all on function samvad_internal.public_profile(uuid) from public,anon,authenticated;
create function samvad_internal.profile_state(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('profile',samvad_internal.public_profile(p_id),
 'followers',(select count(*) from samvad_internal.follows where target=p_id),
 'following',(select count(*) from samvad_internal.follows where actor=p_id),
 'is_following',exists(select 1 from samvad_internal.follows where actor=auth.uid() and target=p_id));
$$;
revoke all on function samvad_internal.profile_state(uuid) from public,anon,authenticated;
create function samvad_internal.interaction_state(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p_id,'likes',(select count(*) from samvad_internal.likes where target=p_id),
 'reposts',(select count(*) from samvad_internal.reposts where target=p_id),
 'liked',exists(select 1 from samvad_internal.likes where target=p_id and actor=auth.uid()),
 'reposted',exists(select 1 from samvad_internal.reposts where target=p_id and actor=auth.uid()));
$$;
revoke all on function samvad_internal.interaction_state(uuid) from public,anon,authenticated;

create function samvad_internal.capture_mentions()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into samvad_internal.mentions(entity_type,entity_id,handle,target_id)
 select case when tg_table_name='posts' then 'post' else 'reply' end,new.id,lower(m[2]),p.user_id
 from regexp_matches(new.body,'(^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{3,30})(?![A-Za-z0-9_])','g') m
 join public.profiles p on p.handle::text=lower(m[2]) on conflict do nothing;
 return new;
end;
$$;
revoke all on function samvad_internal.capture_mentions() from public,anon,authenticated;
create trigger posts_capture_mentions after insert on public.posts for each row execute function samvad_internal.capture_mentions();
create trigger replies_capture_mentions after insert on public.replies for each row execute function samvad_internal.capture_mentions();
-- Existing bodies remain unchanged; existing mentions are intentionally not reassigned.

create function samvad_internal.social(p_action text,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare actor uuid:=auth.uid(); target uuid; lim integer; result jsonb; keys text[];
 wanted boolean; ids uuid[]; saved samvad_internal.review_actions; rep public.reports;
 old_hidden boolean; req uuid; reason_text text; act text;
begin
 if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception using errcode='22023',message='Invalid payload'; end if;
 keys:=case p_action
 when 'profile' then array['id'] when 'save_profile' then array['handle','display_name','bio','language','interests','avatar_path']
 when 'people' then array['query','after','limit'] when 'connections' then array['id','direction','after','limit']
 when 'follow' then array['id','desired'] when 'like' then array['id','desired'] when 'repost' then array['id','desired']
 when 'interactions' then array['ids'] when 'feed' then array['mode','id','after','limit']
 when 'mentions' then array['type','ids'] when 'admin_status' then array[]::text[]
 when 'review_queue' then array['after','limit','status'] when 'review' then array['id','request_id','action','reason'] else null end;
 if keys is null or exists(select 1 from jsonb_object_keys(p_payload) k where not k=any(keys)) then
 raise exception using errcode='22023',message='Unknown action or field'; end if;
 if p_action in ('save_profile','follow','like','repost','review','review_queue','admin_status') or
 (p_action='feed' and p_payload->>'mode'='following') then
 if actor is null then raise exception using errcode='42501',message='Sign in required'; end if;
 end if;
 if p_action in ('save_profile','follow','like','repost','review') then
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0)); end if;
 target:=(p_payload->>'id')::uuid;
 lim:=coalesce((p_payload->>'limit')::integer,20);
 if lim not between 1 and 50 then raise exception using errcode='22023',message='Invalid page size'; end if;
 if p_action='save_profile' then
   if p_payload->>'handle' is null or p_payload->>'display_name' is null or p_payload->>'bio' is null or p_payload->>'language' is null
      or jsonb_typeof(p_payload->'interests') is distinct from 'array' then
     raise exception using errcode='22023',message='Incomplete profile'; end if;
   select array_agg(distinct x::uuid) into ids from jsonb_array_elements_text(p_payload->'interests') x;
   ids:=coalesce(ids,'{}');
   if cardinality(ids)>50 or exists(select 1 from unnest(ids) i where not exists(select 1 from public.interests where id=i)) then
     raise exception using errcode='22023',message='Invalid interests'; end if;
   if p_payload->>'avatar_path' is not null and not exists(select 1 from storage.objects o
      where o.bucket_id='avatars' and o.name=p_payload->>'avatar_path' and split_part(o.name,'/',1)=actor::text) then
     raise exception using errcode='22023',message='Upload your avatar before saving'; end if;
   insert into public.profiles(user_id,handle,display_name,bio,preferred_language,avatar_path)
    values(actor,p_payload->>'handle',p_payload->>'display_name',p_payload->>'bio',p_payload->>'language',p_payload->>'avatar_path')
    on conflict(user_id) do update set handle=excluded.handle,display_name=excluded.display_name,bio=excluded.bio,
      preferred_language=excluded.preferred_language,avatar_path=excluded.avatar_path;
   delete from public.user_interests where user_id=actor and not interest_id=any(ids);
   insert into public.user_interests(user_id,interest_id) select actor,unnest(ids) on conflict do nothing;
   return samvad_internal.public_profile(actor);
 elsif p_action in ('profile','follow') then
   if not exists(select 1 from public.profiles where user_id=target) then raise exception using errcode='PT404',message='Profile unavailable'; end if;
   if p_action='follow' then
     if jsonb_typeof(p_payload->'desired') is distinct from 'boolean' or actor=target then
       raise exception using errcode='22023',message='Invalid follow'; end if;
     if (p_payload->>'desired')::boolean then insert into samvad_internal.follows(actor,target) values(actor,target) on conflict do nothing;
     else delete from samvad_internal.follows f where f.actor=actor and f.target=target; end if;
   end if;
   return samvad_internal.profile_state(target);
 elsif p_action in ('people','connections') then
   if p_action='connections' and (target is null or coalesce(p_payload->>'direction','') not in ('followers','following')) then
      raise exception using errcode='22023',message='Invalid connections'; end if;
   if char_length(coalesce(p_payload->>'query',''))>80 then raise exception using errcode='22023',message='Search too long'; end if;
   select coalesce(jsonb_agg(samvad_internal.public_profile(x.user_id) order by x.user_id),'[]') into result
   from (select p.user_id from public.profiles p where
    (p_payload->>'after' is null or p.user_id>(p_payload->>'after')::uuid) and
    (p_action='people' and (strpos(lower(p.handle::text),lower(coalesce(p_payload->>'query','')))>0 or
     strpos(lower(p.display_name),lower(coalesce(p_payload->>'query','')))>0)
    or p_action='connections' and exists(select 1 from samvad_internal.follows f where
     (p_payload->>'direction'='followers' and f.target=target and f.actor=p.user_id) or
     (p_payload->>'direction'='following' and f.actor=target and f.target=p.user_id)))
    order by p.user_id limit lim) x;
   return result;
 elsif p_action in ('like','repost') then
   if jsonb_typeof(p_payload->'desired') is distinct from 'boolean' or target is null then
    raise exception using errcode='22023',message='Invalid desired state'; end if;
   wanted:=(p_payload->>'desired')::boolean;
   if wanted and not samvad_internal.public_root(target) then raise exception using errcode='PT404',message='Public source unavailable'; end if;
   if p_action='like' then
    if wanted then insert into samvad_internal.likes(actor,target) values(actor,target) on conflict do nothing;
    else delete from samvad_internal.likes f where f.actor=actor and f.target=target; end if;
   else
    if wanted then insert into samvad_internal.reposts(actor,target) values(actor,target) on conflict do nothing;
    else delete from samvad_internal.reposts f where f.actor=actor and f.target=target; end if;
   end if;
   if not samvad_internal.public_root(target) then return jsonb_build_object('id',target,'likes',0,'reposts',0,'liked',false,'reposted',false); end if;
   return samvad_internal.interaction_state(target);
 elsif p_action in ('interactions','mentions') then
   if jsonb_typeof(p_payload->'ids') is distinct from 'array' or jsonb_array_length(p_payload->'ids')>50 then
     raise exception using errcode='22023',message='Invalid batch'; end if;
   select array_agg(distinct x::uuid) into ids from jsonb_array_elements_text(p_payload->'ids') x;
   if p_action='interactions' then
    select coalesce(jsonb_agg(samvad_internal.interaction_state(i)),'[]') into result from unnest(ids) i where samvad_internal.public_root(i);
   else
    if coalesce(p_payload->>'type','') not in ('post','reply') then raise exception using errcode='22023',message='Invalid mention type'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('entity_id',m.entity_id,'handle',m.handle,'target_id',m.target_id)),'[]') into result
    from samvad_internal.mentions m where m.entity_type=p_payload->>'type' and m.entity_id=any(ids) and
    ((m.entity_type='post' and exists(select 1 from public.posts p join public.conversations c on c.root_post_id=p.id
       where p.id=m.entity_id and p.deleted_at is null and samvad_internal.root_visible(c.id)
       and (p.author_id=actor or p.moderation_state='allowed' and not p.manual_hidden))) or
     (m.entity_type='reply' and exists(select 1 from public.replies r where r.id=m.entity_id and r.deleted_at is null
       and samvad_internal.root_visible(r.conversation_id) and (r.author_id=actor or r.moderation_state='allowed' and not r.manual_hidden))));
   end if;
   return result;
 elsif p_action='feed' then
   if coalesce(p_payload->>'mode','') not in ('following','posts','reposts') or
      (p_payload->>'mode'<>'following' and target is null) then raise exception using errcode='22023',message='Invalid feed'; end if;
   if p_payload->'after' is not null and p_payload->'after'<>'null'::jsonb and
     ((p_payload->'after'->>'at') is null or (p_payload->'after'->>'id') is null) then
       raise exception using errcode='22023',message='Invalid cursor'; end if;
   with events as (
     select c.id cid,p.created_at at,p.id eid,null::uuid reposter from public.posts p
     join public.conversations c on c.root_post_id=p.id where
       (p_payload->>'mode'='posts' and p.author_id=target) or
       (p_payload->>'mode'='following' and exists(select 1 from samvad_internal.follows f where f.actor=actor and f.target=p.author_id))
     union all
     select r.target,r.created_at,r.id,r.actor from samvad_internal.reposts r where
       (p_payload->>'mode'='reposts' and r.actor=target) or
       (p_payload->>'mode'='following' and exists(select 1 from samvad_internal.follows f where f.actor=actor and f.target=r.actor))
   ), page as (
     select e.* from events e where samvad_internal.public_root(e.cid) and
      (p_payload->'after' is null or p_payload->'after'='null'::jsonb or
       (e.at,e.eid)<((p_payload->'after'->>'at')::timestamptz,(p_payload->'after'->>'id')::uuid))
      order by e.at desc,e.eid desc limit lim
   ) select coalesce(jsonb_agg(jsonb_build_object('at',e.at,'id',e.eid,'reposter',samvad_internal.public_profile(e.reposter),
      'item',case when c.root_post_id is not null then jsonb_build_object('kind','post','id',p.id,
       'post',jsonb_build_object('id',p.id,'body',p.body,'language',p.language,'created_at',p.created_at,
       'moderation_state',p.moderation_state,'is_fixture',p.is_fixture,'conversation_id',c.id,'author',samvad_internal.public_profile(p.author_id)))
       else jsonb_build_object('kind','news','id',n.id,'conversation_id',c.id,'news',jsonb_build_object('id',n.id,'title',n.title,
       'source_name',n.source_name,'source_url',n.source_url,'excerpt',n.excerpt,'language',n.language,'published_at',n.published_at,'topic',n.topic)) end)
      order by e.at desc,e.eid desc),'[]') into result from page e join public.conversations c on c.id=e.cid
      left join public.posts p on p.id=c.root_post_id left join public.news_items n on n.id=c.news_item_id;
   return result;
 elsif p_action='admin_status' then
   return to_jsonb(exists(select 1 from samvad_internal.review_admins where user_id=actor));
 elsif p_action in ('review_queue','review') then
   if not exists(select 1 from samvad_internal.review_admins where user_id=actor) then
     raise exception using errcode='42501',message='Trusted reviewer required'; end if;
   if p_action='review_queue' then
     if coalesce(p_payload->>'status','submitted') not in ('submitted','resolved','dismissed','reviewing') then
       raise exception using errcode='22023',message='Invalid report status'; end if;
     select coalesce(jsonb_agg(x.value order by x.id),'[]') into result from (
       select r.id,jsonb_build_object('id',r.id,'entity_type',r.entity_type,'entity_id',r.entity_id,'reason',r.reason,
        'details',r.details,'status',r.status,'created_at',r.created_at,'content',case r.entity_type
        when 'post' then (select body from public.posts where id=r.entity_id and deleted_at is null)
        when 'reply' then (select body from public.replies where id=r.entity_id and deleted_at is null)
        when 'news' then (select title from public.news_items where id=r.entity_id)
        when 'profile' then (select '@'||handle::text from public.profiles where user_id=r.entity_id) end) value
       from public.reports r where r.status=coalesce(p_payload->>'status','submitted') and
         (p_payload->>'after' is null or r.id>(p_payload->>'after')::uuid) order by r.id limit lim) x;
     return result;
   end if;
   req:=(p_payload->>'request_id')::uuid; act:=p_payload->>'action';reason_text:=p_payload->>'reason';
   if req is null or act is null or act not in ('reviewed','dismissed','hide','restore') or reason_text is null or
      char_length(btrim(reason_text)) not between 1 and 500 then raise exception using errcode='22023',message='Action and reason required'; end if;
   select * into saved from samvad_internal.review_actions a where a.reviewer=actor and a.request_id=req;
   if found then
     if saved.report_id is distinct from target or saved.action<>act or saved.reason<>reason_text then
       raise exception using errcode='PT409',message='Review request already used'; end if;
     return jsonb_build_object('id',saved.id,'action',saved.action);
   end if;
   select * into rep from public.reports where id=target for update;
   if not found then raise exception using errcode='PT404',message='Report unavailable'; end if;
   if act in ('hide','restore') then
     if rep.entity_type='post' then
       select manual_hidden into old_hidden from public.posts where id=rep.entity_id for update;
       update public.posts set manual_hidden=(act='hide') where id=rep.entity_id;
     elsif rep.entity_type='reply' then
       select manual_hidden into old_hidden from public.replies where id=rep.entity_id for update;
       update public.replies set manual_hidden=(act='hide') where id=rep.entity_id;
     elsif rep.entity_type='news' then
       select manual_hidden into old_hidden from public.news_items where id=rep.entity_id for update;
       update public.news_items set manual_hidden=(act='hide') where id=rep.entity_id;
     else raise exception using errcode='22023',message='Profile reports support review or dismiss only'; end if;
     if old_hidden is null then raise exception using errcode='PT404',message='Source unavailable'; end if;
   end if;
   insert into samvad_internal.review_actions(reviewer,request_id,report_id,action,reason,previous_hidden)
    values(actor,req,target,act,reason_text,old_hidden) returning * into saved;
   update public.reports set status=case when act='dismissed' then 'dismissed' else 'resolved' end where id=target;
   return jsonb_build_object('id',saved.id,'action',saved.action);
 end if;
 raise exception using errcode='22023',message='Invalid action';
end;
$$;
revoke all on function samvad_internal.social(text,jsonb) from public,anon,authenticated;
grant execute on function samvad_internal.social(text,jsonb) to anon,authenticated;
create function public.social(p_action text,p_payload jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$select samvad_internal.social(p_action,p_payload);$$;
revoke all on function public.social(text,jsonb) from public,anon,authenticated;
grant execute on function public.social(text,jsonb) to anon,authenticated;

create or replace function public.get_discovery_feed(
    p_topic text default null, p_limit integer default 20, p_after jsonb default null
)
returns table (kind text,id uuid,sort_at timestamptz,interest_match boolean,
    conversation_id uuid,news jsonb,post jsonb)
language plpgsql stable security invoker set search_path = '' as $$
declare
    after_match boolean; after_at timestamptz; after_id uuid; after_kind text;
    preferred_topics text[] := '{}';
begin
    if p_limit is null or p_limit not between 1 and 50 or
        (p_topic is not null and not exists (select 1 from public.interests i where i.slug=p_topic)) then
        raise exception using errcode='22023', message='Invalid feed parameters';
    end if;
    if p_after is not null then
        if jsonb_typeof(p_after) <> 'object' or
           jsonb_typeof(p_after->'matched') is distinct from 'boolean' or
           jsonb_typeof(p_after->'at') is distinct from 'string' or
           jsonb_typeof(p_after->'id') is distinct from 'string' or
           p_after->>'kind' not in ('news','post') or p_after->>'kind' is null then
            raise exception using errcode='22023', message='Invalid feed cursor';
        end if;
        begin
            after_match := (p_after->>'matched')::boolean;
            after_at := (p_after->>'at')::timestamptz;
            after_id := (p_after->>'id')::uuid;
            after_kind := p_after->>'kind';
        exception when others then
            raise exception using errcode='22023', message='Invalid feed cursor';
        end;
    end if;
    if auth.uid() is not null then
        select coalesce(array_agg(i.slug),'{}'::text[]) into preferred_topics
        from public.user_interests ui join public.interests i on i.id=ui.interest_id
        where ui.user_id=(select auth.uid());
    end if;
    return query
    with items as (
        select 'news'::text k,n.id entity_id,n.published_at at_time,
            n.topic = any(preferred_topics) matched,
            c.id cid,jsonb_build_object('id',n.id,'title',n.title,'source_name',n.source_name,
                'source_url',n.source_url,'excerpt',n.excerpt,'language',n.language,
                'published_at',n.published_at,'topic',n.topic) ndata,null::jsonb pdata
        from public.news_items n join public.conversations c on c.news_item_id=n.id
        where p_topic is null or n.topic=p_topic
        union all
        select 'post',p.id,p.created_at,false,c.id,null::jsonb,
            jsonb_build_object('id',p.id,'body',p.body,'language',p.language,
                'created_at',p.created_at,'moderation_state',p.moderation_state,
                'is_fixture',p.is_fixture,'conversation_id',c.id,
                'author',jsonb_build_object('user_id',pr.user_id,'handle',pr.handle,
                    'display_name',pr.display_name,'bio',pr.bio,'avatar_path',pr.avatar_path,'preferred_language',pr.preferred_language))
        from public.posts p join public.profiles pr on pr.user_id=p.author_id
        join public.conversations c on c.root_post_id=p.id
        where p.deleted_at is null and p.moderation_state='allowed' and not p.manual_hidden
    )
    select x.k,x.entity_id,x.at_time,x.matched,x.cid,x.ndata,x.pdata from items x
    where p_after is null or (x.matched,x.at_time,x.entity_id,x.k)
        < (after_match,after_at,after_id,after_kind)
    order by x.matched desc,x.at_time desc,x.entity_id desc,x.k desc limit p_limit;
end;
$$;


create or replace function public.get_replies(p_conversation_id uuid,p_limit integer default 30,p_after jsonb default null)
returns table(id uuid,conversation_id uuid,parent_reply_id uuid,body text,language text,created_at timestamptz,
    deleted_at timestamptz,moderation_state text,is_fixture boolean,author jsonb)
language plpgsql stable security invoker set search_path='' as $$
declare after_at timestamptz; after_id uuid;
begin
    if p_conversation_id is null or p_limit is null or p_limit not between 1 and 50 then
        raise exception using errcode='22023',message='Invalid reply parameters'; end if;
    if p_after is not null then
        begin
            if jsonb_typeof(p_after->'at') is distinct from 'string' or jsonb_typeof(p_after->'id') is distinct from 'string' then
                raise exception 'Invalid cursor'; end if;
            after_at:=(p_after->>'at')::timestamptz; after_id:=(p_after->>'id')::uuid;
        exception when others then raise exception using errcode='22023',message='Invalid reply cursor'; end;
    end if;
    return query select r.id,r.conversation_id,r.parent_reply_id,r.body,r.language,r.created_at,r.deleted_at,
        r.moderation_state,r.is_fixture,jsonb_build_object('user_id',pr.user_id,'handle',pr.handle,
        'display_name',pr.display_name,'bio',pr.bio,'avatar_path',pr.avatar_path,'preferred_language',pr.preferred_language)
        from public.replies r join public.profiles pr on pr.user_id=r.author_id
        where r.conversation_id=p_conversation_id and (p_after is null or (r.created_at,r.id)>(after_at,after_id))
        order by r.created_at,r.id limit p_limit;
end;
$$;

create or replace function samvad_internal.submit_reply(p_request_id uuid,p_conversation_id uuid,
    p_parent_reply_id uuid,p_body text,p_language text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); fingerprint text; saved public.replies;
begin
    if actor is null then raise exception using errcode='42501',message='Sign in required'; end if;
    if p_request_id is null or p_conversation_id is null or p_body is null or
        char_length(p_body) not between 1 and 2000 or p_body !~ '[^[:space:]]' or
        p_language is null or p_language not in ('en','hi','ml') then
        raise exception using errcode='22023',message='Invalid reply'; end if;
    perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
    fingerprint:=encode(sha256(convert_to(jsonb_build_array(p_conversation_id,p_parent_reply_id,p_body,p_language)::text,'UTF8')),'hex');
    select * into saved from public.replies where author_id=actor and request_id=p_request_id;
    if found then
        if saved.request_fingerprint<>fingerprint then raise exception using errcode='PT409',message='Request ID already used for different content'; end if;
    else
        if not samvad_internal.root_visible(p_conversation_id) then
            raise exception using errcode='PT404',message='Conversation unavailable'; end if;
        if p_parent_reply_id is not null and not exists(select 1 from public.replies r
            where r.id=p_parent_reply_id and r.conversation_id=p_conversation_id and r.deleted_at is null
            and ((r.moderation_state='allowed' and not r.manual_hidden) or r.author_id=actor)) then
            raise exception using errcode='PT404',message='Parent reply unavailable'; end if;
        perform samvad_internal.consume_budget('reply_minute',10,60);
        insert into public.replies(author_id,request_id,request_fingerprint,conversation_id,parent_reply_id,body,language)
            values(actor,p_request_id,fingerprint,p_conversation_id,p_parent_reply_id,p_body,p_language) returning * into saved;
    end if;
    return jsonb_build_object('id',saved.id,'conversation_id',saved.conversation_id,
        'moderation_state',saved.moderation_state,'deleted',saved.deleted_at is not null);
end;
$$;

create or replace function samvad_internal.submit_report(p_request_id uuid,p_entity_type text,p_entity_id uuid,p_reason text,p_details text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); fingerprint text; saved public.reports; visible boolean:=false;
begin
    if actor is null then raise exception using errcode='42501',message='Sign in required'; end if;
    if p_request_id is null or p_entity_id is null or p_entity_type is null or p_entity_type not in ('post','reply','profile','news')
        or p_reason is null or p_reason not in ('threat','harassment','hate','doxxing','impersonation','scam','spam','other')
        or p_details is null or char_length(p_details)>1000 then
        raise exception using errcode='22023',message='Invalid report'; end if;
    perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
    fingerprint:=encode(sha256(convert_to(jsonb_build_array(p_entity_type,p_entity_id,p_reason,p_details)::text,'UTF8')),'hex');
    select * into saved from public.reports where reporter_id=actor and request_id=p_request_id;
    if found then
        if saved.request_fingerprint<>fingerprint then raise exception using errcode='PT409',message='Request ID already used for different content'; end if;
        return jsonb_build_object('id',saved.id,'status',saved.status,'already_reported',false);
    end if;
    if p_entity_type='post' then
        select exists(select 1 from public.posts p where p.id=p_entity_id and p.deleted_at is null
            and ((p.moderation_state='allowed' and not p.manual_hidden) or p.author_id=actor)) into visible;
    elsif p_entity_type='reply' then
        select exists(select 1 from public.replies r where r.id=p_entity_id and r.deleted_at is null
            and ((r.moderation_state='allowed' and not r.manual_hidden) or r.author_id=actor)
            and samvad_internal.root_visible(r.conversation_id)) into visible;
    elsif p_entity_type='profile' then
        select exists(select 1 from public.profiles p where p.user_id=p_entity_id) into visible;
    else
        select exists(select 1 from public.news_items n where n.id=p_entity_id and not n.manual_hidden) into visible;
    end if;
    if not visible then raise exception using errcode='PT404',message='Content unavailable'; end if;
    select * into saved from public.reports where reporter_id=actor and entity_type=p_entity_type and entity_id=p_entity_id;
    if found then return jsonb_build_object('id',saved.id,'status',saved.status,'already_reported',true); end if;
    perform samvad_internal.consume_budget('report_minute',5,60);
    perform samvad_internal.consume_budget('report_hour',30,3600);
    insert into public.reports(reporter_id,request_id,request_fingerprint,entity_type,entity_id,reason,details)
        values(actor,p_request_id,fingerprint,p_entity_type,p_entity_id,p_reason,p_details) returning * into saved;
    return jsonb_build_object('id',saved.id,'status',saved.status,'already_reported',false);
end;
$$;

commit;
