-- P2: sourced discovery and review-pending original posts. No AI/replies/reports.
begin;
create schema if not exists samvad_internal;
revoke all on schema samvad_internal from public, anon, authenticated;
grant usage on schema samvad_internal to authenticated;

create table public.news_items (
    id uuid primary key default gen_random_uuid(),
    title text not null check (char_length(title) between 1 and 300),
    source_name text not null check (char_length(source_name) between 1 and 120),
    source_url text not null unique check (source_url ~ '^https://[^[:space:]]+$'),
    excerpt text not null default '' check (char_length(excerpt) <= 600),
    language text not null check (language in ('en','hi','ml')),
    published_at timestamptz not null,
    topic text not null references public.interests(slug),
    summary_3line jsonb,
    created_at timestamptz not null default now(),
    check (summary_3line is null or
        (jsonb_typeof(summary_3line) = 'array' and jsonb_array_length(summary_3line) = 3))
);
create index news_items_topic_published_idx on public.news_items (topic, published_at desc, id desc);
create index news_items_published_idx on public.news_items (published_at desc, id desc);

create table public.posts (
    id uuid primary key default gen_random_uuid(),
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
    unique (author_id, request_id),
    check ((deleted_at is null and char_length(body) between 1 and 2000
        and body ~ '[^[:space:]]') or (deleted_at is not null and body = ''))
);
create index posts_public_created_idx on public.posts (created_at desc, id desc)
    where deleted_at is null and moderation_state = 'allowed';
create index posts_author_created_idx on public.posts (author_id, created_at desc, id desc);

create table public.conversations (
    id uuid primary key default gen_random_uuid(),
    news_item_id uuid unique references public.news_items(id),
    root_post_id uuid unique references public.posts(id),
    created_at timestamptz not null default now(),
    check (num_nonnulls(news_item_id, root_post_id) = 1)
);

alter table public.news_items enable row level security;
alter table public.posts enable row level security;
alter table public.conversations enable row level security;
revoke all on public.news_items, public.posts, public.conversations from public, anon, authenticated;
grant select on public.news_items, public.conversations to anon, authenticated;
grant select (id,author_id,body,language,created_at,deleted_at,moderation_state,is_fixture)
    on public.posts to anon, authenticated;
create policy news_public_read on public.news_items for select to anon, authenticated using (true);
create policy posts_public_read on public.posts for select to anon, authenticated
    using (deleted_at is null and moderation_state = 'allowed');
create policy posts_owner_read on public.posts for select to authenticated
    using (deleted_at is null and author_id = (select auth.uid()));
create policy conversations_visible_read on public.conversations for select to anon, authenticated
    using (news_item_id is not null or exists (
        select 1 from public.posts p where p.id = root_post_id
    ));

create function samvad_internal.attach_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    if tg_table_name = 'posts' then
        if auth.uid() is not null and auth.uid() <> new.author_id then
            raise exception using errcode='42501', message='Owner mismatch';
        end if;
        insert into public.conversations(root_post_id) values (new.id);
    else
        insert into public.conversations(news_item_id) values (new.id);
    end if;
    return new;
end;
$$;
revoke all on function samvad_internal.attach_conversation() from public, anon, authenticated;
create trigger posts_attach_conversation after insert on public.posts
    for each row execute function samvad_internal.attach_conversation();
create trigger news_attach_conversation after insert on public.news_items
    for each row execute function samvad_internal.attach_conversation();

create function samvad_internal.submit_post(p_request_id uuid, p_body text, p_language text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
    actor uuid := auth.uid();
    fingerprint text;
    saved public.posts;
begin
    if actor is null then
        raise exception using errcode='42501', message='Sign in required';
    end if;
    if p_request_id is null or p_body is null or char_length(p_body) not between 1 and 2000
       or p_body !~ '[^[:space:]]' or p_language is null or p_language not in ('en','hi','ml') then
        raise exception using errcode='22023', message='Invalid post';
    end if;
    fingerprint := encode(sha256(convert_to(jsonb_build_array(p_body,p_language)::text,'UTF8')),'hex');
    insert into public.posts(author_id,request_id,request_fingerprint,body,language)
        values (actor,p_request_id,fingerprint,p_body,p_language)
        on conflict (author_id,request_id) do nothing;
    -- A separate statement sees a concurrent winner after uniqueness waits.
    select * into strict saved from public.posts where author_id=actor and request_id=p_request_id;
    if saved.request_fingerprint <> fingerprint then
        raise exception using errcode='PT409', message='Request ID already used for different content';
    end if;
    return jsonb_build_object('id',saved.id,'moderation_state',saved.moderation_state,
        'deleted',saved.deleted_at is not null,'conversation_id',
        (select c.id from public.conversations c where c.root_post_id=saved.id));
end;
$$;
revoke all on function samvad_internal.submit_post(uuid,text,text) from public, anon, authenticated;
grant execute on function samvad_internal.submit_post(uuid,text,text) to authenticated;
create function public.submit_post(p_request_id uuid, p_body text, p_language text)
returns jsonb language sql security invoker set search_path = '' as $$
    select samvad_internal.submit_post(p_request_id,p_body,p_language);
$$;
revoke all on function public.submit_post(uuid,text,text) from public, anon, authenticated;
grant execute on function public.submit_post(uuid,text,text) to authenticated;

create function samvad_internal.delete_own_post(p_post_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
    if auth.uid() is null then
        raise exception using errcode='42501', message='Sign in required';
    end if;
    update public.posts set deleted_at=coalesce(deleted_at,now()),body=''
        where id=p_post_id and author_id=auth.uid();
    return found;
end;
$$;
revoke all on function samvad_internal.delete_own_post(uuid) from public, anon, authenticated;
grant execute on function samvad_internal.delete_own_post(uuid) to authenticated;
create function public.delete_own_post(p_post_id uuid)
returns boolean language sql security invoker set search_path = '' as $$
    select samvad_internal.delete_own_post(p_post_id);
$$;
revoke all on function public.delete_own_post(uuid) from public, anon, authenticated;
grant execute on function public.delete_own_post(uuid) to authenticated;

create function public.get_discovery_feed(
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
                    'display_name',pr.display_name,'bio',pr.bio,'preferred_language',pr.preferred_language))
        from public.posts p join public.profiles pr on pr.user_id=p.author_id
        join public.conversations c on c.root_post_id=p.id
        where p.deleted_at is null and p.moderation_state='allowed'
    )
    select x.k,x.entity_id,x.at_time,x.matched,x.cid,x.ndata,x.pdata from items x
    where p_after is null or (x.matched,x.at_time,x.entity_id,x.k)
        < (after_match,after_at,after_id,after_kind)
    order by x.matched desc,x.at_time desc,x.entity_id desc,x.k desc limit p_limit;
end;
$$;
revoke all on function public.get_discovery_feed(text,integer,jsonb) from public, anon, authenticated;
grant execute on function public.get_discovery_feed(text,integer,jsonb) to anon, authenticated;

-- Reviewed historical source metadata; original publication/event dates, not current headlines.
insert into public.news_items (id,title,source_name,source_url,excerpt,language,published_at,topic)
select id,title,source_name,source_url,excerpt,language,published_at,topic
from jsonb_to_recordset('[{"id": "30000000-0000-4000-8000-000000000001", "title": "India seal T20 World Cup glory after epic duel against South Africa", "source_name": "International Cricket Council", "source_url": "https://www.icc-cricket.com/tournaments/t20cricketworldcup/news/live-india-and-south-africa-face-off-in-t20-world-cup-final", "excerpt": "India won the 2024 men''s T20 final in Barbados. Revisit the match through the ICC''s report.", "language": "en", "published_at": "2024-06-29T00:00:00Z", "topic": "sports"}, {"id": "30000000-0000-4000-8000-000000000002", "title": "Operationalisation of Central Bank Digital Currency – Retail (e₹-R) Pilot", "source_name": "Reserve Bank of India", "source_url": "https://rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=54773", "excerpt": "The RBI announced a retail digital rupee pilot beginning on 1 December 2022.", "language": "en", "published_at": "2022-11-29T00:00:00Z", "topic": "business"}, {"id": "30000000-0000-4000-8000-000000000003", "title": "Chandrayaan-3", "source_name": "Indian Space Research Organisation", "source_url": "https://www.isro.gov.in/ISRO_EN/Chandrayaan3.html", "excerpt": "ISRO''s mission archive provides Chandrayaan-3 updates, images and its Moon landing coverage.", "language": "en", "published_at": "2023-08-23T00:00:00Z", "topic": "technology"}, {"id": "30000000-0000-4000-8000-000000000004", "title": "PM inaugurates Atal Bihari Vajpayee Sewri – Nhava Sheva Atal Setu in Navi Mumbai", "source_name": "Press Information Bureau", "source_url": "https://www.pib.gov.in/PressReleasePage.aspx?PRID=1995650&lang=2&reg=48", "excerpt": "The Mumbai Trans Harbour Link inauguration took place on 12 January 2024.", "language": "en", "published_at": "2024-01-12T00:00:00Z", "topic": "infrastructure"}, {"id": "30000000-0000-4000-8000-000000000005", "title": "Cabinet Approves National Education Policy 2020, paving way for transformational reforms in school and higher education systems", "source_name": "Press Information Bureau", "source_url": "https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1642061&lang=2&reg=48", "excerpt": "The Union Cabinet approved the education policy on 29 July 2020. Read the original policy announcement.", "language": "en", "published_at": "2020-07-29T00:00:00Z", "topic": "politics"}, {"id": "30000000-0000-4000-8000-000000000006", "title": "Santiniketan: New Indian site on the UNESCO World Heritage List", "source_name": "UNESCO", "source_url": "https://www.unesco.org/en/articles/santiniketan-new-indian-site-unesco-world-heritage-list", "excerpt": "Santiniketan in West Bengal was inscribed on the World Heritage List in September 2023.", "language": "en", "published_at": "2023-09-17T00:00:00Z", "topic": "culture"}]'::jsonb) as x(id uuid,title text,source_name text,source_url text,
    excerpt text,language text,published_at timestamptz,topic text);

commit;
