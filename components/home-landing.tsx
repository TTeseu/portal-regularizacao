"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  BellRing,
  Blocks,
  CheckCircle2,
  ClipboardList,
  CloudLightning,
  FileText,
  Gauge,
  LogOut,
  Network,
  RadioTower,
  Sparkles,
  Zap
} from "lucide-react";

type HomeUser = {
  name: string;
  email: string;
  role: string;
};

const modules = [
  {
    title: "Portal de Regularizacao",
    description: "Gestao de notificacoes formais, lotes, regularizacoes, PDFs, downloads, anexos e acompanhamento operacional.",
    href: "/regularizacao",
    icon: FileText,
    label: "Entrar no Portal de Regularizacao",
    tags: ["Notificacoes", "Lotes", "Regularizacao", "Downloads"],
    accent: "from-[#00E676] to-[#6EE7FF]"
  },
  {
    title: "Notifica Facil",
    description: "Controle de notificacoes vindas do censo, pendencias tecnicas, respostas de clientes, anexos, assinaturas e fluxo documental.",
    href: "/notifica-facil",
    icon: BellRing,
    label: "Entrar no Notifica Facil",
    tags: ["Censo", "Pendencias", "Anexos", "Fluxo documental"],
    accent: "from-[#1E2D44] to-[#00E676]"
  }
];

const news = [
  {
    category: "Inovacao",
    title: "Automacao operacional acelera a gestao documental no setor eletrico",
    summary: "Plataformas integradas reduzem retrabalho, melhoram rastreabilidade e aproximam areas tecnicas e administrativas.",
    date: "05/06/2026"
  },
  {
    category: "Redes Inteligentes",
    title: "Distribuidoras ampliam monitoramento digital de ativos em campo",
    summary: "Telemetria, historico visual e leitura operacional passam a apoiar decisoes sobre infraestrutura compartilhada.",
    date: "05/06/2026"
  },
  {
    category: "Mercado Livre",
    title: "Digitalizacao ganha espaco em processos regulados e contratos",
    summary: "Governanca documental vira diferencial para organizar evidencias, prazos e notificacoes em escala.",
    date: "05/06/2026"
  },
  {
    category: "Infraestrutura",
    title: "Compartilhamento de postes exige padronizacao e acompanhamento continuo",
    summary: "Fluxos centralizados ajudam a conectar censo, regularizacao, pendencias tecnicas e respostas de clientes.",
    date: "05/06/2026"
  },
  {
    category: "Regulacao",
    title: "Rastreabilidade se torna pilar para auditorias e comunicacoes formais",
    summary: "Historicos, anexos e PDFs consistentes fortalecem a governanca em todo o ciclo de notificacao.",
    date: "05/06/2026"
  },
  {
    category: "Seguranca Operacional",
    title: "Controle de ocupacoes ajuda a reduzir risco em redes de distribuicao",
    summary: "Informacao centralizada melhora priorizacao, resposta e acompanhamento de tratativas criticas.",
    date: "05/06/2026"
  }
];

const operations = [
  { title: "Integracao entre modulos", description: "Regularizacao e Notifica Facil conectados em uma entrada unica.", icon: Blocks },
  { title: "Gestao centralizada", description: "Notificacoes, anexos, status e historicos com acesso organizado.", icon: Network },
  { title: "Padronizacao documental", description: "HTML e PDFs com fluxo consistente para assinatura e download.", icon: ClipboardList },
  { title: "Acompanhamento em tempo real", description: "Indicadores e status para operacao, tratativa e governanca.", icon: Gauge }
];

export function HomeLanding({ user }: { user: HomeUser }) {
  const router = useRouter();
  const [transition, setTransition] = useState<{ label: string; href: string } | null>(null);

  function enterModule(label: string, href: string) {
    if (transition) return;
    setTransition({ label, href });
    window.setTimeout(() => router.push(href), 850);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#F4F7FA] text-[#172033]">
      <EDPBackgroundPattern />
      <TransitionOverlay transition={transition} />

      <header className="relative z-10 border-b border-[#E2E8F0]/80 bg-white/86 backdrop-blur-xl">
        <div className="mx-auto flex min-h-24 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-28 items-center justify-center rounded-2xl bg-[#1E2D44] px-4 shadow-lg shadow-slate-900/10">
              <Image src="/edp-logo-white.svg" alt="EDP" width={82} height={36} className="h-9 w-auto" priority />
            </div>
            <div>
              <div className="text-sm font-bold text-[#172033]">Portal de Notificacoes EDP</div>
              <div className="text-xs font-semibold text-[#00A95C]">Ambiente corporativo integrado</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden rounded-2xl border border-[#E2E8F0] bg-white px-4 py-2 text-right shadow-sm sm:block">
              <div className="text-sm font-bold text-[#172033]">{user.name}</div>
              <div className="text-xs text-[#64748B]">{user.role === "admin" ? "Administrador" : "Usuario aprovado"}</div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white text-[#1E2D44] shadow-sm transition hover:border-[#00E676] hover:text-[#00A95C]" title="Sair">
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00E676]/30 bg-[#00E676]/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#008E4A]">
            <Sparkles size={15} />
            Gestao integrada de notificacoes
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[1.03] text-[#172033] md:text-6xl">
            Portal de Notificacoes EDP
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#64748B]">
            Centralize regularizacoes, notificacoes, fluxos documentais e acompanhamento operacional em uma unica plataforma.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => enterModule("Portal de Regularizacao", "/regularizacao")} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00E676] px-6 py-4 text-sm font-bold text-[#102033] shadow-xl shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-[#00C853]">
              Acessar Portal de Regularizacao
              <ArrowRight size={17} />
            </button>
            <button onClick={() => enterModule("Notifica Facil", "/notifica-facil")} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#1E2D44]/15 bg-white px-6 py-4 text-sm font-bold text-[#1E2D44] shadow-sm transition hover:-translate-y-0.5 hover:border-[#00E676] hover:text-[#008E4A]">
              Acessar Notifica Facil
              <BellRing size={17} />
            </button>
          </div>
        </div>

        <HeroVisual />
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-14 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="text-sm font-bold uppercase tracking-wide text-[#008E4A]">Escolha o sistema</div>
            <h2 className="mt-2 text-3xl font-bold text-[#172033]">Dois modulos, uma experiencia integrada</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#64748B]">
            Entre no modulo ideal para sua operacao. A Home permanece clara e institucional; os sistemas internos mantem o ambiente operacional EDP.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {modules.map((module) => (
            <ModuleSelectorCard key={module.href} module={module} onEnter={enterModule} />
          ))}
        </div>
      </section>

      <section className="relative z-10 bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#1E2D44] px-4 py-2 text-xs font-bold uppercase text-white">
                <RadioTower size={15} className="text-[#00E676]" />
                Radar do Setor Eletrico
              </div>
              <h2 className="mt-4 text-3xl font-bold text-[#172033]">Tendencias e movimentos do setor</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#64748B]">
                Acompanhe tendencias, inovacao e movimentacoes relevantes para distribuicao de energia, infraestrutura compartilhada e regularizacao.
              </p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F4F7FA] px-4 py-3 text-sm font-semibold text-[#64748B]">
              Conteudo estatico preparado para futura API
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {news.map((item) => <SectorNewsCard key={item.title} item={item} />)}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="rounded-[32px] bg-[#1E2D44] p-6 shadow-2xl shadow-slate-900/15 md:p-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {operations.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00E676]/15 text-[#00E676]">
                    <Icon size={21} />
                  </div>
                  <h3 className="font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#C7D0DA]">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-[#00E676]/20 via-white to-[#1E2D44]/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-[32px] border border-white bg-white p-5 shadow-2xl shadow-slate-900/10">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-[#1E2D44] via-[#24354F] to-[#00A95C]" />
        <div className="relative rounded-[26px] border border-white/20 bg-white/10 p-5 backdrop-blur">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00E676] text-[#1E2D44]">
                <CloudLightning size={23} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Operacao EDP</div>
                <div className="text-xs text-white/70">Painel documental integrado</div>
              </div>
            </div>
            <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">Online</div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-xl shadow-slate-900/10">
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniMetric label="Notificacoes" value="1.9k" tone="green" />
              <MiniMetric label="Pendencias" value="86" tone="blue" />
              <MiniMetric label="Fluxos" value="2" tone="dark" />
            </div>

            <div className="mt-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-bold uppercase text-[#64748B]">Rede operacional</div>
                <Zap size={16} className="text-[#00A95C]" />
              </div>
              <div className="relative h-32 overflow-hidden rounded-xl bg-gradient-to-br from-[#EDFDF4] to-white">
                <div className="absolute left-8 top-5 h-24 w-px bg-[#1E2D44]/25" />
                <div className="absolute left-7 top-5 h-2 w-2 rounded-full bg-[#00E676]" />
                <div className="absolute left-8 top-8 h-px w-72 rotate-[15deg] bg-[#00A95C]/50" />
                <div className="absolute right-16 top-10 h-20 w-px bg-[#1E2D44]/25" />
                <div className="absolute right-16 top-10 h-2 w-2 rounded-full bg-[#00E676]" />
                <div className="absolute bottom-4 left-5 right-5 grid grid-cols-5 gap-2">
                  {[42, 70, 54, 88, 63].map((height, index) => (
                    <div key={index} className="flex items-end rounded-lg bg-[#1E2D44]/5 px-1">
                      <div className="w-full rounded-t-md bg-[#1E2D44]" style={{ height: `${height}%`, opacity: 0.22 + index * 0.08 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {["PDF gerado e armazenado", "Historico centralizado", "Assinatura e anexos rastreaveis"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] px-4 py-3">
                  <CheckCircle2 size={18} className="text-[#00A95C]" />
                  <span className="text-sm font-semibold text-[#172033]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: "green" | "blue" | "dark" }) {
  const tones = {
    green: "bg-[#00E676]/12 text-[#008E4A]",
    blue: "bg-sky-100 text-sky-700",
    dark: "bg-[#1E2D44]/10 text-[#1E2D44]"
  };
  return (
    <div className={`rounded-2xl p-4 ${tones[tone]}`}>
      <div className="text-xs font-bold uppercase">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function ModuleSelectorCard({
  module,
  onEnter
}: {
  module: typeof modules[number];
  onEnter: (label: string, href: string) => void;
}) {
  const Icon = module.icon;
  return (
    <button
      onClick={() => onEnter(module.title, module.href)}
      className="group relative overflow-hidden rounded-[30px] border border-[#E2E8F0] bg-white p-6 text-left shadow-xl shadow-slate-900/7 transition duration-300 hover:-translate-y-1 hover:border-[#00E676]/60 hover:shadow-2xl hover:shadow-emerald-900/10"
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${module.accent}`} />
      <div className="flex items-start justify-between gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#1E2D44] text-[#00E676] shadow-lg shadow-slate-900/10">
          <Icon size={29} />
        </div>
        <ArrowRight className="text-[#94A3B8] transition group-hover:translate-x-1 group-hover:text-[#00A95C]" size={24} />
      </div>
      <h3 className="mt-7 text-2xl font-bold text-[#172033]">{module.title}</h3>
      <p className="mt-3 min-h-20 text-sm leading-7 text-[#64748B]">{module.description}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {module.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-xs font-bold text-[#64748B]">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#00E676] px-5 py-3 text-sm font-bold text-[#102033] transition group-hover:bg-[#00C853]">
        {module.label}
        <ArrowRight size={16} />
      </div>
    </button>
  );
}

function SectorNewsCard({ item }: { item: typeof news[number] }) {
  return (
    <article className="group rounded-[26px] border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#00E676]/50 hover:shadow-xl hover:shadow-slate-900/10">
      <div className="flex items-center justify-between gap-4">
        <span className="rounded-full bg-[#F0FDF5] px-3 py-1 text-xs font-bold uppercase text-[#008E4A]">{item.category}</span>
        <span className="text-xs font-semibold text-[#94A3B8]">{item.date}</span>
      </div>
      <h3 className="mt-4 text-lg font-bold leading-snug text-[#172033]">{item.title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#64748B]">{item.summary}</p>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#008E4A]">
        Ver detalhes
        <ArrowRight size={15} className="transition group-hover:translate-x-1" />
      </div>
    </article>
  );
}

function TransitionOverlay({ transition }: { transition: { label: string; href: string } | null }) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#1E2D44] transition duration-500 ${transition ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 overflow-hidden bg-white/10">
        <div className={`h-full w-1/2 bg-gradient-to-r from-transparent via-[#00E676] to-transparent transition-transform duration-700 ${transition ? "translate-x-[200%]" : "-translate-x-full"}`} />
      </div>
      <div className={`relative rounded-[30px] border border-white/10 bg-white/[0.06] px-10 py-8 text-center shadow-2xl shadow-black/25 backdrop-blur-xl transition duration-500 ${transition ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#00E676]/15">
          <Image src="/edp-logo-white.svg" alt="EDP" width={78} height={34} className="h-9 w-auto animate-pulse" />
        </div>
        <div className="mt-6 text-xl font-bold text-white">Carregando modulo...</div>
        <div className="mt-2 text-sm text-[#C7D0DA]">{transition?.label}</div>
      </div>
    </div>
  );
}

function EDPBackgroundPattern() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(30,45,68,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(30,45,68,0.045)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="absolute left-[-12%] top-[-12%] h-96 w-96 rounded-full bg-[#00E676]/16 blur-3xl" />
      <div className="absolute right-[-10%] top-[12%] h-[520px] w-[520px] rounded-full bg-[#1E2D44]/10 blur-3xl" />
      <div className="absolute bottom-[-16%] left-[22%] h-96 w-96 rounded-full bg-sky-200/30 blur-3xl" />
    </div>
  );
}
