begin;
-- Private server-only caches, reservations and triage audit. No client grants.
create table samvad_internal.ai_cache (
    cache_key text primary key check(length(cache_key)=64),
    result jsonb not null,
    created_at timestamptz not null default now()
);
create table samvad_internal.ai_reservations (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid not null references public.profiles(user_id),
    task text not null check(task in ('translation','summary','moderation')),
    tokens integer not null check(tokens between 1 and 4000),
    created_at timestamptz not null default clock_timestamp(),
    lease_until timestamptz not null,
    released boolean not null default false
);
create index ai_reservations_time_idx on samvad_internal.ai_reservations(created_at);
create index ai_reservations_actor_idx on samvad_internal.ai_reservations(actor_id,created_at);
create table samvad_internal.moderation_events (
    id uuid primary key default gen_random_uuid(),
    entity_type text not null check(entity_type in ('post','reply')),
    entity_id uuid not null,
    source_hash text not null,
    decision text not null check(decision in ('allowed','flagged','blocked')),
    reason_code text not null,
    model_id text not null,
    prompt_version text not null,
    created_at timestamptz not null default now()
);
create index moderation_events_entity_idx on samvad_internal.moderation_events(entity_type,entity_id,created_at);
alter table samvad_internal.ai_cache enable row level security;
alter table samvad_internal.ai_reservations enable row level security;
alter table samvad_internal.moderation_events enable row level security;
revoke all on samvad_internal.ai_cache,samvad_internal.ai_reservations,samvad_internal.moderation_events from public,anon,authenticated;
grant usage on schema samvad_internal to service_role;

create function samvad_internal.ai_control(p_operation text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
    moment timestamptz:=clock_timestamp(); actor uuid; charge integer; reservation uuid;
    minute_count integer; day_count integer; minute_tokens bigint; day_tokens bigint;
    rpm integer; rpd integer; tpm integer; tpd integer; timeout_seconds integer;
    result jsonb; actual_body text; actual_state text; actual_author uuid; removed timestamptz;
begin
    if p_operation='cache_get' then
        select c.result into result from samvad_internal.ai_cache c where cache_key=p_payload->>'key'
            and created_at>moment-interval '7 days';
        return result;
    elsif p_operation='cache_put' then
        insert into samvad_internal.ai_cache(cache_key,result) values(p_payload->>'key',p_payload->'result')
            on conflict(cache_key) do update set result=excluded.result,created_at=moment;
        delete from samvad_internal.ai_cache where created_at<moment-interval '7 days';
        return 'true'::jsonb;
    elsif p_operation='reserve' then
        actor:=(p_payload->>'actor')::uuid; charge:=(p_payload->>'tokens')::integer;
        rpm:=(p_payload->>'rpm')::integer; rpd:=(p_payload->>'rpd')::integer;
        tpm:=(p_payload->>'tpm')::integer; tpd:=(p_payload->>'tpd')::integer;
        timeout_seconds:=(p_payload->>'timeout')::integer;
        if actor is null or charge is null or charge not between 1 and 4000 or
            rpm is null or rpm not between 1 and 10 or rpd is null or rpd not between 1 and 100 or
            tpm is null or tpm not between 1 and 4000 or tpd is null or tpd not between 1 and 50000 or
            timeout_seconds is null or timeout_seconds not between 1 and 30 or
            p_payload->>'task' is null or p_payload->>'task' not in ('translation','summary','moderation') then
            raise exception using errcode='22023',message='Invalid AI reservation'; end if;
        perform pg_advisory_xact_lock(71441004);
        select count(*) filter(where created_at>moment-interval '1 minute'),
            count(*) filter(where created_at>=date_trunc('day',moment at time zone 'UTC') at time zone 'UTC'),
            coalesce(sum(tokens) filter(where created_at>moment-interval '1 minute'),0),
            coalesce(sum(tokens) filter(where created_at>=date_trunc('day',moment at time zone 'UTC') at time zone 'UTC'),0)
            into minute_count,day_count,minute_tokens,day_tokens
            from samvad_internal.ai_reservations where created_at>=least(moment-interval '1 minute',date_trunc('day',moment at time zone 'UTC') at time zone 'UTC');
        if minute_count>=rpm or day_count>=rpd or minute_tokens+charge>tpm or day_tokens+charge>tpd
            or exists(select 1 from samvad_internal.ai_reservations where not released and lease_until>moment)
            or (select count(*) from samvad_internal.ai_reservations where actor_id=actor and created_at>moment-interval '1 minute')>=5
            or (p_payload->>'task'='summary' and (minute_count>=greatest(rpm-2,0) or day_count>=greatest(rpd-10,0))) then
            raise exception using errcode='PT429',message='Free AI budget unavailable'; end if;
        insert into samvad_internal.ai_reservations(actor_id,task,tokens,lease_until)
            values(actor,p_payload->>'task',charge,moment+make_interval(secs=>timeout_seconds)) returning id into reservation;
        delete from samvad_internal.ai_reservations where created_at<moment-interval '2 days';
        return jsonb_build_object('id',reservation);
    elsif p_operation='release' then
        update samvad_internal.ai_reservations set released=true where id=(p_payload->>'id')::uuid;
        -- Conservative accounting: failed/truncated calls still spend their reservation.
        return 'true'::jsonb;
    elsif p_operation='moderate_commit' then
        if p_payload->>'entity_type'='post' then
            select body,moderation_state,author_id,deleted_at into actual_body,actual_state,actual_author,removed
                from public.posts where id=(p_payload->>'id')::uuid for update;
        elsif p_payload->>'entity_type'='reply' then
            select body,moderation_state,author_id,deleted_at into actual_body,actual_state,actual_author,removed
                from public.replies where id=(p_payload->>'id')::uuid for update;
        else raise exception using errcode='22023',message='Invalid content type'; end if;
        if actual_body is null or removed is not null or actual_author is distinct from (p_payload->>'actor')::uuid then
            raise exception using errcode='PT404',message='Content unavailable'; end if;
        if encode(sha256(convert_to(actual_body,'UTF8')),'hex')<>p_payload->>'source_hash' or actual_state<>'pending' then
            raise exception using errcode='PT409',message='Content changed during screening'; end if;
        if p_payload->>'decision' is null or p_payload->>'decision' not in ('allowed','flagged','blocked') then
            raise exception using errcode='22023',message='Invalid decision'; end if;
        insert into samvad_internal.moderation_events(entity_type,entity_id,source_hash,decision,reason_code,model_id,prompt_version)
            values(p_payload->>'entity_type',(p_payload->>'id')::uuid,p_payload->>'source_hash',p_payload->>'decision',
                p_payload->>'reason_code',p_payload->>'model_id',p_payload->>'prompt_version');
        if p_payload->>'entity_type'='post' then
            update public.posts set moderation_state=p_payload->>'decision' where id=(p_payload->>'id')::uuid;
        else update public.replies set moderation_state=p_payload->>'decision' where id=(p_payload->>'id')::uuid; end if;
        return jsonb_build_object('status',p_payload->>'decision');
    else raise exception using errcode='22023',message='Invalid AI operation'; end if;
end;
$$;
revoke all on function samvad_internal.ai_control(text,jsonb) from public,anon,authenticated;
grant execute on function samvad_internal.ai_control(text,jsonb) to service_role;
create function public.ai_control(p_operation text,p_payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select samvad_internal.ai_control(p_operation,p_payload); $$;
revoke all on function public.ai_control(text,jsonb) from public,anon,authenticated;
grant execute on function public.ai_control(text,jsonb) to service_role;
commit;
