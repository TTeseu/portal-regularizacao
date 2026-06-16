import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { canEdit, requireUser } from "@/lib/auth";
import { NotificaFacilForm } from "@/components/notifica-facil-form";
import { prisma } from "@/lib/prisma";
import { createNotificaFacilNotification } from "../actions";

function parseRegNumber(value: string | null | undefined) {
  const match = String(value || "").match(/^REG(\d+)\/(\d{4})$/i);
  if (!match) return null;
  return { sequence: Number(match[1]), year: match[2] };
}

export default async function NovaNotificaFacilPage() {
  const user = await requireUser();
  const mayEdit = canEdit(user);
  const [baseCompanies, existingNumbers, counters, templateHtml] = await Promise.all([
    prisma.empresa.findMany({
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        status_envio_notificacao: true,
        vencimento_contrato: true,
        ano_vencimento_contrato: true,
        endereco: true,
        bairro: true,
        cidade: true,
        estado: true,
        contrato_numero: true,
        ac: true,
        numero_nome_empresa: true,
        celebrado_em: true,
        numero_parceiro: true,
        cnpj: true,
        texto_contrato_7_14: true,
        texto_ocupacao_revelia: true,
        texto_23_3: true,
        texto_24_1: true,
        texto_24_3: true,
        valor_atualizado: true,
        multa: true,
        retroativo: true
      }
    }),
    prisma.notificaFacilNotification.findMany({
      where: { numero_notificacao: { startsWith: "REG" } },
      select: { numero_notificacao: true }
    }),
    prisma.notificaFacilNotificationCounter.findMany({ select: { year: true, current: true } }),
    readFile(join(process.cwd(), "public", "templates", "notifica-facil-template.html"), "utf8").catch(() => "")
  ]);

  const nextByYear = new Map<string, number>();
  for (const counter of counters) {
    nextByYear.set(counter.year, Math.max(nextByYear.get(counter.year) || 0, counter.current + 1));
  }
  for (const item of existingNumbers) {
    const parsed = parseRegNumber(item.numero_notificacao);
    if (parsed) nextByYear.set(parsed.year, Math.max(nextByYear.get(parsed.year) || 1, parsed.sequence + 1));
  }
  const currentYear = String(new Date().getFullYear());
  if (!nextByYear.has(currentYear)) nextByYear.set(currentYear, 1);
  const nextByYearObject = Object.fromEntries(nextByYear);
  const nextSequence = nextByYearObject[currentYear] || 1;
  const nextNumero = `REG${String(nextSequence).padStart(4, "0")}/${currentYear}`;
  const companyOptions = baseCompanies.map((empresa) => ({
    id: empresa.id,
    empresa: empresa.nome,
    status_envio_notificacao: empresa.status_envio_notificacao,
    vencimento_contrato: empresa.vencimento_contrato,
    ano_vencimento_contrato: empresa.ano_vencimento_contrato,
    empresa_endereco: empresa.endereco,
    empresa_bairro: empresa.bairro,
    empresa_cidade: empresa.cidade,
    empresa_estado: empresa.estado,
    contrato_numero: empresa.contrato_numero,
    ac: empresa.ac,
    numero_nome_empresa: empresa.numero_nome_empresa,
    celebrado_em: empresa.celebrado_em,
    numero_parceiro: empresa.numero_parceiro,
    cnpj: empresa.cnpj,
    texto_contrato_7_14: empresa.texto_contrato_7_14,
    texto_ocupacao_revelia: empresa.texto_ocupacao_revelia,
    texto_23_3: empresa.texto_23_3,
    texto_24_1: empresa.texto_24_1,
    texto_24_3: empresa.texto_24_3,
    valor_atualizado: empresa.valor_atualizado,
    multa: empresa.multa,
    retroativo: empresa.retroativo
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link className="btn-secondary mb-4" href="/notifica-facil">
            <ArrowLeft size={16} />
            Voltar
          </Link>
          <h1 className="text-3xl font-bold text-white">Nova notificacao - Notifica Facil</h1>
          <p className="mt-2 text-sm text-edp-muted">Ao salvar, o HTML e o PDF serao gerados e armazenados para downloads futuros.</p>
        </div>
      </div>
      <NotificaFacilForm
        action={createNotificaFacilNotification}
        canEdit={mayEdit}
        companyOptions={companyOptions}
        nextNumero={nextNumero}
        nextByYear={nextByYearObject}
        templateHtml={templateHtml}
      />
    </div>
  );
}
