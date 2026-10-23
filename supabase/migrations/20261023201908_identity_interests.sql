-- P1 only. Apply once via the migration ledger, after review, to development.
-- Existing incompatible tables cause an error instead of being overwritten.
begin;

create schema if not exists extensions;
create extension if not exists citext with schema extensions;

create table public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    handle extensions.citext not null unique,
    display_name text not null default '',
    bio text not null default '',
    preferred_language text not null default 'en',
    created_at timestamptz not null default now(),
    constraint profiles_handle_format check (handle::text ~ '^[a-z0-9_]{3,30}$'),
    constraint profiles_handle_reserved check (
        handle::text not in ('admin', 'administrator', 'samvad', 'support', 'moderator', 'system')
    ),
    constraint profiles_display_name_length check (char_length(display_name) <= 80),
    constraint profiles_bio_length check (char_length(bio) <= 280),
    constraint profiles_language check (preferred_language in ('en', 'hi', 'ml'))
);

-- All columns here are private; even the owner reads their email via Auth instead.
create table public.private_identities (
    user_id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    verification_status text not null default 'unverified'
        check (verification_status in ('unverified', 'email_verified')),
    created_at timestamptz not null default now()
);

create table public.interests (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z][a-z0-9_]{1,39}$'),
    label text not null check (char_length(label) between 1 and 80)
);

create table public.user_interests (
    user_id uuid not null references public.profiles(user_id) on delete cascade,
    interest_id uuid not null references public.interests(id) on delete cascade,
    primary key (user_id, interest_id)
);
create index user_interests_interest_id_idx on public.user_interests (interest_id);

-- Upsert needs UPDATE(user_id), but it must never reassign the row or timestamp.
create function public.samvad_guard_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if tg_op = 'UPDATE' then
        if new.user_id is distinct from old.user_id
           or new.created_at is distinct from old.created_at then
            raise exception using errcode = '42501', message = 'Immutable profile fields';
        end if;
    end if;
    new.handle := pg_catalog.lower(new.handle::text);
    return new;
end;
$$;
revoke all on function public.samvad_guard_profile() from public, anon, authenticated;
create trigger samvad_guard_profile
before insert or update on public.profiles
for each row execute function public.samvad_guard_profile();

-- No client metadata is trusted as email verification. Only Auth-owned columns.
-- Avoid profile creation in this trigger: a handle collision must not block signup.
create function public.samvad_sync_private_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.email is not null and new.email <> '' then
        insert into public.private_identities (user_id, email, verification_status)
        values (
            new.id,
            new.email,
            case when new.email_confirmed_at is not null
                then 'email_verified' else 'unverified' end
        )
        on conflict (user_id) do update
        set email = excluded.email, verification_status = excluded.verification_status;
    else
        -- A removed email must not leave stale private contact/verification data.
        delete from public.private_identities where user_id = new.id;
    end if;
    return new;
end;
$$;
revoke all on function public.samvad_sync_private_identity() from public, anon, authenticated;
create trigger samvad_sync_private_identity
after insert or update of email, email_confirmed_at on auth.users
for each row execute function public.samvad_sync_private_identity();

-- Non-destructive backfill for accounts created before this migration.
insert into public.private_identities (user_id, email, verification_status)
select id, email,
    case when email_confirmed_at is not null then 'email_verified' else 'unverified' end
from auth.users
where email is not null and email <> ''
on conflict (user_id) do update
set email = excluded.email, verification_status = excluded.verification_status;

alter table public.profiles enable row level security;
alter table public.private_identities enable row level security;
alter table public.interests enable row level security;
alter table public.user_interests enable row level security;

-- Supabase may grant broad table defaults. Clear them before narrow grants.
revoke all on public.profiles, public.private_identities, public.interests,
    public.user_interests from public, anon, authenticated;
grant usage on schema public, extensions to anon, authenticated;
grant select (user_id, handle, display_name, bio, preferred_language, created_at)
    on public.profiles to anon, authenticated;
grant insert (user_id, handle, display_name, bio, preferred_language)
    on public.profiles to authenticated;
grant update (user_id, handle, display_name, bio, preferred_language)
    on public.profiles to authenticated;
grant select on public.interests to anon, authenticated;
grant select, insert, delete on public.user_interests to authenticated;
-- Deliberately no private_identities grants or client RLS policies.

create policy profiles_public_read on public.profiles
    for select to anon, authenticated using (true);
create policy profiles_owner_insert on public.profiles
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_owner_update on public.profiles
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
create policy interests_public_read on public.interests
    for select to anon, authenticated using (true);
create policy user_interests_owner_read on public.user_interests
    for select to authenticated using ((select auth.uid()) = user_id);
create policy user_interests_owner_insert on public.user_interests
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_interests_owner_delete on public.user_interests
    for delete to authenticated using ((select auth.uid()) = user_id);

-- Stable IDs for the agreed taxonomy. No news, posts, passwords or demo accounts.
insert into public.interests (id, slug, label) values
    ('10000000-0000-4000-8000-000000000001', 'sports', 'Sports'),
    ('10000000-0000-4000-8000-000000000002', 'business', 'Business'),
    ('10000000-0000-4000-8000-000000000003', 'technology', 'Technology'),
    ('10000000-0000-4000-8000-000000000004', 'infrastructure', 'Infrastructure'),
    ('10000000-0000-4000-8000-000000000005', 'politics', 'Politics'),
    ('10000000-0000-4000-8000-000000000006', 'culture', 'Culture');

commit;
