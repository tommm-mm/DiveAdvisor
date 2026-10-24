import "server-only";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendModerationEmail, sendNewReviewEmail } from "@/lib/email";
import { centerPath } from "@/lib/centers";

export type ReviewInput = {
  centerId: string; diveDate: string; text: string; code: string;
  safety: number; equipment: number; briefing: number; group: number; environment: number; value: number;
};

export type SaveResult =
  | { ok: true; status: "published" | "pending" }
  | { ok: false; reason: "not_found" | "own_centre" | "invalid_code" | "too_soon" | "failed" };

// Single place where a validated review is stored, for logged-in users and for confirmed drafts alike.
// With a code: verified + published (atomic code redemption). Without: pending moderation
// (a DB trigger allows one unverified review per user and centre every 30 days).
export async function saveReview(userId: string, d: ReviewInput, site: string): Promise<SaveResult> {
  const admin = createAdminClient();
  const { data: center } = await admin
    .from("dive_centers").select("id, slug, name, region, email, owner_id").eq("id", d.centerId).maybeSingle();
  if (!center) return { ok: false, reason: "not_found" };
  if (center.owner_id === userId) return { ok: false, reason: "own_centre" };
  const isTest = center.name.startsWith("[TEST]");

  if (d.code) {
    const { error } = await admin.rpc("submit_verified_review", {
      p_user_id: userId, p_center_id: center.id, p_code: d.code, p_dive_date: d.diveDate,
      p_safety: d.safety, p_equipment: d.equipment, p_briefing: d.briefing,
      p_group: d.group, p_environment: d.environment, p_value: d.value, p_text: d.text,
    });
    if (error?.message.includes("invalid_code")) return { ok: false, reason: "invalid_code" };
    if (error) return { ok: false, reason: "failed" };
    revalidatePath(centerPath(center));
    await sendNewReviewEmail({ centerName: center.name, centerEmail: center.email, isTest, url: `${site}/dashboard`, text: d.text });
    return { ok: true, status: "published" };
  }

  const { data: review, error } = await admin.from("reviews").insert({
    center_id: center.id, user_id: userId, dive_date: d.diveDate, text: d.text, status: "pending", verified: false,
    score_safety: d.safety, score_equipment: d.equipment, score_briefing: d.briefing,
    score_group: d.group, score_environment: d.environment, score_value: d.value,
  }).select("id").single();
  if (error?.message.includes("unverified_too_soon")) return { ok: false, reason: "too_soon" };
  if (error || !review) return { ok: false, reason: "failed" };
  await sendModerationEmail({ centerName: center.name, reviewId: review.id, text: d.text });
  return { ok: true, status: "pending" };
}

export const SAVE_ERRORS: Record<Exclude<SaveResult, { ok: true }>["reason"], string> = {
  not_found: "Diving non trovato.",
  own_centre: "Non puoi recensire un diving che gestisci.",
  invalid_code: "Codice non valido, già usato o scaduto. Controllalo o lascia il campo vuoto.",
  too_soon: "Hai già inviato una recensione senza codice per questo diving negli ultimi 30 giorni. Per una nuova immersione chiedi un codice al diving.",
  failed: "Non siamo riusciti a salvare la recensione. Riprova.",
};
