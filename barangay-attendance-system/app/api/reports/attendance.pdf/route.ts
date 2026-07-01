
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import PDFDocument from "pdfkit";
import { computeStatus, todayDateKeyPH, dateKeyAddDays } from "@/lib/reporting";

function parseRange(req: NextRequest) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date")?.trim() || "";
  const userId = url.searchParams.get("userId")?.trim() || "";
  const from = url.searchParams.get("from")?.trim() || "";
  const to = url.searchParams.get("to")?.trim() || "";

  if (date) return { from: date, to: date, userId };

  const today = todayDateKeyPH();
  const defaultFrom = dateKeyAddDays(today, -30);
  return { from: from || defaultFrom, to: to || today, userId };
}

export async function GET(req: NextRequest) {
  const { from, to, userId } = parseRange(req);

  const where: any = { dateKey: { gte: from, lte: to } };
  if (userId) where.userId = userId;

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: { user: true },
    orderBy: [{ dateKey: "desc" }, { timeIn: "desc" }],
    take: 700, // cap for PDF size
  });

  const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
  const chunks: Buffer[] = [];

  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  // Title & Header Information
  doc.fontSize(18).font("Helvetica-Bold").text("Attendance Report", 30, 30);
  doc.moveDown(0.2);
  doc.fontSize(10).font("Helvetica").fillColor("#555555").text(`Range: ${from} to ${to}`);
  if (userId) doc.text(`Employee ID: ${userId}`);
  doc.text(`Generated: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })}`);
  doc.moveDown(0.8);

  const headers = [
    { text: "Date", x: 30, w: 60 },
    { text: "User ID", x: 90, w: 50 },
    { text: "Name", x: 140, w: 110 },
    { text: "Role", x: 250, w: 50 },
    { text: "Time In", x: 300, w: 65 },
    { text: "Break In", x: 365, w: 65 },
    { text: "Break Out", x: 430, w: 65 },
    { text: "Time Out", x: 495, w: 65 },
    { text: "Status", x: 560, w: 70 },
    { text: "Worked", x: 630, w: 60 },
    { text: "Overtime", x: 690, w: 60 },
    { text: "Remarks", x: 750, w: 62 },
  ];

  function drawTableHeader(doc: any, yVal: number) {
    doc.save();
    // Draw dark blue header bar background
    doc.fillColor("#1F4E78").rect(30, yVal - 4, 782, 18).fill();
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);
    for (const h of headers) {
      doc.text(h.text, h.x, yVal, { width: h.w, align: "left" });
    }
    doc.restore();
  }

  let y = doc.y;
  drawTableHeader(doc, y);
  y += 20;

  doc.font("Helvetica").fontSize(8).fillColor("#333333");

  for (const r of records) {
    // If we exceed page boundaries, insert a new page and repeat headers
    if (y > 500) {
      doc.addPage();
      y = 30;
      drawTableHeader(doc, y);
      y += 20;
      doc.font("Helvetica").fontSize(8).fillColor("#333333");
    }

    const name = r.user ? `${r.user.firstName} ${r.user.lastName}` : "";
    const s = computeStatus({
      dateKey: r.dateKey,
      timeIn: r.timeIn,
      timeOut: r.timeOut,
      breakIn: r.breakIn,
      breakOut: r.breakOut,
      scheduleTime: r.user?.scheduleTime,
    });

    const timeInStr = r.timeIn ? r.timeIn.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "-";
    const breakInStr = r.breakIn ? r.breakIn.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "-";
    const breakOutStr = r.breakOut ? r.breakOut.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "-";
    const timeOutStr = r.timeOut ? r.timeOut.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "-";

    // Draw fields at aligned x-coordinates
    doc.text(r.dateKey, 30, y, { width: 60 });
    doc.text(r.userId, 90, y, { width: 50 });
    doc.text(name, 140, y, { width: 110, height: 16, ellipsis: true });
    doc.text(r.role, 250, y, { width: 50 });
    doc.text(timeInStr, 300, y, { width: 65 });
    doc.text(breakInStr, 365, y, { width: 65 });
    doc.text(breakOutStr, 430, y, { width: 65 });
    doc.text(timeOutStr, 495, y, { width: 65 });
    doc.text(s.status, 560, y, { width: 70 });
    doc.text(s.workText, 630, y, { width: 60 });
    doc.text(s.overtimeText, 690, y, { width: 60 });
    doc.text(s.remarks, 750, y, { width: 62, height: 16, ellipsis: true });

    y += 18;

    // Draw horizontal divider line
    doc.strokeColor("#E0E0E0").lineWidth(0.5).moveTo(30, y - 2).lineTo(812, y - 2).stroke();
  }

  doc.end();
  const pdf = await done;

  return new NextResponse(pdf as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attendance_${userId ? userId + '_' : ''}${from}_to_${to}.pdf"`,
    },
  });
}
