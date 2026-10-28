-- Team can hide a listing (e.g. closed business, duplicate) without deleting it or its reviews.
-- Hidden listings disappear from every public query through RLS; the owner still sees their own.
alter table public.dive_centers add column hidden boolean not null default false;

drop policy "centers: public read" on public.dive_centers;
create policy "centers: public read" on public.dive_centers
  for select using (not hidden or owner_id = (select auth.uid()));

-- Owners cannot change visibility: only the service role (admin area) writes this column.
revoke update (hidden) on public.dive_centers from anon, authenticated;
