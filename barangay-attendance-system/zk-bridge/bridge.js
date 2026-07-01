/**
 * ZKTeco R20i Bridge  v19.0
 *
 * ARCHITECTURE:
 *   capture  → zkfp-helper.exe capture   (live scan, fast, no PS1)
 *   verify   → zkfp-helper.exe match     (ZKFPM_DBMatch, raw<0 = match)
 *   merge    → zkfp-helper.ps1 merge     (ZKFPM_DBMerge, no device)
 *   identify → zkfp-helper.ps1 identify  (ZKFPM_DBIdentify with pre-captured scan)
 *
 * WHY PS1 for merge/identify:
 *   The bundled exe (v3) only supports: capture | enroll | match | identify(args) | count
 *   The exe identify requires JSON via CLI args which hits Windows 8191-char limit.
 *   The PS1 has merge and identify via stdin — no CLI limit issue.
 *   For merge: no device needed, Add-Type only needs the DLL (no device open).
 *   For identify: pre-captured scan + stored templates → DBIdentify offline.
 *
 * NOTE: If you rebuild zkfp-helper.exe from zkfp-helper-src/BUILD.bat (requires .NET 6),
 *       the exe v4.0 will handle everything without PS1 and will be faster.
 */
"use strict";

const WebSocket = require("ws");
const express   = require("express");
const http      = require("http");
const { spawn } = require("child_process");
const path      = require("path");
const fs        = require("fs");

const WS_PORT    = 8888;
const HTTP_PORT  = 8889;
const BRIDGE_DIR = __dirname;

const exePath  = path.join(BRIDGE_DIR, "zkfp-helper.exe");
const ps1Path  = path.join(BRIDGE_DIR, "zkfp-helper.ps1");
const dllPath  = path.join(BRIDGE_DIR, "libzkfp.dll");

const exeExists = fs.existsSync(exePath);
const ps1Exists = fs.existsSync(ps1Path);
const dllExists = fs.existsSync(dllPath);

console.log("ZKTeco Bridge v21.0");
console.log("  zkfp-helper.exe :", exeExists ? "found" : "MISSING");
console.log("  zkfp-helper.ps1 :", ps1Exists ? "found" : "MISSING");
console.log("  libzkfp.dll     :", dllExists ? "found" : "MISSING");

let nativeReady = false;

// ── Concurrency queue — limits parallel exe calls to avoid ZKFPM_OpenDevice conflicts ──
// The ZKTeco DLL can only open the device from one process at a time.
// Capture/enroll commands need the device; match commands are offline and run freely.
const DEVICE_CMDS = new Set(["capture", "enroll"]);
let deviceBusy = false;
const deviceQueue = [];
function runWithQueue(fn) {
  return new Promise((resolve, reject) => {
    const run = () => {
      deviceBusy = true;
      fn().then(r => { deviceBusy = false; resolve(r); drainQueue(); })
          .catch(e => { deviceBusy = false; reject(e);  drainQueue(); });
    };
    if (!deviceBusy) { run(); } else { deviceQueue.push(run); }
  });
}
function drainQueue() {
  if (deviceQueue.length > 0 && !deviceBusy) {
    const next = deviceQueue.shift();
    next();
  }
}

// ── Run exe with args + optional stdin ───────────────────────────────────────
function runExeRaw(args, stdinData, timeoutMs = 35000) {
  return new Promise((resolve, reject) => {
    if (!exeExists) return reject(new Error("zkfp-helper.exe missing"));
    if (!dllExists) return reject(new Error("libzkfp.dll missing"));

    const proc = spawn(exePath, args, { cwd: BRIDGE_DIR });
    let stdout = "", stderr = "";
    proc.stdout.on("data", d => { stdout += d.toString(); });
    proc.stderr.on("data", d => {
      const s = d.toString();
      stderr += s;
      s.split("\n").filter(l => l.trim()).forEach(l => console.log("[exe]", l.trim()));
    });

    if (stdinData) {
      try { proc.stdin.write(stdinData); proc.stdin.end(); } catch {}
    } else {
      try { proc.stdin.end(); } catch {}
    }

    const timer = setTimeout(() => { try { proc.kill(); } catch {} reject(new Error("exe timeout")); }, timeoutMs);

    proc.on("close", code => {
      clearTimeout(timer);
      const jsonLine = stdout.split("\n").map(l => l.trim()).find(l => l.startsWith("{"));
      if (!jsonLine) return reject(new Error("No JSON from exe (code " + code + "): " + stdout.slice(0, 200)));
      try {
        const r = JSON.parse(jsonLine);
        if (r.error) return reject(new Error(r.error));
        resolve(r);
      } catch { reject(new Error("Invalid JSON from exe: " + jsonLine.slice(0, 100))); }
    });
    proc.on("error", e => reject(new Error("Cannot start exe: " + e.message)));
  });
}

function runExe(args, stdinData, timeoutMs = 35000) {
  // Device commands need serialization; offline match commands run freely in parallel
  if (DEVICE_CMDS.has(args[0])) {
    return runWithQueue(() => runExeRaw(args, stdinData, timeoutMs));
  }
  return runExeRaw(args, stdinData, timeoutMs);
}

// ── Run PS1 command with stdin JSON ─────────────────────────────────────────
// Retries once if Add-Type fails (transient DLL load issue)
function runPs1(command, stdinJson, timeoutMs = 20000, attempt = 1) {
  return new Promise((resolve, reject) => {
    if (!ps1Exists) return reject(new Error("zkfp-helper.ps1 missing"));

    const args = [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
      "-File", ps1Path, "-Command", command
    ];

    const proc = spawn("powershell.exe", args, { cwd: BRIDGE_DIR });
    let stdout = "", stderr = "";

    proc.stdout.on("data", d => { stdout += d.toString(); });
    proc.stderr.on("data", d => {
      const s = d.toString();
      stderr += s;
      // Only log non-Add-Type, non-WARNING lines
      s.split("\n")
        .filter(l => l.trim() && !l.includes("WARNING") && !l.includes("Add-Type") && !l.includes("PSSnapIn"))
        .forEach(l => console.log("[ps1]", l.trim()));
    });

    try { proc.stdin.write(stdinJson); proc.stdin.end(); } catch {}

    const timer = setTimeout(() => {
      try { proc.kill(); } catch {}
      reject(new Error("ps1 timeout (" + command + ")"));
    }, timeoutMs);

    proc.on("close", code => {
      clearTimeout(timer);

      // Try to parse JSON from stdout regardless of exit code
      const jsonLine = stdout.split("\n").map(l => l.trim()).find(l => l.startsWith("{"));
      if (jsonLine) {
        try {
          const r = JSON.parse(jsonLine);
          if (r.error) {
            // Retry once on Add-Type failure (transient DLL lock)
            if (r.code === -2 && attempt === 1) {
              console.warn("[ps1/" + command + "] Add-Type failed — retrying in 500ms");
              setTimeout(() => runPs1(command, stdinJson, timeoutMs, 2).then(resolve).catch(reject), 500);
              return;
            }
            return reject(new Error(r.error));
          }
          return resolve(r);
        } catch {}
      }

      if (code !== 0) {
        // Retry once on exit-1 with no JSON (silent Add-Type crash)
        if (attempt === 1) {
          console.warn("[ps1/" + command + "] exit " + code + " (no stderr) — retrying in 500ms");
          setTimeout(() => runPs1(command, stdinJson, timeoutMs, 2).then(resolve).catch(reject), 500);
          return;
        }
        return reject(new Error("ps1 " + command + " failed (code " + code + ")"));
      }

      reject(new Error("No JSON from ps1 " + command));
    });
    proc.on("error", e => reject(new Error("Cannot start powershell: " + e.message)));
  });
}

// ── Device check ─────────────────────────────────────────────────────────────
(async function testDevice() {
  if (!exeExists || !dllExists) { console.log("Native mode: DISABLED\n"); return; }
  try {
    const r = await runExe(["count"], null, 5000);
    nativeReady = (r.count ?? 0) > 0;
    console.log(nativeReady
      ? "Native mode: ENABLED — ZKTeco device found\n"
      : "Native mode: READY — NO device connected\n");
  } catch(e) {
    console.log("Native mode: DISABLED —", e.message.slice(0, 200), "\n");
  }
})();

// ── Express HTTP API ──────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/status", (req, res) => {
  res.json({ ok: true, native: nativeReady, version: "21.0" });
});

// /capture — live scan via exe
app.post("/capture", async (req, res) => {
  try {
    const r = await runExe(["capture"], null, 35000);
    console.log("[capture] quality=" + r.quality);
    res.json({ template: r.template, image: r.image ?? "", quality: r.quality });
  } catch(e) {
    console.error("[capture] ERROR:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// /verify — compare two templates offline (fail-open if crashes)
app.post("/verify", async (req, res) => {
  const { scan, stored } = req.body ?? {};
  if (!scan || !stored) return res.status(400).json({ error: "scan and stored required" });
  try {
    const r = await runExe(["match", scan, stored], null, 10000);
    // R20i: positive score >= 50 = same finger, 0 = different finger
    const raw = r.raw ?? r.score ?? 0;
    const matched = r.matched === true || raw >= 50;
    console.log("[verify] matched=" + matched + " raw=" + raw);
    res.json({ matched, score: matched ? raw : 0, raw });
  } catch(e) {
    console.warn("[verify] error — failing open:", e.message);
    res.json({ matched: true, score: -1, raw: -1, failOpen: true });
  }
});

// /match — backward compat alias for /verify
app.post("/match", async (req, res) => {
  const { t1, t2, scan, stored } = req.body ?? {};
  const a = t1 ?? scan, b = t2 ?? stored;
  if (!a || !b) return res.status(400).json({ error: "t1/t2 or scan/stored required" });
  try {
    const r = await runExe(["match", a, b], null, 10000);
    const raw = r.raw ?? r.score ?? 0;
    const matched = r.matched === true || raw >= 50;
    console.log("[sdkMatch] matched=" + matched + " raw=" + raw);
    res.json({ matched, score: matched ? raw : 0, raw });
  } catch(e) {
    console.warn("[match] error — failing open:", e.message);
    res.json({ matched: true, score: -1, raw: -1, failOpen: true });
  }
});

// /merge — merge 3 templates via compiled native executable (super fast, no PS1 startup overhead)
// DBMerge -22 = templates too different; in that case just use scan[0] as stored template.
app.post("/merge", async (req, res) => {
  const { t1, t2, t3 } = req.body ?? {};
  if (!t1 || !t2 || !t3) return res.status(400).json({ error: "t1, t2, t3 required" });
  try {
    const r = await runExe(["merge"], JSON.stringify({ t1, t2, t3 }), 15000);
    const mergedTpl = r.template ?? r.merged;
    if (r.len > 0 && mergedTpl) {
      console.log("[merge] DBMerge success len=" + r.len);
      res.json({ merged: mergedTpl, len: r.len });
    } else {
      // DBMerge returned empty/zero — use scan[0] as fallback
      console.warn("[merge] DBMerge returned len=" + r.len + " — using scan[0] as template");
      res.json({ merged: t1, len: -1, fallback: true });
    }
  } catch(e) {
    console.warn("[merge] EXE failed:", e.message, "— using scan[0] as template");
    res.json({ merged: t1, len: -1, fallback: true });
  }
});

// /identify — 1:N match using compiled native executable (super fast, no PS1 startup overhead)
// Takes: { scan: base64, templates: [{fid, tpl}] }
app.post("/identify", async (req, res) => {
  const { scan, templates } = req.body ?? {};
  if (!scan) return res.status(400).json({ error: "scan required" });
  if (!Array.isArray(templates) || templates.length === 0)
    return res.json({ matched: false, fid: 0, score: 0 });

  try {
    // Map templates to the format expected by the C# application (key 'template' instead of 'tpl')
    const mappedTemplates = templates.map(t => ({
      fid: t.fid,
      template: t.tpl ?? t.template
    }));

    const r = await runExe(["identify-offline"], JSON.stringify({ scan, templates: mappedTemplates }), 30000);
    console.log("[identify] RESULT matched=" + r.matched + " fid=" + r.fid + " score=" + r.score);
    res.json({ matched: r.matched, fid: r.fid, score: r.score });
  } catch(e) {
    console.error("[identify] Native identify error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── WebSocket (live capture for enrollment UI) ────────────────────────────────
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("Browser connected from", ws._socket?.remoteAddress ?? "?");

  // Handle incoming commands from the browser — keep connection alive
  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.cmd === "capture") {
      runExe(["capture"], null, 35000)
        .then(r => {
          console.log("Captured quality:", r.quality);
          if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: "captured", template: r.template, image: r.image ?? "", quality: r.quality }));
        })
        .catch(e => {
          console.error("Capture error:", e.message);
          if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: "error", message: e.message }));
        });
    }
  });

  // Also trigger an immediate capture on connect (backward compat with frontend)
  runExe(["capture"], null, 35000)
    .then(r => {
      console.log("Captured quality:", r.quality);
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: "captured", template: r.template, image: r.image ?? "", quality: r.quality }));
    })
    .catch(e => {
      console.error("Capture error:", e.message);
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: "error", message: e.message }));
    });

  ws.on("close", () => {
    console.log("Browser disconnected");
  });

  ws.on("error", () => {});
});

const ping = setInterval(() => {
  wss.clients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.ping(); });
}, 25000);

server.listen(HTTP_PORT, "0.0.0.0", () => {
  console.log("HTTP       http://localhost:" + HTTP_PORT);
  console.log("WebSocket  ws://localhost:"   + HTTP_PORT + "\n");
});
server.on("error", e => {
  if (e.code === "EADDRINUSE") { console.error("Port " + HTTP_PORT + " in use."); process.exit(1); }
});

function shutdown() { clearInterval(ping); wss.close(() => server.close(() => process.exit(0))); }
process.on("SIGINT",  shutdown);
process.on("SIGTERM", shutdown);
