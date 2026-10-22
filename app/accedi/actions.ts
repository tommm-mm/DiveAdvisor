"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

const schema = z.object({ email: z.email("Inserisci un indirizzo email valido") });

export async function sendMagicLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: String(form.get("email") ?? "").trim() });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

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
