import { createPublicClient } from "@/lib/supabase/public";
import type { Rating, Review } from "@/lib/review-utils";

const REVIEW_COLUMNS =
  "id, dive_date, verified, text, owner_reply, owner_reply_at, created_at, score_safety, score_equipment, score_briefing, score_group, score_environment, score_value";

// Published reviews only (anon client, so RLS hides pending/rejected ones).
export async function getPublishedReviews(centerId: string) {
  const { data, error } = await createPublicClient()
    .from("reviews").select(REVIEW_COLUMNS).eq("center_id", centerId).eq("status", "published")
    .order("verified", { ascending: false }).order("created_at", { ascending: false }).limit(50);
  return { reviews: (data ?? []) as Review[], error: !!error };
}

export async function getRating(centerId: string): Promise<Rating | null> {
  const { data } = await createPublicClient().from("center_ratings").select("*").eq("center_id", centerId).maybeSingle();
  return (data as Rating | null) ?? null;
}


// Ratings for many centres in one query (list pages), keyed by centre id.
export async function getRatings(centerIds: string[]): Promise<Map<string, Rating>> {
  if (!centerIds.length) return new Map();
  const { data } = await createPublicClient().from("center_ratings").select("*").in("center_id", centerIds);
  return new Map(((data ?? []) as (Rating & { center_id: string })[]).map((r) => [r.center_id, r]));
}
