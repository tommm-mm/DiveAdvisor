-- Moderation: a reason shown to the author when a review is rejected or removed,
-- and a marker so the daily job emails each author only once.
alter table public.reviews
  add column moderation_note text check (char_length(moderation_note) <= 1000),
  add column rejection_notified_at timestamptz;

-- Owners and the public must never see the moderation note through the API (it is for the author's email).
-- Column privileges: keep all existing selectable columns except moderation_note and rejection_notified_at.
revoke select on public.reviews from anon, authenticated;
grant select (id, center_id, user_id, dive_date, status, verified, verification_code_id,
  score_safety, score_equipment, score_briefing, score_group, score_environment, score_value,
  text, owner_reply, owner_reply_at, created_at) on public.reviews to anon, authenticated;
