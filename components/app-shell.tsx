import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  Search
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notificacoes/nova", label: "Gerar Notificação", icon: FileText },
  { href: "/notificacoes", label: "Buscar Notificações", icon: Search },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/notificacoes?origem=importacao", label: "Importar Dados", icon: Database }
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-edp-navy edp-technical-bg">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-gradient-to-b from-edp-navy via-[#1b2a40] to-[#142238] shadow-2xl shadow-black/20 lg:block">
        <div className="flex h-24 items-center gap-4 border-b border-line px-6">
          <div className="flex h-14 w-28 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-4 shadow-lg shadow-black/10">
            <img src="/edp-logo-white.svg" alt="EDP" className="h-9 w-auto" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Portal</div>
            <div className="text-xs font-medium text-edp">Regularização</div>
          </div>
        </div>
        <nav className="space-y-2 px-4 py-6">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold text-edp-muted transition hover:border-edp/25 hover:bg-edp/10 hover:text-white"
              >
                <Icon size={18} className="text-white transition group-hover:text-edp" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-line bg-edp-navy/88 px-4 backdrop-blur-xl lg:px-8">
          <nav className="flex gap-2 overflow-x-auto lg:hidden">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="btn-secondary px-3">
                  <Icon size={17} />
                  <span className="sr-only">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden h-9 border-l border-line lg:block" />
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{user.full_name || user.email}</div>
              <div className="text-xs text-edp-muted">
                {user.role === "admin" ? "Administrador" : "Usuário"}
              </div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="btn-secondary" title="Sair">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </header>
        <main className="px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
