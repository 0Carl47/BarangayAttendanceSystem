/**
 * GET /api/fingerprint/bridge-status
 * Returns bridge liveness, device state, and WebSocket URL for the browser.
 */
import { NextResponse } from "next/server";
import { isBridgeAlive } from "@/lib/fingerprint";

export async function GET() {
  const bridgeRunning = await isBridgeAlive();

  let deviceReady = false;
  let dllLoaded   = false;
  let mode        = "simulation";

  if (bridgeRunning) {
    try {
      const res  = await fetch(
        `${process.env.ZKFINGER_BRIDGE_URL}/status`,
        { signal: AbortSignal.timeout(2000) }
      );
      const data = await res.json() as {
        deviceReady?: boolean;
        dllLoaded?:   boolean;
        mode?:        string;
      };
      deviceReady = data.deviceReady ?? false;
      dllLoaded   = data.dllLoaded   ?? false;
      mode        = data.mode        ?? "simulation";
    } catch {}
  }

  return NextResponse.json({
    bridgeRunning,
    deviceReady,
    dllLoaded,
    mode,
    wsUrl: "ws://127.0.0.1:8889",
  });
}
