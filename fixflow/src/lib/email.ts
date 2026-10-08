import "server-only";
import { COMPANY } from "./company";

/**
 * Transactional e-mail via Brevo (EU). Set BREVO_API_KEY and EMAIL_FROM.
 * Without a key the e-mail is only logged (development / test mode).
 */
export const isEmailEnabled = () => !!process.env.BREVO_API_KEY;

export async function sendEmail(opts: { to: string; toName?: string; subject: string; text: string }) {
  const footer = `\n\n—\n${COMPANY.name} · CVR ${COMPANY.cvr}\n${COMPANY.address}\n${COMPANY.email} · ${COMPANY.phone}`;
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
        sender: { email: process.env.EMAIL_FROM || COMPANY.email, name: COMPANY.name },
        to: [{ email: opts.to, name: opts.toName }],
        subject: opts.subject,
        textContent: text,
      }),
    });
    if (!res.ok) {
      console.error("E-mail failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("E-mail failed", err);
    return false;
  }
}
