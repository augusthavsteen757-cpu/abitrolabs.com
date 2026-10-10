/**
 * Demo mode (hand-written example analyses, no AI, a seeded demo account) is only for local development
 * and explicit preview sites. In production a missing key must fail loudly – never show an example as if
 * it were the user's quote, and never let anyone into the shared demo account.
 */
export const DEMO_EMAIL = "demo@klardal.dk";

export const isDemoMode = () =>
  !process.env.ANTHROPIC_API_KEY && (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_MODE === "1");

/** True when the app can't analyse at all: production without a key and without an explicit demo opt-in. */
export const isAiMissing = () => !process.env.ANTHROPIC_API_KEY && !isDemoMode();

/** The seeded demo account only works in demo mode. */
export const isDemoAccountBlocked = (email: string) => email.toLowerCase() === DEMO_EMAIL && !isDemoMode();
