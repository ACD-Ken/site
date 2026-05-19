create table if not exists public.blog_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.blog_admins enable row level security;
alter table public.blog_posts enable row level security;

create or replace function public.is_blog_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.blog_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_blog_admin() from public;
grant execute on function public.is_blog_admin() to anon, authenticated;

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
  using (published = true or public.is_blog_admin());

create policy "Blog admins can insert posts"
  on public.blog_posts
  for insert
  to authenticated
  with check (public.is_blog_admin());

create policy "Blog admins can update posts"
  on public.blog_posts
  for update
  to authenticated
  using (public.is_blog_admin())
  with check (public.is_blog_admin());

create policy "Blog admins can delete posts"
  on public.blog_posts
  for delete
  to authenticated
  using (public.is_blog_admin());
