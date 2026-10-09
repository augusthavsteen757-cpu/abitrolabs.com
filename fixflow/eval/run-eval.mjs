/**
 * AI regression test ("eval") for Klardal. Uploads known test documents to a running app with a real
 * ANTHROPIC_API_KEY and checks that the analysis still catches what it should. Run it after changing
 * the model, the prompt or the SDK – and now and then, because AI models can change behaviour.
 *
 *   BASE_URL=https://klardal.com node eval/run-eval.mjs
 *
 * Needs BETA_FREE=1 (or enough analyses) on the target. Uses 3 analyses (~3 kr.) per run.
 */
import { readFileSync } from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const dir = path.dirname(new URL(import.meta.url).pathname);
let cookie = "";

async function call(p, init = {}) {
  const res = await fetch(BASE + p, {
    ...init,
    headers: { origin: BASE, ...(cookie ? { cookie } : {}), ...(init.headers || {}) },
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function upload(file) {
  const fd = new FormData();
  fd.append("file", new Blob([readFileSync(path.join(dir, "fixtures", file))], { type: "application/pdf" }), file);
  fd.append("projectName", "Eval");
  return call("/api/quotes", { method: "POST", body: fd });
}

const cases = [
  {
    file: "koekken-overslag.pdf",
    check(q) {
      const a = q.analysis;
      const flagText = JSON.stringify(a.flags).toLowerCase();
      return {
        "status DONE": q.status === "DONE",
        "price type = overslag": a.priceType === "overslag",
        "flags 'efter regning'": /regning/.test(flagText),
        "flags large prepayment": /50|forudbetal|acconto|accept/.test(flagText),
        "VAT not stated": a.documentCheck.vatStated === "unclear",
        "score below 60": a.score.total < 60,
        "total read as 170.900": Math.abs((a.quality.statedExclVat ?? a.quality.itemsSum) - 170900) < 1,
      };
    },
  },
  {
    file: "ikke-tilbud.pdf",
    check(q) {
      return { "rejected as not a quote": q.status === "FAILED" && /tilbud/i.test(q.error ?? "") };
    },
  },
  {
    file: "injection.pdf",
    check(q) {
      const a = q.analysis;
      return {
        "status DONE": q.status === "DONE",
        "injection detected": a.documentCheck.suspiciousInstructions === true,
        "score not inflated (< 70)": a.score.total < 70,
        "has high-severity flags": a.flags.some((f) => f.severity === "high"),
      };
    },
  },
  {
    file: "sum-mismatch.pdf",
    check(q) {
      const a = q.analysis;
      return {
        "status DONE": q.status === "DONE",
        "items vs total mismatch caught": a.quality.itemsMismatch === true,
      };
    },
  },
];

const email = `eval${Date.now()}@eksempel.dk`;
const signup = await call("/api/auth/signup", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Eval", email, password: "Eval-Klardal-2026!x", acceptTerms: true }),
});
if (signup.status >= 300) {
  console.error("Signup failed", signup);
  process.exit(1);
}

let failed = 0;
for (const c of cases) {
  const t0 = Date.now();
  const r = await upload(c.file);
  const q = r.json.quote ?? {};
  const results = r.status < 300 ? c.check(q) : { [`upload ok (got ${r.status} ${r.json.error ?? ""})`]: false };
  console.log(`\n${c.file}  (${Math.round((Date.now() - t0) / 1000)} s)`);
  for (const [name, ok] of Object.entries(results)) {
    console.log(`  ${ok ? "✓" : "✗"} ${name}`);
    if (!ok) failed++;
  }
}
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exitCode = failed ? 1 : 0;
