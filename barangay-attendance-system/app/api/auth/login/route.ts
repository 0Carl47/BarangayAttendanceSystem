
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signSession } from "@/lib/auth";
import { serialize } from "cookie";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "Missing username or password" }, { status: 400 });
  }

  const user = await prisma.credential.findUnique({ where: { username } });
  if (!user) return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });

  const token = await signSession({ username: user.username, role: user.role as any });

  const cookie = serialize("session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true, role: user.role }, { headers: { "Set-Cookie": cookie } });
}
