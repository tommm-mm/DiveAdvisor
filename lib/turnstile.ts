import "server-only";

// Cloudflare's documented test keys: always pass. Used only outside production when no keys are set.
const TEST_SITE_KEY = "1x00000000000000000000AA";
const TEST_SECRET = "1x0000000000000000000000000000000AA";
const isProduction = process.env.VERCEL_ENV === "production";

export const turnstileSiteKey = () =>
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || (isProduction ? "" : TEST_SITE_KEY);

export async function verifyTurnstile(token: string, ip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY || (isProduction ? "" : TEST_SECRET);
  if (!secret || !token) return false; // fail closed
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
