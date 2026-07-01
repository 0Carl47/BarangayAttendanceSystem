/**
 * POST /api/fingerprint/verify
 * Verify a live fingerprint against stored templates.
 * Used for attendance time-in/time-out (unauthenticated endpoint).
 *
 * Body: { templateData: string (base64), source?: string }
 * Returns: { ok, userId, score } | { ok:false, error, score? }
 *
 * v3.0 FIX: passes stored template source to sdkMatch so ZKTeco templates
 * are NEVER matched via Hamming fallback.
 */
import { NextResponse } from "next/server";
import { prisma }        from "@/lib/db";
import { isValidTemplate, sdkMatch, MATCH_THRESHOLD } from "@/lib/fingerprint";
import { headers } from "next/headers";

// Simple in-memory rate limiter: max 10 attempts / IP / 60 s
const rlMap = new Map<string, { count: number; resetAt: number }>();
function checkRL(ip: string): boolean {
  const now = Date.now();
  const e   = rlMap.get(ip);
  if (!e || now > e.resetAt) { rlMap.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  if (e.count >= 10) return false;
  e.count++;
  return true;
}

export async function POST(req: Request) {
  const hdrs = await headers();
  const ip   = hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip") ?? "unknown";

  if (!checkRL(ip))
    return NextResponse.json({ ok: false, error: "Too many requests. Wait 60 s." }, { status: 429 });

  let body: Record<string, unknown>;
  try   { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const { templateData, source } = body;
  if (!isValidTemplate(templateData))
    return NextResponse.json({ ok: false, error: "Invalid templateData (base64, ≥64 bytes)" }, { status: 400 });

  const srcFilter = typeof source === "string" ? source : undefined;

  const allTemplates = await prisma.fingerprintTemplate.findMany({
    where:  srcFilter ? { source: srcFilter } : undefined,
    select: { id: true, userId: true, finger: true, templateData: true, source: true },
  });

  if (allTemplates.length === 0) {
    return NextResponse.json({ ok: false, error: "No enrolled fingerprints found", score: 0 }, { status: 401 });
  }

  // Match against all stored templates in batches
  // Pass stored template's source so Hamming is NEVER used for ZKTeco templates
  const BATCH = 10;
  let bestScore  = 0;
  let bestUserId: string | null = null;
  let bestFinger = 0;

  for (let i = 0; i < allTemplates.length; i += BATCH) {
    const slice   = allTemplates.slice(i, i + BATCH);
    const scores  = await Promise.all(
      slice.map((t) => sdkMatch(String(templateData), t.templateData, t.source))
    );
    for (let j = 0; j < slice.length; j++) {
      if (scores[j] > bestScore) {
        bestScore  = scores[j];
        bestUserId = slice[j].userId;
        bestFinger = slice[j].finger;
      }
    }
    if (bestScore >= 90) break; // early exit on very strong match
  }

  const matched = bestScore >= MATCH_THRESHOLD && bestUserId !== null;

  await prisma.fingerprintAuditLog.create({
    data: {
      userId:    matched ? bestUserId : null,
      action:    matched ? "verify_success" : "verify_fail",
      source:    srcFilter ?? "zkteco",
      finger:    matched ? bestFinger : null,
      quality:   bestScore,
      ipAddress: ip,
      userAgent: hdrs.get("user-agent") ?? null,
    },
  }).catch(() => {});

  if (!matched) {
    return NextResponse.json(
      { ok: false, error: "Fingerprint not recognized", score: bestScore },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true, userId: bestUserId, score: bestScore, finger: bestFinger });
}
