/**
 * Production without ANTHROPIC_API_KEY (and without ALLOW_DEMO_MODE) must never show an example analysis
 * as if it were the user's quote: the health check fails, uploads fail with a clear message and nobody is charged.
 * The seeded demo account is closed outside demo mode.
 *
 *   ALLOW_LOCAL_DB=1 npm start            # no ANTHROPIC_API_KEY, no ALLOW_DEMO_MODE
 *   BASE_URL=http://localhost:3000 node scripts/no-ai-key.mjs
 */
import { readFileSync } from "node:fs";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
let failed = 0;
const ok = (cond, msg) => {
  console.log(`  ${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) failed++;
};
let cookie = "";
const req = async (path, init = {}) => {
  const r = await fetch(BASE + path, { ...init, headers: { origin: BASE, cookie, ...(init.headers ?? {}) }, redirect: "manual" });
  const set = r.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  return r;
};

console.log(`No-AI-key test: ${BASE}`);
const health = await req("/api/health");
ok(health.status === 503 && (await health.json()).ai === false, `health check reports the missing AI key (${health.status})`);

const signup = await req("/api/auth/signup", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Uden Nøgle", email: `nokey${Date.now()}@eksempel.dk`, password: "Uden-Noegle-Kode-42", acceptTerms: true }),
});
ok(signup.ok && cookie.startsWith("ff_session="), `signup works (${signup.status})`);

const pdf = readFileSync(new URL("../sample-quotes/eksempel-vvs-badevaerelse.pdf", import.meta.url));
const upload = async () => {
  const form = new FormData();
  form.append("file", new Blob([pdf], { type: "application/pdf" }), "tilbud.pdf");
  form.append("projectName", "Test");
  const r = await req("/api/quotes", { method: "POST", body: form });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

const first = await upload();
ok(first.status === 201 && first.body.quote?.status === "FAILED", `upload fails instead of analysing (${first.status}, ${first.body.quote?.status})`);
ok(first.body.quote?.analysis == null, "no example analysis is stored or shown");
ok(/teknisk fejl/.test(first.body.quote?.error ?? ""), `clear error message (${first.body.quote?.error})`);

// The free plan has 1 analysis: if the failed one had been charged, the next upload would be refused with 402.
const second = await upload();
ok(second.status === 201 && second.body.quote?.status === "FAILED", `the failed analysis was not charged (${second.status})`);

const page = await req(`/dashboard/tilbud/${first.body.quote?.id}`);
const html = await page.text();
ok(page.status === 200 && html.includes("teknisk fejl") && !html.includes('data-testid="demo-notice"'), "quote page shows the error, not an example");

// The seeded demo account and its login hint exist only in demo mode.
const loginHtml = await (await fetch(BASE + "/login")).text();
ok(!loginHtml.includes("demo1234"), "login page does not show the demo account");
const demoLogin = await fetch(BASE + "/api/auth/login", {
  method: "POST",
  headers: { origin: BASE, "content-type": "application/json" },
  body: JSON.stringify({ email: "demo@klardal.dk", password: "demo1234" }),
});
ok(demoLogin.status === 401, `demo account cannot log in (${demoLogin.status})`);

// No e-mail service (BREVO_API_KEY) in this run: the forgot-password page must not pretend to send a link.
const forgot = await (await fetch(BASE + "/glemt-adgangskode")).text();
ok(forgot.includes('data-testid="forgot-offline"') && forgot.includes("mailto:") && !forgot.includes(">Send link<"), "forgot password is honest without e-mail");
const forgotApi = await fetch(BASE + "/api/auth/forgot", { method: "POST", headers: { origin: BASE, "content-type": "application/json" }, body: JSON.stringify({ email: "a@b.dk" }) });
ok((await forgotApi.json()).emailEnabled === false, "forgot API reports that e-mail is off");

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
