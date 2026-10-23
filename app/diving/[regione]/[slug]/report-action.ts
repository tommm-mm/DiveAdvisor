"use server";

import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendReportEmail } from "@/lib/email";

export type ReportState = { status: "idle" | "sent" | "error"; message?: string; needsLogin?: boolean };

const schema = z.object({
  reviewId: z.uuid(),
  reason: z.string().trim().min(5, "Spiega il motivo in almeno 5 caratteri").max(1000, "Massimo 1000 caratteri"),
});

export async function reportReview(_prev: ReportState, form: FormData): Promise<ReportState> {
  const user = await getUser();
  if (!user) return { status: "error", message: "Accedi per segnalare una recensione.", needsLogin: true };

  const parsed = schema.safeParse({ reviewId: form.get("reviewId"), reason: form.get("reason") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  // RLS: users may only insert reports in their own name; one report per user per review.
  const supabase = await createClient();
  const { error } = await supabase.from("review_reports")
    .insert({ review_id: parsed.data.reviewId, reporter_id: user.id, reason: parsed.data.reason });
  if (error?.code === "23505") return { status: "sent" };
  if (error) return { status: "error", message: "Non siamo riusciti a inviare la segnalazione. Riprova." };

  await sendReportEmail({ reviewId: parsed.data.reviewId, reason: parsed.data.reason });
  return { status: "sent" };
}
