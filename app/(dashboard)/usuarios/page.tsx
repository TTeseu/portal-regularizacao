import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { User } from "@prisma/client";
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ROLE_OPTIONS } from "@/lib/constants";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { PageTitle } from "@/components/page-title";
import { approveUser, rejectUser, updateUserPermission } from "../actions";

export default async function UsuariosPage() {
  const currentUser = await requireUser();
  if (currentUser.role !== "admin") redirect("/");

  const users = await prisma.user.findMany({ orderBy: [{ status: "asc" }, { email: "asc" }] });
  const pending = users.filter((user) => user.status === "pending");
  const approved = users.filter((user) => user.status === "approved");
  const rejected = users.filter((user) => user.status === "rejected");

  return (
    <>
      <PageTitle title="Usuários e permissões" subtitle="Aprove acessos, administre perfis e controle edição/importação." />
      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Pendentes" value={pending.length} icon={<Clock3 size={20} />} tone="text-amber-200" />
        <Metric title="Aprovados" value={approved.length} icon={<CheckCircle2 size={20} />} tone="text-edp" />
        <Metric title="Recusados" value={rejected.length} icon={<XCircle size={20} />} tone="text-red-200" />
      </div>

      <div className="mt-6 space-y-6">
        <UserSection title="Pendentes" subtitle="Solicitações aguardando decisão do administrador." users={pending} />
        <UserSection title="Aprovados" subtitle="Usuários com acesso liberado ao Portal." users={approved} />
        <UserSection title="Recusados" subtitle="Usuários sem permissão de acesso." users={rejected} />
      </div>
    </>
  );
}

function Metric({ title, value, icon, tone }: { title: string; value: number; icon: ReactNode; tone: string }) {
  return (
    <div className="panel flex items-center justify-between p-5">
      <div>
        <div className="text-xs font-semibold uppercase text-edp-muted">{title}</div>
        <div className="mt-2 text-3xl font-bold text-white">{value}</div>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 ${tone}`}>
        {icon}
      </div>
    </div>
  );
}

function UserSection({
  title,
  subtitle,
  users
}: {
  title: string;
  subtitle: string;
  users: User[];
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line bg-surface px-5 py-5">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm text-edp-muted">{subtitle}</p>
      </div>
      {users.length === 0 ? (
        <div className="px-5 py-8 text-sm text-edp-muted">Nenhum usuário nesta categoria.</div>
      ) : (
        <div className="divide-y divide-line">
          {users.map((user) => (
            <div key={user.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_520px] lg:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-edp/15 text-sm font-bold text-edp">
                  {(user.name || user.full_name || user.email).slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{user.name || user.full_name || "Sem nome"}</span>
                    {isSuperAdminEmail(user.email) ? (
                      <span className="rounded-full border border-edp/30 bg-edp/10 px-2 py-0.5 text-xs font-bold text-edp">Super admin</span>
                    ) : null}
                    {user.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-300/30 bg-violet-500/10 px-2 py-0.5 text-xs font-bold text-violet-100">
                        <ShieldCheck size={12} />
                        Admin
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-sm text-edp-muted">{user.email}</div>
                  <div className="mt-1 text-xs text-edp-muted">
                    Solicitado em {formatDate(user.requestedAt || user.created_date)}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <form action={updateUserPermission.bind(null, user.id)} className="grid gap-3 sm:grid-cols-[150px_1fr_120px]">
                  <select className="field" name="role" defaultValue={user.role} disabled={isSuperAdminEmail(user.email)}>
                    {ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}
                  </select>
                  <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium text-edp-muted">
                    <input type="checkbox" name="pode_editar_importar" defaultChecked={user.pode_editar_importar} disabled={isSuperAdminEmail(user.email)} />
                    Pode editar/importar
                  </label>
                  <button className="btn-secondary" disabled={isSuperAdminEmail(user.email)}>Salvar</button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {user.status !== "approved" ? (
                    <form action={approveUser.bind(null, user.id)}>
                      <button className="btn-primary" type="submit">Aprovar</button>
                    </form>
                  ) : null}
                  {user.status !== "rejected" && !isSuperAdminEmail(user.email) ? (
                    <form action={rejectUser.bind(null, user.id)}>
                      <button className="btn-danger" type="submit">Recusar</button>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDate(value?: Date | null) {
  if (!value) return "-";
  return value.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
