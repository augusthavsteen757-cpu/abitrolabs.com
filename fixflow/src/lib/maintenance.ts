import { deleteInactiveAccounts } from "./account";

/** Daily background jobs. */
export function scheduleMaintenance() {
  const run = () => deleteInactiveAccounts().catch((err) => console.error("Inactive-account cleanup failed", err));
  setTimeout(run, 60_000).unref?.();
  setInterval(run, 24 * 60 * 60 * 1000).unref?.();
}
