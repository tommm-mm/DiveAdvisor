import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// Counts one listing view per visit (the beacon dedupes per browser tab). Stores only
// (centre, day, count): no cookies, no IP, no user agent.
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse/i;

export async function POST(request: NextRequest) {
  if (BOT.test(request.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  const parsed = z.object({ centerId: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  await createAdminClient().rpc("increment_center_view", { p_center_id: parsed.data.centerId });
  return new NextResponse(null, { status: 204 });
}
