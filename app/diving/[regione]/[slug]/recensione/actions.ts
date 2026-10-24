"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendReviewConfirmEmail } from "@/lib/email";
import { CRITERIA, normalizeCode, type CriterionKey } from "@/lib/review-utils";
import { SAVE_ERRORS, saveReview } from "@/lib/review-save";

type Field = CriterionKey | "diveDate" | "text" | "code" | "rules" | "email";

export type ReviewState = {
  status: "idle" | "published" | "pending" | "confirm" | "error";
  email?: string;
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
  rules: z.literal("on", { error: "Conferma che la recensione rispetta le regole" }),
});

export async function submitReview(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  const fields: Field[] = [...CRITERIA.map((c) => c.key), "diveDate", "text", "code", "rules", "email"];
  const values = Object.fromEntries(fields.map((f) => [f, String(form.get(f) ?? "")])) as Record<Field, string>;

  const user = await getUser();

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
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? h.get("origin") ?? "";

  if (user) {
    const result = await saveReview(user.id, d, site);
    if (result.ok) return { status: result.status };
    return result.reason === "invalid_code"
      ? { status: "error", values, fieldErrors: { code: SAVE_ERRORS.invalid_code } }
      : { status: "error", values, message: SAVE_ERRORS[result.reason] };
  }

  // Not logged in: keep the review as a draft and email a confirmation link (48 h).
  const email = z.email("Inserisci un indirizzo email valido").max(200).safeParse(values.email);
  if (!email.success) return { status: "error", values, fieldErrors: { email: email.error.issues[0].message } };
  const admin = createAdminClient();
  if (d.code) {
    // Tell about a wrong code now, not after the email round trip.
    const { data: valid } = await admin.from("verification_codes").select("id")
      .eq("code", d.code).eq("center_id", d.centerId).is("used_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (!valid) return { status: "error", values, fieldErrors: { code: SAVE_ERRORS.invalid_code } };
  }
  const { data: center } = await admin.from("dive_centers").select("name").eq("id", d.centerId).maybeSingle();
  if (!center) return { status: "error", values, message: SAVE_ERRORS.not_found };

  const token = randomBytes(32).toString("base64url");
  const { error } = await admin.from("review_drafts").insert({
    token_hash: createHash("sha256").update(token).digest("hex"), email: email.data, center_id: d.centerId, payload: d,
  });
  if (error) return { status: "error", values, message: SAVE_ERRORS.failed };
  await sendReviewConfirmEmail({ to: email.data, centerName: center.name, url: `${site}/recensione/conferma?token=${token}` });
  return { status: "confirm", email: email.data };
}
