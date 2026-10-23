-- Centre tools: daily listing views (for owner stats) and listing removal requests.

-- 1. Daily view counters. One row per centre per day, no visitor data at all (cookieless, no IP).
create table public.center_daily_views (
  center_id uuid not null references public.dive_centers (id) on delete cascade,
  day date not null default current_date,
  views integer not null default 0,
  primary key (center_id, day)
);
alter table public.center_daily_views enable row level security;
create policy "views: owner read" on public.center_daily_views
  for select using (private.is_center_owner(center_id));

-- Increment is only callable by the server (service role) from the /api/view route.
create function public.increment_center_view(p_center_id uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.center_daily_views (center_id, day, views) values (p_center_id, current_date, 1)
  on conflict (center_id, day) do update set views = public.center_daily_views.views + 1;
$$;
revoke execute on function public.increment_center_view(uuid) from public, anon, authenticated;
grant execute on function public.increment_center_view(uuid) to service_role;

-- 2. Removal requests from centres. Written server-side after Turnstile; read only in the table editor.
create table public.removal_requests (
  id uuid primary key default gen_random_uuid(),
  center_id uuid references public.dive_centers (id) on delete set null,
  center_name text not null check (char_length(center_name) between 2 and 200),
  requester_name text not null check (char_length(requester_name) between 2 and 100),
  requester_email text not null check (char_length(requester_email) <= 200),
  role text not null check (char_length(role) <= 100),
  reason text check (char_length(reason) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'done', 'rejected')),
  created_at timestamptz not null default now()
);
alter table public.removal_requests enable row level security;
-- No policies: neither anon nor authenticated users can read or write; only the service role.
