import { NextResponse } from "next/server";
import { sessionCookieName, sessionCookieOptions } from "@/server/session-cookie";

// MOCK: any non-empty name and password signs in.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: string; password?: string } | null;
  if (!body?.name || !body.password) {
    return NextResponse.json({ ok: false, error: "Invalid", code: "INVALID_CREDENTIALS" }, { status: 401 });
  }
  const response = NextResponse.json({ next: "done" });
  response.cookies.set(sessionCookieName(), "mock", sessionCookieOptions(60 * 60 * 12));
  return response;
}
