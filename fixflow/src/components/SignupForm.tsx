"use client";
import { useState } from "react";
import { EXTRAS, PAYMENTS, PLANS, type Payment, type Plan } from "@/lib/signup";

/** "Ja tak" for the booking service: the firm fills in what it wants and accepts – posted to /api/tilmeld. */
export function SignupForm({
  firma = "",
  pakke = "149",
  ydelser,
  aabningstider = "",
}: {
  firma?: string;
  pakke?: Plan;
  /** Suggested services from a personal link, shown as ticked boxes instead of a blank text field. */
  ydelser?: readonly string[];
  aabningstider?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<Plan>(pakke);
  const [payment, setPayment] = useState<Payment>("kort");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    const f = new FormData(e.currentTarget);
    const body = {
      firma: String(f.get("firma") ?? ""),
      navn: String(f.get("navn") ?? ""),
      telefon: String(f.get("telefon") ?? ""),
      email: String(f.get("email") ?? ""),
      cvr: String(f.get("cvr") ?? ""),
      pakke: plan,
      besked: f.get("besked") === "sms" ? "sms" : "mail",
      behandlinger: [...f.getAll("ydelse").map(String), String(f.get("behandlinger") ?? "")].filter((t) => t.trim()).join("\n"),
      aabningstider: String(f.get("aabningstider") ?? ""),
      billeder: f.get("billeder") === "on",
      tilvalg: f.getAll("tilvalg").map(String),
      betaling: payment,
      accept: f.get("accept") === "on",
    };
    if (!body.accept) return setError("Sæt kryds i boksen nederst, før I sender.");
    setError("");
    setState("sending");
    try {
      const res = await fetch("/api/tilmeld", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Noget gik galt. Prøv igen om lidt.");
      if (typeof data.checkoutUrl === "string" && data.checkoutUrl.startsWith("https://checkout.stripe.com/")) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setState("done");
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Ingen forbindelse. Prøv igen om lidt.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="done" role="status" data-testid="signup-done">
        <h2>Tak. Vi går i gang.</h2>
        <p>
          {payment === "kort"
            ? "Vi sender jer et link, hvor I lægger kortet ind. Der trækkes først penge efter den gratis måned."
            : `Vi sender jer en aftale om fast betaling via ${PAYMENTS[payment]}, som I godkender med et enkelt tryk. Der trækkes først penge efter den gratis måned.`}
        </p>
        <p>Vi ringer, når alt er sat op, så I kan se det hele, før det går live.</p>
      </div>
    );
  }
  return (
    <form className="signup" onSubmit={onSubmit} noValidate data-testid="signup-form">
      <fieldset>
        <legend>1. Om jer</legend>
        <label>Firma<input name="firma" defaultValue={firma} autoComplete="organization" required maxLength={120} /></label>
        <label>Dit navn<input name="navn" autoComplete="name" required maxLength={120} /></label>
        <label>Telefon<input name="telefon" type="tel" inputMode="tel" autoComplete="tel" placeholder="12 34 56 78" required maxLength={40} /></label>
        <label>E-mail<input name="email" type="email" autoComplete="email" required maxLength={200} /></label>
        <label>CVR (valgfrit)<input name="cvr" inputMode="numeric" maxLength={20} /></label>
      </fieldset>

      <fieldset>
        <legend>2. Vælg pakke</legend>
        {(Object.keys(PLANS) as Plan[]).map((p) => (
          <label className="choice" key={p}>
            <input type="radio" name="pakke" value={p} checked={plan === p} onChange={() => setPlan(p)} /> {PLANS[p]}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>3. Jeres booking</legend>
        {ydelser?.length ? (
          <>
            <span className="sub">Det kan kunderne booke</span>
            <p className="hint">Vi har udfyldt det på forhånd. Fjern det, I ikke tilbyder.</p>
            {ydelser.map((y) => (
              <label className="choice" key={y}><input type="checkbox" name="ydelse" value={y} defaultChecked /> {y}</label>
            ))}
            <label>Andre ydelser (valgfrit)<input name="behandlinger" maxLength={500} placeholder="Fx Permanent (120 min)" /></label>
          </>
        ) : (
          <label>Ydelser og varighed (valgfrit)
            <textarea name="behandlinger" rows={4} maxLength={2000} placeholder={"Fx\nHerreklip, 30 min\nDameklip, 45 min"} />
          </label>
        )}
        <label>Åbningstider (valgfrit)<input name="aabningstider" maxLength={500} defaultValue={aabningstider} placeholder="Som på Google" /></label>
        <p className="hint">Tider og priser finjusterer vi sammen, når vi ringer.</p>
        <span className="sub">Giv besked om nye bookinger på</span>
        <label className="choice"><input type="radio" name="besked" value="mail" defaultChecked /> Mail</label>
        <label className="choice"><input type="radio" name="besked" value="sms" /> SMS</label>
        <label className="choice"><input type="checkbox" name="billeder" defaultChecked /> I må bruge billeder fra vores hjemmeside og sociale medier</label>
      </fieldset>

      <fieldset>
        <legend>4. Tilvalg (valgfrit)</legend>
        <p className="hint">Vi aftaler prisen med jer, før vi starter.</p>
        {(Object.keys(EXTRAS) as (keyof typeof EXTRAS)[]).map((k) => (
          <label className="choice" key={k}><input type="checkbox" name="tilvalg" value={k} /> {EXTRAS[k]}</label>
        ))}
      </fieldset>

      <fieldset>
        <legend>5. Betaling</legend>
        <p className="hint">Betalingen kører automatisk hver måned. Der trækkes først penge efter den gratis måned.</p>
        {(Object.keys(PAYMENTS) as Payment[]).map((p) => (
          <label className="choice" key={p}>
            <input type="radio" name="betaling" value={p} checked={payment === p} onChange={() => setPayment(p)} /> {PAYMENTS[p]}
          </label>
        ))}
      </fieldset>

      <label className="choice accept">
        <input type="checkbox" name="accept" data-testid="signup-accept" />
        <span>
          Vi vil gerne i gang. Første måned er gratis, derefter {plan} kr. om måneden uden binding. Vi accepterer{" "}
          <a href="/vilkaar" target="_blank">vilkårene</a> og <a href="/databehandleraftale" target="_blank">databehandleraftalen</a>.
        </span>
      </label>
      <button className="btn" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sender…" : "Kom i gang"}</button>
      {error && <p className="err" role="alert">{error}</p>}
    </form>
  );
}
