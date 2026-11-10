/**
 * Admins are the e-mail addresses in ADMIN_EMAILS (comma-separated).
 * Sign-up refuses these addresses (see api/auth/signup), so nobody can become admin by registering
 * an admin address that has no account yet. Create the admin account first, then add it here.
 */
export function isAdminEmail(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}
