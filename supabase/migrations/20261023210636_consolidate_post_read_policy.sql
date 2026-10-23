-- Preserve visibility while avoiding two permissive SELECT evaluations per user.
begin;
drop policy posts_public_read on public.posts;
drop policy posts_owner_read on public.posts;
create policy posts_public_read on public.posts for select to anon
    using (deleted_at is null and moderation_state='allowed');
create policy posts_authenticated_read on public.posts for select to authenticated
    using (deleted_at is null and (moderation_state='allowed' or author_id=(select auth.uid())));
commit;
