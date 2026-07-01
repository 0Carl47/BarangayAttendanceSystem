"use client";
/**
 * app/login/page.tsx — Smooth, fast, modern login
 * - Instant button feedback, GPU-accelerated
 * - No flicker, no lag, no delay
 * - Uses CSS classes (globals.css) for consistency
 */
import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { FingerprintSource, ScanResult } from "@/components/FingerprintScanner";

const FingerprintScanner = dynamic(() => import("@/components/FingerprintScanner"), { ssr: false });

type AuthTab  = "login" | "signup";
type LoginTab = "password" | "fingerprint";

const numOnly = (v: string) => v.replace(/[^0-9]/g, "");

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data && data.session) {
            router.replace("/");
          }
        }
      } catch {}
    };
    checkSession();
  }, [router]);

  const [authTab,  setAuthTab]  = useState<AuthTab>("login");
  const [loginTab, setLoginTab] = useState<LoginTab>("password");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState("");

  /* Sign In — password */
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  /* Sign In — fingerprint (needs userId + role) */
  const [fpLoginId,   setFpLoginId]   = useState("");
  const [fpLoginRole, setFpLoginRole] = useState<"employee" | "admin">("employee");
  const [fpScanKey,   setFpScanKey]   = useState(0);

  /* Sign Up fields */
  const [role,           setRole]           = useState<"employee" | "admin">("employee");
  const [empId,          setEmpId]          = useState("");
  const [firstName,      setFirstName]      = useState("");
  const [middleName,     setMiddleName]     = useState("");
  const [lastName,       setLastName]       = useState("");
  const [age,            setAge]            = useState("");
  const [sex,            setSex]            = useState("");
  const [phone,          setPhone]          = useState("");
  const [position,       setPosition]       = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm,  setSignupConfirm]  = useState("");

  /* Fingerprint enroll — 3 scans required */
  const [enrollScans,  setEnrollScans]  = useState<ScanResult[]>([]);
  const [showScanner,  setShowScanner]  = useState(false);

  const redirect = useCallback((r: string) => {
    startTransition(() => {
      router.push(r === "admin" ? "/admin" : "/employee");
    });
  }, [router, startTransition]);

  /* ── Password Login ─────────────────────────────────────── */
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isPending) return;
    if (!loginUsername.trim() || !loginPassword) {
      setError("Please enter username and password.");
      return;
    }
    setError(""); setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error || "Login failed"); return; }
      setSuccess("Welcome back! Redirecting…");
      redirect(data.role);
    } finally { setLoading(false); }
  };

  /* ── Fingerprint Login ─── */
  const handleFingerprintLogin = async (templateData: string, _source: FingerprintSource) => {
    if (!fpLoginId.trim()) { setError("Enter your ID number before scanning."); return; }
    if (loading) return;
    setError(""); setLoading(true);
    try {
      const res  = await fetch("/api/auth/login-fingerprint", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: fpLoginId.trim(), role: fpLoginRole, templateData }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Fingerprint not recognised");
        setFpScanKey(k => k + 1);
        return;
      }
      setSuccess("Verified! Redirecting…");
      redirect(data.role);
    } finally { setLoading(false); }
  };

  /* ── Enroll capture handler ─── */
  const handleEnrollCapture = (_s1: string, _src: FingerprintSource, scans?: ScanResult[]) => {
    if (scans && scans.length > 0) {
      setEnrollScans(scans);
    }
    if (scans && scans.length >= 3) {
      setShowScanner(false);
    }
  };

  /* ── Sign Up ─── */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!empId.trim() || !/^\d+$/.test(empId))        { setError("ID must contain numbers only"); return; }
    if (!firstName.trim() || !lastName.trim())          { setError("First and last name are required"); return; }
    if (!age || isNaN(Number(age)))                     { setError("Valid age is required"); return; }
    if (!sex)                                           { setError("Sex is required"); return; }
    if (!phone || phone.length !== 11)                  { setError("Phone must be exactly 11 digits"); return; }
    if (role === "employee" && !position.trim())        { setError("Position is required for employees"); return; }
    if (!signupPassword || signupPassword.length < 4)  { setError("Password must be at least 4 characters"); return; }
    if (signupPassword !== signupConfirm)               { setError("Passwords do not match"); return; }
    if (enrollScans.length < 3)                        { setError("3 fingerprint scans are required — please complete all 3"); return; }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        id: empId.trim(), role,
        firstName: firstName.trim(),
        middleName: middleName.trim() || null,
        lastName: lastName.trim(),
        age: Number(age), sex, phone,
        position: position.trim() || null,
        username: empId.trim(),
        password: signupPassword,
        scans: enrollScans.map(sc => ({
          templateData:  sc.template,
          templateImage: sc.image || null,
          quality:       sc.quality,
        })),
        source: "zkteco",
        finger: 0,
      };
      const res  = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error || "Sign up failed"); return; }
      setSuccess("Account created! Redirecting…");
      redirect(data.role);
    } finally { setLoading(false); }
  };

  const scansDone   = enrollScans.length;
  const allScanned  = scansDone >= 3;
  const busy = loading || isPending;

  return (
    <div className="lp-shell">
      {/* Ambient particles */}
      <div className="lp-bg" aria-hidden="true">
        <div className="lp-orb lp-orb1" />
        <div className="lp-orb lp-orb2" />
        <div className="lp-orb lp-orb3" />
      </div>

      <div className="lp-card">
        {/* Header */}
        <div className="lp-header">
          <div className="lp-logo-ring">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="lp-title">Barangay System</h1>
          <p className="lp-subtitle">Attendance &amp; Records Portal</p>
        </div>

        {/* Auth tabs */}
        <div className="lp-tab-row" role="tablist">
          {(["login", "signup"] as AuthTab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={authTab === t}
              className={`lp-tab${authTab === t ? " lp-tab--active" : ""}`}
              onClick={() => { setAuthTab(t); setError(""); setSuccess(""); }}
            >
              {t === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* ── SIGN IN ──────────────────────────────────────── */}
        {authTab === "login" && (
          <div className="lp-panel">
            {/* Sub-tabs */}
            <div className="lp-subtab-row" role="tablist">
              {(["password", "fingerprint"] as LoginTab[]).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={loginTab === t}
                  className={`lp-subtab${loginTab === t ? " lp-subtab--active" : ""}`}
                  onClick={() => { setLoginTab(t); setError(""); setSuccess(""); }}
                >
                  {t === "password" ? (
                    <><span className="lp-icon">🔑</span> Password</>
                  ) : (
                    <><span className="lp-icon">👆</span> Fingerprint</>
                  )}
                </button>
              ))}
            </div>

            {loginTab === "password" && (
              <form onSubmit={handlePasswordLogin} className="lp-form" noValidate>
                <div className="lp-field">
                  <label className="lp-label" htmlFor="login-username">Username</label>
                  <input
                    id="login-username"
                    className="lp-input"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter username"
                    autoComplete="username"
                    autoFocus
                    disabled={busy}
                  />
                </div>
                <div className="lp-field">
                  <label className="lp-label" htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    className="lp-input"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    disabled={busy}
                  />
                </div>
                <button
                  type="submit"
                  className={`lp-btn lp-btn--primary${busy ? " lp-btn--loading" : ""}`}
                  disabled={busy}
                  aria-busy={busy}
                >
                  {busy ? <><span className="lp-spinner" />Signing in…</> : "Sign In →"}
                </button>
              </form>
            )}

            {loginTab === "fingerprint" && (
              <div className="lp-fp-login">
                <div className="lp-grid2">
                  <div className="lp-field">
                    <label className="lp-label" htmlFor="fp-id">Your ID Number</label>
                    <input
                      id="fp-id"
                      className="lp-input"
                      value={fpLoginId}
                      onChange={(e) => { setFpLoginId(numOnly(e.target.value)); setFpScanKey(k => k + 1); }}
                      inputMode="numeric"
                      placeholder="e.g. 1001"
                      autoFocus
                      disabled={busy}
                    />
                  </div>
                  <div className="lp-field">
                    <label className="lp-label" htmlFor="fp-role">Role</label>
                    <select
                      id="fp-role"
                      className="lp-input lp-select"
                      value={fpLoginRole}
                      onChange={(e) => { setFpLoginRole(e.target.value as "employee" | "admin"); setFpScanKey(k => k + 1); }}
                      disabled={busy}
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                {fpLoginId.trim() ? (
                  <FingerprintScanner
                    key={fpScanKey}
                    mode="single"
                    label="Tap finger on scanner to sign in"
                    onCapture={handleFingerprintLogin}
                    disabled={busy}
                  />
                ) : (
                  <div className="lp-fp-hint">
                    Enter your ID number above, then place your finger on the scanner
                  </div>
                )}

                {success && (
                  <p className="lp-success">{success}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SIGN UP ──────────────────────────────────────── */}
        {authTab === "signup" && (
          <form onSubmit={handleSignup} className="lp-form lp-panel" noValidate>
            <div className="lp-field">
              <label className="lp-label" htmlFor="su-role">Role</label>
              <select id="su-role" className="lp-input lp-select" value={role} onChange={(e) => setRole(e.target.value as "employee" | "admin")} disabled={busy}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="lp-grid2">
              <div className="lp-field">
                <label className="lp-label" htmlFor="su-id">ID (numbers only)</label>
                <input id="su-id" className="lp-input" value={empId} onChange={(e) => setEmpId(numOnly(e.target.value))} inputMode="numeric" placeholder="e.g. 1001" disabled={busy}/>
              </div>
              <div className="lp-field">
                <label className="lp-label" htmlFor="su-age">Age</label>
                <input id="su-age" className="lp-input" value={age} onChange={(e) => setAge(numOnly(e.target.value))} inputMode="numeric" placeholder="Age" disabled={busy}/>
              </div>
              <div className="lp-field">
                <label className="lp-label" htmlFor="su-fn">First Name</label>
                <input id="su-fn" className="lp-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" disabled={busy}/>
              </div>
              <div className="lp-field">
                <label className="lp-label" htmlFor="su-mn">Middle Name</label>
                <input id="su-mn" className="lp-input" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="(optional)" disabled={busy}/>
              </div>
              <div className="lp-field">
                <label className="lp-label" htmlFor="su-ln">Last Name</label>
                <input id="su-ln" className="lp-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" disabled={busy}/>
              </div>
              <div className="lp-field">
                <label className="lp-label" htmlFor="su-sex">Sex</label>
                <select id="su-sex" className="lp-input lp-select" value={sex} onChange={(e) => setSex(e.target.value)} disabled={busy}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="lp-field">
                <label className="lp-label" htmlFor="su-phone">Phone (11 digits)</label>
                <input id="su-phone" className="lp-input" value={phone} onChange={(e) => setPhone(numOnly(e.target.value).slice(0, 11))} inputMode="numeric" placeholder="09XXXXXXXXX" disabled={busy}/>
              </div>
              {role === "employee" && (
                <div className="lp-field">
                  <label className="lp-label" htmlFor="su-pos">Position</label>
                  <input id="su-pos" className="lp-input" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Clerk" disabled={busy}/>
                </div>
              )}
              <div className="lp-field">
                <label className="lp-label" htmlFor="su-pw">Password (min 4 chars)</label>
                <input id="su-pw" type="password" className="lp-input" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Password" autoComplete="new-password" disabled={busy}/>
              </div>
              <div className="lp-field">
                <label className="lp-label" htmlFor="su-cpw">Confirm Password</label>
                <input id="su-cpw" type="password" className="lp-input" value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} placeholder="Confirm Password" autoComplete="new-password" disabled={busy}/>
              </div>
            </div>

            {/* Fingerprint section */}
            <div className="lp-fp-box">
              <div className="lp-fp-box-title">
                <span>Fingerprint Registration</span>
                <span className="lp-required">*</span>
                <span className="lp-fp-hint-small">(3 scans required — same finger)</span>
              </div>

              {/* Progress */}
              <div className="lp-progress-track">
                <div
                  className="lp-progress-fill"
                  style={{ width: `${(scansDone / 3) * 100}%`, background: allScanned ? "linear-gradient(90deg,#34d399,#10b981)" : "linear-gradient(90deg,#38bdf8,#7c83ff)" }}
                />
              </div>
              <div className="lp-progress-label">
                {allScanned
                  ? "✓ 3/3 scans complete — ready to register"
                  : scansDone > 0
                    ? `${scansDone}/3 done — scan again with same finger`
                    : "0/3 scans — place finger on ZKTeco device"}
              </div>

              {enrollScans.length > 0 && (
                <div className="lp-scan-previews">
                  {enrollScans.map((sc, i) => (
                    <div key={i} className="lp-scan-preview">
                      <div className="lp-scan-label">Scan {i + 1}</div>
                      {sc.image
                        ? <img src={`data:image/png;base64,${sc.image}`} alt={`scan${i+1}`} className="lp-scan-img" />
                        : <div className="lp-scan-placeholder">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(56,189,248,0.5)" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                            </svg>
                          </div>
                      }
                    </div>
                  ))}
                </div>
              )}

              {!allScanned && !showScanner && (
                <button
                  type="button"
                  className="lp-btn lp-btn--outline"
                  onClick={() => setShowScanner(true)}
                  disabled={busy}
                >
                  {scansDone === 0 ? "▶ Start Scan 1 of 3" : scansDone === 1 ? "▶ Start Scan 2 of 3" : "▶ Start Scan 3 of 3"}
                </button>
              )}

              {showScanner && (
                <>
                  <FingerprintScanner
                    mode="enroll"
                    onCapture={handleEnrollCapture}
                    label="Register Fingerprint"
                  />
                  <button type="button" onClick={() => setShowScanner(false)} className="lp-link-btn">
                    Cancel
                  </button>
                </>
              )}

              {allScanned && (
                <div className="lp-fp-done">
                  <span>✓ All 3 scans saved</span>
                  <button type="button" onClick={() => { setEnrollScans([]); setShowScanner(false); }} className="lp-link-btn">
                    Re-scan
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className={`lp-btn lp-btn--primary${busy ? " lp-btn--loading" : ""}${(!allScanned || busy) ? " lp-btn--disabled" : ""}`}
              disabled={busy || !allScanned}
            >
              {busy ? <><span className="lp-spinner" />Creating account…</> : "Create Account →"}
            </button>
          </form>
        )}

        {/* Messages */}
        {error && (
          <div className="lp-error" role="alert">
            <span>⚠</span> {error}
          </div>
        )}
        {success && authTab === "login" && loginTab === "password" && (
          <div className="lp-success-banner">{success}</div>
        )}
      </div>

      <style>{`
        /* ── LOGIN PAGE SPECIFIC STYLES ── */
        .lp-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          position: relative;
          overflow: hidden;
        }

        /* Background orbs */
        .lp-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .lp-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
          will-change: transform;
          animation: orbFloat 12s ease-in-out infinite;
        }
        .lp-orb1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, #7c83ff, transparent 70%);
          top: -200px; left: -150px;
          animation-delay: 0s;
        }
        .lp-orb2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #38bdf8, transparent 70%);
          bottom: -150px; right: -100px;
          animation-delay: -4s;
        }
        .lp-orb3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #10b981, transparent 70%);
          top: 40%; left: 60%;
          animation-delay: -8s;
        }
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1) translateZ(0); }
          33% { transform: translate(30px, -20px) scale(1.05) translateZ(0); }
          66% { transform: translate(-20px, 15px) scale(0.97) translateZ(0); }
        }

        .lp-card {
          position: relative;
          z-index: 1;
          width: min(480px, 96vw);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 22px;
          padding: 28px 24px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          animation: lp-rise 0.45s cubic-bezier(0.16,1,0.3,1) both;
          contain: layout style;
        }
        @keyframes lp-rise {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .lp-header {
          text-align: center;
          margin-bottom: 22px;
        }
        .lp-logo-ring {
          width: 60px; height: 60px;
          border-radius: 50%;
          margin: 0 auto 12px;
          background: rgba(56,189,248,0.10);
          border: 1.5px solid rgba(56,189,248,0.28);
          display: flex; align-items: center; justify-content: center;
          color: #38bdf8;
          box-shadow: 0 0 30px rgba(56,189,248,0.20), 0 0 0 6px rgba(56,189,248,0.05);
          animation: lp-pulse-ring 3s ease infinite;
          will-change: box-shadow;
        }
        @keyframes lp-pulse-ring {
          0%, 100% { box-shadow: 0 0 20px rgba(56,189,248,0.15), 0 0 0 4px rgba(56,189,248,0.04); }
          50% { box-shadow: 0 0 35px rgba(56,189,248,0.30), 0 0 0 8px rgba(56,189,248,0.07); }
        }
        .lp-title {
          font-size: 20px; font-weight: 800;
          color: #fff; margin: 0 0 4px;
          letter-spacing: -0.3px;
        }
        .lp-subtitle {
          font-size: 12px;
          color: rgba(255,255,255,0.42);
          margin: 0;
        }

        /* Tabs */
        .lp-tab-row {
          display: flex; gap: 4px;
          background: rgba(255,255,255,0.04);
          border-radius: 12px; padding: 4px;
          margin-bottom: 18px;
        }
        .lp-tab {
          flex: 1;
          padding: 9px 8px;
          border: none; background: transparent;
          cursor: pointer; font-size: 13px; font-weight: 700;
          color: rgba(255,255,255,0.48);
          border-radius: 9px;
          transition: color 0.18s ease, background 0.18s ease, transform 0.12s ease;
          will-change: transform;
          font-family: inherit;
        }
        .lp-tab:hover { color: rgba(255,255,255,0.75); }
        .lp-tab:active { transform: scale(0.97); }
        .lp-tab--active {
          background: rgba(56,189,248,0.16);
          color: #38bdf8;
          box-shadow: 0 2px 12px rgba(56,189,248,0.15);
        }

        /* Sub-tabs */
        .lp-subtab-row {
          display: flex; gap: 4px;
          background: rgba(255,255,255,0.03);
          border-radius: 10px; padding: 3px;
          margin-bottom: 14px;
        }
        .lp-subtab {
          flex: 1;
          padding: 8px 6px;
          border: none; background: transparent;
          cursor: pointer; font-size: 12px; font-weight: 600;
          color: rgba(255,255,255,0.42);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center; gap: 5px;
          transition: color 0.18s ease, background 0.18s ease, transform 0.12s ease;
          font-family: inherit;
          will-change: transform;
        }
        .lp-subtab:hover { color: rgba(255,255,255,0.7); }
        .lp-subtab:active { transform: scale(0.97); }
        .lp-subtab--active { background: rgba(56,189,248,0.13); color: #38bdf8; }
        .lp-icon { font-size: 13px; line-height: 1; }

        /* Panel animation */
        .lp-panel {
          animation: lp-fadein 0.25s ease both;
        }
        @keyframes lp-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Form */
        .lp-form { display: flex; flex-direction: column; gap: 11px; }
        .lp-field { display: flex; flex-direction: column; gap: 5px; }
        .lp-label {
          font-size: 11px; font-weight: 700;
          color: rgba(255,255,255,0.52);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .lp-input {
          width: 100%;
          background: rgba(0,0,0,0.28);
          border: 1.5px solid rgba(255,255,255,0.10);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          color: #fff;
          font-family: inherit;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
          will-change: transform;
        }
        .lp-input::placeholder { color: rgba(255,255,255,0.22); }
        .lp-input:focus {
          border-color: rgba(56,189,248,0.6);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.12);
          transform: translateY(-0.5px);
        }
        .lp-input:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .lp-select { cursor: pointer; }
        .lp-select option { background: #0d1627; color: #fff; }

        .lp-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 480px) { .lp-grid2 { grid-template-columns: 1fr; } }

        /* Buttons */
        .lp-btn {
          width: 100%;
          padding: 13px 16px;
          border: none; border-radius: 12px;
          font-size: 14px; font-weight: 700;
          cursor: pointer; font-family: inherit;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform 0.16s cubic-bezier(0.34,1.56,0.64,1),
                      box-shadow 0.18s ease,
                      background 0.18s ease,
                      opacity 0.15s ease;
          will-change: transform;
          position: relative; overflow: hidden;
          transform: translateZ(0);
        }
        .lp-btn::after {
          content: "";
          position: absolute;
          inset: -2px;
          background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.18) 40%, transparent 60%);
          transform: translateX(-120%);
          transition: transform 0.55s ease;
        }
        .lp-btn:hover::after { transform: translateX(120%); }
        .lp-btn:hover:not(:disabled) { transform: translateY(-2px) translateZ(0); }
        .lp-btn:active:not(:disabled) { transform: scale(0.97) translateZ(0); transition-duration: 0.08s; }
        .lp-btn--primary {
          background: linear-gradient(135deg, #38bdf8 0%, #7c83ff 100%);
          color: #040d18;
          box-shadow: 0 6px 24px rgba(56,189,248,0.30);
          margin-top: 4px;
        }
        .lp-btn--primary:hover:not(:disabled) {
          box-shadow: 0 10px 32px rgba(56,189,248,0.42);
        }
        .lp-btn--outline {
          background: rgba(56,189,248,0.06);
          color: #38bdf8;
          border: 1.5px solid rgba(56,189,248,0.24);
          font-size: 12px;
          padding: 9px 14px;
        }
        .lp-btn--disabled { opacity: 0.4 !important; cursor: not-allowed !important; }
        .lp-btn--loading { opacity: 0.75; }

        /* Spinner */
        .lp-spinner {
          display: inline-block;
          width: 14px; height: 14px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: rgba(255,255,255,0.85);
          animation: lp-spin 0.65s linear infinite;
          will-change: transform;
          flex-shrink: 0;
        }
        @keyframes lp-spin { to { transform: rotate(360deg); } }

        /* Link button */
        .lp-link-btn {
          background: none; border: none;
          color: rgba(255,255,255,0.38);
          text-decoration: underline;
          cursor: pointer; font-size: 12px;
          padding: 4px 0; font-family: inherit;
          transition: color 0.15s ease;
        }
        .lp-link-btn:hover { color: rgba(255,255,255,0.65); }

        /* Error / success */
        .lp-error {
          margin-top: 12px; padding: 10px 14px;
          background: rgba(255,90,122,0.09);
          border: 1px solid rgba(255,90,122,0.22);
          border-radius: 10px;
          font-size: 13px; font-weight: 600;
          color: #ff8ea3;
          display: flex; align-items: center; gap: 6px;
          animation: lp-shake 0.35s ease;
        }
        @keyframes lp-shake {
          0%,100%{transform:translateX(0)}
          25%{transform:translateX(-5px)}
          75%{transform:translateX(5px)}
        }
        .lp-success { color: #34d399; font-size: 13px; font-weight: 600; text-align: center; margin: 6px 0 0; }
        .lp-success-banner {
          margin-top: 10px; padding: 10px 14px;
          background: rgba(52,211,153,0.09);
          border: 1px solid rgba(52,211,153,0.22);
          border-radius: 10px;
          font-size: 13px; font-weight: 600;
          color: #34d399; text-align: center;
        }

        /* Fingerprint */
        .lp-fp-login { display: flex; flex-direction: column; gap: 12px; }
        .lp-fp-hint {
          text-align: center; padding: 20px 0;
          color: rgba(255,255,255,0.32); font-size: 13px;
        }

        .lp-fp-box {
          border: 1px solid rgba(56,189,248,0.16);
          border-radius: 12px;
          padding: 14px;
          background: rgba(56,189,248,0.03);
          display: flex; flex-direction: column; gap: 8px;
        }
        .lp-fp-box-title {
          display: flex; align-items: center; gap: 6px;
          font-weight: 700; font-size: 13px; color: #38bdf8;
        }
        .lp-required { color: #ff5a7a; }
        .lp-fp-hint-small { font-weight: 400; font-size: 11px; color: rgba(255,255,255,0.38); }

        .lp-progress-track {
          height: 4px; background: rgba(255,255,255,0.05);
          border-radius: 8px; overflow: hidden;
        }
        .lp-progress-fill {
          height: 100%; border-radius: 8px;
          transition: width 0.5s ease, background 0.4s ease;
          will-change: width;
        }
        .lp-progress-label {
          font-size: 11px; color: rgba(255,255,255,0.45);
        }

        .lp-scan-previews { display: flex; gap: 8px; }
        .lp-scan-preview { text-align: center; }
        .lp-scan-label { font-size: 10px; color: rgba(255,255,255,0.45); margin-bottom: 3px; }
        .lp-scan-img {
          width: 60px; height: 60px; border-radius: 6px;
          border: 1.5px solid rgba(56,189,248,0.28);
          object-fit: cover;
        }
        .lp-scan-placeholder {
          width: 60px; height: 60px; border-radius: 6px;
          border: 1.5px solid rgba(56,189,248,0.18);
          background: rgba(56,189,248,0.06);
          display: flex; align-items: center; justify-content: center;
        }

        .lp-fp-done {
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; font-weight: 600; color: #34d399;
        }
      `}</style>
    </div>
  );
}
