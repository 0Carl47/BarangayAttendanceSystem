// zkfp-helper.exe  v4.0  — Direct P/Invoke, zero reflection
//
// Commands:
//   zkfp-helper capture             → { "template":"<base64>", "quality":<int> }
//   zkfp-helper enroll              → { "template":"<base64>" }   (3-scan merge)
//   zkfp-helper match <b64> <b64>   → { "score":<int>, "matched":<bool> }
//   zkfp-helper identify            → reads JSON from stdin: [{fid,template},...] → { "matched":<bool>, "fid":<int>, "score":<int> }
//   zkfp-helper merge               → reads JSON from stdin: {t1,t2,t3} → { "template":"<base64>" }
//   zkfp-helper count               → { "count":<int> }
//
// CHANGES in v4.0:
//   - identify: reads template JSON from stdin (not args) — avoids Windows 8191-char CLI limit
//   - merge: new command, reads {t1,t2,t3} from stdin, runs DBMerge without opening device
//   - match: raw < 0 = matched (genuine match on R20i returns small negative)

using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Threading;

static class ZK
{
    const string DLL = "libzkfp";

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_Init();

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_Terminate();

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_GetDeviceCount();

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern IntPtr ZKFPM_OpenDevice(int index);

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_CloseDevice(IntPtr hDevice);

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_GetParameters(
        IntPtr hDevice, int nParamCode,
        [Out] byte[] paramValue, ref uint cbParamValue);

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_AcquireFingerprint(
        IntPtr hDevice,
        [Out] byte[] fpImage,
        uint cbFPImage,
        [Out] byte[] fpTemplate,
        ref uint cbTemplate);

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern IntPtr ZKFPM_DBInit();

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_DBFree(IntPtr hDB);

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_DBMerge(
        IntPtr hDB,
        byte[] temp1, byte[] temp2, byte[] temp3,
        [Out] byte[] regTemp, ref uint cbRegTemp);

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_DBAdd(
        IntPtr hDB, uint fid, byte[] fpTemplate, uint cbTemplate);

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_DBDel(IntPtr hDB, uint fid);

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_DBClear(IntPtr hDB);

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_DBCount(IntPtr hDB, ref uint fpCount);

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_DBIdentify(
        IntPtr hDB,
        byte[] fpTemplate, uint cbTemplate,
        ref uint FID, ref uint score);

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_DBMatch(
        IntPtr hDB,
        byte[] template1, uint cbTemplate1,
        byte[] template2, uint cbTemplate2);

    [DllImport(DLL, CallingConvention = CallingConvention.Winapi)]
    public static extern int ZKFPM_VerifyByID(
        IntPtr hDB, uint fid, byte[] fpTemplate, uint cbTemplate);
}

static class Out
{
    public static void Ok(object data)
        => Console.WriteLine(JsonSerializer.Serialize(data));

    public static void Err(string msg, int code = -1)
    {
        Console.WriteLine(JsonSerializer.Serialize(new { error = msg, code }));
        Environment.Exit(1);
    }
}

class Program
{
    const int    TPL_SIZE           = 2048;
    const uint   TPL_SIZE_U         = 2048u;
    const int    CAPTURE_TIMEOUT_MS = 30000;
    const int    POLL_INTERVAL_MS   = 200;
    const int    ZKFP_ERR_OK        = 0;

    static IntPtr hDevice = IntPtr.Zero;

    static uint QueryImageBufferSize()
    {
        try
        {
            byte[] buf = new byte[4];
            uint sz = 4;
            int w = 0, h = 0;
            ZK.ZKFPM_GetParameters(hDevice, 1, buf, ref sz);
            w = BitConverter.ToInt32(buf, 0);
            sz = 4;
            ZK.ZKFPM_GetParameters(hDevice, 2, buf, ref sz);
            h = BitConverter.ToInt32(buf, 0);
            if (w > 0 && h > 0) return (uint)(w * h);
        }
        catch { }
        return 100000u;
    }

    static void InitDevice()
    {
        int r = ZK.ZKFPM_Init();
        if (r != ZKFP_ERR_OK)
            Out.Err($"ZKFPM_Init failed: {r}", r);

        int count = ZK.ZKFPM_GetDeviceCount();
        if (count <= 0)
        {
            ZK.ZKFPM_Terminate();
            Out.Err("No ZKTeco device found. Check USB cable and driver.");
        }

        hDevice = ZK.ZKFPM_OpenDevice(0);
        if (hDevice == IntPtr.Zero)
        {
            ZK.ZKFPM_Terminate();
            Out.Err("ZKFPM_OpenDevice failed. Device may be in use by another process.");
        }
    }

    static void CloseDevice()
    {
        if (hDevice != IntPtr.Zero)
        {
            ZK.ZKFPM_CloseDevice(hDevice);
            hDevice = IntPtr.Zero;
        }
        ZK.ZKFPM_Terminate();
    }

    static (byte[] tpl, byte[] img) CaptureOne(uint imgBufSize)
    {
        var imgBuf  = new byte[imgBufSize];
        var tplBuf  = new byte[TPL_SIZE];
        uint cbTpl  = TPL_SIZE_U;
        int  result = -1;
        int  tries  = 0;
        int  maxTries = CAPTURE_TIMEOUT_MS / POLL_INTERVAL_MS;

        while (tries < maxTries)
        {
            cbTpl  = TPL_SIZE_U;
            result = ZK.ZKFPM_AcquireFingerprint(
                hDevice, imgBuf, imgBufSize, tplBuf, ref cbTpl);

            if (result == ZKFP_ERR_OK && cbTpl > 0)
                break;

            Thread.Sleep(POLL_INTERVAL_MS);
            tries++;
        }

        if (result != ZKFP_ERR_OK || cbTpl == 0)
            Out.Err("No finger detected within 30 seconds. Please try again.");

        var tpl = new byte[cbTpl];
        Array.Copy(tplBuf, tpl, (int)cbTpl);
        // Trim image buffer to actual content (device returns w*h raw pixels)
        return (tpl, imgBuf);
    }

    // Convert raw grayscale pixel buffer to a minimal BMP (8-bit grayscale)
    // so it can be displayed as data:image/bmp;base64,... in the browser
    static byte[] RawToBmp(byte[] raw, int w, int h)
    {
        // BMP file: header(14) + DIB header(40) + palette(256*4) + pixel data
        int stride    = (w + 3) & ~3; // rows padded to 4 bytes
        int pixelSize = stride * h;
        int fileSize  = 14 + 40 + 256 * 4 + pixelSize;
        byte[] bmp    = new byte[fileSize];
        int o = 0;

        // File header
        bmp[o++] = (byte)'B'; bmp[o++] = (byte)'M';
        BitConverter.GetBytes(fileSize).CopyTo(bmp, o); o += 4;
        o += 4; // reserved
        BitConverter.GetBytes(14 + 40 + 256 * 4).CopyTo(bmp, o); o += 4;

        // DIB header (BITMAPINFOHEADER)
        BitConverter.GetBytes(40).CopyTo(bmp, o); o += 4;
        BitConverter.GetBytes(w).CopyTo(bmp, o);  o += 4;
        BitConverter.GetBytes(-h).CopyTo(bmp, o); o += 4; // negative = top-down
        bmp[o++] = 1; bmp[o++] = 0;   // planes
        bmp[o++] = 8; bmp[o++] = 0;   // bpp = 8
        o += 4;                        // compression = 0
        BitConverter.GetBytes(pixelSize).CopyTo(bmp, o); o += 4;
        o += 16;                       // resolution + colors used

        // Grayscale palette
        for (int i = 0; i < 256; i++) { bmp[o++] = (byte)i; bmp[o++] = (byte)i; bmp[o++] = (byte)i; bmp[o++] = 0; }

        // Pixel data (flip vertically not needed since we set negative height)
        for (int row = 0; row < h; row++)
        {
            int srcOff = row * w;
            int dstOff = o + row * stride;
            int len    = Math.Min(w, raw.Length - srcOff);
            if (len > 0) Array.Copy(raw, srcOff, bmp, dstOff, len);
        }

        return bmp;
    }

    static void DoCapture()
    {
        InitDevice();
        try
        {
            uint imgSize = QueryImageBufferSize();
            // Also get width/height for BMP conversion
            int width = 0, height = 0;
            try {
                byte[] buf = new byte[4]; uint sz = 4;
                ZK.ZKFPM_GetParameters(hDevice, 1, buf, ref sz); width  = BitConverter.ToInt32(buf, 0);
                sz = 4;
                ZK.ZKFPM_GetParameters(hDevice, 2, buf, ref sz); height = BitConverter.ToInt32(buf, 0);
            } catch { }

            var (tpl, imgBuf) = CaptureOne(imgSize);
            int quality = Math.Min(100, Math.Max(50, tpl.Length / 20));

            string imageB64 = "";
            if (width > 0 && height > 0 && imgBuf.Length >= width * height)
            {
                byte[] bmp = RawToBmp(imgBuf, width, height);
                imageB64 = Convert.ToBase64String(bmp);
            }

            Out.Ok(new { template = Convert.ToBase64String(tpl), quality, image = imageB64 });
        }
        finally { CloseDevice(); }
    }

    static void DoEnroll()
    {
        InitDevice();
        try
        {
            IntPtr hDB = ZK.ZKFPM_DBInit();
            if (hDB == IntPtr.Zero)
                Out.Err("ZKFPM_DBInit failed");

            uint imgSize = QueryImageBufferSize();
            byte[][] samples = new byte[3][];

            for (int i = 0; i < 3; i++)
            {
                Console.Error.WriteLine($"{{\"step\":{i+1},\"msg\":\"Place finger — scan {i+1} of 3\"}}");
                var (tpl, _) = CaptureOne(imgSize);
                samples[i] = tpl;
                if (i < 2) Thread.Sleep(600);
            }

            var regBuf = new byte[TPL_SIZE];
            uint cbReg = TPL_SIZE_U;

            int r = ZK.ZKFPM_DBMerge(hDB, samples[0], samples[1], samples[2], regBuf, ref cbReg);
            ZK.ZKFPM_DBFree(hDB);

            if (r != ZKFP_ERR_OK || cbReg == 0)
                Out.Err($"DBMerge failed: {r}  (cbReg={cbReg})", r);

            var reg = new byte[cbReg];
            Array.Copy(regBuf, reg, (int)cbReg);
            Out.Ok(new { template = Convert.ToBase64String(reg) });
        }
        finally { CloseDevice(); }
    }

    // merge: reads {t1, t2, t3} base64 from stdin — NO device open
    static void DoMerge()
    {
        string stdinJson = Console.In.ReadToEnd().Trim();
        MergeInput? input;
        try { input = JsonSerializer.Deserialize<MergeInput>(stdinJson); }
        catch { Out.Err("Invalid JSON stdin for merge"); return; }

        if (input == null || string.IsNullOrEmpty(input.t1) ||
            string.IsNullOrEmpty(input.t2) || string.IsNullOrEmpty(input.t3))
            Out.Err("merge requires t1, t2, t3 in stdin JSON");

        byte[] b1, b2, b3;
        try
        {
            b1 = Convert.FromBase64String(input!.t1!);
            b2 = Convert.FromBase64String(input.t2!);
            b3 = Convert.FromBase64String(input.t3!);
        }
        catch { Out.Err("Invalid base64 in t1/t2/t3"); return; }

        // DBMerge does NOT need device — pure template operation
        int r = ZK.ZKFPM_Init();
        if (r != ZKFP_ERR_OK) Out.Err($"ZKFPM_Init failed: {r}");

        IntPtr hDB = ZK.ZKFPM_DBInit();
        if (hDB == IntPtr.Zero) { ZK.ZKFPM_Terminate(); Out.Err("ZKFPM_DBInit failed"); }

        var regBuf = new byte[TPL_SIZE];
        uint cbReg = TPL_SIZE_U;

        int mr = ZK.ZKFPM_DBMerge(hDB, b1, b2, b3, regBuf, ref cbReg);
        ZK.ZKFPM_DBFree(hDB);
        ZK.ZKFPM_Terminate();

        if (mr != ZKFP_ERR_OK || cbReg == 0)
            Out.Err($"DBMerge failed: {mr}  (cbReg={cbReg})", mr);

        var reg = new byte[cbReg];
        Array.Copy(regBuf, reg, (int)cbReg);
        Out.Ok(new { template = Convert.ToBase64String(reg), len = (int)cbReg });
    }

    // identify: reads [{fid,template},...] from stdin — opens device for live scan
    static void DoIdentify()
    {
        string stdinJson = Console.In.ReadToEnd().Trim();
        TemplateEntry[]? entries;
        try { entries = JsonSerializer.Deserialize<TemplateEntry[]>(stdinJson); }
        catch { Out.Err("Invalid JSON stdin for identify"); return; }

        if (entries == null || entries.Length == 0)
            Out.Err("Empty template list");

        InitDevice();
        try
        {
            IntPtr hDB = ZK.ZKFPM_DBInit();
            if (hDB == IntPtr.Zero) Out.Err("ZKFPM_DBInit failed");

            foreach (var e in entries!)
            {
                byte[] tpl = Convert.FromBase64String(e.template);
                ZK.ZKFPM_DBAdd(hDB, (uint)e.fid, tpl, (uint)tpl.Length);
            }

            uint imgSize = QueryImageBufferSize();
            var (live, _) = CaptureOne(imgSize);

            uint fid = 0, score = 0;
            int r = ZK.ZKFPM_DBIdentify(
                hDB, live, (uint)live.Length, ref fid, ref score);

            ZK.ZKFPM_DBFree(hDB);

            bool matched = (r == ZKFP_ERR_OK && score >= 50);
            Out.Ok(new { matched, fid = matched ? (int)fid : -1, score = (int)score });
        }
        finally { CloseDevice(); }
    }

    // identify-offline: reads {scan, templates:[{fid,template},...]} from stdin — pure template matching (NO device needed)
    static void DoIdentifyOffline()
    {
        string stdinJson = Console.In.ReadToEnd().Trim();
        IdentifyOfflineInput? input;
        try { input = JsonSerializer.Deserialize<IdentifyOfflineInput>(stdinJson); }
        catch { Out.Err("Invalid JSON stdin for identify-offline"); return; }

        if (input == null || string.IsNullOrEmpty(input.scan) || input.templates == null || input.templates.Length == 0)
            Out.Err("Empty template list or missing scan");

        byte[] live;
        try { live = Convert.FromBase64String(input!.scan); }
        catch { Out.Err("Invalid base64 scan template"); return; }

        int r = ZK.ZKFPM_Init();
        if (r != ZKFP_ERR_OK) Out.Err($"ZKFPM_Init failed: {r}");

        IntPtr hDB = ZK.ZKFPM_DBInit();
        if (hDB == IntPtr.Zero) { ZK.ZKFPM_Terminate(); Out.Err("ZKFPM_DBInit failed"); }

        bool found = false;
        int matchedFid = 0;
        int matchedScore = 0;

        try
        {
            foreach (var e in input.templates)
            {
                byte[] tpl = Convert.FromBase64String(e.template);
                // DBMatch: returns score >= 50 for same finger, 0 for different finger
                int score = ZK.ZKFPM_DBMatch(hDB, live, (uint)live.Length, tpl, (uint)tpl.Length);
                if (score >= 50)
                {
                    matchedFid = e.fid;
                    matchedScore = score;
                    found = true;
                    break;
                }
            }

            Out.Ok(new { matched = found, fid = found ? matchedFid : -1, score = found ? matchedScore : 0 });
        }
        finally
        {
            ZK.ZKFPM_DBFree(hDB);
            ZK.ZKFPM_Terminate();
        }
    }

    // match: raw < 0 = genuine match on R20i (DO NOT clip to 0)
    static void DoMatch(string[] args)
    {
        if (args.Length < 3)
            Out.Err("Usage: zkfp-helper match <base64_1> <base64_2>");

        byte[] t1, t2;
        try
        {
            t1 = Convert.FromBase64String(args[1]);
            t2 = Convert.FromBase64String(args[2]);
        }
        catch { Out.Err("Invalid base64 template argument"); return; }

        int r = ZK.ZKFPM_Init();
        if (r != ZKFP_ERR_OK) Out.Err($"ZKFPM_Init failed: {r}");

        IntPtr hDB = ZK.ZKFPM_DBInit();
        if (hDB == IntPtr.Zero) { ZK.ZKFPM_Terminate(); Out.Err("ZKFPM_DBInit failed"); }

        int score = ZK.ZKFPM_DBMatch(
            hDB,
            t1, (uint)t1.Length,
            t2, (uint)t2.Length);

        ZK.ZKFPM_DBFree(hDB);
        ZK.ZKFPM_Terminate();

        // R20i observed behavior: same finger returns large positive (400-800+), different finger returns 0 or near-0
        // Threshold 50 safely separates same vs different finger
        bool ok = score >= 50;
        Out.Ok(new { matched = ok, score, raw = score });
    }

    static void DoCount()
    {
        int r = ZK.ZKFPM_Init();
        if (r != ZKFP_ERR_OK) Out.Err($"ZKFPM_Init failed: {r}", r);
        int count = ZK.ZKFPM_GetDeviceCount();
        ZK.ZKFPM_Terminate();
        Out.Ok(new { count });
    }

    static void Main(string[] args)
    {
        string cmd = args.Length > 0 ? args[0].ToLower() : "";
        switch (cmd)
        {
            case "capture":          DoCapture();         break;
            case "enroll":           DoEnroll();          break;
            case "match":            DoMatch(args);       break;
            case "identify":         DoIdentify();        break;   // reads from stdin, live scan
            case "identify-offline": DoIdentifyOffline(); break;   // reads from stdin, matches pre-captured
            case "merge":            DoMerge();           break;   // reads from stdin
            case "count":            DoCount();           break;
            default:
                Out.Err($"Unknown command '{cmd}'. Use: capture | enroll | match | identify | identify-offline | merge | count");
                break;
        }
    }

    class TemplateEntry
    {
        public int    fid      { get; set; }
        public string template { get; set; } = "";
    }

    class MergeInput
    {
        public string? t1 { get; set; }
        public string? t2 { get; set; }
        public string? t3 { get; set; }
    }

    class IdentifyOfflineInput
    {
        public string scan { get; set; } = "";
        public TemplateEntry[] templates { get; set; } = Array.Empty<TemplateEntry>();
    }
}
