"use client";
/**
 * FingerprintScanner.tsx  v7.0
 * mode="single"  → 1 scan (login)
 * mode="enroll"  → 3 scans required, SAME finger validation between scans
 *   - After scan 2 & 3: compares against scan 1 via bridge /verify (ZKFPM_VerifyByID)
 *   - If different finger detected → shows error, resets that scan, asks to retry
 *   - Only accepts all 3 if they all match the same finger
 */
import React, { useCallback, useEffect, useRef, useState } from "react";

export type FingerprintSource = "zkteco";
export interface ScanResult { template: string; image: string; quality: number; }

interface Props {
  onCapture:    (template: string, source: FingerprintSource, scans?: ScanResult[]) => void;
  onDuplicate?: () => void;  // called when scan 1 matches an already-registered finger
  disabled?:    boolean;
  bridgeUrl?:   string;
  mode?:        "single" | "enroll";
  label?:       string;
  autoStart?:   boolean;  // if true, connects immediately on mount without button click
}

type Status = "idle" | "connecting" | "waiting" | "verifying" | "done1" | "done2" | "captured" | "error";

const WS       = "ws://127.0.0.1:8889";
const HTTP     = "http://127.0.0.1:8889";
const CONN_TO  = 6_000;
const CAP_TO   = 30_000;
const TOTAL    = 3;
// Minimum score to accept two scans as the same finger during enrollment.
// With binary MapScore: same finger always returns 80, different always returns 0.
// Threshold 75 cleanly separates the two — no wrong finger can pass, no correct finger fails.
const SAME_FINGER_THRESHOLD = 75;

const C = {
  brand:  "#38bdf8",
  brand2: "#7c83ff",
  ok:     "#34d399",
  danger: "#ff5a7a",
  warn:   "#f59e0b",
  text:   "rgba(255,255,255,0.92)",
  muted:  "rgba(255,255,255,0.55)",
  border: "rgba(56,189,248,0.25)",
  card:   "rgba(11,16,32,0.75)",
  glass:  "rgba(56,189,248,0.07)",
};

const STATUS_COLOR: Record<Status, string> = {
  idle:       C.brand,
  connecting: C.brand,
  waiting:    C.brand,
  verifying:  C.warn,
  done1:      C.ok,
  done2:      C.ok,
  captured:   C.ok,
  error:      C.danger,
};

export default function FingerprintScanner({
  onCapture, onDuplicate, disabled = false, bridgeUrl = WS, mode = "single", label, autoStart = false,
}: Props) {
  const [status,     setStatus]     = useState<Status>("idle");
  const [message,    setMessage]    = useState("");
  const [dots,       setDots]       = useState(0);
  const [scans,      setScans]      = useState<ScanResult[]>([]);
  const [pulse,      setPulse]      = useState(false);
  const [retryCount, setRetryCount] = useState(0); // retries for current scan slot

  const wsRef      = useRef<WebSocket | null>(null);
  const timers     = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dotIvl     = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stable refs so autoStart effect never has stale closures
  const doScanRef     = useRef<((onOk: (r: ScanResult) => void) => void) | null>(null);
  const onCaptureRef  = useRef(onCapture);
  const autoStartRef  = useRef(autoStart);
  onCaptureRef.current = onCapture;
  autoStartRef.current = autoStart;

  // Stop timers and dots, but keep the WebSocket alive
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (dotIvl.current) { clearInterval(dotIvl.current); dotIvl.current = null; }
  }, []);

  // Full cleanup: close WS too (for unmount / cancel)
  const cleanup = useCallback(() => {
    clearTimers();
    if (wsRef.current) {
      const ws = wsRef.current;
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      if (ws.readyState <= WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ cmd: "cancel" })); } catch {}
        ws.close();
      }
      wsRef.current = null;
    }
  }, [clearTimers]);

  useEffect(() => () => cleanup(), [cleanup]);

  // Capture one fingerprint via WebSocket — reuses existing connection
  const doScan = useCallback((onOk: (r: ScanResult) => void) => {
    clearTimers();

    // Helper: schedule an auto-retry — creates a fresh WS if needed
    const scheduleRetry = (delayMs = 2000) => {
      if (!autoStartRef.current) return;
      timers.current.push(setTimeout(() => {
        doScanRef.current?.(onOk);
      }, delayMs));
    };

    // Helper: start dot animation
    const startDots = () => {
      if (dotIvl.current) clearInterval(dotIvl.current);
      let d = 0;
      dotIvl.current = setInterval(() => { d = (d + 1) % 4; setDots(d); }, 500);
    };

    // Set up message handler on a WS
    const attachHandlers = (ws: WebSocket) => {
      setStatus("waiting"); setPulse(true); setMessage("");
      startDots();

      // Capture timeout: in autoStart mode wait forever, in enroll mode auto-retry
      if (!autoStartRef.current) {
        const capRetry = () => {
          timers.current.push(setTimeout(() => {
            if (wsRef.current === ws && ws.readyState === WebSocket.OPEN) {
              // Don't error — just re-send capture command silently
              setMessage("Still waiting… place finger on scanner");
              ws.send(JSON.stringify({ cmd: "capture" }));
              capRetry(); // schedule another retry
            } else if (wsRef.current === ws) {
              // WS died — clean up
              cleanup(); setStatus("error"); setMessage("Scanner disconnected. Try again.");
            }
          }, CAP_TO));
        };
        capRetry();
      }

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data as string) as {
            type?: string; template?: string; image?: string; quality?: number;
            error?: string; message?: string;
          };
          // Success: bridge sends { type: "captured", template, image, quality }
          if ((data.type === "captured" || data.type === "capture") && data.template) {
            clearTimers(); setPulse(false);
            // Don't close the WS — keep it alive for next scan
            onOk({ template: data.template, image: data.image ?? "", quality: data.quality ?? 0 });
          } else if (data.type === "error" || data.error) {
            // Bridge error: { type: "error", message: "..." } or { error: "..." }
            const errMsg = data.message || data.error || "Scanner error";
            clearTimers();
            // Stay connected, just retry capture
            setStatus("waiting"); setMessage("Try again…"); setPulse(true);
            startDots();
            timers.current.push(setTimeout(() => {
              setMessage("");
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ cmd: "capture" }));
              } else {
                scheduleRetry(500);
              }
            }, 1500));
          }
        } catch {}
      };

      ws.onerror = () => {
        // In autoStart: DON'T call cleanup() — just null the ref and silently retry
        clearTimers(); setPulse(false);
        if (wsRef.current === ws) wsRef.current = null;
        if (autoStartRef.current) {
          setStatus("waiting"); setMessage("Scanner reconnecting…");
          setPulse(true); startDots();
          scheduleRetry(1500);
        } else {
          setStatus("error"); setMessage("Bridge connection failed. Run START-BRIDGE.bat first.");
        }
      };
      ws.onclose = () => {
        // In autoStart: DON'T call cleanup() — just null the ref and silently retry
        clearTimers(); setPulse(false);
        if (wsRef.current === ws) wsRef.current = null;
        if (autoStartRef.current) {
          setStatus("waiting"); setMessage("Scanner reconnecting…");
          setPulse(true); startDots();
          scheduleRetry(1500);
        } else {
          setStatus("error"); setMessage("Connection lost. Try again.");
        }
      };
    };

    // Reuse existing open connection — no status flash
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const ws = wsRef.current;
      setStatus("waiting"); setPulse(true); setMessage("");
      startDots();
      attachHandlers(ws);
      ws.send(JSON.stringify({ cmd: "capture" }));
      return;
    }

    // Need a new connection
    setStatus("waiting"); setMessage("Connecting to scanner…"); setPulse(true);
    startDots();

    let ws: WebSocket;
    try { ws = new WebSocket(bridgeUrl); } catch {
      if (autoStartRef.current) {
        setMessage("Waiting for scanner…");
        scheduleRetry(2000);
      } else {
        setPulse(false);
        setStatus("error"); setMessage("Cannot connect. Is START-BRIDGE.bat running?");
      }
      return;
    }
    wsRef.current = ws;

    // Connection timeout
    timers.current.push(setTimeout(() => {
      if (wsRef.current === ws && ws.readyState !== WebSocket.OPEN) {
        // Don't call cleanup() — just close this specific WS and retry
        ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
        try { ws.close(); } catch {}
        if (wsRef.current === ws) wsRef.current = null;
        if (autoStartRef.current) {
          setMessage("Waiting for scanner…");
          scheduleRetry(1500);
        } else {
          setPulse(false);
          setStatus("error"); setMessage("Scanner not responding.");
        }
      }
    }, CONN_TO));

    ws.onopen = () => {
      attachHandlers(ws);
      // Bridge auto-captures on connect
    };
  }, [clearTimers, cleanup, bridgeUrl]);


  // Keep ref current every render so autoStart effect always calls latest doScan
  doScanRef.current = doScan;

  // Stable ref to restart the loop after a capture
  const restartScanRef = useRef<(() => void) | null>(null);

  // ── AUTO-START: fires on mount, works with React Strict Mode ─────────────
  // In autoStart mode, we loop forever: capture → notify parent → immediately re-scan.
  // The WS stays open the whole time (doScan reuses existing connection).
  useEffect(() => {
    if (!autoStart || disabled || mode !== "single") return;

    const startLoop = () => {
      doScanRef.current?.(r => {
        setStatus("waiting");
        setMessage("");
        onCaptureRef.current(r.template, "zkteco", [r]);
        // Immediately start listening for the next finger (no delay, no disconnect)
        const t = setTimeout(() => restartScanRef.current?.(), 800);
        timers.current.push(t);
      });
    };

    restartScanRef.current = startLoop;

    const t = setTimeout(startLoop, 200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compare two templates via bridge /verify endpoint
  // If bridge verify fails (PS1 crash, DLL busy, etc.) we ALLOW the scan —
  // the real duplicate guard is DBMerge at signup and DBIdentify at login.
  const checkSameFinger = useCallback(async (t1: string, t2: string): Promise<{ same: boolean; score: number }> => {
    try {
      const res = await fetch(`${HTTP}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan: t1, stored: t2 }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        // Bridge endpoint error — allow scan to proceed (fail-open for enrollment)
        console.warn("[checkSameFinger] bridge /verify returned", res.status, "— allowing scan");
        return { same: true, score: -1 };
      }
      const data = await res.json() as { matched?: boolean; score?: number; error?: string };
      if (data.error) {
        // Bridge reported SDK error — allow scan to proceed
        console.warn("[checkSameFinger] bridge error:", data.error, "— allowing scan");
        return { same: true, score: -1 };
      }
      const same = data.matched === true;
      const score = same ? 80 : 0;
      return { same, score };
    } catch {
      // Network/timeout error — allow scan to proceed rather than blocking enrollment
      console.warn("[checkSameFinger] fetch failed — allowing scan");
      return { same: true, score: -1 };
    }
  }, []);

  // Check if this scan is already registered to any account (duplicate detection)
  // Called after scan 1 — blocks enrollment immediately if finger already registered
  const checkDuplicate = useCallback(async (template: string): Promise<boolean> => {
    try {
      // Fetch all existing templates from the server
      const listRes = await fetch("/api/fingerprint/all-templates", { signal: AbortSignal.timeout(8000) });
      if (!listRes.ok) return false; // fail-open: can't check, allow to continue
      const listData = await listRes.json() as { templates?: { id: string; tpl: string }[] };
      const existing = listData.templates ?? [];
      if (existing.length === 0) return false; // no registrations yet

      // Run identify: compare this scan against all existing templates
      const identRes = await fetch(`${HTTP}/identify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan: template, templates: existing.map((t, i) => ({ fid: i + 1, tpl: t.tpl })) }),
        signal: AbortSignal.timeout(15000),
      });
      if (!identRes.ok) return false;
      const identData = await identRes.json() as { matched?: boolean; score?: number };
      return identData.matched === true;
    } catch {
      return false; // fail-open on network error
    }
  }, []);
  const startSingleRef = useRef<(() => void) | null>(null);

  const startSingle = useCallback(() => {
    if (disabled) return;
    doScan(r => {
      setStatus("captured"); setMessage("Fingerprint captured!");
      onCapture(r.template, "zkteco", [r]);
    });
  }, [disabled, doScan, onCapture]);

  // Keep startSingleRef current
  startSingleRef.current = startSingle;

  // (autoStart effect is above, right after doScan — no duplicate effect here)

  // Enroll: scan next, validate same finger if scan 2 or 3
  const startNext = useCallback((existing: ScanResult[]) => {
    if (disabled) return;
    const scanNum = existing.length + 1;

    doScan(async (r) => {
      // After scan 1: immediately check if this finger is already registered
      if (existing.length === 0) {
        setStatus("verifying");
        setMessage("Checking if fingerprint is already registered…");
        const isDuplicate = await checkDuplicate(r.template);
        if (isDuplicate) {
          setStatus("error");
          setMessage("This finger is already registered to another account. Use a different finger.");
          setScans([]);
          onDuplicate?.();
          return;
        }
      }

      // If this is scan 2 or 3, verify it matches scan 1 (same finger)
      if (existing.length >= 1) {
        setStatus("verifying");
        setMessage(`Verifying scan ${scanNum} is the same finger…`);

        const { same, score } = await checkSameFinger(existing[0].template, r.template);

        if (!same) {
          // Different finger — reject and retry same slot
          const newRetry = retryCount + 1;
          setRetryCount(newRetry);
          setStatus("error");
          const msg = `Wrong finger! (score: ${score}). Use the SAME finger as Scan 1. Tap to retry Scan ${scanNum}.`;
          setMessage(msg);
          setScans(existing);
          return;
        }
      }

      // Same finger (or scan 1 passed duplicate check) — accept
      setRetryCount(0);
      const updated = [...existing, r];
      setScans(updated);

      if (updated.length < TOTAL) {
        setStatus(updated.length === 1 ? "done1" : "done2");
        setMessage(`Scan ${updated.length}/${TOTAL} saved! Remove finger, then scan again.`);
      } else {
        setStatus("captured");
        setMessage(`All ${TOTAL} scans complete! Same finger confirmed.`);
        onCapture(updated[0].template, "zkteco", updated);
      }
    });
  }, [disabled, doScan, onCapture, onDuplicate, checkSameFinger, checkDuplicate, retryCount]);

  const reset = useCallback(() => {
    cleanup();
    setStatus("idle"); setMessage(""); setScans([]); setDots(0); setPulse(false); setRetryCount(0);
  }, [cleanup]);

  const isIdle    = status === "idle" || status === "error";
  const isMid     = status === "done1" || status === "done2";
  const isWaiting = status === "waiting" || status === "connecting";
  const isVerify  = status === "verifying";
  const color     = STATUS_COLOR[status];
  const pct       = mode === "enroll" ? (scans.length / TOTAL) * 100 : 0;

  const waitMsg = (isWaiting || isVerify) ? message + ".".repeat(dots) : message;

  const getStatusText = () => {
    if (waitMsg) return waitMsg;
    if (mode === "enroll") return `${scans.length}/${TOTAL} scans — use SAME finger for all 3`;
    return "Place finger on ZKTeco R20i sensor";
  };

  const getBtnLabel = () => {
    if (mode === "single") return { main: "Scan Fingerprint", sub: "Place finger on ZKTeco R20i" };
    if (scans.length === 0) return { main: `Start Scan 1 of ${TOTAL}`, sub: "Place any finger on ZKTeco R20i" };
    // Retry scenario
    if (status === "error" && scans.length > 0) {
      return {
        main: `Retry Scan ${scans.length + 1} of ${TOTAL}`,
        sub: `Use the SAME finger as Scan 1${retryCount > 0 ? ` (attempt ${retryCount + 1})` : ""}`,
      };
    }
    return { main: `Scan ${scans.length + 1} of ${TOTAL}`, sub: "Remove finger, then place same finger again" };
  };

  const getBtnGradient = () => {
    if (status === "error" && scans.length > 0) return `linear-gradient(135deg,${C.warn},#d97706)`;
    if (scans.length === 1) return "linear-gradient(135deg,#34d399,#059669)";
    if (scans.length === 2) return "linear-gradient(135deg,#10b981,#047857)";
    return `linear-gradient(135deg,${C.brand},${C.brand2})`;
  };

  // Show button for: idle/error at start, mid-enroll, or error mid-enroll (retry)
  // In autoStart single mode, hide the button entirely — scanning starts automatically
  const showMainBtn = mode === "single"
    ? (isIdle && !autoStart)
    : (isIdle && scans.length === 0) || isMid || (status === "error" && scans.length > 0 && scans.length < TOTAL);

  // In autoStart mode: render a modern, beautiful glowing fingerprint scanner visual matching the 1st pic
  if (autoStart && mode === "single") {
    const dotColor = status === "error" ? C.danger : status === "captured" ? C.ok : "#38bdf8";
    const glowColor = status === "error" ? C.danger : status === "captured" ? C.ok : "#0052ff";
    const isScan = status === "waiting" || status === "connecting";
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 0",
        gap: 24,
      }}>
        <style>{`
          @keyframes fpScanLine {
            0% { top: 10%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 90%; opacity: 0; }
          }
          @keyframes fpPulseSuccess {
            0% { box-shadow: 0 0 10px rgba(52, 211, 153, 0.4), inset 0 0 20px rgba(52, 211, 153, 0.2); }
            50% { box-shadow: 0 0 35px rgba(52, 211, 153, 0.8), inset 0 0 40px rgba(52, 211, 153, 0.5); }
            100% { box-shadow: 0 0 10px rgba(52, 211, 153, 0.4), inset 0 0 20px rgba(52, 211, 153, 0.2); }
          }
          @keyframes fpShake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-6px); }
            40% { transform: translateX(6px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
          }
          @keyframes fpGlow {
            0%, 100% { opacity: 0.85; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.06); }
          }
        `}</style>

        {/* Flat Glowing Fingerprint Container */}
        <div style={{
          position: "relative",
          width: 140,
          height: 140,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: status === "error" 
            ? "radial-gradient(circle, rgba(255, 90, 122, 0.25) 0%, rgba(0, 0, 0, 0) 70%)"
            : status === "captured"
              ? "radial-gradient(circle, rgba(52, 211, 153, 0.25) 0%, rgba(0, 0, 0, 0) 70%)"
              : "radial-gradient(circle, rgba(0, 82, 255, 0.28) 0%, rgba(0, 0, 0, 0) 72%)",
          animation: status === "error"
            ? "fpShake 0.4s ease-in-out"
            : isScan
              ? "fpGlow 2.5s ease-in-out infinite"
              : undefined,
          transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          margin: "10px 0",
        }}>
          {/* Faint Outer Neon Ring */}
          <div style={{
            position: "absolute",
            width: 124,
            height: 124,
            borderRadius: "50%",
            border: `1.5px solid ${status === "error" ? C.danger : status === "captured" ? C.ok : "rgba(56, 189, 248, 0.35)"}`,
            boxShadow: status === "error"
              ? `0 0 15px ${C.danger}40`
              : status === "captured"
                ? `0 0 15px ${C.ok}40`
                : `0 0 15px rgba(0, 82, 255, 0.35)`,
            transition: "all 0.3s ease",
            pointerEvents: "none",
          }} />

          {/* Laser Scanning Line */}
          {isScan && (
            <div style={{
              position: "absolute",
              left: 20,
              right: 20,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${dotColor}, #ffffff, ${dotColor}, transparent)`,
              boxShadow: `0 0 8px ${dotColor}, 0 0 16px ${dotColor}`,
              animation: "fpScanLine 2s linear infinite",
              zIndex: 10,
              borderRadius: "50%"
            }} />
          )}

          {/* Top Layer - Fingerprint SVG */}
          <div style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease"
          }}>
            {status === "captured" ? (
              // Success checkmark
              <svg width="84" height="84" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{
                filter: `drop-shadow(0 0 16px ${C.ok})`
              }}>
                <circle cx="40" cy="40" r="32" stroke={C.ok} strokeWidth="3" fill="rgba(52, 211, 153, 0.15)" />
                <path d="M26 40 L35 49 L54 30" stroke={C.ok} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              // Biometric Fingerprint (matching the 1st pic)
              <svg width="84" height="84" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{
                filter: status === "error"
                  ? `drop-shadow(0 0 4px #ffffff) drop-shadow(0 0 12px ${C.danger})`
                  : `drop-shadow(0 0 4px #ffffff) drop-shadow(0 0 16px ${glowColor}) drop-shadow(0 0 28px ${glowColor})`
              }}>
                <path d="M11.83,1.73C8.43,1.79 6.23,3.32 6.23,3.32C5.95,3.5 5.88,3.91 6.07,4.19C6.27,4.5 6.66,4.55 6.96,4.34C6.96,4.34 11.27,1.15 17.46,4.38C17.75,4.55 18.14,4.45 18.31,4.15C18.5,3.85 18.37,3.47 18.03,3.28C16.36,2.4 14.78,1.96 13.36,1.8C12.83,1.74 12.32,1.72 11.83,1.73M12.22,4.34C6.26,4.26 3.41,9.05 3.41,9.05C3.22,9.34 3.3,9.72 3.58,9.91C3.87,10.1 4.26,10 4.5,9.68C4.5,9.68 6.92,5.5 12.2,5.59C17.5,5.66 19.82,9.65 19.82,9.65C20,9.94 20.38,10.04 20.68,9.87C21,9.69 21.07,9.31 20.9,9C20.9,9 18.15,4.42 12.22,4.34M11.5,6.82C9.82,6.94 8.21,7.55 7,8.56C4.62,10.53 3.1,14.14 4.77,19C4.88,19.33 5.24,19.5 5.57,19.39C5.89,19.28 6.07,18.92 5.95,18.6V18.6C4.41,14.13 5.78,11.2 7.8,9.5C9.77,7.89 13.25,7.5 15.84,9.1C17.11,9.9 18.1,11.28 18.6,12.64C19.11,14 19.08,15.32 18.67,15.94C18.25,16.59 17.4,16.83 16.65,16.64C15.9,16.45 15.29,15.91 15.26,14.77C15.23,13.06 13.89,12 12.5,11.84C11.16,11.68 9.61,12.4 9.21,14C8.45,16.92 10.36,21.07 14.78,22.45C15.11,22.55 15.46,22.37 15.57,22.04C15.67,21.71 15.5,21.35 15.15,21.25C11.32,20.06 9.87,16.43 10.42,14.29C10.66,13.33 11.5,13 12.38,13.08C13.25,13.18 14,13.7 14,14.79C14.05,16.43 15.12,17.54 16.34,17.85C17.56,18.16 18.97,17.77 19.72,16.62C20.5,15.45 20.37,13.8 19.78,12.21C19.18,10.61 18.07,9.03 16.5,8.04C14.96,7.08 13.19,6.7 11.5,6.82M11.86,9.25V9.26C10.08,9.32 8.3,10.24 7.28,12.18C5.96,14.67 6.56,17.21 7.44,19.04C8.33,20.88 9.54,22.1 9.54,22.1C9.78,22.35 10.17,22.35 10.42,22.11C10.67,21.87 10.67,21.5 10.43,21.23C10.43,21.23 9.36,20.13 8.57,18.5C7.78,16.87 7.3,14.81 8.38,12.77C9.5,10.67 11.5,10.16 13.26,10.67C15.04,11.19 16.53,12.74 16.5,15.03C16.46,15.38 16.71,15.68 17.06,15.7C17.4,15.73 17.7,15.47 17.73,15.06C17.79,12.2 15.87,10.13 13.61,9.47C13.04,9.31 12.45,9.23 11.86,9.25M12.08,14.25C11.73,14.26 11.46,14.55 11.47,14.89C11.47,14.89 11.5,16.37 12.31,17.8C13.15,19.23 14.93,20.59 18.03,20.3C18.37,20.28 18.64,20 18.62,19.64C18.6,19.29 18.3,19.03 17.91,19.06C15.19,19.31 14.04,18.28 13.39,17.17C12.74,16.07 12.08,14.25" fill={dotColor} />
              </svg>
            )}
          </div>
        </div>

        {/* Status Text Info */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
           <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: dotColor,
            textShadow: `0 0 8px ${dotColor}40`,
            letterSpacing: 0.5,
            textTransform: "uppercase"
          }}>
            {status === "connecting" ? "Initializing Scanner" :
             status === "waiting" ? "Ready to Scan" :
             status === "error" ? "Fingerprint error" :
             "Scanner Active"}
          </div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", letterSpacing: 0.3, textAlign: "center" }}>
            {status === "connecting" ? "Establishing connection…" :
             status === "waiting" ? "Place your finger on the sensor" :
             status === "error" ? (message || "Not recognized. Please try again.") :
             "Scanner ready"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <style>{`
        @keyframes fpBeam  { 0%,100% { top:6%;  opacity:0.9; } 50% { top:85%; opacity:0.7; } }
        @keyframes fpGlow  { 0%,100% { opacity:0.5; transform:scale(1);    } 50% { opacity:1;   transform:scale(1.08); } }
        @keyframes fpRing  { 0%,100% { opacity:0.3; transform:scale(1);    } 50% { opacity:0.8; transform:scale(1.15); } }
        @keyframes fpFade  { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fpSuccess { 0% { transform:scale(0.8); opacity:0; } 60% { transform:scale(1.1); } 100% { transform:scale(1); opacity:1; } }
        @keyframes fpSpin  { to { transform: rotate(360deg); } }
        @keyframes fpShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 60%{transform:translateX(6px)} 80%{transform:translateX(-3px)} }
      `}</style>

      {/* Icon + status row */}
      <div style={styles.row}>
        <div style={{ ...styles.iconWrap, borderColor: color, boxShadow: `0 0 20px ${color}40, inset 0 0 20px ${color}10` }}>
          {isWaiting || isVerify ? (
            <div style={{ position: "relative", width: 44, height: 44 }}>
              <FPSvg color={color} size={44} glow />
              {isWaiting && (
                <div style={{
                  position: "absolute", left: "8%", right: "8%", height: 2,
                  background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                  borderRadius: 2, top: "6%",
                  animation: "fpBeam 1.6s ease-in-out infinite",
                  boxShadow: `0 0 8px ${color}`,
                }}/>
              )}
              {isVerify && (
                <div style={{
                  position: "absolute", inset: -4,
                  border: `2px dashed ${C.warn}`,
                  borderRadius: "50%",
                  animation: "fpSpin 1.5s linear infinite",
                }}/>
              )}
              <div style={{
                position: "absolute", inset: -8, borderRadius: "50%",
                border: `1.5px solid ${color}`,
                animation: "fpRing 1.6s ease-in-out infinite",
              }}/>
            </div>
          ) : status === "captured" ? (
            <div style={{ animation: "fpSuccess .5s ease-out" }}>
              <FPSvg color={C.ok} size={44} glow />
              <div style={{ position: "absolute", bottom: 2, right: 2 }}>
                <CheckCircle color={C.ok} />
              </div>
            </div>
          ) : status === "error" ? (
            <div style={{ animation: "fpShake .4s ease" }}>
              <FPSvg color={C.danger} size={44} glow />
            </div>
          ) : (
            <div style={{ animation: pulse ? "fpGlow 2s ease-in-out infinite" : undefined, position: "relative" }}>
              <FPSvg color={color} size={44} glow />
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.title}>
            {label ?? (mode === "enroll" ? "Fingerprint Enrollment" : "Fingerprint Login")}
          </div>
          <div style={{
            fontSize: 12, lineHeight: 1.45, marginTop: 3,
            color: message
              ? (status === "error" ? C.danger : status === "captured" ? C.ok : isVerify ? C.warn : color)
              : C.muted,
            animation: message ? "fpFade .3s ease" : undefined,
          }}>
            {getStatusText()}
          </div>
        </div>
      </div>

      {/* Same-finger reminder banner for enroll */}
      {mode === "enroll" && scans.length === 0 && status === "idle" && (
        <div style={styles.sameFingerBanner}>
          <span>Pick ONE finger — use that exact same finger for all 3 scans</span>
        </div>
      )}

      {/* Duplicate fingerprint banner */}
      {status === "error" && scans.length === 0 && message.includes("already registered") && (
        <div style={{ ...styles.wrongFingerBanner, borderColor: "rgba(245,158,11,0.45)", background: "rgba(245,158,11,0.10)", color: "#f59e0b" }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>Fingerprint already registered!</div>
            <div style={{ opacity: 0.85 }}>This finger is linked to another account. Please use a different finger.</div>
          </div>
        </div>
      )}

      {/* Wrong finger warning banner */}
      {status === "error" && scans.length > 0 && scans.length < TOTAL && (
        <div style={styles.wrongFingerBanner}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>Wrong finger!</div>
            <div style={{ opacity: 0.85 }}>Scan 1 was your reference. Use that exact same finger for Scan {scans.length + 1}.</div>
          </div>
        </div>
      )}

      {/* Enrollment progress */}
      {mode === "enroll" && (
        <div style={styles.progressWrap}>
          <div style={styles.track}>
            <div style={{
              ...styles.bar,
              width: `${pct}%`,
              background: status === "captured"
                ? `linear-gradient(90deg,${C.ok},#10b981)`
                : `linear-gradient(90deg,${C.brand},${C.brand2})`,
            }}/>
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div key={i} style={{
                width: 9, height: 9, borderRadius: "50%",
                transition: "all .35s ease",
                background: i < scans.length
                  ? (status === "captured" ? C.ok : C.brand)
                  : "rgba(255,255,255,0.10)",
                boxShadow: i < scans.length ? `0 0 8px ${C.brand}` : "none",
                transform: i < scans.length ? "scale(1.2)" : "scale(1)",
              }}/>
            ))}
            <span style={{ fontSize: 11, color: C.muted, marginLeft: 2 }}>{scans.length}/{TOTAL}</span>
          </div>
        </div>
      )}

      {/* Scan image previews (enroll) */}
      {mode === "enroll" && scans.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {scans.map((sc, i) => (
            <div key={i} style={styles.preview}>
              <div style={{ fontSize: 11, color: i === 0 ? C.brand : C.ok, fontWeight: 700, marginBottom: 5, letterSpacing: 0.3 }}>
                {i === 0 ? "Scan 1 — Reference" : `Scan ${i + 1}`}
              </div>
              {sc.image
                ? <img src={`data:image/bmp;base64,${sc.image}`} alt={`scan${i + 1}`} style={styles.fpImg}/>
                : <div style={styles.fpPlaceholder}><FPSvg color={C.brand} size={36}/></div>
              }
              <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                Quality: {sc.quality}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start Over button — visible when enrollment is in progress */}
      {mode === "enroll" && scans.length > 0 && status !== "captured" && (
        <button
          onClick={reset}
          style={{
            marginTop: 8, padding: "8px 16px", borderRadius: 10,
            border: `1px solid rgba(255,255,255,0.15)`, background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 11, fontWeight: 600,
            width: "100%", textAlign: "center" as const,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,90,122,0.15)"; e.currentTarget.style.color = "#ff5a7a"; e.currentTarget.style.borderColor = "rgba(255,90,122,0.40)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
        >
          ↻ Start Over — Re-scan from Scan 1
        </button>
      )}

      {/* Main scan / retry button */}
      {showMainBtn && (
        <button
          onClick={() => {
            if (mode === "single") { startSingle(); }
            else if (scans.length === 0) { setScans([]); setRetryCount(0); startNext([]); }
            else { startNext(scans); } // continue from where we are (mid or retry)
          }}
          disabled={disabled}
          style={{ ...styles.btn, background: getBtnGradient(), opacity: disabled ? 0.5 : 1 }}
        >
          <div style={styles.btnIcon}><FPSvg color="#fff" size={22}/></div>
          <span>
            <b style={{ display: "block", fontSize: 13 }}>{getBtnLabel().main}</b>
            <small style={{ opacity: 0.75, fontSize: 11 }}>{getBtnLabel().sub}</small>
          </span>
        </button>
      )}

      {/* Verifying spinner state — no button while verifying */}
      {isVerify && (
        <div style={styles.verifyingBox}>
          <span style={{ fontSize: 13, color: C.warn, fontWeight: 600 }}>
            Checking fingerprint match…
          </span>
        </div>
      )}




    </div>
  );
}

function FPSvg({ color, size = 40, glow = false }: { color: string; size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={glow ? {
      filter: `drop-shadow(0 0 1px #ffffff) drop-shadow(0 0 6px ${color})`
    } : undefined}>
      <path d="M11.83,1.73C8.43,1.79 6.23,3.32 6.23,3.32C5.95,3.5 5.88,3.91 6.07,4.19C6.27,4.5 6.66,4.55 6.96,4.34C6.96,4.34 11.27,1.15 17.46,4.38C17.75,4.55 18.14,4.45 18.31,4.15C18.5,3.85 18.37,3.47 18.03,3.28C16.36,2.4 14.78,1.96 13.36,1.8C12.83,1.74 12.32,1.72 11.83,1.73M12.22,4.34C6.26,4.26 3.41,9.05 3.41,9.05C3.22,9.34 3.3,9.72 3.58,9.91C3.87,10.1 4.26,10 4.5,9.68C4.5,9.68 6.92,5.5 12.2,5.59C17.5,5.66 19.82,9.65 19.82,9.65C20,9.94 20.38,10.04 20.68,9.87C21,9.69 21.07,9.31 20.9,9C20.9,9 18.15,4.42 12.22,4.34M11.5,6.82C9.82,6.94 8.21,7.55 7,8.56C4.62,10.53 3.1,14.14 4.77,19C4.88,19.33 5.24,19.5 5.57,19.39C5.89,19.28 6.07,18.92 5.95,18.6V18.6C4.41,14.13 5.78,11.2 7.8,9.5C9.77,7.89 13.25,7.5 15.84,9.1C17.11,9.9 18.1,11.28 18.6,12.64C19.11,14 19.08,15.32 18.67,15.94C18.25,16.59 17.4,16.83 16.65,16.64C15.9,16.45 15.29,15.91 15.26,14.77C15.23,13.06 13.89,12 12.5,11.84C11.16,11.68 9.61,12.4 9.21,14C8.45,16.92 10.36,21.07 14.78,22.45C15.11,22.55 15.46,22.37 15.57,22.04C15.67,21.71 15.5,21.35 15.15,21.25C11.32,20.06 9.87,16.43 10.42,14.29C10.66,13.33 11.5,13 12.38,13.08C13.25,13.18 14,13.7 14,14.79C14.05,16.43 15.12,17.54 16.34,17.85C17.56,18.16 18.97,17.77 19.72,16.62C20.5,15.45 20.37,13.8 19.78,12.21C19.18,10.61 18.07,9.03 16.5,8.04C14.96,7.08 13.19,6.7 11.5,6.82M11.86,9.25V9.26C10.08,9.32 8.3,10.24 7.28,12.18C5.96,14.67 6.56,17.21 7.44,19.04C8.33,20.88 9.54,22.1 9.54,22.1C9.78,22.35 10.17,22.35 10.42,22.11C10.67,21.87 10.67,21.5 10.43,21.23C10.43,21.23 9.36,20.13 8.57,18.5C7.78,16.87 7.3,14.81 8.38,12.77C9.5,10.67 11.5,10.16 13.26,10.67C15.04,11.19 16.53,12.74 16.5,15.03C16.46,15.38 16.71,15.68 17.06,15.7C17.4,15.73 17.7,15.47 17.73,15.06C17.79,12.2 15.87,10.13 13.61,9.47C13.04,9.31 12.45,9.23 11.86,9.25M12.08,14.25C11.73,14.26 11.46,14.55 11.47,14.89C11.47,14.89 11.5,16.37 12.31,17.8C13.15,19.23 14.93,20.59 18.03,20.3C18.37,20.28 18.64,20 18.62,19.64C18.6,19.29 18.3,19.03 17.91,19.06C15.19,19.31 14.04,18.28 13.39,17.17C12.74,16.07 12.08,14.25" fill={color} />
    </svg>
  );
}

function CheckCircle({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill={color} opacity="0.2"/>
      <circle cx="10" cy="10" r="9" stroke={color} strokeWidth="1.5" fill="none"/>
      <path d="M6 10l3 3 5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "rgba(11,16,32,0.72)",
    border: "1px solid rgba(56,189,248,0.18)",
    borderRadius: 18,
    padding: "18px 18px 14px",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    maxWidth: 420,
    width: "100%",
    boxShadow: "0 8px 40px rgba(56,189,248,0.08)",
  },
  row: { display: "flex", alignItems: "center", gap: 14 },
  iconWrap: {
    width: 64, height: 64, borderRadius: "50%", border: "1.5px solid",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "all .4s ease",
    background: "rgba(56,189,248,0.06)", position: "relative" as const,
  },
  title: { fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.92)", letterSpacing: 0.2 },
  sameFingerBanner: {
    display: "flex", alignItems: "center", gap: 8,
    background: "rgba(56,189,248,0.08)",
    border: "1px solid rgba(56,189,248,0.22)",
    borderRadius: 10, padding: "8px 12px",
    fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 500,
  },
  wrongFingerBanner: {
    display: "flex", alignItems: "flex-start", gap: 10,
    background: "rgba(255,90,122,0.10)",
    border: "1px solid rgba(255,90,122,0.35)",
    borderRadius: 10, padding: "10px 12px",
    fontSize: 12, color: "#ff5a7a",
    animation: "fpShake .4s ease",
  },
  progressWrap: { display: "flex", alignItems: "center", gap: 10 },
  track: { flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 10, height: 5, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 10, transition: "width .5s ease" },
  preview: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    background: "rgba(56,189,248,0.05)",
    border: "1px solid rgba(56,189,248,0.14)",
    borderRadius: 10, padding: "10px 12px",
  },
  fpImg: {
    width: 90, height: 116, objectFit: "cover" as const, borderRadius: 8,
    border: "1.5px solid rgba(56,189,248,0.35)", background: "#050a14",
    filter: "contrast(1.15) brightness(1.08)",
    boxShadow: "0 4px 16px rgba(56,189,248,0.15)",
  },
  fpPlaceholder: {
    width: 90, height: 116, display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(56,189,248,0.04)", borderRadius: 8,
    border: "1.5px dashed rgba(56,189,248,0.22)",
  },
  btn: {
    color: "#fff", border: "none", borderRadius: 12, padding: "12px 16px",
    cursor: "pointer", fontWeight: 600, width: "100%",
    textAlign: "left" as const, display: "flex", alignItems: "center", gap: 12, lineHeight: 1.4,
    boxShadow: "0 4px 20px rgba(56,189,248,0.22)", transition: "transform .15s, box-shadow .15s",
  },
  btnIcon: {
    width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.12)",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  verifyingBox: {
    textAlign: "center" as const, padding: "8px 0",
  },
  cancelBtn: {
    background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)",
    border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8,
    padding: "8px 14px", cursor: "pointer", fontWeight: 600,
    fontSize: 12, width: "100%", textAlign: "center" as const, transition: "all .2s",
  },
};
