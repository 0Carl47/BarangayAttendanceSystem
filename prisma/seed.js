import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Default admin User ──────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { id: "1000" },
    update: {},
    create: {
      id: "1000",
      role: "admin",
      firstName: "Admin",
      lastName: "User",
      scheduleTime: null,
    },
  });

  // ── Default employee User ───────────────────────────────────────────────
  const empUser = await prisma.user.upsert({
    where: { id: "1001" },
    update: {},
    create: {
      id: "1001",
      role: "employee",
      firstName: "Sample",
      lastName: "Employee",
      position: "Clerk",
      scheduleTime: "08:00",
    },
  });

  // ── Admin credential (linked to adminUser) ──────────────────────────────
  const adminExists = await prisma.credential.findUnique({ where: { username: "admin" } });
  if (!adminExists) {
    const hash = await bcrypt.hash("admin123", 10);
    await prisma.credential.create({
      data: {
        username: "admin",
        passwordHash: hash,
        role: "admin",
        userId: adminUser.id,   // ← linked so fingerprint login works
      },
    });
    console.log("  ✅ Created: admin / admin123  (userId: 1000)");
  } else if (!adminExists.userId) {
    // patch missing userId
    await prisma.credential.update({
      where: { username: "admin" },
      data: { userId: adminUser.id },
    });
    console.log("  🔧 Patched admin credential → userId 1000");
  } else {
    console.log("  ⏭  admin credential already exists");
  }

  // ── Employee credential (linked to empUser) ─────────────────────────────
  const empCredExists = await prisma.credential.findUnique({ where: { username: "employee" } });
  if (!empCredExists) {
    const hash = await bcrypt.hash("employee123", 10);
    await prisma.credential.create({
      data: {
        username: "employee",
        passwordHash: hash,
        role: "employee",
        userId: empUser.id,   // ← linked so fingerprint login works
      },
    });
    console.log("  ✅ Created: employee / employee123  (userId: 1001)");
  } else if (!empCredExists.userId) {
    await prisma.credential.update({
      where: { username: "employee" },
      data: { userId: empUser.id },
    });
    console.log("  🔧 Patched employee credential → userId 1001");
  } else {
    console.log("  ⏭  employee credential already exists");
  }

  // ── Also seed credential for signup-created user with ID as username ──
  const empById = await prisma.credential.findUnique({ where: { username: "1001" } });
  if (!empById) {
    const hash = await bcrypt.hash("1001123", 10);
    await prisma.credential.create({
      data: {
        username: "1001",
        passwordHash: hash,
        role: "employee",
        userId: empUser.id,
      },
    }).catch(() => {}); // ignore unique constraint if userId already taken
  }

  console.log("\n✅ Seed complete!");
  console.log("   Password login:     admin / admin123");
  console.log("   Password login:     employee / employee123");
  console.log("   Fingerprint login:  enroll via /fingerprint page (admin required)");
  console.log("   Prisma Studio:      npm run db:studio");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
