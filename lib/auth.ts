import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Only same-site relative paths are allowed as post-login targets (prevents open redirects).
export function safeNext(next: unknown, fallback = "/dashboard") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// For protected pages: sends anonymous visitors to the login page and back afterwards.
export async function requireUser(returnTo: string) {
  const user = await getUser();
  if (!user) redirect(`/accedi?next=${encodeURIComponent(returnTo)}`);
  return user;
}
