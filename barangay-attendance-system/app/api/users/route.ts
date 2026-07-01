import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { role: "employee" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      scheduleTime: true,
      position: true,
    },
  });

  return NextResponse.json({ ok: true, users });
}
