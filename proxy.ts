import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isSessionActive } from "@/lib/guest-session";

const STAY_TOKEN_PATTERN = /^\/stay\/([A-Za-z0-9]{8})(?:\/|$)/;

export async function proxy(request: NextRequest) {
  const stayMatch = request.nextUrl.pathname.match(STAY_TOKEN_PATTERN);

  if (stayMatch && !(await isSessionActive(stayMatch[1]))) {
    return NextResponse.redirect(new URL("/stay/invalid", request.url));
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
