-- Refuse to enable enforcement until every existing admin has a verified factor.
do $$
begin
  if exists (
    select 1
    from (
      select u.id as user_id
      from public.admin_console_users staff
      left join auth.users u on u.email = staff.email and u.email_confirmed_at is not null
      where staff.role = 'admin'
      union
      select id from public.user_profiles where role = 'admin'
      union
      select user_id from public.blog_admins
    ) grants
    where not exists (
      select 1 from auth.mfa_factors factor
      where factor.user_id = grants.user_id and factor.status = 'verified'
    )
  ) then
    raise exception 'Verified MFA enrollment is required for all DMsgBox admins before rollout';
  end if;
end;
$$;

alter policy "DMsgBox admins can read contact submissions"
  on public.contact_submissions
  using (
    (select auth.uid()) is not null
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and exists (
      select 1 from public.admin_console_users staff
      where staff.email = (select auth.jwt() ->> 'email') and staff.role = 'admin'
    )
  );

alter policy admin_read_all_profiles on public.user_profiles
  to authenticated
  using (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and exists (
      select 1 from public.admin_console_users staff
      where staff.email = (select auth.jwt() ->> 'email') and staff.role = 'admin'
    )
  );

-- Profile writes are already server-only. Remove the obsolete admin write policy.
drop policy if exists admin_update_profiles on public.user_profiles;

alter policy "Admins can view all devices" on public.devices
  to authenticated
  using (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and exists (
      select 1 from public.user_profiles profile
      where profile.id = (select auth.uid()) and profile.role = 'admin'
    )
  );

alter policy "Admins can view all device revocations" on public.device_revocations
  to authenticated
  using (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and exists (
      select 1 from public.user_profiles profile
      where profile.id = (select auth.uid()) and profile.role = 'admin'
    )
  );

-- Public readers do not need access to the private admin helper.
alter policy "Public read published" on public.blog_posts using (published = true);
create policy "Blog admins can read drafts" on public.blog_posts
  for select to authenticated using (private.is_blog_admin());

create or replace function private.is_blog_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select (select auth.jwt() ->> 'aal') = 'aal2' and exists (
    select 1 from public.blog_admins
    where user_id = (select auth.uid())
  );
$$;
