-- Group invite links: one code for a whole dive group, usable by up to max_uses people (one review each).
-- used_at keeps its meaning "no uses left", so existing checks (used_at is null) stay correct.
alter table public.verification_codes
  add column max_uses smallint not null default 1 check (max_uses between 1 and 30),
  add column use_count smallint not null default 0 check (use_count >= 0);
alter table public.verification_codes
  add constraint verification_codes_uses_cap check (use_count <= max_uses);

-- A code can now back several reviews, but each person only one.
alter table public.reviews drop constraint reviews_verification_code_id_key;
create unique index reviews_code_user_idx on public.reviews (verification_code_id, user_id) where verification_code_id is not null;

create or replace function public.submit_verified_review(
  p_user_id uuid, p_center_id uuid, p_code text, p_dive_date date,
  p_safety smallint, p_equipment smallint, p_briefing smallint,
  p_group smallint, p_environment smallint, p_value smallint, p_text text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_code public.verification_codes%rowtype;
  v_review_id uuid;
begin
  -- Lock the code row so concurrent submissions cannot exceed max_uses.
  select * into v_code from public.verification_codes
    where code = upper(p_code) and center_id = p_center_id
      and used_at is null and use_count < max_uses and expires_at > now()
    for update;
  if v_code.id is null then
    raise exception 'invalid_code';
  end if;
  if exists (select 1 from public.reviews where verification_code_id = v_code.id and user_id = p_user_id) then
    raise exception 'invalid_code';
  end if;

  insert into public.reviews (center_id, user_id, dive_date, status, verified, verification_code_id,
    score_safety, score_equipment, score_briefing, score_group, score_environment, score_value, text)
  values (p_center_id, p_user_id, p_dive_date, 'published', true, v_code.id,
    p_safety, p_equipment, p_briefing, p_group, p_environment, p_value, p_text)
  returning id into v_review_id;

  update public.verification_codes
    set use_count = use_count + 1,
        used_by = p_user_id,
        used_at = case when use_count + 1 >= max_uses then now() else null end
    where id = v_code.id;
  return v_review_id;
end;
$$;
