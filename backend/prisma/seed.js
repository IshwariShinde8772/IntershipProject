import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const seed = async () => {
  const password_hash = await bcrypt.hash("Admin@123", 10);

  await prisma.user.upsert({
    where: {
      email: "tpo@kbtcoe.org"
    },
    update: {
      password_hash,
      role: UserRole.SUPER_ADMIN,
      is_active: true
    },
    create: {
      email: "tpo@kbtcoe.org",
      password_hash,
      role: UserRole.SUPER_ADMIN,
      is_active: true
    }
  });
};

seed()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
