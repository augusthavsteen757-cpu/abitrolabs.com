import { NextResponse, type NextRequest } from "next/server";

// Cheap presence check only – the real verification happens server-side in requireUser().
export function middleware(req: NextRequest) {
  if (!req.cookies.get("ff_session")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
