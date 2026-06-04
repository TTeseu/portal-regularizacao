import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Building2,
  Download,
  FileText,
  LayoutDashboard,
  LogOut,
  Users
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notificacoes/nova", label: "Gerar Notificação", icon: FileText },
  { href: "/notificacoes", label: "Buscar Notificações", icon: Bell },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/downloads", label: "Downloads", icon: Download },
  { href: "/usuarios", label: "Usuários", icon: Users }
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-edp text-white">
            <FileText size={19} />
          </div>
          <div>
            <div className="text-sm font-bold">Portal</div>
            <div className="text-xs text-slate-500">Regularização</div>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-line bg-white px-4 lg:px-8">
          <nav className="flex gap-2 overflow-x-auto lg:hidden">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="btn-secondary px-2">
                  <Icon size={17} />
                  <span className="sr-only">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-semibold">{user.full_name || user.email}</div>
              <div className="text-xs text-slate-500">
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
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
