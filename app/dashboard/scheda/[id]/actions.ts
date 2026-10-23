"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { centerPath } from "@/lib/centers";
import { DIVE_TYPE_LABELS, FEDERATIONS, LANGUAGE_LABELS, SERVICE_LABELS } from "@/lib/labels";

export type EditState = {
  status: "idle" | "saved" | "error"; message?: string; fieldErrors?: Record<string, string>;
  // Echo of what was submitted: React resets the form after an action, so the form refills from this.
  values?: Record<string, string | string[]>;
};

const optional = (max: number) => z.string().trim().max(max, `Massimo ${max} caratteri`).transform((v) => v || null);
const oneOf = (allowed: string[]) => z.array(z.string()).transform((vs) => vs.filter((v) => allowed.includes(v)));

const schema = z.object({
  id: z.uuid(),
  description: optional(1500),
  address: optional(200),
  phone: optional(40),
  whatsapp: optional(40),
  email: z.union([z.literal(""), z.email("Email non valida")]).transform((v) => v || null),
  website: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Inserisci un indirizzo che inizia con https://" })]).transform((v) => v || null),
  instagram: optional(100),
  season: optional(100),
  federations: oneOf(FEDERATIONS),
  dive_types: oneOf(Object.keys(DIVE_TYPE_LABELS)),
  services: oneOf(Object.keys(SERVICE_LABELS)),
  languages: oneOf(Object.keys(LANGUAGE_LABELS)),
});

// RLS ("centers: owner update") and the column grant restrict this to the owner and to these fields.
export async function updateCenter(_prev: EditState, form: FormData): Promise<EditState> {
  const text = (k: string) => String(form.get(k) ?? "");
  const lists = (k: string) => form.getAll(k).map(String);
  const values = {
    description: text("description"), address: text("address"), phone: text("phone"), whatsapp: text("whatsapp"),
    email: text("email").trim(), website: text("website").trim(), instagram: text("instagram"), season: text("season"),
    federations: lists("federations"), dive_types: lists("dive_types"), services: lists("services"), languages: lists("languages"),
  };
  const parsed = schema.safeParse({ id: form.get("id"), ...values });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", fieldErrors, values };
  }
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.from("dive_centers").update(fields).eq("id", id).select("slug, region").maybeSingle();
  if (error || !data) return { status: "error", message: "Non siamo riusciti a salvare. Riprova.", values };
  revalidatePath(centerPath(data));
  revalidatePath("/dashboard");
  return { status: "saved", values };
}
