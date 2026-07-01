# 🏛️ Barangay Attendance System

A full-featured digital attendance and records management system designed for Barangay e. rodriguiz. It uses **ZKTeco R20i fingerprint scanner** hardware for biometric login and attendance tracking, built with modern web technologies.

---

## 📋 System Description

The **Barangay Attendance System** is a web-based application that replaces manual paper-based attendance logbooks in Barangay offices. It allows Barangay officials and staff to:

- Log in using their **fingerprint** via the ZKTeco R20i USB scanner
- Record and track **daily attendance** automatically upon login
- Manage **employee records** with full profile information
- Export **attendance reports** to Excel or PDF
- Administer accounts through a dedicated **Admin dashboard**

The system runs entirely on your local Windows PC — no internet connection is required after installation.

---

## 🛠️ Technologies Used

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 + React 18 | Web interface (UI) |
| **Language** | TypeScript | Type-safe frontend code |
| **Styling** | CSS (globals.css) | Custom styling and layout |
| **Backend** | Next.js API Routes | Server-side logic and REST API |
| **Database** | SQLite (via Prisma ORM) | Local data storage — no server needed |
| **Auth** | jose (JWT) + bcryptjs | Secure session tokens and password hashing |
| **Biometrics** | ZKTeco SDK (libzkfp.dll) | Native fingerprint capture and matching |
| **Bridge** | C# + Node.js + WebSocket + HTTP | Connects fingerprint hardware to web browser |
| **Reports** | ExcelJS + PDFKit | Export to .xlsx and .pdf |
| **Runtime** | Node.js 18+ | JavaScript runtime |
| **OS** | Windows 10/11 (64-bit) | Required for ZKTeco native DLL |

---

## ✨ Key Features

### 👆 Fingerprint Attendance
- **3-scan enrollment** — register your fingerprint with 3 placements for accuracy
- **Live fingerprint preview** — see your fingerprint image on screen during scanning
- **Biometric login** — place finger on ZKTeco R20i to log in instantly
- Native ZKTeco SDK matching — genuine match scores between 40–100
- Automatic login on every fingerprint success

### 👤 Account & Employee Management
- Admin can **create, view, edit, and delete** employee accounts
- Each employee has: name, position, department, contact info, and fingerprint templates

### 📊 Attendance Tracking & Reports
- Daily attendance log with timestamps (time-in / time-out)
- View attendance history per employee
- **Export to Excel (.xlsx)**
- **Export to PDF** — for printed records submission

### 🔐 Admin Dashboard
- Separate admin interface at `/admin`
- Manage all user accounts and roles
- View system-wide attendance overview
- Reset employee fingerprints if needed

### 🔒 Security
- Passwords hashed with bcryptjs (salted)
- JWT tokens stored in secure HTTP-only cookies
- Middleware route protection — unauthenticated users redirected to login
- AES-256-GCM encryption

---

## 💻 System Requirements

Before installing, make sure your computer has:

| Requirement | Details |
|-------------|---------|
| **Operating System** | Windows 10 or Windows 11 (64-bit) |
| **Node.js** | Version 18 or newer → [Download here](https://nodejs.org) |
| **Fingerprint Device** | ZKTeco R20i connected via USB *(optional — password login works without it)* |
| **Disk Space** | At least 500 MB free |
| **RAM** | At least 4 GB recommended |
| **Browser** | Google Chrome, Microsoft Edge, or Firefox (latest) |

---

## 📦 Installation Guide

Follow these steps **once** to set up the system.

---

### Step 1 — Download & Extract

1. Download the `barangay-attendance-system` folder (you already have this)
2. Move or copy the folder to a permanent location, for example:
   ```
   C:\barangay-attendance-system\
   ```
   > ⚠️ **Avoid putting it in a path with spaces** (e.g. avoid `C:\My Documents\`)

---

### Step 2 — Install Node.js (if not installed)

1. Open your browser and go to: **https://nodejs.org**
2. Click the **LTS** download button (the recommended version)
3. Run the installer — click **Next → Next → Install → Finish**
4. To verify, open PowerShell and type:
   ```powershell
   node --version
   ```
   You should see something like `v18.20.0` or higher.

---

### Step 3 — Allow PowerShell Scripts

1. Press `Windows Key + X` → click **Windows PowerShell (Admin)** or **Terminal (Admin)**
2. Type the following and press Enter:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. Type `Y` and press Enter to confirm.

---

### Step 4 — Run the Installer

**Option A — Double-click (easiest):**
1. Open the `barangay-attendance-system` folder
2. Right-click **`INSTALL.bat`** → click **"Run as Administrator"**
3. Right-click **`BUILD.bat`** Found at barangay-attendance-system\zk-bridge\zkfp-helper-src→ click **"Run as Administrator"**
4. Right-click **`START-BRIDGE.bat`** → click **"Run as Administrator"**
5. Right-click **`START-WEBSITE.bat`** → click **"Run as Administrator"**
6. A black terminal window will open and automatically:
   - Install all website packages (`npm install`)
   - Create the SQLite database (`prisma db push`)
   - Create the default admin account (`node prisma/seed.js`)
   - Install fingerprint bridge packages
7. When done, you'll see **"INSTALL COMPLETE!"** — press any key to close

**Option B — Manual (PowerShell):**
```powershell
# Open PowerShell as Administrator and run:
cd "C:\barangay-attendance-system"

npm install
npx prisma db push
node prisma/seed.js

cd zk-bridge
npm install
cd ..
```

---

## 🚀 How to Start the System (Every Time)

You need to open **two separate terminal windows** every time you use the system.

---

### Window 1 — Start the Fingerprint Bridge

> This connects the ZKTeco R20i USB device to the website. **Must be running first.**

**Option A — Double-click:**
1. Open the `barangay-attendance-system` folder
2. Double-click **`START-BRIDGE.bat`**
3. A purple/magenta terminal window opens — you'll see:
   ```
   ZKTeco R20i Fingerprint Bridge
   Bridge will start on:
     WebSocket:  ws://localhost:8888
     HTTP:       http://localhost:8889
   ```
4. **Leave this window open** the entire time you use the system

**Option B — PowerShell:**
```powershell
cd "C:\barangay-attendance-system\zk-bridge"
node bridge.js
```

---

### Window 2 — Start the Website

**Option A — Double-click:**
1. Double-click **`START-WEBSITE.bat`** in the main folder
2. A terminal window opens — wait until you see:
   ```
   ▲ Next.js ready
   - Local: http://localhost:3000
   ```
3. **Leave this window open** the entire time you use the system

**Option B — PowerShell:**
```powershell
cd "C:\barangay-attendance-system"
npm run dev
```

---

### Step 3 — Open the Website

1. Open **Google Chrome** or **Microsoft Edge**
2. Go to: **http://localhost:3000**
3. The Barangay Attendance System login page will appear

---

## 🖥️ How to Use the System

### Logging In
1. Open **http://localhost:3000** in your browser
2. **place your finger** on sensor auto login
3. automatic log out if the user inactive for 15seconds
4. Click **Login**
5. You will be redirected to your dashboard

### Logging In (Fingerprint)
1. Make sure the **Fingerprint Bridge is running** (Window 1 is open)
2. Make sure the **ZKTeco R20i** is plugged into USB
3. Open **http://localhost:3000** in your browser
4. Click the **Fingerprint** tab
5. Click the **🖐️ ZKTeco R20i Fingerprint** button
6. **Place your finger** on the sensor
7. If recognized → you are logged in automatically
8. If not recognized → try again

### Registering a New Employee/Admin
2. Click **"Sign Up"**
3. Fill in the employee's details:
   - Full Name
   - Position
   - Age
   - Sex
   - Contact Number
4. For **fingerprint enrollment**:
   - Click **"Enroll Fingerprint"**
   - Place the finger → **Scan 1 of 3** — lift finger
   - Place same finger again → **Scan 2 of 3** — lift finger
   - Place same finger again → **Scan 3 of 3**
   - Fingerprint image preview appears for each scan
5. Click **"Create Account"** to save

### Viewing Attendance
1. Log in as **admin**
2. Go to **Reports** or **Attendance** in the navigation menu
3. Filter by date range or employee
4. View time-in and time-out logs

### Exporting Reports
1. Go to **Reports** section
2. Choose your date range and filters
3. Click **"Export to Excel"** → downloads an `.xlsx` file
4. Or click **"Export to PDF"** → downloads a printable `.pdf`

---

## ⚠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Bridge unreachable"** | Start `START-BRIDGE.bat` first, then refresh the browser |
| **"ZKTeco device not found"** | Plug in the ZKTeco R20i USB device, then restart the bridge |
| **"libzkfp.dll not found"** | Copy `libzkfp.dll` and `zkfp.dll` from the ZKTeco SDK `Lib\x64` folder into the `zk-bridge` folder |
| **"Fingerprint not recognised"** | Re-enroll the fingerprint via Sign Up; use the same finger |
| **"No enrolled fingerprints"** | Register the account first via Sign Up before trying fingerprint login |
| **npm install fails** | Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell as Admin |
| **Port 3000 already in use** | Close other Node.js apps or change the port in `next.config.mjs` |
| **Website won't load** | Make sure `START-WEBSITE.bat` is running and wait for "Next.js ready" message |

---

## 📁 Project Structure

```
barangay-attendance-system/
├── INSTALL.bat              ← Run once to install everything
├── START-BRIDGE.bat         ← Start fingerprint hardware bridge
├── START-WEBSITE.bat        ← Start the web application
├── README.md                ← This file
├── SETUP.md                 ← Quick setup reference
├── .env                     ← Environment configuration
├── package.json             ← Node.js project config
├── next.config.mjs          ← Next.js configuration
├── prisma/
│   ├── schema.prisma        ← Database schema
│   └── seed.js              ← Creates default admin account
├── app/                     ← Next.js pages and API routes
│   ├── layout.tsx           ← Root HTML layout
│   ├── page.tsx             ← Home/redirect page
│   ├── login/               ← Login page (password + fingerprint)
│   ├── admin/               ← Admin dashboard pages
│   ├── employee/            ← Employee dashboard pages
│   ├── reports/             ← Report generation pages
│   ├── fingerprint/         ← Fingerprint API routes
│   └── api/                 ← All backend API endpoints
├── components/              ← Reusable React components
├── lib/                     ← Utility functions and helpers
└── zk-bridge/               ← Fingerprint bridge server
    ├── bridge.js            ← Main bridge server (WebSocket + HTTP)
    ├── START-BRIDGE.bat     ← Start bridge script
    ├── libzkfp.dll          ← ZKTeco native SDK library
    └── zkfp-helper.exe      ← Native fingerprint helper
```

---

## 🔧 Without ZKTeco Hardware

If you don't have the ZKTeco R20i device, the system still works:
- The fingerprint bridge can still run (it will show `deviceReady: false`) — this is fine
- All attendance, reporting, and admin features work normally

---

## 📞 Support

For issues, check the **Troubleshooting** section above or review the detailed bridge documentation in `zk-bridge/README.md`.

---

### 👥 Group Members:

- Armenion, Carl Michael S.
- Menandro, Aguilar
- Estopase, Kzel
- Co, Anne Dominique
- Jallores, Jose Mauricio
- Valeroso, Angelica
- Ibanez, Faith Anne
- Pajaroja, Michael Lyn
- Bacay, Angelo
- Ga, Jerwin
