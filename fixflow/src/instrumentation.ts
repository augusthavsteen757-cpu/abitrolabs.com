/** Runs once when the server starts. Syncs partner codes, keeps beta analyses open, and schedules the daily deletion of inactive accounts (Node.js runtime only). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runStartupTasks, scheduleMaintenance } = await import("./lib/maintenance");
    await runStartupTasks();
    scheduleMaintenance();
  }
}
