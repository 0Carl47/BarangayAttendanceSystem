"use client";
/**
 * app/fingerprint/page.tsx  v2.0 — Fingerprint Management (dark themed)
 */
import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { FingerprintSource, ScanResult } from "@/components/FingerprintScanner";

const FingerprintScanner = dynamic(
  () => import("@/components/FingerprintScanner"),
  { ssr: false }
);

const FINGER_NAMES = [
  "Right Thumb",  "Right Index",  "Right Middle", "Right Ring",  "Right Little",
  "Left Thumb",   "Left Index",   "Left Middle",  "Left Ring",   "Left Little",
];

type Employee = { id: string; firstName: string; lastName: string; position?: string };
type Template = {
  id: string; finger: number; fingerName: string;
  quality: number; source: string; createdAt: string;
};

/* ── Color tokens ────────────────────────────────────────────────────────── */
const T = {
  bg:      "rgba(255,255,255,0.06)",
  stroke:  "rgba(255,255,255,0.12)",
  text:    "rgba(255,255,255,0.92)",
  muted:   "rgba(255,255,255,0.55)",
  brand:   "#38bdf8",
  brand2:  "#7c83ff",
  success: "#34d399",
  danger:  "#ff5a7a",
  warn:    "#f59e0b",
};

export default function FingerprintPage() {
  const [employees,     setEmployees]     = useState<Employee[]>([]);
  const [selectedUser,  setSelectedUser]  = useState<Employee | null>(null);
  const [templates,     setTemplates]     = useState<Template[]>([]);
  const [selectedFinger,setSelectedFinger]= useState(0);
  const [enrolling,     setEnrolling]     = useState(false);
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [bridgeStatus,  setBridgeStatus]  = useState<{ ok: boolean; device: boolean; mode: string } | null>(null);

  /* ── Load bridge status ─────────────────────────────────────────────── */
  useEffect(() => {
    fetch("/api/fingerprint/bridge-status")
      .then((r) => r.json())
      .then((d) => setBridgeStatus({ ok: d.bridgeRunning, device: d.deviceReady, mode: d.mode ?? "simulation" }))
      .catch(() => setBridgeStatus({ ok: false, device: false, mode: "simulation" }));
  }, []);

  /* ── Load employees ─────────────────────────────────────────────────── */
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setEmployees(d.users ?? []))
      .catch(() => {});
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTemplates = useCallback((userId: string) => {
    fetch(`/api/fingerprint/list?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {});
  }, []);

  const selectUser = (emp: Employee) => {
    setSelectedUser(emp);
    setEnrolling(false);
    loadTemplates(emp.id);
  };

  /* ── Enroll ─────────────────────────────────────────────────────────── */
  const onCapture = async (templateData: string, source: FingerprintSource, scans?: ScanResult[]) => {
    if (!selectedUser) return;
    setEnrolling(false);
    const template2 = scans && scans[1] ? scans[1].template : undefined;
    const template3 = scans && scans[2] ? scans[2].template : undefined;
    try {
      const res = await fetch("/api/fingerprint/enroll", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: selectedUser.id, finger: selectedFinger, templateData, template2, template3, source }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        showToast(`Enrolled ${FINGER_NAMES[selectedFinger]} for ${selectedUser.firstName}`, true);
        loadTemplates(selectedUser.id);
      } else {
        showToast(`${data?.error ?? "Enroll failed"}`, false);
      }
    } catch {
      showToast("Network error. Try again.", false);
    }
  };

  /* ── Delete ─────────────────────────────────────────────────────────── */
  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this fingerprint template?")) return;
    const res = await fetch("/api/fingerprint/delete", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ templateId: id }),
    });
    if (res.ok) {
      showToast("Template deleted", true);
      if (selectedUser) loadTemplates(selectedUser.id);
    } else {
      showToast("Delete failed", false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={s.pageHeader}>
        <h1 style={s.h1}>
          Fingerprint Management
        </h1>
        <p style={s.sub}>Enroll and manage fingerprint templates per employee.</p>

        {/* Bridge status badge */}
        <div style={s.bridgeBadge}>
          <span style={{
            ...s.dot,
            background: bridgeStatus?.ok ? (bridgeStatus.device ? T.success : T.warn) : T.danger,
          }} />
          {bridgeStatus === null ? "Checking bridge…"
            : bridgeStatus.ok
              ? bridgeStatus.device
                ? `Bridge connected — ZKTeco R20i ready (${bridgeStatus.mode})`
                : `Bridge running — No device detected`
              : "Bridge not running — start START-BRIDGE.bat"}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, borderColor: toast.ok ? T.success : T.danger, color: toast.ok ? T.success : T.danger }}>
          {toast.msg}
        </div>
      )}

      <div style={s.layout}>
        {/* Employee sidebar */}
        <div style={s.sidebar}>
          <div style={s.sidebarTitle}>Employees</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {employees.map((emp) => {
              const active = selectedUser?.id === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => selectUser(emp)}
                  style={{
                    ...s.empBtn,
                    background:  active ? `${T.brand}18` : "rgba(255,255,255,0.04)",
                    borderColor: active ? T.brand : T.stroke,
                    color:       active ? T.brand : T.text,
                  }}
                >
                  <span style={s.empAvatar}>{emp.firstName[0]}{emp.lastName[0]}</span>
                  <span>
                    <span style={{ fontWeight: 700, display: "block" }}>
                      {emp.lastName}, {emp.firstName}
                    </span>
                    {emp.position && (
                      <span style={{ fontSize: 11, color: T.muted }}>{emp.position}</span>
                    )}
                  </span>
                </button>
              );
            })}
            {employees.length === 0 && (
              <p style={{ color: T.muted, fontSize: 13 }}>No employees found.</p>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div style={s.panel}>
          {!selectedUser ? (
            <div style={s.empty}>
              <div style={{ color: T.muted, fontSize: 14 }}>Select an employee to manage fingerprints</div>
            </div>
          ) : (
            <>
              {/* Employee header */}
              <div style={s.empHeader}>
                <div style={s.empAvatarLg}>
                  {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>
                    {selectedUser.firstName} {selectedUser.lastName}
                  </div>
                  {selectedUser.position && (
                    <div style={{ fontSize: 12, color: T.muted }}>{selectedUser.position}</div>
                  )}
                </div>
              </div>

              {/* Enrolled templates grid */}
              <div style={{ marginBottom: 28 }}>
                <div style={s.sectionTitle}>
                  Enrolled Templates
                  <span style={s.badge}>{templates.length}</span>
                </div>
                {templates.length === 0 ? (
                  <p style={{ color: T.muted, fontSize: 13 }}>No fingerprints enrolled yet.</p>
                ) : (
                  <div style={s.tplGrid}>
                    {templates.map((t) => (
                      <div key={t.id} style={s.tplCard}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{t.fingerName}</div>
                        <div style={s.tplMeta}>
                          Quality:&nbsp;
                          <span style={{
                            color: t.quality >= 70 ? T.success : t.quality >= 40 ? T.warn : T.danger,
                            fontWeight: 700,
                          }}>{t.quality}/100</span>
                        </div>
                        <div style={s.tplMeta}>Source: {t.source}</div>
                        <div style={{ ...s.tplMeta, fontSize: 10 }}>
                          {new Date(t.createdAt).toLocaleDateString()}
                        </div>
                        <button onClick={() => deleteTemplate(t.id)} style={s.delBtn}>
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Enroll section */}
              {!enrolling ? (
                <div>
                  <div style={s.sectionTitle}>Enroll New Fingerprint</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                    <label style={{ fontWeight: 600, fontSize: 13, color: T.muted }}>Finger:</label>
                    <select
                      value={selectedFinger}
                      onChange={(e) => setSelectedFinger(Number(e.target.value))}
                      style={s.select}
                    >
                      {FINGER_NAMES.map((name, i) => (
                        <option key={i} value={i}>{i} — {name}</option>
                      ))}
                    </select>
                    <button onClick={() => setEnrolling(true)} style={s.enrollBtn}>
                      + Enroll Fingerprint
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={s.sectionTitle}>
                    Scanning: {FINGER_NAMES[selectedFinger]}
                  </div>
                  <p style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
                    Scan your finger TWICE for better recognition. Follow the steps below.
                  </p>
                  <FingerprintScanner
                    mode="enroll"
                    onCapture={onCapture}
                    label={`Enroll ${FINGER_NAMES[selectedFinger]}`}
                  />
                  <button
                    onClick={() => setEnrolling(false)}
                    style={{ marginTop: 10, fontSize: 12, color: T.muted, background: "none", border: "none", cursor: "pointer" }}
                  >
                    ✕ Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth:   1100,
    margin:     "0 auto",
    padding:    "28px 18px",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
    color:      T.text,
  },
  pageHeader: { marginBottom: 24 },
  h1: {
    fontSize:    26,
    fontWeight:  900,
    color:       T.text,
    margin:      "0 0 4px",
    display:     "flex",
    alignItems:  "center",
    gap:         10,
  },
  h1Icon: { fontSize: 28 },
  sub: { color: T.muted, fontSize: 14, margin: "0 0 10px" },

  bridgeBadge: {
    display:      "inline-flex",
    alignItems:   "center",
    gap:          7,
    background:   "rgba(255,255,255,0.05)",
    border:       "1px solid rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding:      "5px 12px",
    fontSize:     12,
    color:        T.muted,
  },
  dot: {
    width:       8,
    height:      8,
    borderRadius:"50%",
    flexShrink:  0,
  },

  toast: {
    padding:      "10px 16px",
    borderRadius: 10,
    marginBottom: 16,
    fontWeight:   600,
    fontSize:     13,
    border:       "1px solid",
    background:   "rgba(255,255,255,0.05)",
  },

  layout: { display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" },

  sidebar: {
    width:      220,
    flexShrink: 0,
  },
  sidebarTitle: {
    fontSize:     12,
    fontWeight:   700,
    color:        T.muted,
    textTransform:"uppercase",
    letterSpacing:"0.06em",
    marginBottom: 10,
  },

  empBtn: {
    display:      "flex",
    alignItems:   "center",
    gap:          10,
    width:        "100%",
    textAlign:    "left",
    border:       "1px solid",
    borderRadius: 10,
    padding:      "8px 12px",
    cursor:       "pointer",
    transition:   "all .2s",
  },
  empAvatar: {
    width:          32,
    height:         32,
    borderRadius:   "50%",
    background:     "rgba(56,189,248,0.18)",
    color:          T.brand,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontWeight:     800,
    fontSize:       12,
    flexShrink:     0,
  },

  panel: {
    flex:         1,
    minWidth:     300,
    background:   "rgba(255,255,255,0.04)",
    border:       "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding:      24,
    backdropFilter:"blur(10px)",
  },

  empty: { textAlign:"center", padding:"60px 20px" },

  empHeader: {
    display:      "flex",
    alignItems:   "center",
    gap:          14,
    marginBottom: 24,
    paddingBottom:18,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  empAvatarLg: {
    width:          52,
    height:         52,
    borderRadius:   "50%",
    background:     "linear-gradient(135deg,#38bdf8,#7c83ff)",
    color:          "#fff",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontWeight:     900,
    fontSize:       18,
    flexShrink:     0,
  },

  sectionTitle: {
    fontSize:     13,
    fontWeight:   700,
    color:        T.muted,
    textTransform:"uppercase",
    letterSpacing:"0.06em",
    marginBottom: 12,
    display:      "flex",
    alignItems:   "center",
    gap:          8,
  },
  badge: {
    background:   "rgba(56,189,248,0.18)",
    color:        T.brand,
    borderRadius: 20,
    padding:      "1px 8px",
    fontSize:     11,
    fontWeight:   700,
  },

  tplGrid: {
    display:             "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
    gap:                 10,
    marginTop:           8,
  },
  tplCard: {
    background:   "rgba(255,255,255,0.05)",
    border:       "1px solid rgba(255,255,255,0.10)",
    borderRadius: 12,
    padding:      "14px 14px",
    display:      "flex",
    flexDirection:"column",
    gap:          3,
  },
  tplMeta: { fontSize: 11, color: T.muted },
  delBtn: {
    marginTop:    8,
    background:   "rgba(255,90,122,0.12)",
    color:        T.danger,
    border:       "1px solid rgba(255,90,122,0.30)",
    borderRadius: 7,
    padding:      "5px 10px",
    cursor:       "pointer",
    fontWeight:   600,
    fontSize:     11,
  },

  select: {
    background:   "rgba(255,255,255,0.07)",
    border:       "1px solid rgba(255,255,255,0.18)",
    borderRadius: 8,
    padding:      "7px 12px",
    fontSize:     13,
    color:        T.text,
    cursor:       "pointer",
  },
  enrollBtn: {
    background:   "linear-gradient(135deg,#38bdf8,#7c83ff)",
    color:        "#fff",
    border:       "none",
    borderRadius: 9,
    padding:      "8px 18px",
    cursor:       "pointer",
    fontWeight:   700,
    fontSize:     13,
  },
};
