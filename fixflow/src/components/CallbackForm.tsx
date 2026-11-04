"use client";
import { useState } from "react";

/** "Lav min gratis prøve": phone number (required) and company (optional), posted to /api/ring. */
export function CallbackForm() {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    const form = new FormData(e.currentTarget);
    const telefon = String(form.get("telefon") ?? "");
    if (telefon.replace(/\D/g, "").replace(/^(45|0045)(?=\d{8}$)/, "").length !== 8) {
      setError("Skriv et dansk telefonnummer med 8 cifre.");
      return;
    }
    setError("");
    setState("sending");
    try {
      const res = await fetch("/api/ring", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ telefon, firma: String(form.get("firma") ?? "") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Noget gik galt. Prøv igen om lidt.");
      setState("done");
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Ingen forbindelse. Prøv igen om lidt.");
      setState("idle");
    }
  }

  if (state === "done") {
    return <p className="msg" role="status" data-testid="ring-done">Tak. Vi ringer, når jeres prøveversion er klar.</p>;
  }
  return (
    <form onSubmit={onSubmit} noValidate data-testid="ring-form">
      <div className="fields">
        <label htmlFor="tlf">
          Telefonnummer
          <input id="tlf" name="telefon" type="tel" inputMode="tel" autoComplete="tel" placeholder="12 34 56 78" required maxLength={40} />
        </label>
        <label htmlFor="firma">
          Firma (valgfrit)
          <input id="firma" name="firma" type="text" autoComplete="organization" placeholder="Jeres firmanavn" maxLength={120} />
        </label>
      </div>
      <button className="btn" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sender…" : "Lav min gratis prøve"}
      </button>
      {error && <p className="msg" role="alert">{error}</p>}
    </form>
  );
}
