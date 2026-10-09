import { deleteInactiveAccounts } from "./account";
import { recoverStaleAnalyses } from "./quotes";

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
