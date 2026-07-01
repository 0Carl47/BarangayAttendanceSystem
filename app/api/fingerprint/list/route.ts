/**
 * GET /api/fingerprint/list?userId=xxx
 * List enrolled fingerprint templates for a user (metadata only, no raw template data).
 * Auth: admin only.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value ?? "";
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId query param required" }, { status: 400 });
  }

  const templates = await prisma.fingerprintTemplate.findMany({
    where: { userId },
    select: {
      id: true,
      finger: true,
      quality: true,
      source: true,
      deviceId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ finger: "asc" }, { createdAt: "asc" }],
  });

  const FINGER_NAMES = [
    "Right Thumb", "Right Index", "Right Middle", "Right Ring", "Right Little",
    "Left Thumb",  "Left Index",  "Left Middle",  "Left Ring",  "Left Little",
  ];

  return NextResponse.json({
    ok: true,
    templates: templates.map((t) => ({
      ...t,
      fingerName: FINGER_NAMES[t.finger] ?? `Finger ${t.finger}`,
    })),
  });
}
