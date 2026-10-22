import "server-only";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Lead = { centerName: string; centerEmail: string; name: string; email: string; message: string; isTest: boolean };

// Sends the lead to the centre via Resend's HTTP API. Returns false (never throws) so a mail outage
// doesn't lose the lead: it is already saved and visible in the dashboard.
export async function sendLeadEmail(lead: Lead): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LEAD_EMAIL_FROM || "DiveAdvisor <onboarding@resend.dev>";
  // Test centres have fake addresses: route their mail to a real inbox we control.
  const to = lead.isTest || process.env.LEAD_EMAIL_FORCE_OVERRIDE === "1"
    ? process.env.LEAD_EMAIL_OVERRIDE
    : lead.centerEmail;
  if (!apiKey || !to) return false;

  const subject = `Nuova richiesta da DiveAdvisor: ${lead.name}`;
  const text = `${lead.name} (${lead.email}) ha scritto a ${lead.centerName}:\n\n${lead.message}\n\nRispondi direttamente a questa email.`;
  const html = `<p><strong>${esc(lead.name)}</strong> (${esc(lead.email)}) ha scritto a ${esc(lead.centerName)}:</p>
<blockquote style="white-space:pre-line">${esc(lead.message)}</blockquote>
<p>Rispondi direttamente a questa email.</p>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, reply_to: lead.email, subject, text, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
