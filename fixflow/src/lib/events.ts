import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { usageEvents } from "@/db/schema";

/**
 * Privacy-friendly usage counting for the beta. Each event is stored as (name, day) only – no user id,
 * time of day, IP address or cookie – so it is not personal data and needs no consent. Counting must
 * never break what the user is doing, so errors are only logged.
 */
export const EVENTS = {
  analysis_done: "Analyse fuldført",
  second_quote_in_project: "Tilbud nr. 2 i samme projekt",
  compare_opened: "Sammenligning åbnet",
  message_generated: "Besked genereret",
  message_copied: "Besked kopieret",
  questions_copied: "Spørgsmål kopieret",
  guest_started: "Tjek uden konto startet",
  guest_converted: "Gæst oprettede konto",
} as const;
export type EventName = keyof typeof EVENTS;

/** Events the browser may report (the rest are counted on the server where they happen). */
export const CLIENT_EVENTS = ["message_copied", "questions_copied"] as const satisfies readonly EventName[];

export const danishDay = (d = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export async function track(name: EventName) {
  try {
    await db.insert(usageEvents).values({ name, day: danishDay() });
  } catch (err) {
    console.error(JSON.stringify({ event: "usage_event_failed", name, error: String(err) }));
  }
}

/** Counts per event and day since `fromDay` (YYYY-MM-DD), for the admin page. */
export async function eventCounts(fromDay: string) {
  return db
    .select({ name: usageEvents.name, day: usageEvents.day, count: sql<number>`count(*)` })
    .from(usageEvents)
    .where(sql`${usageEvents.day} >= ${fromDay}`)
    .groupBy(usageEvents.name, usageEvents.day);
}

export async function eventTotals() {
  return db.select({ name: usageEvents.name, count: sql<number>`count(*)` }).from(usageEvents).groupBy(usageEvents.name);
}
