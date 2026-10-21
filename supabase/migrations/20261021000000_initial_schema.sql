-- Initial schema for DiveAdvisor (MVP). See PROJECT.md section 6.
-- RLS is enabled on every table. Moderation/admin happens via the Supabase dashboard (service role).

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'diver' check (role in ('diver', 'center_owner', 'admin')),
  certification_level text,
  created_at timestamptz not null default now()
);

-- Create a profile automatically when a user signs up.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- dive_centers ----------
create table public.dive_centers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  region text not null,
  province text,
  city text,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  whatsapp text,
  email text,
  website text,
  instagram text,
  federations text[] not null default '{}',
  dive_types text[] not null default '{}',
  services text[] not null default '{}',
  languages text[] not null default '{}',
  season text,
  status text not null default 'unclaimed' check (status in ('unclaimed', 'claimed', 'premium')),
  owner_id uuid references public.profiles (id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'owner')),
  verified_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dive_centers_region_idx on public.dive_centers (region);
create index dive_centers_dive_types_idx on public.dive_centers using gin (dive_types);
create index dive_centers_federations_idx on public.dive_centers using gin (federations);

-- ---------- verification_codes ----------
create table public.verification_codes (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.dive_centers (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid references public.profiles (id) on delete set null
);

-- ---------- reviews ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.dive_centers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  dive_date date not null,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  verified boolean not null default false,
  verification_code_id uuid unique references public.verification_codes (id),
  score_safety smallint not null check (score_safety between 1 and 5),
  score_equipment smallint not null check (score_equipment between 1 and 5),
  score_briefing smallint not null check (score_briefing between 1 and 5),
  score_group smallint not null check (score_group between 1 and 5),
  score_environment smallint not null check (score_environment between 1 and 5),
  score_value smallint not null check (score_value between 1 and 5),
  text text,
  owner_reply text,
  owner_reply_at timestamptz,
  created_at timestamptz not null default now(),
  unique (center_id, user_id)
);

-- ---------- leads ----------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.dive_centers (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  name text,
  email text,
  message text,
  channel text not null check (channel in ('form', 'whatsapp', 'phone')),
  created_at timestamptz not null default now()
);

-- ---------- claim_requests ----------
create table public.claim_requests (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.dive_centers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  evidence text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.dive_centers enable row level security;
alter table public.verification_codes enable row level security;
alter table public.reviews enable row level security;
alter table public.leads enable row level security;
alter table public.claim_requests enable row level security;

-- Helper: is the current user the owner of this center?
create function public.is_center_owner(c_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dive_centers where id = c_id and owner_id = (select auth.uid())
  );
$$;

-- profiles: users read and update only their own profile (role is not user-editable, see below).
create policy "profiles: read own" on public.profiles
  for select using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (display_name, certification_level) on public.profiles to authenticated;

-- dive_centers: public read; only the owner updates. Inserts/deletes via service role only.
create policy "centers: public read" on public.dive_centers
  for select using (true);
create policy "centers: owner update" on public.dive_centers
  for update using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
revoke update on public.dive_centers from authenticated, anon;
grant update (description, address, phone, whatsapp, email, website, instagram,
  federations, dive_types, services, languages, season) on public.dive_centers to authenticated;

-- reviews: public reads published; author reads own; author inserts own (always pending, unverified).
-- Verified reviews and owner replies go through server-side code using the service role.
create policy "reviews: public read published" on public.reviews
  for select using (status = 'published' or user_id = (select auth.uid()));
create policy "reviews: author insert" on public.reviews
  for insert with check (
    user_id = (select auth.uid()) and status = 'pending' and verified = false
    and verification_code_id is null and owner_reply is null
  );

-- verification_codes: only the center owner reads/creates its codes.
create policy "codes: owner read" on public.verification_codes
  for select using (public.is_center_owner(center_id));
create policy "codes: owner insert" on public.verification_codes
  for insert with check (public.is_center_owner(center_id) and used_at is null and used_by is null);

-- leads: only the center owner reads. Inserts happen server-side (service role) after Turnstile check.
create policy "leads: owner read" on public.leads
  for select using (public.is_center_owner(center_id));

-- claim_requests: a user creates and reads their own requests.
create policy "claims: user insert" on public.claim_requests
  for insert with check (user_id = (select auth.uid()) and status = 'pending');
create policy "claims: user read own" on public.claim_requests
  for select using (user_id = (select auth.uid()));

-- Keep updated_at fresh.
create function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dive_centers_touch before update on public.dive_centers
  for each row execute function public.touch_updated_at();
