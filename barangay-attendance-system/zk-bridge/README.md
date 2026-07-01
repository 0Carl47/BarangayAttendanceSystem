# ZKTeco R20i Bridge — Setup Guide

## What is this?

This folder contains the **bridge server** that connects your ZKTeco R20i
fingerprint reader (USB device) to the Barangay website.

```
ZKTeco R20i (USB)
       ↓
  bridge.js  ← runs on your Windows PC
  ├── WebSocket  ws://localhost:8888   ← browser talks here
  └── HTTP REST  http://localhost:8889 ← website server talks here
       ↓
  Barangay System (Next.js website)
```

---

## Step-by-Step Setup

### Step 1 — Install the ZKTeco Driver

1. Run **driversetup.exe** from the SDK folder you received
2. Follow the installer (click Next → Install → Finish)
3. Plug in your ZKTeco R20i via USB
4. Windows should detect it automatically

### Step 2 — Copy the DLL files

From the SDK you received, find these files:

```
ZKFinger Standard SDK 5.3.0.33\Lib\x64\
  ├── libzkfp.dll   ← copy this
  └── zkfp.dll      ← copy this too
```

Copy both DLL files into **this folder** (same folder as bridge.js).

> **Note:** Use the x64 folder if your Windows is 64-bit (most PCs).
> Use x86 if your Windows is 32-bit.

### Step 3 — Install Node.js

Download from: https://nodejs.org (choose LTS version)

### Step 4 — Start the Bridge

Double-click **START-BRIDGE.bat**

You should see:
```
✅ libzkfp.dll loaded successfully
✅ ZKTeco R20i device opened
🔌 WebSocket bridge listening on ws://localhost:8888
🌐 HTTP bridge listening on http://localhost:8889
```

**Leave this window open** while using the Barangay system!

### Step 5 — Test it

Open your browser and go to: http://localhost:8889/status

You should see:
```json
{
  "ok": true,
  "deviceReady": true,
  "dllLoaded": true,
  "mode": "native"
}
```

---

## Using the Fingerprint in the Website

1. Start the bridge (START-BRIDGE.bat)
2. Start the website (`npm run dev` in the barangay-fixed folder)
3. Go to http://localhost:3000/login
4. Click **Fingerprint** tab
5. Click **🖐️ ZKTeco R20i Fingerprint**
6. Place your finger on the sensor

---

## Troubleshooting

**"Cannot reach ZKTeco bridge"**
→ Bridge is not running. Start START-BRIDGE.bat first.

**"libzkfp.dll not found"**
→ Copy the DLL files from the SDK Lib folder to this folder.

**"No device connected" (count=0)**
→ Check USB cable, try a different USB port, or reinstall the driver.

**Bridge runs but device shows 0**
→ Run driversetup.exe and reinstall the ZKTeco driver.

**"CORS error" in browser**
→ WebSocket on ws://localhost:8888 bypasses CORS — this is expected and fine.

---

## Without ZKTeco Hardware

If you don't have the device plugged in, the system still works with:
- **Windows Hello** fingerprint (laptop with built-in sensor)
- **Android/iPhone biometric** (via WebAuthn on Chrome)
- Simply use the **Password login** instead

The bridge will still run and show `deviceReady: false` — that's fine.
