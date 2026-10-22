-- Fix security advisor warnings 0028/0029: SECURITY DEFINER functions in `public`
-- are callable through the REST API (/rest/v1/rpc/...).

-- 1. handle_new_user is only meant to run as a trigger: nobody should call it directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 2. Move is_center_owner to a private schema that the API does not expose.
--    Policies can still call it; visitors cannot call it as an endpoint.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_center_owner(c_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dive_centers where id = c_id and owner_id = (select auth.uid())
  );
$$;
revoke execute on function private.is_center_owner(uuid) from public;
grant execute on function private.is_center_owner(uuid) to anon, authenticated;

alter policy "codes: owner read" on public.verification_codes
  using (private.is_center_owner(center_id));
alter policy "codes: owner insert" on public.verification_codes
  with check (private.is_center_owner(center_id) and used_at is null and used_by is null);
alter policy "leads: owner read" on public.leads
  using (private.is_center_owner(center_id));

-- The old public copy is no longer used by any policy; nobody may call it.
revoke execute on function public.is_center_owner(uuid) from public, anon, authenticated;
