-- "Write first, confirm later": reviews by visitors who are not logged in wait here until
-- they click the link we email them. Only the service role (server code) touches this table.
create table public.review_drafts (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,            -- sha256 of the emailed token; the token itself is never stored
  email text not null check (char_length(email) <= 200),
  center_id uuid not null references public.dive_centers (id) on delete cascade,
  payload jsonb not null,                     -- scores, dive date, text, optional code
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours')
);
create index review_drafts_expires_idx on public.review_drafts (expires_at);
alter table public.review_drafts enable row level security;
-- No policies on purpose: not readable or writable through the public API.

-- Find an existing account by email (to attach the confirmed review to it). Service role only.
create function public.user_id_by_email(p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke execute on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;
