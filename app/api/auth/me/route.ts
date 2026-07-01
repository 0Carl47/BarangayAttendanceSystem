
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const token = cookies().get("session")?.value || "";
  const session = token ? await verifySession(token) : null;
  return NextResponse.json({ ok: true, session });
}
