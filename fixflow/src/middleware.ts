import { NextResponse, type NextRequest } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

export const config = { matcher: ["/dashboard/:path*", "/api/:path*"] };
