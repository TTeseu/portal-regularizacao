import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { applySuperAdminPrivileges, isSuperAdminEmail } from "@/lib/super-admin";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  let user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  if (isSuperAdminEmail(user.email)) {
    user = await applySuperAdminPrivileges(user.email);
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  if (user.status === "rejected") {
    return NextResponse.redirect(new URL("/acesso-recusado", request.url), 303);
  }

  if (user.status !== "approved" || !user.accessApproved) {
    return NextResponse.redirect(new URL("/aguardando-aprovacao", request.url), 303);
  }

  await setSessionCookie({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    name: user.name,
    image: user.image,
    role: user.role,
    status: user.status,
    accessApproved: user.accessApproved,
    pode_editar_importar: user.pode_editar_importar
  });

  return NextResponse.redirect(new URL("/", request.url), 303);
}
