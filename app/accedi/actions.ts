"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; email?: string; field?: "email" | "terms" };

const schema = z.object({
  email: z.email("Inserisci un indirizzo email valido"),
  // Acceptance of terms/privacy and minimum age (14 in Italy), required for every account.
  terms: z.literal("on", { error: "Per continuare accetta i termini e conferma di avere almeno 14 anni" }),
});

export async function sendMagicLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const parsed = schema.safeParse({ email, terms: form.get("terms") ?? undefined });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { status: "error", message: issue.message, email, field: issue.path[0] as "email" | "terms" };
  }

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const next = safeNext(form.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    const rateLimited = error.status === 429;
    return {
      status: "error",
      email: parsed.data.email,
      message: rateLimited ? "Troppi tentativi. Riprova tra qualche minuto." : "Non siamo riusciti a inviare il link. Riprova.",
    };
  }
  return { status: "sent", email: parsed.data.email };
}
