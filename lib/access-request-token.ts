import { createHmac, timingSafeEqual } from "node:crypto";

export type AccessDecision = "approve" | "reject";

type AccessDecisionPayload = {
  userId: string;
  email: string;
  action: AccessDecision;
  exp: number;
};

function secret() {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "dev-secret-change-me";
}

function base64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createAccessDecisionToken(input: {
  userId: string;
  email: string;
  action: AccessDecision;
  ttlHours?: number;
}) {
  const payload = base64Url(JSON.stringify({
    userId: input.userId,
    email: input.email.toLowerCase(),
    action: input.action,
    exp: Date.now() + 1000 * 60 * 60 * (input.ttlHours || 72)
  } satisfies AccessDecisionPayload));

  return `${payload}.${sign(payload)}`;
}

export function verifyAccessDecisionToken(token?: string | null): AccessDecisionPayload | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AccessDecisionPayload;
    if (!data.userId || !data.email || !["approve", "reject"].includes(data.action)) return null;
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
