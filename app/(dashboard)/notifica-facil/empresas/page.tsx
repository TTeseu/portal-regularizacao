import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Database, Download, Eye, Plus, Search } from "lucide-react";
import { canEdit as canEditUser, requireUser } from "@/lib/auth";
import { cnpjSearchTerm, formatCNPJDisplay } from "@/lib/cnpj";
import { formatPtBrDisplay } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function buildWhere(params: Record<string, string | undefined>) {
  const where: Prisma.EmpresaWhereInput = {};
  if (params.q) {
    const q = { contains: cnpjSearchTerm(params.q), mode: "insensitive" as const };
    where.OR = [
      { nome: q },
      { cnpj: q },
      { contrato_numero: q },
      { cidade: q },
      { numero_parceiro: q },
      { status_envio_notificacao: q }
    ];
  }
  return where;
}

export default async function NotificaFacilEmpresasPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const [params, user] = await Promise.all([searchParams, requireUser()]);
  const values = params || {};
  const where = buildWhere(values);
  const canEdit = canEditUser(user);
  const [empresas, total] = await Promise.all([
    prisma.empresa.findMany({
      where,
      orderBy: { nome: "asc" },
      take: 500
    }),
    prisma.empresa.count({ where })
  ]);

  const query = new URLSearchParams();
  if (values.q) query.set("q", values.q);

  return (
    <div className="mx-auto max-w-[1800px] space-y-6">
      <section className="panel overflow-hidden">
        <div className="relative p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(0,230,118,0.18),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_62%)]" />
          <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-edp/25 bg-edp/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-edp">
                <Database size={14} />
                Fonte unica de empresas
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Banco de Dados das Empresas</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-edp-muted">
                Base compartilhada pelo Portal de Regularização e pelo Notifica Fácil. Alterações feitas aqui ficam disponíveis nos dois módulos.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a className="btn-secondary" href={`/api/notifica-facil/export?tipo=empresas&${query.toString()}`}>
                <Download size={16} />
                Exportar CSV
              </a>
              {canEdit ? (
                <Link className="btn-primary" href="/notifica-facil/empresas/nova">
                  <Plus size={16} />
                  Nova empresa
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <form className="panel p-4">
        <label>
          <span className="label">Buscar por nome, CNPJ, contrato ou cidade</span>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-edp-muted" size={16} />
            <input className="field pl-9" name="q" defaultValue={values.q || ""} placeholder="Digite para pesquisar..." />
          </div>
        </label>
      </form>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-bold text-white">Empresas cadastradas</h2>
          <p className="mt-1 text-sm text-edp-muted">Mostrando {empresas.length} de {total} empresas.</p>
        </div>
        <div className="table-scroll">
          <table className="w-full min-w-[1500px] text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">CNPJ</th>
                <th className="px-4 py-3">Contrato</th>
                <th className="px-4 py-3">Endereco</th>
                <th className="px-4 py-3">Bairro</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Status envio</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr key={empresa.id} className="border-t border-line">
                  <td className="px-4 py-3 font-bold text-white">{empresa.nome}</td>
                  <td className="px-4 py-3 text-edp-muted">{formatCNPJDisplay(empresa.cnpj)}</td>
                  <td className="px-4 py-3 text-edp-muted">{empresa.contrato_numero || "-"}</td>
                  <td className="px-4 py-3 text-edp-muted">{empresa.endereco || "-"}</td>
                  <td className="px-4 py-3 text-edp-muted">{empresa.bairro || "-"}</td>
                  <td className="px-4 py-3 text-edp-muted">{formatPtBrDisplay(empresa.cidade)}</td>
                  <td className="px-4 py-3 text-edp-muted">{empresa.estado || "-"}</td>
                  <td className="px-4 py-3 text-edp-muted">{empresa.vencimento_contrato || "-"}</td>
                  <td className="px-4 py-3 text-edp-muted">{empresa.status_envio_notificacao || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link className="btn-secondary h-9 px-3" href={`/notifica-facil/empresas/${empresa.id}`}>
                      <Eye size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
              {empresas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-edp-muted">Nenhuma empresa encontrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
