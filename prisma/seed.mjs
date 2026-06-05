import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `${salt}:${hash}`;
}

const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
const password = process.env.ADMIN_PASSWORD || "admin123";
const name = process.env.ADMIN_NAME || "Administrador";

await prisma.user.upsert({
  where: { email },
  update: {
    full_name: name,
    name,
    role: "admin",
    status: "approved",
    accessApproved: true,
    approvedAt: new Date(),
    approvedBy: "seed",
    pode_editar_importar: true
  },
  create: {
    id: "admin-local",
    created_date: new Date(),
    updated_date: new Date(),
    email,
    full_name: name,
    name,
    role: "admin",
    status: "approved",
    accessApproved: true,
    requestedAt: new Date(),
    approvedAt: new Date(),
    approvedBy: "seed",
    pode_editar_importar: true,
    password_hash: hashPassword(password)
  }
});

console.log(`Admin pronto: ${email}`);
await prisma.$disconnect();
