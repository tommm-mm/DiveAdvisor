-- Photos and video links for centres.
-- Files live in the public Storage bucket "center-photos" under "<center_id>/<file>";
-- rows in public.center_photos give their order (position 0 = cover) and alt text.

-- 1. Bucket: public read (they are shown on public pages), images only, 5 MB max per file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('center-photos', 'center-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Only the centre owner may add, replace or delete files in their centre's folder.
-- The folder name must be a uuid; anything else is rejected before the ownership check.
create function private.owns_photo_folder(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  folder text := (storage.foldername(object_name))[1];
begin
  if folder !~ '^[0-9a-f-]{36}$' then return false; end if;
  return private.is_center_owner(folder::uuid);
end;
$$;
revoke execute on function private.owns_photo_folder(text) from public;
grant execute on function private.owns_photo_folder(text) to authenticated;

create policy "center photos: owner insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'center-photos' and private.owns_photo_folder(name));
create policy "center photos: owner update" on storage.objects
  for update to authenticated using (bucket_id = 'center-photos' and private.owns_photo_folder(name));
create policy "center photos: owner delete" on storage.objects
  for delete to authenticated using (bucket_id = 'center-photos' and private.owns_photo_folder(name));

-- 2. Photo rows: public read, owner manages their centre's rows.
create table public.center_photos (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.dive_centers (id) on delete cascade,
  path text not null unique check (path like center_id::text || '/%'),
  position smallint not null default 0,
  alt text check (char_length(alt) <= 150),
  created_at timestamptz not null default now()
);
create index center_photos_center_idx on public.center_photos (center_id, position);
alter table public.center_photos enable row level security;

create policy "photos: public read" on public.center_photos for select using (true);
create policy "photos: owner insert" on public.center_photos
  for insert with check (private.is_center_owner(center_id));
create policy "photos: owner update" on public.center_photos
  for update using (private.is_center_owner(center_id)) with check (private.is_center_owner(center_id));
create policy "photos: owner delete" on public.center_photos
  for delete using (private.is_center_owner(center_id));

-- At most 8 photos per centre.
create function private.limit_center_photos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.center_photos where center_id = new.center_id) >= 8 then
    raise exception 'too_many_photos' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function private.limit_center_photos() from public, anon, authenticated;
create trigger center_photos_limit before insert on public.center_photos
  for each row execute function private.limit_center_photos();

-- 3. Video links (YouTube / Instagram), at most 3, editable by the owner like the other listing fields.
alter table public.dive_centers
  add column video_urls text[] not null default '{}' check (cardinality(video_urls) <= 3);
grant update (video_urls) on public.dive_centers to authenticated;
