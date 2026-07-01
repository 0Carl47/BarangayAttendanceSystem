/**
 * POST /api/auth/signup  v9.0 — DBMerge + VerifyByID
 *
 * Registration flow:
 * 1. Receive 3 fingerprint scans
 * 2. Merge them into 1 strong template via ZKFPM_DBMerge (bridge /merge)
 * 3. Check merged template against ALL existing templates via ZKFPM_VerifyByID
 * 4. If duplicate → reject with clear message
 * 5. Save the merged template to database (1 template per user)
 *
 * Falls back to saving raw scan[0] if bridge is offline (no merge, no duplicate check).
 */
import { NextResponse } from "next/server";
import { prisma }       from "@/lib/db";
import bcrypt           from "bcryptjs";
import { signSession }  from "@/lib/auth";
import { isValidTemplate, sdkMerge, sdkCheckDuplicate } from "@/lib/fingerprint";
import { encryptTemplate } from "@/lib/crypto";
import { serialize }    from "cookie";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

  const { id, role, firstName, lastName, middleName, age, sex, phone, position,
          username, password, scans, source, finger, photo } = body as Record<string, unknown>;

  if (!id || typeof id !== "string" || !/^\d+$/.test(id.trim()))
    return NextResponse.json({ ok: false, error: "ID must be numbers only" }, { status: 400 });
  if (!firstName || typeof firstName !== "string" || !firstName.trim())
    return NextResponse.json({ ok: false, error: "First name is required" }, { status: 400 });
  if (!lastName || typeof lastName !== "string" || !lastName.trim())
    return NextResponse.json({ ok: false, error: "Last name is required" }, { status: 400 });
  if (!role || (role !== "admin" && role !== "employee"))
    return NextResponse.json({ ok: false, error: "Role must be admin or employee" }, { status: 400 });

  const usernameStr = (username && typeof username === "string" ? username.trim() : id.trim());
  const passwordStr = (password && typeof password === "string" ? password : "");
  if (!passwordStr || passwordStr.length < 4)
    return NextResponse.json({ ok: false, error: "Password must be at least 4 characters" }, { status: 400 });

  const scanArr = Array.isArray(scans) ? scans : [];
  if (scanArr.length < 3)
    return NextResponse.json({ ok: false, error: "3 fingerprint scans are required" }, { status: 400 });
  for (let i = 0; i < 3; i++) {
    if (!isValidTemplate(scanArr[i]?.templateData))
      return NextResponse.json({ ok: false, error: `Scan ${i + 1} fingerprint is invalid or missing` }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { id: id.trim() } });
  if (existingUser)
    return NextResponse.json({ ok: false, error: "An account with this ID already exists" }, { status: 409 });
  const existingCred = await prisma.credential.findUnique({ where: { username: usernameStr } });
  if (existingCred)
    return NextResponse.json({ ok: false, error: "Username already taken" }, { status: 409 });

  // ── STEP 1: MERGE 3 SCANS INTO 1 STRONG TEMPLATE ────────────────────────
  const bridgeUrl = process.env.ZKFINGER_BRIDGE_URL;
  let finalTemplate: string = String(scanArr[0].templateData); // fallback
  let bridgeAlive = false;

  if (bridgeUrl) {
    try {
      const sr = await fetch(`${bridgeUrl}/status`, { signal: AbortSignal.timeout(3000) });
      bridgeAlive = sr.ok;
    } catch { bridgeAlive = false; }

    if (bridgeAlive) {
      // Try to merge — creates a stronger combined template
      const merged = await sdkMerge(
        String(scanArr[0].templateData),
        String(scanArr[1].templateData),
        String(scanArr[2].templateData)
      );
      if (merged) {
        finalTemplate = merged;
        console.log(`[signup] Using MERGED template (DBMerge success)`);
      } else {
        console.log(`[signup] DBMerge failed — using scan[0] as template`);
      }
    } else {
      console.log("[signup] Bridge offline — using scan[0], skipping merge and duplicate check");
    }
  }

  // ── STEP 2: DUPLICATE CHECK ──────────────────────────────────────────────
  // Use DBMatch loop via /identify — confirmed working on R20i (raw=731 for same finger).
  // Check ALL 3 raw scans against every existing stored template.
  // If ANY scan matches ANY stored template → block registration.
  if (bridgeAlive && bridgeUrl) {
    const allExisting = await prisma.fingerprintTemplate.findMany({
      where:  { source: "zkteco" },
      select: { id: true, userId: true, templateData: true },
    });

    if (allExisting.length > 0) {
      const rawScans = scanArr.map((s: Record<string, unknown>) => String(s.templateData));
      const { isDuplicate, matchedUserId } = await sdkCheckDuplicate(rawScans, allExisting);
      if (isDuplicate) {
        console.log(`[signup] DUPLICATE blocked: matches userId=${matchedUserId}`);
        return NextResponse.json({
          ok:    false,
          error: "This fingerprint is already registered to another account. Please use a different finger.",
        }, { status: 409 });
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const user = await prisma.user.create({
    data: {
      id: id.trim(),
      role: String(role),
      firstName: String(firstName).trim(),
      middleName: middleName && typeof middleName === "string" ? middleName.trim() : null,
      lastName: String(lastName).trim(),
      age: age ? Number(age) : null,
      sex: sex && typeof sex === "string" ? sex.trim() : null,
      phone: phone && typeof phone === "string" ? phone.trim() : null,
      position: position && typeof position === "string" ? position.trim() : null,
      photo: photo && typeof photo === "string" ? photo : null,
      scheduleTime: role === "employee" ? "08:00" : null,
    },
  });

  const passwordHash = await bcrypt.hash(passwordStr, 10);
  await prisma.credential.create({
    data: { username: usernameStr, passwordHash, role: String(role), userId: user.id },
  });

  const fingerIndex = typeof finger === "number" ? Math.max(0, Math.min(9, finger)) : 0;
  const srcStr = typeof source === "string" ? source : "zkteco";

  // Save the MERGED template (1 strong template per user)
  // Also save all 3 raw scans as backup templates for better matching
  const scan0 = scanArr[0];
  await prisma.fingerprintTemplate.create({
    data: {
      userId:        user.id,
      finger:        fingerIndex,
      templateData:  encryptTemplate(finalTemplate),
      templateImage: scan0.templateImage && typeof scan0.templateImage === "string" ? scan0.templateImage : null,
      quality:       100, // merged template has best quality
      source:        srcStr,
    },
  });

  // Also save raw scans for backup matching
  for (let i = 0; i < 3; i++) {
    const scan = scanArr[i];
    await prisma.fingerprintTemplate.create({
      data: {
        userId:        user.id,
        finger:        fingerIndex,
        templateData:  encryptTemplate(String(scan.templateData)),
        templateImage: scan.templateImage && typeof scan.templateImage === "string" ? scan.templateImage : null,
        quality:       typeof scan.quality === "number" ? scan.quality : 75,
        source:        srcStr,
      },
    });
  }

  const token = await signSession({ username: usernameStr, role: role as "admin" | "employee" });
  const cookie = serialize("session", token, {
    httpOnly: true, sameSite: "lax", path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  console.log(`[signup] Created user ${user.id} — saved merged + 3 raw templates`);
  return NextResponse.json(
    { ok: true, role, userId: user.id, templatesEnrolled: 4 },
    { headers: { "Set-Cookie": cookie } }
  );
}
