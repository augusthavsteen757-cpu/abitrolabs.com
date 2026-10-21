import { ensureSchema } from "@/db/ensure-schema";
import { deleteInactiveAccounts } from "./account";
import { recoverStaleAnalyses, unlockBetaAnalyses } from "./quotes";
import { syncPartnerCodes } from "./codes";
import { deleteOldGuests } from "./guest";

/** One-off jobs when the server starts: partner codes from PARTNER_CODES, and keeping beta analyses open. */
export async function runStartupTasks() {
  // Must run first: the code below (and every request) expects the new columns and tables.
  await ensureSchema().catch((err) => console.error("Schema check failed", err));
  await syncPartnerCodes().catch((err) => console.error("Partner code sync failed", err));
  const unlocked = await unlockBetaAnalyses().catch((err) => {
    console.error("Unlocking beta analyses failed", err);
    return 0;
  });
  if (unlocked) console.info(JSON.stringify({ event: "beta_analyses_unlocked", count: unlocked }));
}

/** Background jobs: refund analyses that died with a server (every 5 min), delete unclaimed guests (hourly) and inactive accounts (daily). */
export function scheduleMaintenance() {
  const recover = () => recoverStaleAnalyses().catch((err) => console.error("Stale-analysis recovery failed", err));
  const cleanup = () => deleteInactiveAccounts().catch((err) => console.error("Inactive-account cleanup failed", err));
  const guests = () => deleteOldGuests().catch((err) => console.error("Guest cleanup failed", err));
  setTimeout(() => {
    void recover();
    void cleanup();
    void guests();
  }, 60_000).unref?.();
  setInterval(guests, 60 * 60 * 1000).unref?.();
  setInterval(recover, 5 * 60 * 1000).unref?.();
  setInterval(cleanup, 24 * 60 * 60 * 1000).unref?.();
}
