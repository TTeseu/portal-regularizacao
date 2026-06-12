import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Eye, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { canEdit as canEditUser, requireUser } from "@/lib/auth";
import { PageTitle } from "@/components/page-title";
import { formatPtBrDisplay } from "@/lib/format";
import { cnpjSearchTerm, formatCNPJDisplay } from "@/lib/cnpj";

export default async function EmpresasPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) || {};
  const user = await requireUser();
  const where: Prisma.EmpresaWhereInput = {};
  if (params.q) {
    const search = { contains: cnpjSearchTerm(params.q), mode: "insensitive" as const };
    where.OR = [{ nome: search }, { cnpj: search }, { contrato_numero: search }, { cidade: search }];
  }

  const empresas = await prisma.empresa.findMany({
    where,
    orderBy: { nome: "asc" },
    take: 100
  });

  return (
    <>
      <PageTitle
        title="Empresas"
        subtitle={`${empresas.length} empresa(s) exibidas`}
        action={
          canEditUser(user) ? (
            <Link className="btn-primary" href="/empresas/nova">
              <Plus size={16} />
              Nova
            </Link>
          ) : null
        }
      />
      <form className="panel mb-4 flex flex-col gap-3 p-4 sm:flex-row">
        <label className="flex-1">
          <span className="label">Busca</span>
          <div className="relative mt-1">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input className="field pl-9" name="q" defaultValue={params.q || ""} />
          </div>
        </label>
        <div className="flex items-end">
          <button className="btn-secondary">Filtrar</button>
        </div>
      </form>
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">CNPJ</th>
                <th className="px-4 py-3">Contrato</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">11.6.3</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {empresas.map((empresa) => (
                <tr key={empresa.id}>
                  <td className="px-4 py-3 font-medium">{empresa.nome}</td>
                  <td className="px-4 py-3">{formatCNPJDisplay(empresa.cnpj)}</td>
                  <td className="px-4 py-3">{empresa.contrato_numero || "-"}</td>
                  <td className="px-4 py-3">{formatPtBrDisplay(empresa.cidade)}</td>
                  <td className="px-4 py-3">{empresa.tem_clausula_11_6_3 ? "Sim" : "Não"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link className="btn-secondary px-2" href={`/empresas/${empresa.id}`}>
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
