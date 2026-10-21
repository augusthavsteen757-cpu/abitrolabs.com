import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, gte, isNull, or, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quotes, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { EVENTS, danishDay, eventCounts, eventTotals, type EventName } from "@/lib/events";

export const metadata: Metadata = { title: "Brugstal", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Only for the e-mail addresses in ADMIN_EMAILS (comma-separated). Everyone else gets a 404. */
const isAdmin = (email: string) =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());

const daysAgo = (n: number) => danishDay(new Date(Date.now() - n * 86_400_000));

export default async function AdminPage() {
  const user = await requireUser();
  if (!isAdmin(user.email)) notFound();

  // Guest checks ("tjek uden konto") are not accounts: they are counted as events below instead.
  const realAccount = or(isNull(users.guest), eq(users.guest, false));
  // Only creation times are read (no e-mails or names), and only counts are shown.
  const since = new Date(Date.now() - 15 * 86_400_000);
  const [rows, totals, newUsers, newQuotes, [userTotal]] = await Promise.all([
    eventCounts(daysAgo(29)),
    eventTotals(),
    db.select({ at: users.createdAt }).from(users).where(and(gte(users.createdAt, since), realAccount)),
    db.select({ at: quotes.createdAt, status: quotes.status }).from(quotes).where(gte(quotes.createdAt, since)),
    db.select({ count: sql<number>`count(*)` }).from(users).where(realAccount),
  ]);
  const perDay = (list: { at: Date }[], day: string) => list.filter((r) => danishDay(r.at) === day).length;
  const names = Object.keys(EVENTS) as EventName[];
  const sum = (name: string, from: string) => rows.filter((r) => r.name === name && r.day >= from).reduce((s, r) => s + Number(r.count), 0);
  const days = Array.from({ length: 14 }, (_, i) => daysAgo(i));
  const cell = "px-3 py-2 text-right tabular-nums";

  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-semibold">Brugstal</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Anonyme tællinger: kun hvilken funktion og hvilken dag – ingen bruger, intet klokkeslæt, ingen IP-adresse og
        ingen cookies. Dage er dansk tid.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Nye konti og tilbud</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Konti i alt: <span className="tabular-nums">{Number(userTotal?.count ?? 0)}</span>. Tælles fra databasen, så slettede
        konti og tilbud er ikke med.
      </p>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm" data-testid="admin-signups">
          <thead className="text-left text-ink-muted">
            <tr>
              <th className="px-3 py-2">Dag</th>
              <th className={cell}>Nye konti</th>
              <th className={cell}>Tilbud uploadet</th>
              <th className={cell}>Heraf analyseret</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {days.map((day) => (
              <tr key={day}>
                <th scope="row" className="px-3 py-2 text-left font-medium tabular-nums">{day}</th>
                <td className={cell}>{perDay(newUsers, day)}</td>
                <td className={cell}>{perDay(newQuotes, day)}</td>
                <td className={cell}>{perDay(newQuotes.filter((q) => q.status === "DONE"), day)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Brug af funktioner</h2>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm" data-testid="admin-totals">
          <thead className="text-left text-ink-muted">
            <tr>
              <th className="px-3 py-2">Hændelse</th>
              <th className={cell}>I dag</th>
              <th className={cell}>7 dage</th>
              <th className={cell}>30 dage</th>
              <th className={cell}>I alt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {names.map((n) => (
              <tr key={n}>
                <th scope="row" className="px-3 py-2 text-left font-medium">{EVENTS[n]}</th>
                <td className={cell}>{sum(n, daysAgo(0))}</td>
                <td className={cell}>{sum(n, daysAgo(6))}</td>
                <td className={cell}>{sum(n, daysAgo(29))}</td>
                <td className={cell}>{Number(totals.find((t) => t.name === n)?.count ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-xl font-semibold">De sidste 14 dage</h2>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="text-left text-ink-muted">
            <tr>
              <th className="px-3 py-2">Dag</th>
              {names.map((n) => (
                <th key={n} className={cell}>{EVENTS[n]}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {days.map((day) => (
              <tr key={day}>
                <th scope="row" className="px-3 py-2 text-left font-medium tabular-nums">{day}</th>
                {names.map((n) => (
                  <td key={n} className={cell}>{Number(rows.find((r) => r.name === n && r.day === day)?.count ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
