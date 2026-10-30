-- What a diver can do with the centre: certification levels / depths served, specialties and prices.
-- Levels double as depth bands: ow 18 m, aow 30 m, deep 40 m, tech1 45 m, tech2 60 m, tech3 over 60 m.
alter table public.dive_centers
  add column levels text[] not null default '{}'
    check (levels <@ array['ow', 'aow', 'deep', 'tech1', 'tech2', 'tech3']),
  add column specialties text[] not null default '{}'
    check (specialties <@ array['nitrox', 'trimix', 'ccr', 'sidemount', 'dpv', 'notturna', 'relitti', 'grotte']),
  -- Indicative prices in euro, with where they come from and when they were checked.
  add column price_dive numeric(7, 2) check (price_dive between 0 and 10000),
  add column price_pack numeric(7, 2) check (price_pack between 0 and 10000),
  add column price_pack_dives smallint check (price_pack_dives between 2 and 100),
  add column price_rental numeric(7, 2) check (price_rental between 0 and 10000),
  add column price_course_ow numeric(7, 2) check (price_course_ow between 0 and 10000),
  add column price_course_aow numeric(7, 2) check (price_course_aow between 0 and 10000),
  add column prices_source text check (prices_source in ('sito', 'diving')),
  add column prices_updated_at date;

create index dive_centers_levels_idx on public.dive_centers using gin (levels);
create index dive_centers_specialties_idx on public.dive_centers using gin (specialties);

-- Nitrox and trimix move from services to specialties (all technical filters in one place).
update public.dive_centers set
  specialties = array(select s from unnest(services) s where s in ('nitrox', 'trimix')),
  services = array(select s from unnest(services) s where s not in ('nitrox', 'trimix'))
where services && array['nitrox', 'trimix'];

-- Owners edit these on their claimed listing (RLS "centers: owner update" still applies).
grant update (levels, specialties, price_dive, price_pack, price_pack_dives, price_rental,
  price_course_ow, price_course_aow, prices_source, prices_updated_at) on public.dive_centers to authenticated;
