import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  await setSessionCookie({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    pode_editar_importar: user.pode_editar_importar
  });

  return NextResponse.redirect(new URL("/", request.url), 303);
}
