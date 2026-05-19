alter table public.subscribers enable row level security;

create or replace function public.get_waitlist_status()
returns table (
  is_subscribed boolean,
  position integer,
  joined_at timestamptz,
  referral_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with current_identity as (
    select
      auth.uid() as user_id,
      nullif(lower(auth.jwt() ->> 'email'), '') as email
  ),
  current_profile as (
    select p.referral_code
    from public.profiles p
    join current_identity i on p.id = i.user_id
  ),
  current_subscriber as (
    select s.id, s.created_at
    from public.subscribers s
    join current_identity i on lower(s.email) = i.email
    order by s.created_at asc, s.id asc
    limit 1
  ),
  ranked_subscribers as (
    select
      id,
      (row_number() over (order by created_at asc, id asc))::integer as waitlist_position
    from public.subscribers
  )
  select
    exists(select 1 from current_subscriber) as is_subscribed,
    (
      select r.waitlist_position
      from ranked_subscribers r
      join current_subscriber s on s.id = r.id
    ) as position,
    (select created_at from current_subscriber) as joined_at,
    (
      select count(*)
      from public.subscribers s
      join current_profile p on s.referred_by = p.referral_code
    ) as referral_count;
$$;

revoke all on function public.get_waitlist_status() from public;
grant execute on function public.get_waitlist_status() to authenticated;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'subscribers'
      and cmd in ('SELECT', 'ALL')
  loop
    execute format('drop policy if exists %I on public.subscribers', pol.policyname);
  end loop;
end $$;

drop policy if exists "Subscribers can read own row" on public.subscribers;
create policy "Subscribers can read own row"
  on public.subscribers
  for select
  to authenticated
  using (lower(email) = nullif(lower(auth.jwt() ->> 'email'), ''));

drop policy if exists "Anyone can join waitlist" on public.subscribers;
create policy "Anyone can join waitlist"
  on public.subscribers
  for insert
  to anon, authenticated
  with check (true);
