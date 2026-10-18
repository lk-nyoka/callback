import { NextResponse, type NextRequest } from "next/server";

// Every visitor gets a private, cookie-scoped workspace. No sign-up needed
// to try Callback; data can be deleted from Settings at any time.
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get("cb_ws")) {
    const id = crypto.randomUUID().replace(/-/g, "");
    res.cookies.set("cb_ws", id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 180, path: "/" });
    req.cookies.set("cb_ws", id);
    // make the new id visible to this same request's handlers
    const headers = new Headers(req.headers);
    headers.set("x-cb-ws", id);
    return NextResponse.next({ request: { headers }, headers: res.headers });
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/health|api/cron).*)"] };
