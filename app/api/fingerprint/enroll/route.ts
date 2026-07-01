/**
 * POST /api/fingerprint/enroll  v2.0
 * Enroll 1–3 fingerprint templates for a user (admin panel).
 * Body: { userId, finger, templateData, template2?, template3?, quality?, source?, deviceId? }
 * Auth: admin session cookie required.
 *
 * DUPLICATE CHECK: uses DUPLICATE_THRESHOLD (85) — only blocks if clearly same finger as another person.
 * Skips check if bridge is offline.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { isValidTemplate, sdkMatch } from "@/lib/fingerprint";
import { encryptTemplate } from "@/lib/crypto";
import { cookies, headers } from "next/headers";

const DUPLICATE_THRESHOLD = 75; // v8: binary MapScore — 80=match, 0=no-match

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value ?? "";
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, finger, templateData, template2, template3, quality, source, deviceId } = body as Record<string, unknown>;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
  }
  if (!isValidTemplate(templateData)) {
    return NextResponse.json({ ok: false, error: "Invalid templateData (must be Base64, ≥64 bytes)" }, { status: 400 });
  }
  const fingerIndex = typeof finger === "number" ? finger : 0;
  if (fingerIndex < 0 || fingerIndex > 9) {
    return NextResponse.json({ ok: false, error: "finger must be 0-9" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  // DUPLICATE CHECK — only against OTHER users
  const bridgeUrl = process.env.ZKFINGER_BRIDGE_URL;
  if (bridgeUrl) {
    let bridgeAlive = false;
    try {
      const sr = await fetch(`${bridgeUrl}/status`, { signal: AbortSignal.timeout(3000) });
      bridgeAlive = sr.ok;
    } catch { bridgeAlive = false; }

    if (bridgeAlive) {
      const others = await prisma.fingerprintTemplate.findMany({
        where:  { source: "zkteco", userId: { not: userId } },
        select: { id: true, userId: true, templateData: true },
      });
      for (const stored of others) {
        const score = await sdkMatch(String(templateData), stored.templateData, "zkteco"); // uses /verify (VerifyByID)
        if (score >= DUPLICATE_THRESHOLD) {
          console.log(`[enroll] DUPLICATE: score=${score} matches userId=${stored.userId}`);
          return NextResponse.json({
            ok:    false,
            error: `This fingerprint is already registered to another account. Use a different finger.`,
          }, { status: 409 });
        }
      }
    }
  }

  // Delete all existing templates for this finger before saving new ones
  await prisma.fingerprintTemplate.deleteMany({ where: { userId, finger: fingerIndex } });

  const headersList = await headers();
  const ipAddress = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? null;
  const userAgent = headersList.get("user-agent") ?? null;
  const srcStr = typeof source === "string" ? source : "zkteco";
  const devStr = typeof deviceId === "string" ? deviceId : null;
  const qualNum = typeof quality === "number" ? quality : 0;

  // Collect all templates provided
  const templatesToSave: string[] = [String(templateData)];
  if (template2 && isValidTemplate(template2)) templatesToSave.push(String(template2));
  if (template3 && isValidTemplate(template3)) templatesToSave.push(String(template3));

  const savedIds: string[] = [];
  for (const td of templatesToSave) {
    const tpl = await prisma.fingerprintTemplate.create({
      data: { userId, finger: fingerIndex, templateData: encryptTemplate(td), quality: qualNum, source: srcStr, deviceId: devStr },
    });
    savedIds.push(tpl.id);
  }

  await prisma.fingerprintAuditLog.create({
    data: { userId, action: "enroll", source: srcStr, finger: fingerIndex, quality: qualNum, ipAddress, userAgent },
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    templateId: savedIds[0],
    templatesEnrolled: savedIds.length,
  });
}
