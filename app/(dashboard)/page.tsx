import Link from "next/link";
import { Bell, Building2, Download, Eye, Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  const [total, empresas, downloads, pendentes, recentes, porStatus] = await Promise.all([
    prisma.notificacao.count(),
    prisma.empresa.count(),
    prisma.historicoDownload.count(),
    prisma.notificacao.count({ where: { status: "Pendente", arquivada: false } }),
    prisma.notificacao.findMany({
      orderBy: { created_date: "desc" },
      take: 8,
      select: { id: true, numero_oficio: true, empresa: true, status: true, cidade: true, created_date: true }
    }),
    prisma.notificacao.groupBy({ by: ["status"], _count: { status: true } })
  ]);

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Resumo operacional das notificações e downloads." />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Notificações", value: total, icon: Bell },
          { label: "Pendentes", value: pendentes, icon: Inbox },
          { label: "Empresas", value: empresas, icon: Building2 },
          { label: "Históricos", value: downloads, icon: Download }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="panel p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">{item.label}</span>
                <Icon size={18} className="text-edp" />
              </div>
              <div className="mt-3 text-3xl font-bold">{item.value}</div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="panel overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold">Notificações recentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ofício</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Cidade</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Criada em</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recentes.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">{item.numero_oficio || "-"}</td>
                    <td className="px-4 py-3">{item.empresa || "-"}</td>
                    <td className="px-4 py-3">{item.cidade || "-"}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3">{formatDateTime(item.created_date)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link className="btn-secondary px-2" href={`/notificacoes/${item.id}`} title="Abrir">
                        <Eye size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel p-4">
          <h2 className="mb-4 text-sm font-bold">Status</h2>
          <div className="space-y-3">
            {porStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                <StatusBadge status={item.status} />
                <span className="text-sm font-bold">{item._count.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
