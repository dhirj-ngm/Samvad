begin;

create table samvad_internal.sarvam_usage (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid not null references public.profiles(user_id),
    characters integer not null check (characters between 1 and 6000),
    requests integer not null check (requests between 1 and 6),
    created_at timestamptz not null default clock_timestamp()
);
create index sarvam_usage_time_idx on samvad_internal.sarvam_usage(created_at);
create table samvad_internal.publication_reviews (
    id uuid primary key default gen_random_uuid(),
    reviewer uuid not null references public.profiles(user_id),
    request_id uuid not null,
    fingerprint text not null,
    entity_type text not null check (entity_type in ('post','reply')),
    entity_id uuid not null,
    previous_state text not null,
    decision text not null check (decision in ('allowed','blocked')),
    reason text not null check (char_length(reason) between 1 and 500),
    created_at timestamptz not null default now(),
    unique(reviewer,request_id)
);
alter table samvad_internal.sarvam_usage enable row level security;
alter table samvad_internal.publication_reviews enable row level security;
revoke all on samvad_internal.sarvam_usage,samvad_internal.publication_reviews from public,anon,authenticated;

create function samvad_internal.demo_ai_control(p_action text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; amount integer; cap integer; calls integer; spent bigint; recent bigint; result uuid;
begin
    if p_action<>'reserve_translation' or p_action is null then
        raise exception using errcode='22023',message='Invalid AI control operation'; end if;
    actor:=(p_payload->>'actor')::uuid;
    amount:=(p_payload->>'characters')::integer;
    cap:=(p_payload->>'cap')::integer;
    calls:=(p_payload->>'requests')::integer;
    if actor is null or amount is null or amount not between 1 and 6000 or
       cap is null or cap not between 0 and 10000 or calls is null or calls not between 1 and 6 then
        raise exception using errcode='22023',message='Invalid translation reservation'; end if;
    perform pg_advisory_xact_lock(71441005);
    select coalesce(sum(characters),0),coalesce(sum(requests) filter
        (where created_at>clock_timestamp()-interval '1 minute'),0)
        into spent,recent from samvad_internal.sarvam_usage;
    if spent+amount>cap or recent+calls>30 then
        raise exception using errcode='PT429',message='Translation allowance unavailable'; end if;
    insert into samvad_internal.sarvam_usage(actor_id,characters,requests)
        values(actor,amount,calls) returning id into result;
    return jsonb_build_object('id',result,'characters_reserved',amount);
end;
$$;
revoke all on function samvad_internal.demo_ai_control(text,jsonb) from public,anon,authenticated;
grant execute on function samvad_internal.demo_ai_control(text,jsonb) to service_role;
create function public.demo_ai_control(p_action text,p_payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$
    select samvad_internal.demo_ai_control(p_action,p_payload);
$$;
revoke all on function public.demo_ai_control(text,jsonb) from public,anon,authenticated;
grant execute on function public.demo_ai_control(text,jsonb) to service_role;

create function samvad_internal.demo_review(p_action text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb; item record; saved samvad_internal.publication_reviews;
    fingerprint text; kind text; target uuid; req uuid; decision text; reason_text text;
begin
    if actor is null or not exists(select 1 from samvad_internal.review_admins where user_id=actor) then
        raise exception using errcode='42501',message='Trusted reviewer required'; end if;
    if p_action='queue' then
        if p_payload<>'{}'::jsonb then
            raise exception using errcode='22023',message='Invalid queue parameters'; end if;
        select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at,q.entity_id),'[]'::jsonb) into result from (
            select 'post'::text entity_type,p.id entity_id,p.body,p.language,p.moderation_state,
                p.manual_hidden,p.created_at,pr.handle,p.is_fixture,
                encode(sha256(convert_to(p.body,'UTF8')),'hex') source_hash
            from public.posts p join public.profiles pr on pr.user_id=p.author_id
            where p.deleted_at is null and p.moderation_state in ('pending','flagged','blocked')
            union all
            select 'reply',r.id,r.body,r.language,r.moderation_state,r.manual_hidden,r.created_at,pr.handle,r.is_fixture,
                encode(sha256(convert_to(r.body,'UTF8')),'hex')
            from public.replies r join public.profiles pr on pr.user_id=r.author_id
            where r.deleted_at is null and r.moderation_state in ('pending','flagged','blocked')
            order by created_at,entity_id limit 50
        ) q;
        return result;
    end if;
    if p_action is null or p_action<>'decide' or jsonb_typeof(p_payload)<>'object' or
       exists(select 1 from jsonb_object_keys(p_payload) k where k not in
        ('entity_type','entity_id','request_id','action','reason','source_hash','expected_state')) then
        raise exception using errcode='22023',message='Invalid review action'; end if;
    kind:=p_payload->>'entity_type';target:=(p_payload->>'entity_id')::uuid;
    req:=(p_payload->>'request_id')::uuid; reason_text:=p_payload->>'reason';
    decision:=case p_payload->>'action' when 'approve' then 'allowed' when 'reject' then 'blocked' end;
    if kind is null or kind not in ('post','reply') or target is null or req is null or decision is null or
       reason_text is null or char_length(reason_text) not between 1 and 500 or btrim(reason_text)='' or
       p_payload->>'source_hash' is null or p_payload->>'source_hash' !~ '^[a-f0-9]{64}$' or
       p_payload->>'expected_state' is null or p_payload->>'expected_state' not in ('pending','flagged','blocked') then
        raise exception using errcode='22023',message='Invalid review payload'; end if;
    perform pg_advisory_xact_lock(hashtextextended(actor::text,452));
    fingerprint:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
    select * into saved from samvad_internal.publication_reviews where reviewer=actor and request_id=req;
    if found then
        if saved.fingerprint<>fingerprint then
            raise exception using errcode='PT409',message='Review request changed'; end if;
        return jsonb_build_object('id',saved.id,'status',saved.decision);
    end if;
    if kind='post' then
        select p.body,p.moderation_state,p.deleted_at into item from public.posts p where p.id=target for update;
    else
        select r.body,r.moderation_state,r.deleted_at into item from public.replies r where r.id=target for update;
    end if;
    if not found or item.deleted_at is not null then
        raise exception using errcode='PT404',message='Content unavailable'; end if;
    if item.moderation_state<>p_payload->>'expected_state' or
       encode(sha256(convert_to(item.body,'UTF8')),'hex')<>p_payload->>'source_hash' then
        raise exception using errcode='PT409',message='Source changed. Refresh review queue'; end if;
    insert into samvad_internal.publication_reviews(reviewer,request_id,fingerprint,entity_type,entity_id,
        previous_state,decision,reason) values(actor,req,fingerprint,kind,target,item.moderation_state,decision,reason_text)
        returning * into saved;
    if kind='post' then update public.posts set moderation_state=decision where id=target;
    else update public.replies set moderation_state=decision where id=target; end if;
    -- No manual_hidden changes: approval cannot undo a manual takedown.
    return jsonb_build_object('id',saved.id,'status',saved.decision);
end;
$$;
revoke all on function samvad_internal.demo_review(text,jsonb) from public,anon,authenticated;
grant execute on function samvad_internal.demo_review(text,jsonb) to authenticated;
create function public.demo_review(p_action text,p_payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$
    select samvad_internal.demo_review(p_action,p_payload);
$$;
revoke all on function public.demo_review(text,jsonb) from public,anon,authenticated;
grant execute on function public.demo_review(text,jsonb) to authenticated;
commit;
