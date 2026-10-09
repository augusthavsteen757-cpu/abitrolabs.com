import { NextResponse, type NextRequest } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Extra domains that should always land on the main domain (e.g. klardal.dk → klardal.com). */
const REDIRECT_HOSTS = new Set(
  (process.env.REDIRECT_HOSTS ?? "klardal.dk,www.klardal.dk").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean),
);
const MAIN_URL = process.env.APP_URL || "https://klardal.com";

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
  return NextResponse.next();
}

// Every page (for the domain redirect) – but not Next's static assets.
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
