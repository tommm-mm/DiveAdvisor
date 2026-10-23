import type { BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";

// Test-only users (password login, created by hand in Supabase; see docs/DEVLOG.md).
export const E2E_OWNER = "e2e-owner@diveadvisor.test"; // owns [TEST] Verbano Tech Prova
export const E2E_DIVER = "e2e-diver@diveadvisor.test";
export const hasE2E = () => !!process.env.E2E_PASSWORD;

// Signs in with the Supabase client and copies the resulting auth cookies into the browser context,
// so tests skip the magic-link email.
export async function signIn(context: BrowserContext, email: string, baseURL: string) {
  const jar: { name: string; value: string }[] = [];
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => jar, setAll: (toSet) => toSet.forEach(({ name, value }) => jar.push({ name, value })) },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password: process.env.E2E_PASSWORD! });
  if (error) throw error;
  await context.clearCookies();
  await context.addCookies(jar.map((c) => ({ ...c, url: baseURL })));
}
