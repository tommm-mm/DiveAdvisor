"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ClaimState = { status: "idle" | "sent" | "error"; message?: string; evidence?: string };

const schema = z.object({
  centerId: z.uuid(),
  evidence: z.string().trim()
    .min(20, "Scrivi almeno 20 caratteri: chi sei e come possiamo verificarlo")
    .max(2000, "Massimo 2000 caratteri"),
});

export async function submitClaim(_prev: ClaimState, form: FormData): Promise<ClaimState> {
  const evidence = String(form.get("evidence") ?? "");
  const parsed = schema.safeParse({ centerId: form.get("centerId"), evidence });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message, evidence };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Accedi per inviare la richiesta.", evidence };

  // RLS only allows inserting a pending claim for yourself.
  const { error } = await supabase.from("claim_requests").insert({
    center_id: parsed.data.centerId, user_id: user.id, evidence: parsed.data.evidence,
  });
  if (error?.code === "23505") return { status: "sent" }; // already pending: same outcome for the user
  if (error) return { status: "error", message: "Non siamo riusciti a inviare la richiesta. Riprova.", evidence };
  return { status: "sent" };
}
