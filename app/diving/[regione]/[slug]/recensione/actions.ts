"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendModerationEmail, sendNewReviewEmail } from "@/lib/email";
import { centerPath } from "@/lib/centers";
import { CRITERIA, normalizeCode, type CriterionKey } from "@/lib/review-utils";

type Field = CriterionKey | "diveDate" | "text" | "code";

export type ReviewState = {
  status: "idle" | "published" | "pending" | "error";
  message?: string;
  fieldErrors?: Partial<Record<Field, string>>;
  values?: Partial<Record<Field, string>>;
};

const score = z.coerce.number({ error: "Scegli un voto da 1 a 5" }).int().min(1, "Scegli un voto da 1 a 5").max(5, "Scegli un voto da 1 a 5");

const today = () => new Date().toISOString().slice(0, 10);
const oneYearAgo = () => new Date(Date.now() - 366 * 86400_000).toISOString().slice(0, 10);

const schema = z.object({
  centerId: z.uuid(),
  safety: score, equipment: score, briefing: score, group: score, environment: score, value: score,
  diveDate: z.iso.date({ error: "Inserisci la data dell'immersione" })
    .refine((d) => d <= today(), "La data non può essere nel futuro")
    .refine((d) => d >= oneYearAgo(), "L'immersione deve essere degli ultimi 12 mesi"),
  text: z.string().trim().min(40, "Scrivi almeno 40 caratteri").max(2000, "Massimo 2000 caratteri"),
  code: z.string().transform(normalizeCode)
    .refine((c) => c === "" || c.length === 8, "Il codice ha 8 caratteri, ad esempio K7MQ-3XPA"),
});

export async function submitReview(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  const fields: Field[] = [...CRITERIA.map((c) => c.key), "diveDate", "text", "code"];
  const values = Object.fromEntries(fields.map((f) => [f, String(form.get(f) ?? "")])) as Record<Field, string>;

  const user = await getUser();
  if (!user) return { status: "error", message: "Accedi per scrivere una recensione.", values };

  const parsed = schema.safeParse({ ...values, centerId: form.get("centerId") });
  if (!parsed.success) {
    const fieldErrors: ReviewState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as Field] ??= issue.message;
    return { status: "error", fieldErrors, values };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstile(String(form.get("cf-turnstile-response") ?? ""), ip))) {
    return { status: "error", message: "Verifica anti-spam non riuscita. Ricarica la pagina e riprova.", values };
  }

  const d = parsed.data;
  const admin = createAdminClient();
  const { data: center } = await admin
    .from("dive_centers").select("id, slug, name, region, email, owner_id").eq("id", d.centerId).maybeSingle();
  if (!center) return { status: "error", message: "Diving non trovato.", values };
  if (center.owner_id === user.id) {
    return { status: "error", message: "Non puoi recensire un diving che gestisci.", values };
  }

  const isTest = center.name.startsWith("[TEST]");
  const duplicate = { status: "error" as const, message: "Hai già scritto una recensione per questo diving.", values };

  if (d.code) {
    // Code check, review insert and code redemption happen in one DB transaction.
    const { error } = await admin.rpc("submit_verified_review", {
      p_user_id: user.id, p_center_id: center.id, p_code: d.code, p_dive_date: d.diveDate,
      p_safety: d.safety, p_equipment: d.equipment, p_briefing: d.briefing,
      p_group: d.group, p_environment: d.environment, p_value: d.value, p_text: d.text,
    });
    if (error?.message.includes("invalid_code")) {
      return {
        status: "error", values,
        fieldErrors: { code: "Codice non valido, già usato o scaduto. Controllalo o lascia il campo vuoto." },
      };
    }
    if (error?.code === "23505") return duplicate;
    if (error) return { status: "error", message: "Non siamo riusciti a salvare la recensione. Riprova.", values };

    revalidatePath(centerPath(center));
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? h.get("origin") ?? "";
    await sendNewReviewEmail({ centerName: center.name, centerEmail: center.email, isTest, url: `${site}/dashboard`, text: d.text });
    return { status: "published" };
  }

  // No code: insert as the user (RLS only allows pending, unverified reviews), then moderation.
  const supabase = await createClient();
  const { data: review, error } = await supabase.from("reviews").insert({
    center_id: center.id, user_id: user.id, dive_date: d.diveDate, text: d.text,
    score_safety: d.safety, score_equipment: d.equipment, score_briefing: d.briefing,
    score_group: d.group, score_environment: d.environment, score_value: d.value,
  }).select("id").single();
  if (error?.code === "23505") return duplicate;
  if (error || !review) return { status: "error", message: "Non siamo riusciti a salvare la recensione. Riprova.", values };

  await sendModerationEmail({ centerName: center.name, reviewId: review.id, text: d.text });
  return { status: "pending" };
}
