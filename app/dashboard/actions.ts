"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";
import { centerPath } from "@/lib/centers";
import { generateCode } from "@/lib/codes";

// RLS limits this to leads of centres the user owns; the column grant limits it to `status`.
export async function setLeadStatus(form: FormData) {
  const parsed = z.object({ id: z.uuid(), status: z.enum(["new", "replied"]) })
    .safeParse({ id: form.get("id"), status: form.get("status") });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("leads").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  revalidatePath("/dashboard");
}

// RLS ("codes: owner insert") limits this to centres the user owns.
export async function createVerificationCode(form: FormData) {
  const parsed = z.uuid().safeParse(form.get("centerId"));
  if (!parsed.success) return;
  const supabase = await createClient();
  // Codes are unique: on the (very unlikely) collision, try again with a new one.
  for (let i = 0; i < 3; i++) {
    const { error } = await supabase.from("verification_codes").insert({ center_id: parsed.data, code: generateCode() });
    if (error?.code !== "23505") break;
  }
  revalidatePath("/dashboard");
}

// Owners cannot update reviews through RLS, so the reply goes through the service role
// after checking ownership; only owner_reply / owner_reply_at are ever written.
export async function saveOwnerReply(form: FormData) {
  const parsed = z.object({
    reviewId: z.uuid(),
    reply: z.string().trim().max(1000),
  }).safeParse({ reviewId: form.get("reviewId"), reply: form.get("reply") });
  if (!parsed.success) return;

  const user = await getUser();
  if (!user) return;
  const admin = createAdminClient();
  const { data: review } = await admin
    .from("reviews").select("id, dive_centers!inner(slug, region, owner_id)").eq("id", parsed.data.reviewId).maybeSingle();
  const center = review?.dive_centers as unknown as { slug: string; region: string; owner_id: string | null } | undefined;
  if (!center || center.owner_id !== user.id) return;

  const reply = parsed.data.reply || null;
  await admin.from("reviews")
    .update({ owner_reply: reply, owner_reply_at: reply ? new Date().toISOString() : null })
    .eq("id", parsed.data.reviewId);
  revalidatePath("/dashboard");
  revalidatePath(centerPath(center));
}

// Printable code cards: 8 single-use codes valid for a season (6 months), then the print page.
// RLS ("codes: owner insert") limits this to the owner; the DB caps expiry at one year.
export async function createCodeCards(form: FormData) {
  const parsed = z.uuid().safeParse(form.get("centerId"));
  if (!parsed.success) return;
  const supabase = await createClient();
  const batchStart = new Date(Date.now() - 1000).toISOString();
  const expires = new Date(Date.now() + 180 * 86400_000).toISOString();
  const rows = Array.from({ length: 8 }, () => ({ center_id: parsed.data, code: generateCode(), expires_at: expires }));
  const { error } = await supabase.from("verification_codes").insert(rows);
  if (error) return;
  revalidatePath("/dashboard");
  redirect(`/dashboard/card/${parsed.data}?da=${encodeURIComponent(batchStart)}`);
}

export type InviteResult = { ok: true; url: string; message: string; uses: number } | { ok: false; error: string };

// Review invite to send on WhatsApp: one person (30 days) or a whole dive group with one link (7 days,
// up to `uses` reviews, one per person). RLS limits creation to the owner.
export async function createInvite(centerId: string, uses: number): Promise<InviteResult> {
  const parsed = z.object({ centerId: z.uuid(), uses: z.number().int().min(1).max(20) }).safeParse({ centerId, uses });
  if (!parsed.success) return { ok: false, error: "Richiesta non valida." };
  const supabase = await createClient();
  const { data: center } = await supabase.from("dive_centers").select("name, slug, region").eq("id", centerId).maybeSingle();
  if (!center) return { ok: false, error: "Diving non trovato." };
  const days = uses > 1 ? 7 : 30;
  const code = generateCode();
  const { error } = await supabase.from("verification_codes").insert({
    center_id: centerId, code, max_uses: uses, expires_at: new Date(Date.now() + days * 86400_000).toISOString(),
  });
  if (error) return { ok: false, error: "Non siamo riusciti a creare l'invito. Riprova." };
  revalidatePath("/dashboard");

  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}${centerPath(center)}/recensione?codice=${code.slice(0, 4)}-${code.slice(4)}`;
  const message = uses > 1
    ? `Grazie a tutti per l'immersione con ${center.name}! Se vi va, lasciateci una recensione: bastano 2 minuti e ci aiuta tantissimo. Il link vale per ognuno di voi: ${url}`
    : `Grazie per l'immersione con ${center.name}! Se ti va, lasciaci una recensione: bastano 2 minuti. ${url}`;
  return { ok: true, url, message, uses };
}
