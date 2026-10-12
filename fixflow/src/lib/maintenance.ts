import { deleteInactiveAccounts } from "./account";
import { recoverStaleAnalyses, unlockBetaAnalyses } from "./quotes";
import { syncPartnerCodes } from "./codes";

/** One-off jobs when the server starts: partner codes from PARTNER_CODES, and keeping beta analyses open. */
export async function runStartupTasks() {
  await syncPartnerCodes().catch((err) => console.error("Partner code sync failed", err));
  const unlocked = await unlockBetaAnalyses().catch((err) => {
    console.error("Unlocking beta analyses failed", err);
    return 0;
  });
  if (unlocked) console.info(JSON.stringify({ event: "beta_analyses_unlocked", count: unlocked }));
}

/** Background jobs: refund analyses that died with a server (every 5 min), delete inactive accounts (daily). */
export function scheduleMaintenance() {
  const recover = () => recoverStaleAnalyses().catch((err) => console.error("Stale-analysis recovery failed", err));
  const cleanup = () => deleteInactiveAccounts().catch((err) => console.error("Inactive-account cleanup failed", err));
  setTimeout(() => {
    void recover();
    void cleanup();
  }, 60_000).unref?.();
  setInterval(recover, 5 * 60 * 1000).unref?.();
  setInterval(cleanup, 24 * 60 * 60 * 1000).unref?.();
}
