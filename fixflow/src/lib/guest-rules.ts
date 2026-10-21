/** Rules for "tjek uden konto" that both server and pages use (no database access here, so unit tests can import it). */

/** Analyses a guest gets before they must create an account. */
export const GUEST_ANALYSES = 1;
/** Guest checks that were never turned into an account are deleted after this many days. */
export const GUEST_DELETE_DAYS = 7;
export const GUEST_DELETE_MS = GUEST_DELETE_DAYS * 24 * 60 * 60 * 1000;
/** .invalid is reserved (RFC 2606): mail to it can never be delivered to anyone. */
export const GUEST_EMAIL_DOMAIN = "gaest.klardal.invalid";

export const isGuest = (user: { guest?: boolean | null; email: string }) =>
  user.guest === true || user.email.endsWith(`@${GUEST_EMAIL_DOMAIN}`);
