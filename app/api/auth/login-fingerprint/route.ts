/**
 * POST /api/auth/login-fingerprint  v11.0 — FINGERPRINT-ONLY LOGIN (no ID/role needed)
 *
 * Flow:
 *   1. Frontend FingerprintScanner captures live scan via ZKTeco bridge WebSocket
 *   2. Client sends { templateData } — the captured template
 *   3. Server loads ALL enrolled templates from ALL users
 *   4. Sends them to bridge /identify for 1:N matching
 *   5. Matched fid maps back to a userId → auto-login that user
 *
 * Rate limit: max 10 attempts / IP / 60s
 */
import { NextResponse } from "next/server";
import { prisma }       from "@/lib/db";
import { signSession }  from "@/lib/auth";
import { serialize }    from "cookie";
import { headers }      from "next/headers";
import { decryptTemplate } from "@/lib/crypto";

const rlMap = new Map<string, { count: number; resetAt: number }>();
function checkRL(ip: string): boolean {
  const now = Date.now();
  const e = rlMap.get(ip);
  if (!e || now > e.resetAt) { rlMap.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  if (e.count >= 10) return false;
  e.count++;
  return true;
}

export async function POST(req: Request) {
  const hdrs = await headers();
  const ip   = hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip") ?? "unknown";

  if (!checkRL(ip))
    return NextResponse.json({ ok: false, error: "Too many attempts. Wait 60 seconds." }, { status: 429 });

  let body: Record<string, unknown>;
  try   { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 }); }

  const { templateData } = body;

  if (!templateData || typeof templateData !== "string" || templateData.trim() === "")
    return NextResponse.json({ ok: false, error: "No fingerprint data received." }, { status: 400 });

  const bridgeUrl = process.env.ZKFINGER_BRIDGE_URL;
  if (!bridgeUrl)
    return NextResponse.json({ ok: false, error: "Fingerprint bridge not configured on server." }, { status: 503 });

  // Load ALL enrolled fingerprint templates across ALL users
  const allTemplates = await prisma.fingerprintTemplate.findMany({
    where:  { source: "zkteco" },
    select: { id: true, userId: true, templateData: true },
    orderBy: { createdAt: "asc" },
  });

  if (allTemplates.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "No fingerprints registered yet. Please create an account first.",
    }, { status: 401 });
  }

  console.log(`[login-fp] Running 1:N identify against ${allTemplates.length} stored templates…`);

  // Build fid-indexed payload for bridge /identify
  const tplPayload = allTemplates.map((t, i) => ({ fid: i + 1, tpl: decryptTemplate(t.templateData) }));

  let identifyResult: { matched: boolean; fid: number; score: number } | null = null;
  try {
    const identRes = await fetch(`${bridgeUrl}/identify`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ scan: templateData, templates: tplPayload }),
      signal:  AbortSignal.timeout(40000),
    });
    if (!identRes.ok) {
      const errText = await identRes.text().catch(() => "");
      console.error(`[login-fp] bridge /identify returned ${identRes.status}: ${errText}`);
      return NextResponse.json({ ok: false, error: "Fingerprint scanner error. Try again." }, { status: 503 });
    }
    identifyResult = await identRes.json();
  } catch (e) {
    console.error("[login-fp] identify fetch error:", e);
    return NextResponse.json({ ok: false, error: "Could not reach fingerprint bridge. Make sure START-BRIDGE.bat is running." }, { status: 503 });
  }

  console.log(`[login-fp] identify result: matched=${identifyResult?.matched} fid=${identifyResult?.fid} score=${identifyResult?.score}`);

  const auditBase = {
    source:    "zkteco",
    quality:   identifyResult?.score ?? 0,
    ipAddress: ip,
    userAgent: hdrs.get("user-agent") ?? null,
  };

  if (!identifyResult?.matched || !identifyResult.fid || identifyResult.fid < 1) {
    await prisma.fingerprintAuditLog.create({
      data: { ...auditBase, userId: null, action: "verify_fail" },
    }).catch(() => {});
    return NextResponse.json({
      ok:    false,
      error: "Fingerprint not recognised. Make sure you are registered, or try again.",
      score: identifyResult?.score ?? 0,
    }, { status: 401 });
  }

  // Map matched fid back to the user record
  const matchedTemplate = allTemplates[identifyResult.fid - 1];
  if (!matchedTemplate) {
    console.error(`[login-fp] fid ${identifyResult.fid} out of range (total=${allTemplates.length})`);
    return NextResponse.json({ ok: false, error: "Fingerprint match error. Try again." }, { status: 500 });
  }

  const matchedUserId = matchedTemplate.userId;
  console.log(`[login-fp] MATCHED → userId=${matchedUserId} fid=${identifyResult.fid} score=${identifyResult.score}`);

  // Load full user record
  const user = await prisma.user.findUnique({
    where:  { id: matchedUserId },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Matched user account not found. Contact administrator." }, { status: 401 });
  }

  // Get credential for JWT session
  const credential = await prisma.credential.findFirst({ where: { userId: matchedUserId } });
  if (!credential) {
    return NextResponse.json({ ok: false, error: "Account credentials missing. Contact administrator." }, { status: 401 });
  }

  const token = await signSession({
    username: credential.username,
    role:     credential.role as "admin" | "employee",
  });

  const cookie = serialize("session", token, {
    httpOnly: true,
    sameSite: "lax",
    path:     "/",
    secure:   process.env.NODE_ENV === "production",
    maxAge:   60 * 60 * 24 * 7,
  });

  await prisma.fingerprintAuditLog.create({
    data: { ...auditBase, userId: matchedUserId, action: "verify_success" },
  }).catch(() => {});

  console.log(`[login-fp] SUCCESS → userId=${matchedUserId} role=${user.role} score=${identifyResult.score}`);

  return NextResponse.json(
    {
      ok:           true,
      role:         user.role,
      userId:       user.id,
      firstName:    user.firstName,
      lastName:     user.lastName,
      scheduleTime: user.scheduleTime ?? "08:00",
      user,
      score:        identifyResult.score,
    },
    { headers: { "Set-Cookie": cookie } }
  );
}
