import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const users = await prisma.user.findMany();
  const records = await prisma.attendanceRecord.findMany();
  return NextResponse.json({ users, records });
}
