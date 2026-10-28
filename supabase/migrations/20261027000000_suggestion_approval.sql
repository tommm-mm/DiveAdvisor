-- One-click approval of "Aggiungi la tua attività" requests: setting status = 'approved' in the
-- table editor creates the (unclaimed) listing. The daily job then emails the requester once.
alter table public.business_suggestions
  add column address text check (char_length(address) <= 200),
  add column lat double precision,
  add column lng double precision,
  add column center_id uuid references public.dive_centers (id) on delete set null,
  add column notified_at timestamptz;
alter table public.business_suggestions drop constraint business_suggestions_status_check;
alter table public.business_suggestions
  add constraint business_suggestions_status_check check (status in ('pending', 'approved', 'imported', 'rejected'));

create function private.approve_business_suggestion()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  base text;
  candidate text;
  n int := 1;
  new_id uuid;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' and new.center_id is null then
    if new.region is null then
      raise exception 'Imposta la regione prima di approvare';
    end if;
    -- Same slug rule as the seed script: name + city, lower case, accents stripped, dashes.
    base := trim(both '-' from regexp_replace(
      translate(lower(new.name || ' ' || new.city), 'àáâäèéêëìíîïòóôöùúûüç''', 'aaaaeeeeiiiioooouuuuc '),
      '[^a-z0-9]+', '-', 'g'));
    candidate := base;
    while exists (select 1 from public.dive_centers where slug = candidate) loop
      n := n + 1;
      candidate := base || '-' || n;
    end loop;
    insert into public.dive_centers (slug, name, region, city, address, lat, lng, email, phone, website,
      business_types, verified_at, source)
    values (candidate, new.name, new.region, new.city, new.address, new.lat, new.lng, new.contact_email,
      new.phone, new.website, new.business_types, current_date, 'owner')
    returning id into new_id;
    new.center_id := new_id;
  end if;
  return new;
end;
$$;
revoke execute on function private.approve_business_suggestion() from public, anon, authenticated;
create trigger business_suggestions_approve
  before update of status on public.business_suggestions
  for each row execute function private.approve_business_suggestion();
