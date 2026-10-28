import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";

// Team accounts allowed into /admin, from ADMIN_LOGIN_EMAILS (comma-separated, server only).
export function isAdminEmail(email: string | undefined | null) {
  const allowed = (process.env.ADMIN_LOGIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!email && allowed.includes(email.toLowerCase());
}

// For admin pages and actions: anonymous visitors go to login, other users get a 404 (the area stays invisible).
export async function requireAdmin(returnTo = "/admin") {
  const user = await requireUser(returnTo);
  if (!isAdminEmail(user.email)) notFound();
  return user;
}
