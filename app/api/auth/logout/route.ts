
import { NextResponse } from "next/server";
import { serialize } from "cookie";

export async function POST() {
  const cookie = serialize("session", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": cookie } });
}
