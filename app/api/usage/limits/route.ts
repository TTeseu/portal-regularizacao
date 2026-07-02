import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUsageLimits } from "@/lib/usage-limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved" || !user.accessApproved) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
  }

  const usage = await getUsageLimits();
  return NextResponse.json(usage);
}
