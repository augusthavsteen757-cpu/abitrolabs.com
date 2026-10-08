/** Runs once when the server starts. Schedules the daily deletion of inactive accounts (Node.js runtime only). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { scheduleMaintenance } = await import("./lib/maintenance");
    scheduleMaintenance();
  }
}
