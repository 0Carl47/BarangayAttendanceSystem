# Barangay Attendance System - Setup Guide

## ✅ NO PostgreSQL Needed!
This system uses **SQLite** — a built-in database. No additional database installation required.

---

## 🚀 FIRST TIME INSTALL

Open **PowerShell as Administrator**, then:

```powershell
# Allow scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Go to your project folder (adjust the path to wherever you extracted the system)
cd "C:\barangay-attendance-system"

# Run installer (or double-click INSTALL.bat)
.\INSTALL.bat
```

**OR** run manually step by step:

```powershell
cd "C:\barangay-attendance-system"
npm install
npx prisma db push
node prisma/seed.js
cd zk-bridge
npm install
cd ..
```

---

## ▶️ EVERY TIME YOU WANT TO RUN

**Window 1 — Fingerprint Bridge** (keep open):
```powershell
cd "C:\barangay-attendance-system\zk-bridge"
node bridge.js
```
Or double-click `zk-bridge\START-BRIDGE.bat`

**Window 2 — Website** (keep open):
```powershell
cd "C:\barangay-attendance-system"
npm run dev
```
Or double-click `START-WEBSITE.bat`

Then open browser: **http://localhost:3000**

---

## 🔑 Default Login

| Account | Username | Password |
|---------|----------|----------|
| Admin   | admin    | admin123 |

---

## 👆 Fingerprint Registration (3 scans required)

1. Go to **Sign Up** page
2. Fill in all details
3. Place finger on ZKTeco R20i → **Scan 1 of 3**
4. Remove finger, place again → **Scan 2 of 3**  
5. Remove finger, place again → **Scan 3 of 3**
6. All 3 scans saved with fingerprint image preview
7. Click **Create Account**

## 👆 Fingerprint Login

1. Place finger on ZKTeco R20i
2. System matches against all 3 stored templates
3. If score ≥ 50 → logged in
4. If no match → "Fingerprint not recognised"

---

## ⚠️ Troubleshooting

**"Bridge unreachable"** — Start `START-BRIDGE.bat` first, plug in ZKTeco USB

**"No enrolled fingerprints"** — Register your account first via Sign Up

**"Fingerprint not recognised"** — Re-enroll; make sure same finger used

**npm install fails** — Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` first
