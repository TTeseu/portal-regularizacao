import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ROLE_OPTIONS } from "@/lib/constants";
import { PageTitle } from "@/components/page-title";
import { updateUserPermission } from "../actions";

export default async function UsuariosPage() {
  const currentUser = await requireUser();
  const users = await prisma.user.findMany({ orderBy: { email: "asc" } });
  const isAdmin = currentUser.role === "admin";

  return (
    <>
      <PageTitle title="Usuários e permissões" subtitle="Controle de admin e permissão para editar/importar." />
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Editar/importar</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium">{user.full_name || "-"}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3" colSpan={3}>
                    <form action={updateUserPermission.bind(null, user.id)} className="grid gap-3 sm:grid-cols-[180px_1fr_120px]">
                      <select disabled={!isAdmin} className="field" name="role" defaultValue={user.role}>
                        {ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}
                      </select>
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input disabled={!isAdmin} type="checkbox" name="pode_editar_importar" defaultChecked={user.pode_editar_importar} />
                        Permitido
                      </label>
                      <button disabled={!isAdmin} className="btn-secondary">Salvar</button>
                    </form>
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
