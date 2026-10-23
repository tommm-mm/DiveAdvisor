-- A diver may review the same centre again after a new dive.
-- Verified reviews: unlimited (each one consumes a new code = a real dive).
-- Unverified reviews: at most one per user per centre every 30 days (anti-spam), enforced here
-- so it also holds for inserts made directly through the API.

alter table public.reviews drop constraint reviews_center_id_user_id_key;
create index reviews_center_user_idx on public.reviews (center_id, user_id, created_at desc);

create function private.limit_unverified_reviews()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not new.verified and exists (
    select 1 from public.reviews
    where center_id = new.center_id and user_id = new.user_id
      and verified = false and created_at > now() - interval '30 days'
  ) then
    raise exception 'unverified_too_soon' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function private.limit_unverified_reviews() from public, anon, authenticated;

create trigger reviews_limit_unverified
  before insert on public.reviews
  for each row execute function private.limit_unverified_reviews();
