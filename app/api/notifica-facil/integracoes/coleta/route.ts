import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildNotificaFacilHtml } from "@/lib/notifica-facil-html";
import { storePdfForNotificaFacil } from "@/lib/notifica-facil-pdf-cache";

function authorized(request: Request) {
  const expected = process.env.NOTIFICA_FACIL_INTEGRATION_TOKEN?.trim();
  if (!expected) return false;
  const auth = request.headers.get("authorization") || "";
  const apiKey = request.headers.get("x-api-key") || "";
  return auth === `Bearer ${expected}` || apiKey === expected;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function POST(request: Request) {
  if (!process.env.NOTIFICA_FACIL_INTEGRATION_TOKEN?.trim()) {
    return new NextResponse("Integracao nao configurada", { status: 503 });
  }
  if (!authorized(request)) return new NextResponse("Nao autorizado", { status: 401 });

  const body = await request.json() as Record<string, unknown>;
  const empresa = asString(body.empresa) || asString(body.empresa_a_notificar);
  if (!empresa) return new NextResponse("empresa obrigatoria", { status: 400 });

  const created = await prisma.notificaFacilNotification.create({
    data: {
      id: randomUUID(),
      created_date: new Date(),
      updated_date: new Date(),
      created_by: "integracao-coleta",
      empresa,
      numero_registro_censo: asString(body.numero_registro_censo) || asString(body.numero_registro),
      numero_poste: asString(body.numero_poste),
      destinatario_endereco: asString(body.endereco),
      empresa_bairro: asString(body.bairro),
      empresa_cidade: asString(body.cidade),
      fotos_censo: Array.isArray(body.fotos) ? body.fotos : undefined,
      pendencia_tecnica: Boolean(body.pendencia_tecnica),
      dados_plaqueta: asString(body.dados_plaqueta),
      latitude: asNumber(body.latitude),
      longitude: asNumber(body.longitude),
      observacoes: asString(body.analise_humana) || asString(body.observacoes),
      censo_registro_id: asString(body.id_censo),
      status: "Aguardando assinatura Gestor",
      is_draft: true
    }
  });

  const pdf = await storePdfForNotificaFacil(created, buildNotificaFacilHtml(created));
  await prisma.notificaFacilActivityLog.create({
    data: {
      id: randomUUID(),
      created_date: new Date(),
      updated_date: new Date(),
      notification_id: created.id,
      notification_number: created.numero_notificacao,
      action: "criacao",
      user_email: asString(body.usuario_que_enviou) || "integracao-coleta",
      user_name: "Integracao Coleta de Dados",
      timestamp: new Date(),
      details: "Registro recebido via endpoint de integracao do Coleta de Dados"
    }
  });

  return NextResponse.json({ id: created.id, pdf_url: pdf.url });
}
