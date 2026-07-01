
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";
import { computeStatus, todayDateKeyPH, dateKeyAddDays } from "@/lib/reporting";

function parseRange(req: NextRequest) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date")?.trim() || "";
  const userId = url.searchParams.get("userId")?.trim() || "";
  const from = url.searchParams.get("from")?.trim() || "";
  const to = url.searchParams.get("to")?.trim() || "";

  if (date) return { from: date, to: date, userId };

  const today = todayDateKeyPH();
  // Default: last 30 days (inclusive)
  const defaultFrom = dateKeyAddDays(today, -30);
  return {
    from: from || defaultFrom,
    to: to || today,
    userId,
  };
}

export async function GET(req: NextRequest) {
  const { from, to, userId } = parseRange(req);

  const where: any = {
    dateKey: { gte: from, lte: to },
  };
  if (userId) where.userId = userId;

  const [records, users] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      include: { user: true },
      orderBy: [{ dateKey: "desc" }, { timeIn: "desc" }],
      take: 5000,
    }),
    prisma.user.findMany({
      where: userId ? { id: userId } : { role: "employee" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Barangay Attendance";
  wb.created = new Date();

  const ws = wb.addWorksheet("Records");

  ws.columns = [
    { header: "Role", key: "role", width: 12 },
    { header: "User ID", key: "userId", width: 18 },
    { header: "Name", key: "name", width: 28 },
    { header: "Date", key: "dateKey", width: 14 },
    { header: "Time In", key: "timeIn", width: 22 },
    { header: "Break In", key: "breakIn", width: 22 },
    { header: "Break Out", key: "breakOut", width: 22 },
    { header: "Time Out", key: "timeOut", width: 22 },
    { header: "Status", key: "status", width: 26 },
    { header: "Late", key: "late", width: 18 },
    { header: "Worked (Attended)", key: "worked", width: 20 },
    { header: "Overtime", key: "overtime", width: 18 },
    { header: "Remarks", key: "remarks", width: 32 },
  ];

  for (const r of records) {
    const name = r.user ? `${r.user.firstName} ${r.user.lastName}` : "";
    const s = computeStatus({
      dateKey: r.dateKey,
      timeIn: r.timeIn,
      timeOut: r.timeOut,
      breakIn: r.breakIn,
      breakOut: r.breakOut,
      scheduleTime: r.user?.scheduleTime,
    });
    ws.addRow({
      role: r.role,
      userId: r.userId,
      name,
      dateKey: r.dateKey,
      timeIn: r.timeIn,
      breakIn: r.breakIn || null,
      breakOut: r.breakOut || null,
      timeOut: r.timeOut || null,
      status: s.status,
      late: s.lateText,
      worked: s.workText,
      overtime: s.overtimeText,
      remarks: s.remarks,
    });
  }

  ws.getRow(1).font = { bold: true };
  // ===== Styling =====
  const headerFill = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FF1F4E78' }
  };

  ws.getRow(1).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  ws.getColumn("timeIn").numFmt = 'hh:mm:ss AM/PM';
  ws.getColumn("breakIn").numFmt = 'hh:mm:ss AM/PM';
  ws.getColumn("breakOut").numFmt = 'hh:mm:ss AM/PM';
  ws.getColumn("timeOut").numFmt = 'hh:mm:ss AM/PM';


  // Daily Summary
  const wsDaily = wb.addWorksheet("Daily Summary");
  wsDaily.columns = [
    { header: "Date", key: "dateKey", width: 14 },
    { header: "Total Employees", key: "total", width: 16 },
    { header: "Present", key: "present", width: 10 },
    { header: "Absent", key: "absent", width: 10 },
    { header: "Late", key: "late", width: 10 },
    { header: "Half Day", key: "half", width: 10 },
    { header: "Out Early", key: "early", width: 10 },
    { header: "In Progress", key: "progress", width: 12 },
  ];

  const totalEmployees = users.length;
  const recordsByDate = new Map<string, typeof records>();
  for (const r of records) {
    const arr = recordsByDate.get(r.dateKey) || [];
    arr.push(r);
    recordsByDate.set(r.dateKey, arr);
  }

  // Iterate date range inclusive.
  for (let dk = from; dk <= to; dk = dateKeyAddDays(dk, 1)) {
    const dayRecs = recordsByDate.get(dk) || [];
    const seen = new Set<string>();
    let late = 0,
      half = 0,
      early = 0,
      progress = 0;
    for (const r of dayRecs) {
      seen.add(r.userId);
      const s = computeStatus({
        dateKey: r.dateKey,
        timeIn: r.timeIn,
        timeOut: r.timeOut,
        breakIn: r.breakIn,
        breakOut: r.breakOut,
        scheduleTime: r.user?.scheduleTime,
      });
      if (s.lateMs > 0) late++;
      if (s.dayType === "HALF DAY") half++;
      if (s.dayType === "OUT EARLY") early++;
      if (s.dayType === "IN PROGRESS") progress++;
    }

    const present = seen.size;
    const absent = Math.max(0, totalEmployees - present);
    wsDaily.addRow({ dateKey: dk, total: totalEmployees, present, absent, late, half, early, progress });
  }
  wsDaily.getRow(1).font = { bold: true };

  // Employee Summary
  const wsEmp = wb.addWorksheet("Employee Summary");
  wsEmp.columns = [
    { header: "User ID", key: "userId", width: 18 },
    { header: "Name", key: "name", width: 28 },
    { header: "Days Present", key: "present", width: 12 },
    { header: "Days Absent", key: "absent", width: 12 },
    { header: "Late Count", key: "late", width: 12 },
    { header: "Half Day", key: "half", width: 12 },
    { header: "Out Early", key: "early", width: 12 },
    { header: "Overtime (hrs)", key: "ot", width: 14 },
  ];

  const dateKeys: string[] = [];
  for (let dk = from; dk <= to; dk = dateKeyAddDays(dk, 1)) dateKeys.push(dk);

  const recByUserDate = new Map<string, (typeof records)[number]>();
  for (const r of records) {
    // If multiple records same day, keep earliest timeIn as the main record
    const k = `${r.userId}__${r.dateKey}`;
    const existing = recByUserDate.get(k);
    if (!existing || r.timeIn.getTime() < existing.timeIn.getTime()) recByUserDate.set(k, r);
  }

  for (const u of users) {
    const name = `${u.firstName} ${u.lastName}`;
    let present = 0,
      absent = 0,
      late = 0,
      half = 0,
      early = 0,
      ot = 0;
    for (const dk of dateKeys) {
      const r = recByUserDate.get(`${u.id}__${dk}`);
      if (!r) {
        absent++;
        continue;
      }
      present++;
      const s = computeStatus({ 
        dateKey: dk, 
        timeIn: r.timeIn, 
        timeOut: r.timeOut, 
        breakIn: r.breakIn, 
        breakOut: r.breakOut, 
        scheduleTime: u.scheduleTime 
      });
      if (s.lateMs > 0) late++;
      if (s.dayType === "HALF DAY") half++;
      if (s.dayType === "OUT EARLY") early++;
      if (s.overtimeMs > 0) ot += s.overtimeMs;
    }
    wsEmp.addRow({ userId: u.id, name, present, absent, late, half, early, ot: (ot / 3600000).toFixed(2) });
  }
  wsEmp.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();

  const fnameBase = userId ? `attendance_${userId}` : "attendance";
  const fname = `${fnameBase}_${from}_to_${to}.xlsx`;

  return new NextResponse(Buffer.from(buf) as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
