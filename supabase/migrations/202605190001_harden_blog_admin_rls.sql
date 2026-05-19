create table if not exists public.blog_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create schema if not exists private;

alter table public.blog_admins enable row level security;
alter table public.blog_posts enable row level security;

create or replace function private.is_blog_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.blog_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function private.is_blog_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_blog_admin() to authenticated;

drop policy if exists "Blog admins can read own admin grant" on public.blog_admins;
create policy "Blog admins can read own admin grant"
  on public.blog_admins
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Public read published" on public.blog_posts;
drop policy if exists "Admin full access" on public.blog_posts;
drop policy if exists "Blog admins can insert posts" on public.blog_posts;
drop policy if exists "Blog admins can update posts" on public.blog_posts;
drop policy if exists "Blog admins can delete posts" on public.blog_posts;

create policy "Public read published"
  on public.blog_posts
  for select
  using (published = true or private.is_blog_admin());

create policy "Blog admins can insert posts"
  on public.blog_posts
  for insert
  to authenticated
  with check (private.is_blog_admin());

create policy "Blog admins can update posts"
  on public.blog_posts
  for update
  to authenticated
  using (private.is_blog_admin())
  with check (private.is_blog_admin());

create policy "Blog admins can delete posts"
  on public.blog_posts
  for delete
  to authenticated
  using (private.is_blog_admin());
