import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ centerId: z.uuid(), channel: z.enum(["whatsapp", "phone"]) });

// Logs a click on a centre's WhatsApp or phone link as a lead (no personal data stored).
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const { error } = await createAdminClient().from("leads").insert({
    center_id: parsed.data.centerId, channel: parsed.data.channel,
  });
  return new NextResponse(null, { status: error ? 500 : 204 });
}
