import { prisma } from "@/lib/prisma";
import { PageTitle } from "@/components/page-title";
import { formatDateTime } from "@/lib/format";

export default async function DownloadsPage() {
  const downloads = await prisma.historicoDownload.findMany({
    orderBy: { created_date: "desc" },
    take: 100
  });

  return (
    <>
      <PageTitle title="Histórico de downloads" subtitle="Registros migrados e novos eventos do sistema." />
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Quantidade</th>
                <th className="px-4 py-3">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {downloads.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{formatDateTime(item.created_date)}</td>
                  <td className="px-4 py-3 font-medium">{item.tipo}</td>
                  <td className="px-4 py-3">{item.descricao}</td>
                  <td className="px-4 py-3">{item.quantidade_arquivos}</td>
                  <td className="px-4 py-3">{item.usuario_nome || item.created_by || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
