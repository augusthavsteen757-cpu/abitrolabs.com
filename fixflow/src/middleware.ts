import { NextResponse, type NextRequest } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Extra domains that should always land on the main domain (e.g. klardal.dk or the misspelling klardahl.dk → klardal.com). */
const REDIRECT_HOSTS = new Set(
  (process.env.REDIRECT_HOSTS ?? "klardal.dk,www.klardal.dk,klardahl.dk,www.klardahl.dk,klardahl.com,www.klardahl.com").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean),
);
const MAIN_URL = process.env.APP_URL || "https://klardal.com";

/** Pages of the old quote-check tool. They still work, but Google should show the booking service instead. */
const OLD_TOOL = ["/tilbud", "/tjek", "/priser", "/opret", "/login", "/glemt-adgangskode", "/artikler", "/handelsbetingelser"];
const isOldToolPath = (p: string) => OLD_TOOL.some((o) => p === o || p.startsWith(`${o}/`));

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (REDIRECT_HOSTS.has(host)) {
    return NextResponse.redirect(new URL(pathname + req.nextUrl.search, MAIN_URL), 301);
  }

  // CSRF protection: state-changing API calls must come from our own pages.
  // (The session cookie is also SameSite=Lax.) Stripe's webhook is server-to-server and signed instead.
  if (pathname.startsWith("/api/") && MUTATING.has(req.method) && pathname !== "/api/billing/webhook") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    let ok = false;
    try {
      ok = !!origin && !!host && new URL(origin).host === host;
    } catch {
      ok = false;
    }
    if (!ok) return NextResponse.json({ error: "Ugyldig anmodning." }, { status: 403 });
    return NextResponse.next();
  }

  // Cheap presence check only – the real verification happens server-side in requireUser().
  if (pathname.startsWith("/dashboard") && !req.cookies.get("ff_session")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  // Lets the root layout know which page it renders (the landing page has no beta banner).
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-klardal-path", pathname);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (isOldToolPath(pathname)) res.headers.set("X-Robots-Tag", "noindex, follow");
  return res;
}

// Every page (for the domain redirect) – but not Next's static assets.
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
