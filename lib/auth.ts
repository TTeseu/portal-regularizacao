import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { applySuperAdminPrivileges, isSuperAdminEmail } from "@/lib/super-admin";

const COOKIE_NAME = "portal_session";

export type SessionUser = {
  id: string;
  email: string;
  full_name: string | null;
  name?: string | null;
  image?: string | null;
  role: string;
  status: string;
  accessApproved: boolean;
  pode_editar_importar: boolean;
};

function secret() {
  return process.env.AUTH_SECRET || "dev-secret-change-me";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored?: string | null) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "base64url");
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export function createSessionToken(user: SessionUser) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      edit: user.pode_editar_importar,
      exp: Date.now() + 1000 * 60 * 60 * 12
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || signature !== sign(payload)) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    sub: string;
    exp: number;
  };
  if (!data.exp || data.exp < Date.now()) return null;
  return data;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const authSession = await auth();
  const authUserId = authSession?.user?.id;
  const authEmail = authSession?.user?.email;
  if (authUserId || authEmail) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(authUserId ? [{ id: authUserId }] : []),
          ...(authEmail ? [{ email: { equals: authEmail, mode: "insensitive" as const } }] : [])
        ]
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        name: true,
        image: true,
        role: true,
        status: true,
        accessApproved: true,
        pode_editar_importar: true
      }
    });

    if (!user) return null;
    if (isSuperAdminEmail(user.email)) {
      const updated = await applySuperAdminPrivileges(user.email);
      if (updated) {
        return {
          id: updated.id,
          email: updated.email,
          full_name: updated.full_name,
          name: updated.name,
          image: updated.image,
          role: updated.role,
          status: updated.status,
          accessApproved: updated.accessApproved,
          pode_editar_importar: updated.pode_editar_importar
        };
      }
    }
    return user;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = readSessionToken(token);
  if (!session?.sub) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      full_name: true,
      name: true,
      image: true,
      role: true,
      status: true,
      accessApproved: true,
      pode_editar_importar: true
    }
  });
  if (user && isSuperAdminEmail(user.email)) {
    const updated = await applySuperAdminPrivileges(user.email);
    if (updated) {
      return {
        id: updated.id,
        email: updated.email,
        full_name: updated.full_name,
        name: updated.name,
        image: updated.image,
        role: updated.role,
        status: updated.status,
        accessApproved: updated.accessApproved,
        pode_editar_importar: updated.pode_editar_importar
      };
    }
  }
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "rejected") redirect("/acesso-recusado");
  if (user.status !== "approved" || !user.accessApproved) redirect("/aguardando-aprovacao");
  return user;
}

export function canEdit(user: SessionUser) {
  return user.role === "admin" || user.pode_editar_importar;
}

export function canAccessPortal(user: SessionUser | null) {
  return Boolean(user && user.status === "approved" && user.accessApproved);
}

export async function setSessionCookie(user: SessionUser) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  for (const name of [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token"
  ]) {
    cookieStore.delete(name);
  }
}
