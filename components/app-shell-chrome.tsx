"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Building2,
  Clock3,
  Database,
  FileArchive,
  FileClock,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Search,
  Upload,
  Users
} from "lucide-react";
import { SidebarWeather } from "@/components/sidebar-weather";

type ShellUser = {
  full_name: string | null;
  email: string;
  role: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  adminOnly?: boolean;
};

const regularizacaoNav: NavItem[] = [
  { href: "/home", label: "Início", icon: LayoutDashboard },
  { href: "/regularizacao", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notificacoes/nova", label: "Gerar Notificação", icon: FileText },
  { href: "/notificacoes", label: "Buscar Notificações", icon: Search },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/notificacoes?origem=importacao", label: "Importar Dados", icon: Database },
  { href: "/usuarios", label: "Usuários", icon: Users, adminOnly: true }
];

const notificaFacilNav: NavItem[] = [
  { href: "/notifica-facil", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notifica-facil/nova", label: "Nova Notificação", icon: FileText },
  { href: "/notifica-facil/importar-csv", label: "Importar CSV", icon: Upload },
  { href: "/notifica-facil/importar-censo", label: "Importar CENSO", icon: Bell },
  { href: "/notifica-facil/historico-censo", label: "Histórico CENSO", icon: Clock3 },
  { href: "/notifica-facil/pendencia-tecnica", label: "Pendência Técnica", icon: AlertTriangle },
  { href: "/notifica-facil/historico-pendencia-tecnica", label: "Histórico Pendência Técnica", icon: History },
  { href: "/notifica-facil/notificacao-pendencias", label: "Notificação das Pendências", icon: FileClock },
  { href: "/notifica-facil/stand-by", label: "Stand-by", icon: Clock3 },
  { href: "/notifica-facil/pdfs", label: "Todos os PDFs", icon: FileArchive }
];

function isActive(pathname: string, href: string) {
  const cleanHref = href.split("?")[0];
  if (cleanHref === "/notifica-facil" || cleanHref === "/regularizacao") return pathname === cleanHref;
  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

export function AppShellChrome({ children, user }: { children: React.ReactNode; user: ShellUser }) {
  const pathname = usePathname();
  const isNotificaFacil = pathname.startsWith("/notifica-facil");
  const visibleNav = (isNotificaFacil ? notificaFacilNav : regularizacaoNav).filter((item) => !item.adminOnly || user.role === "admin");

  if (isNotificaFacil) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
        <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-[#E2E8F0] bg-[#FFFFFF] lg:flex">
          <Link href="/home" className="flex h-36 items-center gap-4 border-b border-[#E2E8F0] px-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Bell size={23} />
            </div>
            <div>
              <div className="text-lg font-extrabold leading-tight text-[#0F172A]">Portal de<br />Notificações</div>
              <div className="mt-1 text-xs font-medium text-[#64748B]">Telecom à Revelia</div>
            </div>
          </Link>
          <nav className="flex-1 px-7 py-7">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Navegação</div>
            <div className="space-y-1">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15" : "text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                    }`}
                  >
                    <Icon size={17} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
          <form action="/api/auth/logout" method="post" className="border-t border-[#E2E8F0] p-7">
            <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#334155] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]">
              <LogOut size={17} />
              Sair
            </button>
          </form>
        </aside>

        <div className="lg:pl-72">
          <header className="sticky top-0 z-20 flex min-h-16 items-center justify-end border-b border-[#E2E8F0] bg-[#FFFFFF]/90 px-4 backdrop-blur-xl lg:px-8">
            <nav className="mr-auto flex gap-2 overflow-x-auto lg:hidden">
              {visibleNav.slice(0, 6).map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-2 text-[#334155]">
                    <Icon size={17} />
                  </Link>
                );
              })}
            </nav>
            <div className="text-right">
              <div className="text-sm font-bold text-[#0F172A]">{user.full_name || user.email}</div>
              <div className="text-xs text-[#64748B]">{user.role === "admin" ? "Administrador" : "Usuário"}</div>
            </div>
          </header>
          <main className="px-4 py-8 lg:px-10">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-edp-navy edp-technical-bg">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-line bg-gradient-to-b from-edp-navy via-[#1b2a40] to-[#142238] shadow-2xl shadow-black/20 lg:flex">
        <Link href="/home" className="flex h-24 items-center gap-4 border-b border-line px-6">
          <div className="flex h-14 w-28 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-4 shadow-lg shadow-black/10">
            <img src="/edp-logo-white.svg" alt="EDP" className="h-9 w-auto" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Portal</div>
            <div className="text-xs font-medium text-edp">Regularização</div>
          </div>
        </Link>
        <nav className="flex-1 space-y-2 px-4 py-6">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  active ? "border-edp/35 bg-edp/15 text-white" : "border-transparent text-edp-muted hover:border-edp/25 hover:bg-edp/10 hover:text-white"
                }`}
              >
                <Icon size={18} className="text-white transition group-hover:text-edp" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 pb-5">
          <SidebarWeather />
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-line bg-edp-navy/88 px-4 backdrop-blur-xl lg:px-8">
          <nav className="flex gap-2 overflow-x-auto lg:hidden">
            {visibleNav.map((item) => {
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
              <div className="text-xs text-edp-muted">{user.role === "admin" ? "Administrador" : "Usuário"}</div>
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
