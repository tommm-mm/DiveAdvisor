-- Sprint 3: reviews, verification codes, reports and ratings.

-- 1. Verification codes expire (single use is already enforced by used_at / reviews.verification_code_id unique).
alter table public.verification_codes
  add column expires_at timestamptz not null default (now() + interval '30 days');

-- 2. Owners read every non-rejected review of their own centre (pending ones too, for the dashboard).
create policy "reviews: owner read own centre" on public.reviews
  for select using (status <> 'rejected' and private.is_center_owner(center_id));

-- 3. Content reports. Users file their own; nobody reads them via the API (admins use the table editor).
create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 5 and 1000),
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);
alter table public.review_reports enable row level security;
create policy "reports: user insert own" on public.review_reports
  for insert with check (reporter_id = (select auth.uid()));

-- 4. Public rating summary per centre, published reviews only.
--    security_invoker so the view respects the reviews RLS policies of the caller.
create view public.center_ratings with (security_invoker = true) as
select
  center_id,
  count(*)::int as review_count,
  round(avg(score_safety), 1) as avg_safety,
  round(avg(score_equipment), 1) as avg_equipment,
  round(avg(score_briefing), 1) as avg_briefing,
  round(avg(score_group), 1) as avg_group,
  round(avg(score_environment), 1) as avg_environment,
  round(avg(score_value), 1) as avg_value,
  round(avg((score_safety + score_equipment + score_briefing + score_group
             + score_environment + score_value) / 6.0), 1) as avg_overall
from public.reviews
where status = 'published'
group by center_id;
grant select on public.center_ratings to anon, authenticated;

-- 5. Redeem a code and insert a verified review atomically. Lives in public so supabase-js can call it via rpc,
--    but only the service role (server code) may execute it.
create function public.submit_verified_review(
  p_user_id uuid, p_center_id uuid, p_code text, p_dive_date date,
  p_safety smallint, p_equipment smallint, p_briefing smallint,
  p_group smallint, p_environment smallint, p_value smallint, p_text text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_code_id uuid;
  v_review_id uuid;
begin
  -- Lock the code row so two submissions cannot redeem it concurrently.
  select id into v_code_id from public.verification_codes
    where code = upper(p_code) and center_id = p_center_id
      and used_at is null and expires_at > now()
    for update;
  if v_code_id is null then
    raise exception 'invalid_code';
  end if;

  insert into public.reviews (center_id, user_id, dive_date, status, verified, verification_code_id,
    score_safety, score_equipment, score_briefing, score_group, score_environment, score_value, text)
  values (p_center_id, p_user_id, p_dive_date, 'published', true, v_code_id,
    p_safety, p_equipment, p_briefing, p_group, p_environment, p_value, p_text)
  returning id into v_review_id;

  update public.verification_codes set used_at = now(), used_by = p_user_id where id = v_code_id;
  return v_review_id;
end;
$$;
revoke execute on function public.submit_verified_review(uuid, uuid, text, date, smallint, smallint, smallint, smallint, smallint, smallint, text)
  from public, anon, authenticated;
grant execute on function public.submit_verified_review(uuid, uuid, text, date, smallint, smallint, smallint, smallint, smallint, smallint, text)
  to service_role;
