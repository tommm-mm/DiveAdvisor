-- "Aggiungi la tua attività" (/eudi and later elsewhere): requests to list a missing business.
-- Nothing goes online automatically: we verify the data and import it with the usual seed flow.
create table public.business_suggestions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  city text not null check (char_length(city) between 2 and 100),
  region text check (char_length(region) <= 50),
  business_types text[] not null default '{diving}' check (business_types <@ array['diving', 'scuola', 'negozio']),
  contact_email text not null check (char_length(contact_email) <= 200),
  phone text check (char_length(phone) <= 40),
  website text check (char_length(website) <= 300),
  source text not null default 'eudi' check (char_length(source) <= 30),
  status text not null default 'pending' check (status in ('pending', 'imported', 'rejected')),
  created_at timestamptz not null default now()
);
alter table public.business_suggestions enable row level security;
-- No policies on purpose: written by the server (service role) after Turnstile, read in the table editor.
