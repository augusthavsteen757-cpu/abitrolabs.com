import "server-only";
import { COMPANY } from "./company";

/**
 * Transactional e-mail via Brevo (EU). Only BREVO_API_KEY is required; the sender defaults to
 * noreply@<the site's domain> (the domain must be verified in Brevo once). EMAIL_FROM overrides it.
 * Without a key nothing is sent: pages that depend on e-mail say so instead of pretending.
 */
export const isEmailEnabled = () => !!process.env.BREVO_API_KEY;

function defaultSender() {
  try {
    return `noreply@${new URL(process.env.APP_URL || "https://klardal.com").hostname.replace(/^www\./, "")}`;
  } catch {
    return "noreply@klardal.com";
  }
}

export async function sendEmail(opts: { to: string; toName?: string; subject: string; text: string }) {
  const footer = `\n\n—\n${COMPANY.name} · CVR ${COMPANY.cvr}\n${COMPANY.address}\n${COMPANY.email}${COMPANY.phone ? ` · ${COMPANY.phone}` : ""}`;
  const text = opts.text + footer;
  if (!isEmailEnabled()) {
    console.info(`[email:not-sent] to=${opts.to.replace(/(.).*@/, "$1***@")} subject="${opts.subject}"`);
    return false;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: process.env.EMAIL_FROM || defaultSender(), name: COMPANY.name },
        replyTo: { email: COMPANY.email },
        to: [{ email: opts.to, name: opts.toName }],
        subject: opts.subject,
        textContent: text,
      }),
    });
    if (!res.ok) {
      console.error(JSON.stringify({ event: "email_failed", status: res.status, body: (await res.text().catch(() => "")).slice(0, 300) }));
      return false;
    }
    return true;
  } catch (err) {
    console.error(JSON.stringify({ event: "email_failed", error: String(err).slice(0, 300) }));
    return false;
  }
}
