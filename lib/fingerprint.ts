/**
 * lib/fingerprint.ts  v10.0 — DBMatch-based matching
 *
 * Uses /identify endpoint which loops through templates using exe DBMatch.
 * DBMatch confirmed working on R20i: raw=731 for same finger, 0 for different.
 * /verify (VerifyByID) was broken — non-zero for correct finger.
 *
 * For duplicate check at signup: send the new scan as "scan" and all existing
 * templates as the "templates" array — if any match, it's a duplicate.
 */

import { decryptTemplate } from "./crypto";

export const MATCH_THRESHOLD              = 50;
export const DUPLICATE_THRESHOLD          = 50;
export const SAME_FINGER_ENROLL_THRESHOLD = 50;

// Use /identify for 1:N matching — DBMatch loop, confirmed working on R20i
// Returns score > 0 if the scan matches any of the provided templates
export async function sdkMatch(scanTemplate: string, storedTemplate: string, _source?: string): Promise<number> {
  const bridgeUrl = process.env.ZKFINGER_BRIDGE_URL;
  if (!bridgeUrl) return 0;
  try {
    const decryptedStored = decryptTemplate(storedTemplate);
    const res = await fetch(`${bridgeUrl}/identify`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ scan: scanTemplate, templates: [{ fid: 1, tpl: decryptedStored }] }),
      signal:  AbortSignal.timeout(15000),
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { matched?: boolean; score?: number; fid?: number; error?: string };
    if (data.error) return 0;
    const score = data.matched ? (data.score ?? 80) : 0;
    console.log(`[sdkMatch] matched=${data.matched} score=${score}`);
    return score;
  } catch (e) {
    console.error(`[sdkMatch] fetch failed:`, e);
    return 0;
  }
}

// Duplicate check: check scans sequentially against all stored templates.
// Uses only scan[0] (the reference scan) — if it matches any stored template, block registration.
// Sequential is safer here since the bridge queues device commands; parallel caused timeouts.
export async function sdkCheckDuplicate(
  scanTemplates: string[],
  allStored: { id: string; userId: string; templateData: string }[]
): Promise<{ isDuplicate: boolean; matchedUserId?: string }> {
  const bridgeUrl = process.env.ZKFINGER_BRIDGE_URL;
  if (!bridgeUrl || allStored.length === 0) return { isDuplicate: false };

  // Only check scan[0] — it's the reference scan and avoids 3x the load
  const scan = scanTemplates[0];
  if (!scan) return { isDuplicate: false };

  const storedPayload = allStored.map((t, i) => ({ fid: i + 1, tpl: decryptTemplate(t.templateData) }));

  try {
    const res = await fetch(`${bridgeUrl}/identify`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ scan, templates: storedPayload }),
      signal:  AbortSignal.timeout(60000), // generous timeout for large employee lists
    });
    if (!res.ok) return { isDuplicate: false }; // fail-open on bridge error
    const data = (await res.json()) as { matched?: boolean; fid?: number; score?: number };
    if (data.matched && data.fid && data.fid > 0) {
      const matchedRecord = allStored[data.fid - 1];
      if (matchedRecord) {
        console.log(`[sdkCheckDuplicate] DUPLICATE: scan matched fid=${data.fid} score=${data.score} userId=${matchedRecord.userId}`);
        return { isDuplicate: true, matchedUserId: matchedRecord.userId };
      }
    }
    return { isDuplicate: false };
  } catch (e) {
    console.error(`[sdkCheckDuplicate] error:`, e);
    return { isDuplicate: false }; // fail-open — don't block signup if check fails
  }
}

// Call /merge endpoint (uses ZKFPM_DBMerge) to create strong registration template
export async function sdkMerge(t1: string, t2: string, t3: string): Promise<string | null> {
  const bridgeUrl = process.env.ZKFINGER_BRIDGE_URL;
  if (!bridgeUrl) return null;
  try {
    const res = await fetch(`${bridgeUrl}/merge`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ t1, t2, t3 }),
      signal:  AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { merged?: string; len?: number; error?: string; fallback?: boolean };
    if (data.error || !data.merged) return null;
    console.log(`[sdkMerge] merged template len=${data.len} fallback=${data.fallback ?? false}`);
    return data.merged;
  } catch (e) {
    console.error(`[sdkMerge] fetch failed:`, e);
    return null;
  }
}

export async function isBridgeAlive(): Promise<boolean> {
  const bridgeUrl = process.env.ZKFINGER_BRIDGE_URL;
  if (!bridgeUrl) return false;
  try {
    const res = await fetch(`${bridgeUrl}/status`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean };
    return data.ok === true;
  } catch { return false; }
}

export function isValidTemplate(t: unknown): t is string {
  if (typeof t !== "string" || t.length === 0) return false;
  try { return Buffer.from(t, "base64").length >= 64; }
  catch { return false; }
}

export function isZktecoTemplate(b64: string): boolean {
  return isValidTemplate(b64);
}
