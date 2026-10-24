-- 1. Activity types: a business can be a dive centre, a school and/or a shop at once.
alter table public.dive_centers
  add column business_types text[] not null default '{diving}'
  check (cardinality(business_types) between 1 and 3 and business_types <@ array['diving', 'scuola', 'negozio']);
create index dive_centers_business_types_idx on public.dive_centers using gin (business_types);
grant update (business_types) on public.dive_centers to authenticated;

-- 2. Printed code cards last a season: owners may set a longer expiry, capped at 1 year.
alter table public.verification_codes
  add constraint verification_codes_expiry_cap check (expires_at <= created_at + interval '366 days');
