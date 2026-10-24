-- P4.5 local lint: explicit empty array type; feed behavior unchanged.
begin;
create or replace function public.get_discovery_feed(
    p_topic text default null, p_limit integer default 20, p_after jsonb default null
)
returns table (kind text,id uuid,sort_at timestamptz,interest_match boolean,
    conversation_id uuid,news jsonb,post jsonb)
language plpgsql stable security invoker set search_path = '' as $$
declare
    after_match boolean; after_at timestamptz; after_id uuid; after_kind text;
    preferred_topics text[] := ARRAY[]::text[];
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
commit;
