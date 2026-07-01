import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type IncomingUser = {
  id: string;
  role: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  age?: number | null;
  position?: string | null;
  sex?: string | null;
  phone?: string | null;
  photo?: string | null;
  scheduleTime?: string | null;
};

type IncomingRecord = {
  // matches your app's structure: { id: employeeId, role, timeIn, timeOut? }
  id: string;            // employee/admin id in your local data
  role: string;          // "employee" | "admin"
  timeIn: number;        // ms timestamp
  timeOut?: number|null; // ms timestamp
  breakIn?: number|null; // ms timestamp
  breakOut?: number|null;// ms timestamp
};

function toDateKeyPH(ms: number) {
  // Manila is UTC+8, no DST.
  const d = new Date(ms + 8 * 60 * 60 * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const users: IncomingUser[] = Array.isArray(body.users) ? body.users : [];
  const records: IncomingRecord[] = Array.isArray(body.records) ? body.records : [];

  // Upsert users
  for (const u of users) {
    if (!u?.id || !u?.role || !u?.firstName || !u?.lastName) continue;

    await prisma.user.upsert({
      where: { id: String(u.id) },
      update: {
        role: String(u.role),
        firstName: String(u.firstName),
        middleName: u.middleName ?? null,
        lastName: String(u.lastName),
        age: u.age ?? null,
        position: u.position ?? null,
        sex: u.sex ?? null,
        phone: u.phone ?? null,
        photo: u.photo ?? null,
        scheduleTime: u.scheduleTime ?? null,
      },
      create: {
        id: String(u.id),
        role: String(u.role),
        firstName: String(u.firstName),
        middleName: u.middleName ?? null,
        lastName: String(u.lastName),
        age: u.age ?? null,
        position: u.position ?? null,
        sex: u.sex ?? null,
        phone: u.phone ?? null,
        photo: u.photo ?? null,
        scheduleTime: u.scheduleTime ?? "08:00",
      },
    });
  }

  // Insert/update attendance records.
  // We dedupe by (userId, timeIn) because your local records don't have stable IDs.
  // This keeps the UI logic unchanged.
  for (const r of records) {
    if (!r?.id || !r?.role || typeof r.timeIn !== "number") continue;

    const userId = String(r.id);
    const timeInDate = new Date(r.timeIn);
    const timeOutDate = r.timeOut ? new Date(r.timeOut) : null;
    const breakInDate = r.breakIn ? new Date(r.breakIn) : null;
    const breakOutDate = r.breakOut ? new Date(r.breakOut) : null;
    const dateKey = toDateKeyPH(r.timeIn);

    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        userId,
        timeIn: timeInDate,
      },
    });

    if (existing) {
      await prisma.attendanceRecord.update({
        where: { recordId: existing.recordId },
        data: {
          role: String(r.role),
          timeOut: timeOutDate,
          breakIn: breakInDate,
          breakOut: breakOutDate,
          dateKey,
        },
      });
    } else {
      await prisma.attendanceRecord.create({
        data: {
          userId,
          role: String(r.role),
          timeIn: timeInDate,
          timeOut: timeOutDate,
          breakIn: breakInDate,
          breakOut: breakOutDate,
          dateKey,
        },
      });
    }
  }

  return NextResponse.json({ ok: true, usersSynced: users.length, recordsSynced: records.length });
}
