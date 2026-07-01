/**
 * PATCH /api/users/update
 * Admin updates any user's profile (name, age, sex, phone, position, scheduleTime, photo).
 * Auth: admin session required.
 * Body: { userId, firstName, lastName, middleName?, age?, sex?, phone?, position?, scheduleTime?, photo? }
 */
import { NextResponse } from "next/server";
import { prisma }       from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { cookies }      from "next/headers";

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value ?? "";
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin")
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

  const { userId, firstName, lastName, middleName, age, sex, phone, position, scheduleTime, photo } =
    body as Record<string, unknown>;

  if (!userId || typeof userId !== "string")
    return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
  if (!firstName || typeof firstName !== "string" || !firstName.toString().trim())
    return NextResponse.json({ ok: false, error: "First name is required" }, { status: 400 });
  if (!lastName || typeof lastName !== "string" || !lastName.toString().trim())
    return NextResponse.json({ ok: false, error: "Last name is required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user)
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName:    String(firstName).trim(),
      lastName:     String(lastName).trim(),
      middleName:   middleName && typeof middleName === "string" ? middleName.trim() : null,
      age:          age != null ? Number(age) : null,
      sex:          sex && typeof sex === "string"  ? sex.trim()  : null,
      phone:        phone && typeof phone === "string" ? phone.trim() : null,
      position:     position && typeof position === "string" ? position.trim() : null,
      scheduleTime: scheduleTime && typeof scheduleTime === "string" ? scheduleTime.trim() : undefined,
      photo:        photo && typeof photo === "string" ? photo : undefined,
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}
