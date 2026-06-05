import { prisma } from "@/lib/prisma";

const DEFAULT_SUPER_ADMINS = ["jabasff159@gmail.com"];

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || "";
}

export function getSuperAdminEmails() {
  const raw = process.env.SUPER_ADMIN_EMAILS || "";
  const envEmails = raw
    .replace(/\[|\]|\(|\)|mailto:/g, " ")
    .split(/[,\s]+/)
    .map(normalizeEmail)
    .filter((email) => email.includes("@"));

  return Array.from(new Set([...DEFAULT_SUPER_ADMINS, ...envEmails]));
}

export function isSuperAdminEmail(email?: string | null) {
  const normalized = normalizeEmail(email);
  return normalized !== "" && getSuperAdminEmails().includes(normalized);
}

export async function applySuperAdminPrivileges(email?: string | null) {
  if (!isSuperAdminEmail(email)) return null;
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizeEmail(email), mode: "insensitive" } },
    select: { id: true }
  });
  if (!user) return null;

  return prisma.user.update({
    where: { id: user.id },
    data: {
      role: "admin",
      status: "approved",
      accessApproved: true,
      pode_editar_importar: true,
      approvedAt: new Date(),
      approvedBy: "bootstrap"
    }
  });
}

export async function countActiveAdmins(exceptUserId?: string) {
  return prisma.user.count({
    where: {
      role: "admin",
      status: "approved",
      accessApproved: true,
      ...(exceptUserId ? { id: { not: exceptUserId } } : {})
    }
  });
}
