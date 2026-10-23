-- P3: replies, private reporting and transactional per-account abuse budgets.
begin;
create table public.replies (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id),
    parent_reply_id uuid,
    author_id uuid not null references public.profiles(user_id),
    request_id uuid not null,
    request_fingerprint text not null,
    body text not null,
    language text not null check (language in ('en','hi','ml')),
    created_at timestamptz not null default now(),
    deleted_at timestamptz,
    moderation_state text not null default 'pending'
        check (moderation_state in ('pending','allowed','flagged','blocked')),
    is_fixture boolean not null default false,
    unique(author_id,request_id),
    unique(id,conversation_id),
    foreign key(parent_reply_id,conversation_id) references public.replies(id,conversation_id),
    check (parent_reply_id is distinct from id),
    check ((deleted_at is null and char_length(body) between 1 and 2000 and body ~ '[^[:space:]]')
        or (deleted_at is not null and body=''))
);
create index replies_thread_order_idx on public.replies(conversation_id,created_at,id);
create index replies_parent_idx on public.replies(parent_reply_id,conversation_id);
create index replies_author_idx on public.replies(author_id,created_at,id);
create table public.reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references public.profiles(user_id),
    entity_type text not null check (entity_type in ('post','reply','profile','news')),
    entity_id uuid not null,
    reason text not null check (reason in ('threat','harassment','hate','doxxing','impersonation','scam','spam','other')),
    details text not null default '' check (char_length(details)<=1000),
    status text not null default 'submitted' check (status in ('submitted','reviewing','resolved','dismissed')),
    request_id uuid not null,
    request_fingerprint text not null,
    created_at timestamptz not null default now(),
    unique(reporter_id,request_id),
    unique(reporter_id,entity_type,entity_id)
);
create index reports_target_idx on public.reports(entity_type,entity_id);
create table samvad_internal.write_budgets (
    actor_id uuid not null references public.profiles(user_id),
    action text not null,
    window_start timestamptz not null,
    used integer not null check (used>0),
    primary key(actor_id,action,window_start)
);
alter table samvad_internal.write_budgets enable row level security;
revoke all on samvad_internal.write_budgets from public,anon,authenticated;
alter table public.replies enable row level security;
alter table public.reports enable row level security;
revoke all on public.replies,public.reports from public,anon,authenticated;
grant select (id,conversation_id,parent_reply_id,author_id,body,language,created_at,
    deleted_at,moderation_state,is_fixture) on public.replies to anon,authenticated;
grant select (id,entity_type,entity_id,reason,details,status,created_at) on public.reports to authenticated;
create policy replies_anon_read on public.replies for select to anon using (
    moderation_state='allowed' and exists(select 1 from public.conversations c where c.id=conversation_id));
create policy replies_user_read on public.replies for select to authenticated using (
    (moderation_state='allowed' or author_id=(select auth.uid()))
    and exists(select 1 from public.conversations c where c.id=conversation_id));
create policy reports_owner_read on public.reports for select to authenticated
    using (reporter_id=(select auth.uid()));

-- Callers lock their own account before checking retries and consuming budgets.
-- Windows are server-clock fixed buckets; there is no client-writeable counter.
create function samvad_internal.consume_budget(p_action text,p_limit integer,p_seconds integer)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); bucket timestamptz; total integer;
begin
    if actor is null then raise exception using errcode='42501',message='Sign in required'; end if;
    bucket:=to_timestamp(floor(extract(epoch from statement_timestamp())/p_seconds)*p_seconds);
    insert into samvad_internal.write_budgets(actor_id,action,window_start,used)
        values(actor,p_action,bucket,1)
        on conflict(actor_id,action,window_start) do update
        set used=samvad_internal.write_budgets.used+1 returning used into total;
    if total>p_limit then raise exception using errcode='PT429',message='Too many submissions. Wait and retry the same draft.'; end if;
    delete from samvad_internal.write_budgets where actor_id=actor and window_start<statement_timestamp()-interval '1 day';
end;
$$;
revoke all on function samvad_internal.consume_budget(text,integer,integer) from public,anon,authenticated;

create function samvad_internal.root_visible(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
    select exists(select 1 from public.conversations c left join public.posts p on p.id=c.root_post_id
        where c.id=p_id and (c.news_item_id is not null or
            (p.deleted_at is null and (p.moderation_state='allowed' or p.author_id=auth.uid()))));
$$;
revoke all on function samvad_internal.root_visible(uuid) from public,anon,authenticated;

create function samvad_internal.submit_reply(p_request_id uuid,p_conversation_id uuid,
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
            and (r.moderation_state='allowed' or r.author_id=actor)) then
            raise exception using errcode='PT404',message='Parent reply unavailable'; end if;
        perform samvad_internal.consume_budget('reply_minute',10,60);
        insert into public.replies(author_id,request_id,request_fingerprint,conversation_id,parent_reply_id,body,language)
            values(actor,p_request_id,fingerprint,p_conversation_id,p_parent_reply_id,p_body,p_language) returning * into saved;
    end if;
    return jsonb_build_object('id',saved.id,'conversation_id',saved.conversation_id,
        'moderation_state',saved.moderation_state,'deleted',saved.deleted_at is not null);
end;
$$;
revoke all on function samvad_internal.submit_reply(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function samvad_internal.submit_reply(uuid,uuid,uuid,text,text) to authenticated;
create function public.submit_reply(p_request_id uuid,p_conversation_id uuid,p_parent_reply_id uuid,p_body text,p_language text)
returns jsonb language sql security invoker set search_path='' as $$
    select samvad_internal.submit_reply(p_request_id,p_conversation_id,p_parent_reply_id,p_body,p_language);
$$;
revoke all on function public.submit_reply(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.submit_reply(uuid,uuid,uuid,text,text) to authenticated;

create function samvad_internal.delete_own_reply(p_reply_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
    if auth.uid() is null then raise exception using errcode='42501',message='Sign in required'; end if;
    update public.replies set deleted_at=coalesce(deleted_at,now()),body='' where id=p_reply_id and author_id=auth.uid();
    return found;
end;
$$;
revoke all on function samvad_internal.delete_own_reply(uuid) from public,anon,authenticated;
grant execute on function samvad_internal.delete_own_reply(uuid) to authenticated;
create function public.delete_own_reply(p_reply_id uuid)
returns boolean language sql security invoker set search_path='' as $$ select samvad_internal.delete_own_reply(p_reply_id); $$;
revoke all on function public.delete_own_reply(uuid) from public,anon,authenticated;
grant execute on function public.delete_own_reply(uuid) to authenticated;

create function public.get_replies(p_conversation_id uuid,p_limit integer default 30,p_after jsonb default null)
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
        'display_name',pr.display_name,'bio',pr.bio,'preferred_language',pr.preferred_language)
        from public.replies r join public.profiles pr on pr.user_id=r.author_id
        where r.conversation_id=p_conversation_id and (p_after is null or (r.created_at,r.id)>(after_at,after_id))
        order by r.created_at,r.id limit p_limit;
end;
$$;
revoke all on function public.get_replies(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.get_replies(uuid,integer,jsonb) to anon,authenticated;

create function samvad_internal.submit_report(p_request_id uuid,p_entity_type text,p_entity_id uuid,p_reason text,p_details text default '')
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
            and (p.moderation_state='allowed' or p.author_id=actor)) into visible;
    elsif p_entity_type='reply' then
        select exists(select 1 from public.replies r where r.id=p_entity_id and r.deleted_at is null
            and (r.moderation_state='allowed' or r.author_id=actor)
            and samvad_internal.root_visible(r.conversation_id)) into visible;
    elsif p_entity_type='profile' then
        select exists(select 1 from public.profiles p where p.user_id=p_entity_id) into visible;
    else
        select exists(select 1 from public.news_items n where n.id=p_entity_id) into visible;
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
revoke all on function samvad_internal.submit_report(uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function samvad_internal.submit_report(uuid,text,uuid,text,text) to authenticated;
create function public.submit_report(p_request_id uuid,p_entity_type text,p_entity_id uuid,p_reason text,p_details text default '')
returns jsonb language sql security invoker set search_path='' as $$
    select samvad_internal.submit_report(p_request_id,p_entity_type,p_entity_id,p_reason,p_details);
$$;
revoke all on function public.submit_report(uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.submit_report(uuid,text,uuid,text,text) to authenticated;

-- Retain P2 retry semantics, adding a budget only for genuinely new posts.
alter function samvad_internal.submit_post(uuid,text,text) rename to submit_post_unlimited;
revoke all on function samvad_internal.submit_post_unlimited(uuid,text,text) from public,anon,authenticated;
create function samvad_internal.submit_post(p_request_id uuid,p_body text,p_language text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
    if actor is null then raise exception using errcode='42501',message='Sign in required'; end if;
    perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
    if not exists(select 1 from public.posts where author_id=actor and request_id=p_request_id) then
        perform samvad_internal.consume_budget('post_minute',5,60);
    end if;
    result:=samvad_internal.submit_post_unlimited(p_request_id,p_body,p_language);
    return result;
end;
$$;
revoke all on function samvad_internal.submit_post(uuid,text,text) from public,anon,authenticated;
grant execute on function samvad_internal.submit_post(uuid,text,text) to authenticated;
-- Rebind the SQL wrapper to the budget-enforcing function (rename preserves OIDs).
create or replace function public.submit_post(p_request_id uuid,p_body text,p_language text)
returns jsonb language sql security invoker set search_path='' as $$
    select samvad_internal.submit_post(p_request_id,p_body,p_language);
$$;
commit;
