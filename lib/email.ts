import "server-only";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Mail = { to: string | undefined; subject: string; text: string; html: string; replyTo?: string };

// Sends via Resend's HTTP API. Returns false (never throws): callers have already saved the data,
// so a mail outage must not fail the user's action.
async function sendEmail({ to, subject, text, html, replyTo }: Mail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LEAD_EMAIL_FROM || "DiveAdvisor <onboarding@resend.dev>";
  if (!apiKey || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, reply_to: replyTo, subject, text, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Test centres have fake addresses: route their mail to a real inbox we control.
const centerInbox = (centerEmail: string | null, isTest: boolean) =>
  isTest || process.env.LEAD_EMAIL_FORCE_OVERRIDE === "1" ? process.env.LEAD_EMAIL_OVERRIDE : centerEmail ?? undefined;

// Moderation inbox (the team). Falls back to the override inbox until a dedicated address exists.
const adminInbox = () => process.env.ADMIN_EMAIL || process.env.LEAD_EMAIL_OVERRIDE;

type Lead = { centerName: string; centerEmail: string; name: string; email: string; message: string; isTest: boolean };

export function sendLeadEmail(lead: Lead) {
  return sendEmail({
    to: centerInbox(lead.centerEmail, lead.isTest),
    replyTo: lead.email,
    subject: `Nuova richiesta da DiveAdvisor: ${lead.name}`,
    text: `${lead.name} (${lead.email}) ha scritto a ${lead.centerName}:\n\n${lead.message}\n\nRispondi direttamente a questa email.`,
    html: `<p><strong>${esc(lead.name)}</strong> (${esc(lead.email)}) ha scritto a ${esc(lead.centerName)}:</p>
<blockquote style="white-space:pre-line">${esc(lead.message)}</blockquote>
<p>Rispondi direttamente a questa email.</p>`,
  });
}

type ReviewMail = { centerName: string; centerEmail: string | null; isTest: boolean; url: string; text: string };

// Verified review: published right away, the centre is told so it can reply.
export function sendNewReviewEmail(r: ReviewMail) {
  return sendEmail({
    to: centerInbox(r.centerEmail, r.isTest),
    subject: `Nuova recensione verificata per ${r.centerName}`,
    text: `${r.centerName} ha ricevuto una nuova recensione verificata:\n\n${r.text}\n\nPuoi rispondere dall'area diving: ${r.url}`,
    html: `<p>${esc(r.centerName)} ha ricevuto una nuova recensione verificata:</p>
<blockquote style="white-space:pre-line">${esc(r.text)}</blockquote>
<p>Puoi rispondere dall'<a href="${esc(r.url)}">area diving</a>.</p>`,
  });
}

// Unverified review: waits for moderation in the Supabase table editor.
export function sendModerationEmail(r: { centerName: string; reviewId: string; text: string }) {
  return sendEmail({
    to: adminInbox(),
    subject: `Recensione da moderare: ${r.centerName}`,
    text: `Nuova recensione non verificata per ${r.centerName} (id ${r.reviewId}):\n\n${r.text}\n\nModerala in Supabase: tabella reviews, cambia status in published o rejected.`,
    html: `<p>Nuova recensione non verificata per ${esc(r.centerName)} (id <code>${esc(r.reviewId)}</code>):</p>
<blockquote style="white-space:pre-line">${esc(r.text)}</blockquote>
<p>Moderala in Supabase: tabella <code>reviews</code>, cambia <code>status</code> in <code>published</code> o <code>rejected</code>.</p>`,
  });
}

export function sendReportEmail(r: { reviewId: string; reason: string }) {
  return sendEmail({
    to: adminInbox(),
    subject: "Recensione segnalata",
    text: `La recensione ${r.reviewId} è stata segnalata:\n\n${r.reason}\n\nControlla le tabelle review_reports e reviews in Supabase.`,
    html: `<p>La recensione <code>${esc(r.reviewId)}</code> è stata segnalata:</p>
<blockquote style="white-space:pre-line">${esc(r.reason)}</blockquote>
<p>Controlla le tabelle <code>review_reports</code> e <code>reviews</code> in Supabase.</p>`,
  });
}

export function sendRemovalEmail(r: { centerName: string; name: string; email: string; role: string; reason: string }) {
  return sendEmail({
    to: adminInbox(),
    replyTo: r.email,
    subject: `Richiesta di rimozione: ${r.centerName}`,
    text: `${r.name} (${r.role}, ${r.email}) chiede la rimozione della scheda "${r.centerName}".\n\nMotivo: ${r.reason || "non indicato"}\n\nVerifica che sia il titolare (rispondi a questa email), poi elimina la scheda in Supabase e segna la richiesta come done nella tabella removal_requests. Impegno: entro 7 giorni.`,
    html: `<p><strong>${esc(r.name)}</strong> (${esc(r.role)}, ${esc(r.email)}) chiede la rimozione della scheda <strong>${esc(r.centerName)}</strong>.</p>
<p>Motivo: ${esc(r.reason || "non indicato")}</p>
<p>Verifica che sia il titolare (rispondi a questa email), poi elimina la scheda in Supabase e segna la richiesta come <code>done</code> nella tabella <code>removal_requests</code>. Impegno: entro 7 giorni.</p>`,
  });
}
