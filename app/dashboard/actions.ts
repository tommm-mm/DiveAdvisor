"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// RLS limits this to leads of centres the user owns; the column grant limits it to `status`.
export async function setLeadStatus(form: FormData) {
  const parsed = z.object({ id: z.uuid(), status: z.enum(["new", "replied"]) })
    .safeParse({ id: form.get("id"), status: form.get("status") });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("leads").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  revalidatePath("/dashboard");
}
