"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveReview, SAVE_ERRORS, type ReviewInput } from "@/lib/review-save";

export type ConfirmState = { status: "idle" | "published" | "pending" | "error"; message?: string };

// Turns a draft into a review: finds or creates the account for the email, then the normal save rules apply.
export async function confirmReview(_prev: ConfirmState, form: FormData): Promise<ConfirmState> {
  const token = String(form.get("token") ?? "");
  const admin = createAdminClient();
  const { data: draft } = await admin.from("review_drafts").select("id, email, payload")
    .eq("token_hash", createHash("sha256").update(token).digest("hex"))
    .gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!draft) return { status: "error", message: "Link scaduto o già usato. Scrivi di nuovo la recensione." };

  let { data: userId } = await admin.rpc("user_id_by_email", { p_email: draft.email });
  if (!userId) {
    const { data: created, error } = await admin.auth.admin.createUser({ email: draft.email, email_confirm: true });
    if (error || !created.user) return { status: "error", message: SAVE_ERRORS.failed };
    userId = created.user.id;
  }

  const h = await headers();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  let result = await saveReview(userId as string, draft.payload as ReviewInput, site);
  // The code was valid when written but got used meanwhile: keep the review, as unverified.
  if (!result.ok && result.reason === "invalid_code") {
    result = await saveReview(userId as string, { ...(draft.payload as ReviewInput), code: "" }, site);
  }
  if (!result.ok) return { status: "error", message: SAVE_ERRORS[result.reason] };
  await admin.from("review_drafts").delete().eq("id", draft.id);
  return { status: result.status };
}
