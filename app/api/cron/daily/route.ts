import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReviewRejectedEmail } from "@/lib/email";

// Daily housekeeping, run by Vercel Cron (vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
// 1. Retention: delete messages to centres older than 24 months (promised in /privacy).
// 2. Moderation: email authors whose review was rejected, once, with the moderator's note (promised in /termini).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const db = createAdminClient();

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 24);
  const { count: deletedLeads, error: leadsError } = await db
    .from("leads").delete({ count: "exact" }).lt("created_at", cutoff.toISOString());

  // Unconfirmed review drafts expire after 48 hours.
  await db.from("review_drafts").delete().lt("expires_at", new Date().toISOString());

  const { data: rejected, error: rejError } = await db
    .from("reviews").select("id, user_id, moderation_note, dive_centers(name)")
    .eq("status", "rejected").is("rejection_notified_at", null).limit(50);

  let notified = 0;
  for (const r of rejected ?? []) {
    const { data: user } = await db.auth.admin.getUserById(r.user_id);
    const centerName = (r.dive_centers as unknown as { name: string } | null)?.name ?? "il diving";
    const sent = user.user?.email
      ? await sendReviewRejectedEmail({ to: user.user.email, centerName, note: r.moderation_note })
      : false;
    // Mark as handled even without an email address, so we never retry forever; failed sends retry tomorrow.
    if (sent || !user.user?.email) {
      await db.from("reviews").update({ rejection_notified_at: new Date().toISOString() }).eq("id", r.id);
      if (sent) notified++;
    }
  }

  return NextResponse.json({
    deletedLeads: deletedLeads ?? 0,
    rejectionEmails: notified,
    errors: [leadsError?.message, rejError?.message].filter(Boolean),
  });
}
