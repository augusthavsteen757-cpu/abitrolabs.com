/**
 * AI regression test ("eval") for Klardal. Uploads known test documents to a running app with a real
 * ANTHROPIC_API_KEY and checks that the analysis still catches what it should. Run it after changing
 * the model, the prompt or the SDK – and now and then, because AI models can change behaviour.
 *
 *   BASE_URL=https://klardal.com node eval/run-eval.mjs
 *
 * Needs BETA_FREE=1 (or enough analyses) on the target. Uses 6 analyses (~6 kr.) per run.
 */
import { appendFileSync, readFileSync } from "fs";
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

async function upload(file, context = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(context)) fd.append(k, v);
  // Several files = one upload of several files (they are joined into one PDF on the server).
  for (const f of [file].flat()) fd.append("file", new Blob([readFileSync(path.join(dir, "fixtures", f))], { type: "application/pdf" }), f);
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
    // The customer says it's a flat and load-bearing walls are involved: the analysis should take that up.
    file: "koekken-overslag.pdf",
    context: { housing: "apartment", builtYear: "1962", loadBearing: "yes" },
    check(q) {
      const a = q.analysis;
      const text = JSON.stringify([a.flags, a.questions]).toLowerCase();
      return {
        "status DONE": q.status === "DONE",
        "mentions the owners' association": /ejerforening/.test(text),
        "mentions structural calculation / engineer": /statik|statisk|ingeniør/.test(text),
      };
    },
  },
  {
    // Two quotes from two different firms in one upload must be refused (and not charged).
    file: ["koekken-overslag.pdf", "sum-mismatch.pdf"],
    check(q) {
      return { "rejected as several quotes": q.status === "FAILED" && /flere forskellige tilbud/i.test(q.error ?? "") };
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

const password = "Eval-Klardal-2026!x";
let email = "";

/** A fresh test account (each gets the free analyses of the beta). */
async function newAccount() {
  cookie = "";
  email = `eval${Date.now()}@eksempel.dk`;
  const signup = await call("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Eval", email, password, acceptTerms: true }),
  });
  if (signup.status >= 300) {
    console.error("Signup failed", signup);
    process.exit(1);
  }
  // After the trial a new account gets the free basic check (top flags only, no questions). A partner code gives
  // the full report, so every check can run: set EVAL_PARTNER_CODE to a code from PARTNER_CODES.
  if (process.env.EVAL_PARTNER_CODE) {
    const code = await call("/api/codes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: process.env.EVAL_PARTNER_CODE }) });
    if (code.status >= 300) console.warn("Partner code not accepted", code.status, code.json?.error);
  }
}

/** Removes the test account again (with its quotes and files), so runs leave nothing behind on the site. */
async function deleteAccount() {
  const deleted = await call("/api/account/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  console.log(deleted.status === 200 ? `\nTest account deleted` : `\nCould not delete the test account ${email} (${deleted.status})`);
}

await newAccount();

let failed = 0;
const summary = [`## AI-test mod ${BASE}`, ""];
for (const c of cases) {
  const t0 = Date.now();
  let r = await upload(c.file, c.context);
  if (r.status === 402) {
    // The account's free analyses are used up: continue on a new one.
    await deleteAccount();
    await newAccount();
    r = await upload(c.file, c.context);
  }
  const q = r.json.quote ?? {};
  const results =
    r.status >= 300
      ? { [`upload ok (got ${r.status} ${r.json.error ?? ""})`]: false }
      : q.status === "DONE" && q.fullAccess === false
        ? { "full report (got the free basic check – set EVAL_PARTNER_CODE)": false }
        : c.check(q);
  console.log(`\n${[c.file].flat().join(" + ")}  (${Math.round((Date.now() - t0) / 1000)} s)`);
  summary.push(`**${[c.file].flat().join(" + ")}**`);
  for (const [name, ok] of Object.entries(results)) {
    console.log(`  ${ok ? "✓" : "✗"} ${name}`);
    summary.push(`- ${ok ? "✅" : "❌"} ${name}`);
    if (!ok) failed++;
  }
  summary.push("");
}
await deleteAccount();
summary.push(failed ? `**${failed} tjek fejlede**` : "**Alle tjek bestået**");
// On GitHub Actions the result is shown on the run's page.
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join("\n") + "\n");
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exitCode = failed ? 1 : 0;
