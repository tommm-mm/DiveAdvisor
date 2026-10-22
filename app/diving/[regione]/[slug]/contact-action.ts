"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendLeadEmail } from "@/lib/email";

export type ContactState = {
  status: "idle" | "sent" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "message" | "privacy", string>>;
  values?: { name: string; email: string; message: string };
};

const schema = z.object({
  centerId: z.uuid(),
  name: z.string().trim().min(2, "Inserisci il tuo nome").max(100, "Massimo 100 caratteri"),
  email: z.email("Inserisci un indirizzo email valido").max(200),
  message: z.string().trim().min(10, "Scrivi almeno 10 caratteri").max(2000, "Massimo 2000 caratteri"),
  privacy: z.literal("on", { error: "Serve il consenso per inviare la richiesta" }),
});

const MAX_PER_HOUR = 5;

export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const values = {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? "").trim(),
    message: String(form.get("message") ?? ""),
  };
  // Honeypot: real users never fill this hidden field.
  if (form.get("website")) return { status: "sent" };

  const parsed = schema.safeParse({ ...values, centerId: form.get("centerId"), privacy: form.get("privacy") ?? undefined });
  if (!parsed.success) {
    const fieldErrors: ContactState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<ContactState["fieldErrors"]>;
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", fieldErrors, values };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstile(String(form.get("cf-turnstile-response") ?? ""), ip))) {
    return { status: "error", message: "Verifica anti-spam non riuscita. Ricarica la pagina e riprova.", values };
  }

  const db = createAdminClient();
  const { data: center } = await db
    .from("dive_centers").select("id, name, email, source").eq("id", parsed.data.centerId).maybeSingle();
  if (!center) return { status: "error", message: "Diving non trovato.", values };

  // Simple abuse limit: a few messages per sender per hour.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from("leads").select("id", { count: "exact", head: true })
    .eq("email", parsed.data.email).gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) {
    return { status: "error", message: "Hai inviato molte richieste. Riprova tra un'ora.", values };
  }

  const { error } = await db.from("leads").insert({
    center_id: center.id, name: parsed.data.name, email: parsed.data.email,
    message: parsed.data.message, channel: "form",
  });
  if (error) return { status: "error", message: "Non siamo riusciti a inviare la richiesta. Riprova.", values };

  await sendLeadEmail({
    centerName: center.name, centerEmail: center.email ?? "", name: parsed.data.name,
    email: parsed.data.email, message: parsed.data.message, isTest: center.name.startsWith("[TEST]"),
  });
  return { status: "sent" };
}
