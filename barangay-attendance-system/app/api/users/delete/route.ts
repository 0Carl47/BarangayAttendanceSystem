/**
 * DELETE /api/users/delete
 * Delete a user account + all their fingerprint templates + credentials from DB.
 * Body: { userId }
 * Auth: admin only.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function DELETE(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value ?? "";
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const userId = body?.userId;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  // Delete in order: fingerprint templates → audit logs → credentials → user
  await prisma.fingerprintTemplate.deleteMany({ where: { userId } });
  await prisma.fingerprintAuditLog.deleteMany({ where: { userId } });
  await prisma.credential.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true, deleted: userId });
}
