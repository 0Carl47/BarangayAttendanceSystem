/**
 * GET /api/fingerprint/all-templates
 *
 * Returns all registered fingerprint templates (template data only, no PII).
 * Used by FingerprintScanner for early duplicate detection after scan 1.
 * Each item: { id, tpl } — fid is assigned by index on the client side.
 */
import { NextResponse } from "next/server";
import { prisma }       from "@/lib/db";
import { decryptTemplate } from "@/lib/crypto";

export async function GET() {
  try {
    const templates = await prisma.fingerprintTemplate.findMany({
      where:  { source: "zkteco" },
      select: { id: true, templateData: true },
    });

    return NextResponse.json({
      templates: templates.map(t => ({ id: t.id, tpl: decryptTemplate(t.templateData) })),
    });
  } catch (e) {
    console.error("[all-templates] error:", e);
    return NextResponse.json({ templates: [] });
  }
}
