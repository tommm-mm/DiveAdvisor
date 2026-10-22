-- Sprint 2: claim approval flow and lead status.

-- 1. Leads get a simple status for the owner dashboard (new / replied).
alter table public.leads
  add column status text not null default 'new' check (status in ('new', 'replied'));

-- Owners may mark their own leads as replied (only the status column).
create policy "leads: owner update status" on public.leads
  for update using (private.is_center_owner(center_id)) with check (private.is_center_owner(center_id));
revoke update on public.leads from anon, authenticated;
grant update (status) on public.leads to authenticated;

-- 2. At most one pending claim per user and centre (stops duplicate submissions).
create unique index claim_requests_one_pending_idx
  on public.claim_requests (center_id, user_id) where status = 'pending';

-- 3. When an admin approves a claim (in the Supabase dashboard), hand the centre to the claimant.
--    Runs as definer because the admin edit happens via the service role / table editor,
--    and the claimant has no rights to change dive_centers.owner_id or their own role.
create function private.apply_approved_claim()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.dive_centers
      set owner_id = new.user_id, status = case when status = 'unclaimed' then 'claimed' else status end
      where id = new.center_id;
    update public.profiles
      set role = 'center_owner'
      where id = new.user_id and role = 'diver';
    -- Other pending claims for the same centre are now moot.
    update public.claim_requests
      set status = 'rejected'
      where center_id = new.center_id and id <> new.id and status = 'pending';
  end if;
  return new;
end;
$$;
revoke execute on function private.apply_approved_claim() from public, anon, authenticated;

create trigger claim_requests_apply_approval
  after update of status on public.claim_requests
  for each row execute function private.apply_approved_claim();
