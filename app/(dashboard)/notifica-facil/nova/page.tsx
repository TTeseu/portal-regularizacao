import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NotificaFacilNotification } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { canEdit, requireUser } from "@/lib/auth";
import { NotificaFacilForm } from "@/components/notifica-facil-form";
import { activeCensoWhere } from "@/lib/notifica-facil-censo";
import { prisma } from "@/lib/prisma";
import { createNotificaFacilNotification } from "../actions";

function parseRegNumber(value: string | null | undefined) {
  const match = String(value || "").match(/^REG(\d+)\/(\d{4})$/i);
  if (!match) return null;
  return { sequence: Number(match[1]), year: match[2] };
}

function normalizeName(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

type CensoAddressSource = {
  empresa_endereco: string | null;
  empresa_bairro: string | null;
  empresa_cidade: string | null;
  numero_registro_censo: string | null;
  numero_poste: string | null;
};

function normalizeAddressKeyPart(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function groupCensoAddresses(items: CensoAddressSource[]) {
  const grouped = new Map<
    string,
    {
      endereco: string;
      bairro: string;
      cidade: string;
      quantidade_postes: number;
      numero_registro_censo: string[];
      numero_poste: string[];
    }
  >();

  for (const item of items) {
    const endereco = String(item.empresa_endereco || "").trim();
    const bairro = String(item.empresa_bairro || "").trim();
    const cidade = String(item.empresa_cidade || "").trim();
    const key = [
      normalizeAddressKeyPart(endereco),
      normalizeAddressKeyPart(bairro),
      normalizeAddressKeyPart(cidade)
    ].join("|");
    const current = grouped.get(key);
    if (current) {
      current.quantidade_postes += 1;
      if (item.numero_registro_censo) current.numero_registro_censo.push(item.numero_registro_censo);
      if (item.numero_poste) current.numero_poste.push(item.numero_poste);
      continue;
    }
    grouped.set(key, {
      endereco,
      bairro,
      cidade,
      quantidade_postes: 1,
      numero_registro_censo: item.numero_registro_censo ? [item.numero_registro_censo] : [],
      numero_poste: item.numero_poste ? [item.numero_poste] : []
    });
  }

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    numero_registro_censo: item.numero_registro_censo.join("; "),
    numero_poste: item.numero_poste.join("; ")
  }));
}

export default async function NovaNotificaFacilPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const mayEdit = canEdit(user);
  const params = (await searchParams) || {};
  const censoIds = String(params.censo || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const [baseCompanies, existingNumbers, counters, templateHtml, selectedCenso] = await Promise.all([
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
    readFile(join(process.cwd(), "public", "templates", "notifica-facil-template.html"), "utf8").catch(() => ""),
    censoIds.length
      ? prisma.notificaFacilNotification.findMany({
          where: { AND: [activeCensoWhere, { id: { in: censoIds } }] },
          orderBy: [{ created_date: "asc" }, { numero_registro_censo: "asc" }]
        })
      : Promise.resolve([])
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
  const selectedCensoCompany = selectedCenso[0]?.empresa || "";
  const baseCompany = selectedCensoCompany
    ? baseCompanies.find((empresa) => normalizeName(empresa.nome) === normalizeName(selectedCensoCompany))
    : null;
  const linkedCensoIds = selectedCenso.map((item) => item.id);
  const groupedCensoAddresses = groupCensoAddresses(selectedCenso);
  const notificationPrefill = selectedCenso.length
    ? {
        empresa: baseCompany?.nome || selectedCensoCompany,
        tipo_servico: "OcupaÃ§Ã£o Ã  Revelia",
        numero_registro_censo: selectedCenso.map((item) => item.numero_registro_censo).filter(Boolean).join("; "),
        censo_registro_id: selectedCenso.map((item) => item.numero_registro_censo).filter(Boolean).join("; "),
        destinatario_nome: baseCompany?.nome || selectedCensoCompany,
        status_envio_notificacao: baseCompany?.status_envio_notificacao || null,
        vencimento_contrato: baseCompany?.vencimento_contrato || null,
        ano_vencimento_contrato: baseCompany?.ano_vencimento_contrato || null,
        empresa_endereco: baseCompany?.endereco || null,
        empresa_bairro: baseCompany?.bairro || null,
        empresa_cidade: baseCompany?.cidade || null,
        empresa_estado: baseCompany?.estado || null,
        contrato_numero: baseCompany?.contrato_numero || null,
        ac: baseCompany?.ac || null,
        numero_nome_empresa: baseCompany?.numero_nome_empresa || null,
        celebrado_em: baseCompany?.celebrado_em || null,
        numero_parceiro: baseCompany?.numero_parceiro || null,
        cnpj: baseCompany?.cnpj || null,
        texto_contrato_7_14: baseCompany?.texto_contrato_7_14 || null,
        texto_ocupacao_revelia: baseCompany?.texto_ocupacao_revelia || null,
        texto_23_3: baseCompany?.texto_23_3 || null,
        texto_24_1: baseCompany?.texto_24_1 || null,
        texto_24_3: baseCompany?.texto_24_3 || null,
        valor_atualizado: baseCompany?.valor_atualizado || null,
        multa: baseCompany?.multa || null,
        retroativo: baseCompany?.retroativo || null,
        enderecos_revelia: groupedCensoAddresses
      }
    : null;

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
        notification={notificationPrefill as NotificaFacilNotification | null}
        action={createNotificaFacilNotification}
        canEdit={mayEdit}
        companyOptions={companyOptions}
        nextNumero={nextNumero}
        nextByYear={nextByYearObject}
        templateHtml={templateHtml}
        linkedCensoIds={linkedCensoIds}
      />
    </div>
  );
}
