import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const knownAuthCookies = [
  "portal_session",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token"
];

function shouldClearCookie(name: string) {
  return (
    name === "portal_session" ||
    name.startsWith("authjs.") ||
    name.startsWith("__Secure-authjs.") ||
    name.startsWith("__Host-authjs.") ||
    name.startsWith("next-auth.") ||
    name.startsWith("__Secure-next-auth.") ||
    name.startsWith("__Host-next-auth.")
  );
}

function isSessionCookie(name: string) {
  return name.includes("session-token");
}

function expireCookie(response: NextResponse, name: string) {
  response.cookies.set(name, "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

async function logout(request: NextRequest) {
  const tokens = request.cookies
    .getAll()
    .filter((cookie) => isSessionCookie(cookie.name) && cookie.value)
    .map((cookie) => cookie.value);

  if (tokens.length > 0) {
    await prisma.session.deleteMany({
      where: { sessionToken: { in: tokens } }
    }).catch((error) => {
      console.warn("[auth:logout] Nao foi possivel remover sessao do banco.", error);
    });
  }

  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  const cookieNames = new Set([
    ...knownAuthCookies,
    ...request.cookies.getAll().filter((cookie) => shouldClearCookie(cookie.name)).map((cookie) => cookie.name)
  ]);

  for (const name of cookieNames) {
    expireCookie(response, name);
  }

  return response;
}

export async function POST(request: NextRequest) {
  return logout(request);
}

export async function GET(request: NextRequest) {
  return logout(request);
}
