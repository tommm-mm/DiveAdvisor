"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendSuggestionEmail } from "@/lib/email";
import { BUSINESS_TYPE_LABELS } from "@/lib/labels";
import { REGIONS } from "@/lib/regions";
import { geocode } from "@/lib/geocode";

type Field = "name" | "region" | "city" | "address" | "email" | "phone" | "website" | "types";
export type SuggestState = { status: "idle" | "sent" | "error"; message?: string; fieldErrors?: Partial<Record<Field, string>>; values?: Partial<Record<Field, string>> };

const schema = z.object({
  name: z.string().trim().min(2, "Indica il nome dell'attività").max(200),
  region: z.enum(REGIONS, { error: "Scegli la regione" }),
  city: z.string().trim().min(2, "Indica la città").max(100),
  address: z.string().trim().max(200).transform((v) => v || null),
  email: z.email("Inserisci un indirizzo email valido").max(200),
  phone: z.string().trim().max(40).transform((v) => v || null),
  website: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Il sito deve iniziare con https://" })]).transform((v) => v || null),
  types: z.array(z.enum(Object.keys(BUSINESS_TYPE_LABELS) as [string, ...string[]])).min(1, "Scegli almeno un tipo di attività"),
});

// Saved for manual review (service role; table has no public access), then the team is emailed.
export async function suggestBusiness(_prev: SuggestState, form: FormData): Promise<SuggestState> {
  const values = {
    name: String(form.get("name") ?? ""), region: String(form.get("region") ?? ""), city: String(form.get("city") ?? ""),
    address: String(form.get("address") ?? ""), email: String(form.get("email") ?? "").trim(),
    phone: String(form.get("phone") ?? ""), website: String(form.get("website") ?? "").trim(),
  };
  if (form.get("company")) return { status: "sent" }; // honeypot
  const parsed = schema.safeParse({ ...values, types: form.getAll("types").map(String) });
  if (!parsed.success) {
    const fieldErrors: SuggestState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as Field] ??= issue.message;
    return { status: "error", fieldErrors, values };
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstile(String(form.get("cf-turnstile-response") ?? ""), ip))) {
    return { status: "error", message: "Verifica anti-spam non riuscita. Ricarica la pagina e riprova.", values };
  }
  const d = parsed.data;
  // Coordinates now, so an approved listing gets its map pin without extra work.
  const point = (d.address && (await geocode(`${d.address}, ${d.city}`))) || (await geocode(`${d.city}, ${d.region}`));
  const source = String(form.get("source") ?? "sito").slice(0, 30);
  const { error } = await createAdminClient().from("business_suggestions").insert({
    name: d.name, region: d.region, city: d.city, address: d.address, lat: point?.lat ?? null, lng: point?.lng ?? null,
    contact_email: d.email, phone: d.phone, website: d.website, business_types: d.types, source,
  });
  if (error) return { status: "error", message: "Non siamo riusciti a inviare la richiesta. Riprova.", values };
  await sendSuggestionEmail({ name: d.name, city: `${d.city} (${d.region})`, email: d.email, phone: d.phone, website: d.website, types: d.types });
  return { status: "sent" };
}
