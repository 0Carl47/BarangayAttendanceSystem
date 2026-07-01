/**
 * DELETE /api/fingerprint/delete
 * Delete a specific fingerprint template by ID.
 * Body: { templateId }
 * Auth: admin only.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { cookies, headers } from "next/headers";

export async function DELETE(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value ?? "";
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const templateId = body?.templateId;
  if (!templateId || typeof templateId !== "string") {
    return NextResponse.json({ ok: false, error: "templateId required" }, { status: 400 });
  }

  const tpl = await prisma.fingerprintTemplate.findUnique({ where: { id: templateId } });
  if (!tpl) {
    return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
  }

  await prisma.fingerprintTemplate.delete({ where: { id: templateId } });

  const headersList = await headers();
  await prisma.fingerprintAuditLog.create({
    data: {
      userId: tpl.userId,
      action: "delete",
      source: tpl.source,
      finger: tpl.finger,
      ipAddress: headersList.get("x-forwarded-for") ?? null,
      userAgent: headersList.get("user-agent") ?? null,
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
