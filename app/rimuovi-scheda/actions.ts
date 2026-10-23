"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendRemovalEmail } from "@/lib/email";

type Field = "centerName" | "name" | "email" | "role" | "reason";
export type RemovalState = { status: "idle" | "sent" | "error"; message?: string; fieldErrors?: Partial<Record<Field, string>>; values?: Partial<Record<Field, string>> };

const schema = z.object({
  centerSlug: z.string().max(200).optional(),
  centerName: z.string().trim().min(2, "Indica il nome del diving").max(200),
  name: z.string().trim().min(2, "Inserisci il tuo nome").max(100),
  email: z.email("Inserisci un indirizzo email valido").max(200),
  role: z.string().trim().min(2, "Indica il tuo ruolo (es. titolare)").max(100),
  reason: z.string().trim().max(2000, "Massimo 2000 caratteri"),
});

// Stores the request (service role; the table has no public access) and alerts the team by email.
export async function requestRemoval(_prev: RemovalState, form: FormData): Promise<RemovalState> {
  const fields: Field[] = ["centerName", "name", "email", "role", "reason"];
  const values = Object.fromEntries(fields.map((f) => [f, String(form.get(f) ?? "").trim()])) as Record<Field, string>;
  if (form.get("website")) return { status: "sent" }; // honeypot

  const parsed = schema.safeParse({ ...values, centerSlug: String(form.get("centerSlug") ?? "") || undefined });
  if (!parsed.success) {
    const fieldErrors: RemovalState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as Field] ??= issue.message;
    return { status: "error", fieldErrors, values };
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstile(String(form.get("cf-turnstile-response") ?? ""), ip))) {
    return { status: "error", message: "Verifica anti-spam non riuscita. Ricarica la pagina e riprova.", values };
  }

  const d = parsed.data;
  const db = createAdminClient();
  const { data: center } = d.centerSlug
    ? await db.from("dive_centers").select("id").eq("slug", d.centerSlug).maybeSingle()
    : { data: null };
  const { error } = await db.from("removal_requests").insert({
    center_id: center?.id ?? null, center_name: d.centerName, requester_name: d.name,
    requester_email: d.email, role: d.role, reason: d.reason || null,
  });
  if (error) return { status: "error", message: "Non siamo riusciti a inviare la richiesta. Riprova.", values };

  await sendRemovalEmail({ centerName: d.centerName, name: d.name, email: d.email, role: d.role, reason: d.reason });
  return { status: "sent" };
}
