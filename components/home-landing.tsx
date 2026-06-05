"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  ClipboardList,
  CloudLightning,
  FileText,
  Gauge,
  Grid3X3,
  LogOut,
  Network,
  Sparkles,
  Zap
} from "lucide-react";

type HomeUser = {
  name: string;
  email: string;
  role: string;
};

type EnergyNewsArticle = {
  id: string;
  category: string;
  title: string;
  summary: string;
  date: string;
  imageUrl: string;
  url: string;
  sourceName?: string;
};

const modules = [
  {
    title: "Portal de Regularizacao",
    description: "Gerencie notificacoes formais, lotes, regularizacoes, downloads, anexos, status e acompanhamento operacional.",
    href: "/regularizacao",
    icon: FileText
  },
  {
    title: "Notifica Facil",
    description: "Gerencie notificacoes vindas do censo, pendencias tecnicas, respostas de clientes, anexos, assinaturas e fluxo documental.",
    href: "/notifica-facil",
    icon: BellRing
  }
];

const fallbackNews: EnergyNewsArticle[] = [
  {
    id: "fallback-inovacao",
    category: "Inovacao",
    title: "Automacao operacional acelera a gestao documental no setor eletrico",
    summary: "Plataformas integradas reduzem retrabalho, melhoram rastreabilidade e aproximam areas tecnicas e administrativas.",
    date: "05/06/2026",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=80",
    url: "https://www.edp.com.br/"
  },
  {
    id: "fallback-redes",
    category: "Redes Inteligentes",
    title: "Distribuidoras ampliam monitoramento digital de ativos em campo",
    summary: "Telemetria, historico visual e leitura operacional passam a apoiar decisoes sobre infraestrutura compartilhada.",
    date: "05/06/2026",
    imageUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=900&q=80",
    url: "https://www.edp.com.br/"
  },
  {
    id: "fallback-mercado",
    category: "Mercado Livre",
    title: "Digitalizacao ganha espaco em processos regulados e contratos",
    summary: "Governanca documental vira diferencial para organizar evidencias, prazos e notificacoes em escala.",
    date: "05/06/2026",
    imageUrl: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=900&q=80",
    url: "https://www.edp.com.br/"
  }
];

const operations = [
  { title: "Integracao entre modulos", description: "Regularizacao e Notifica Facil conectados em uma entrada unica.", icon: Grid3X3 },
  { title: "Gestao centralizada", description: "Notificacoes, anexos, status e historicos com acesso organizado.", icon: Network },
  { title: "Padronizacao documental", description: "HTML e PDFs com fluxo consistente para assinatura e download.", icon: ClipboardList },
  { title: "Acompanhamento em tempo real", description: "Indicadores e status para operacao, tratativa e governanca.", icon: Gauge }
];

export function HomeLanding({ user }: { user: HomeUser }) {
  const router = useRouter();
  const [transition, setTransition] = useState<{ label: string; href: string } | null>(null);
  const [news, setNews] = useState<EnergyNewsArticle[]>(fallbackNews);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/news/energy")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("news_fetch_failed")))
      .then((data: { articles?: EnergyNewsArticle[] }) => {
        if (!active) return;
        if (data.articles?.length) setNews(data.articles.slice(0, 3));
      })
      .catch(() => {
        if (active) setNews(fallbackNews);
      })
      .finally(() => {
        if (active) setNewsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function enterModule(label: string, href: string) {
    if (transition) return;
    setTransition({ label, href });
    window.setTimeout(() => router.push(href), 850);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#04111f] text-white">
      <TransitionOverlay transition={transition} />

      <div className="fixed inset-0 z-0">
        <Image
          src="/edp-home-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#061427]/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(0,230,118,0.28),transparent_30%),linear-gradient(90deg,rgba(2,8,18,0.95)_0%,rgba(4,16,31,0.72)_46%,rgba(3,10,21,0.88)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
      </div>

      <header className="relative z-20 border-b border-white/10 bg-[#07172b]/64 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-20 max-w-[1680px] items-center justify-between gap-4 px-5 md:px-10">
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-32 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.07] px-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <Image src="/edp-logo-white.svg" alt="EDP" width={94} height={40} className="h-10 w-auto" priority />
            </div>
            <div className="border-l border-white/10 pl-5">
              <div className="text-base font-bold text-white">Portal de Notificacoes EDP</div>
              <div className="text-sm font-semibold text-[#00E676]">Ambiente corporativo integrado</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-bold text-white">{user.email || user.name}</div>
              <div className="text-xs text-[#C7D0DA]">{user.role === "admin" ? "Administrador" : "Usuario aprovado"}</div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#00E676]/50 bg-[#00E676]/10 text-[#00E676] transition hover:bg-[#00E676] hover:text-[#061427]" title="Sair">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col">
        <div className="mx-auto grid w-full max-w-[1680px] flex-1 items-center gap-10 px-5 py-10 md:px-10 lg:grid-cols-[1fr_0.82fr] lg:py-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00E676]/40 bg-[#00E676]/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#00E676] shadow-lg shadow-[#00E676]/10 backdrop-blur-xl">
              <Sparkles size={15} />
              Gestao integrada de notificacoes
            </div>

            <h1 className="mt-6 text-5xl font-bold leading-[0.98] tracking-[-0.02em] text-white drop-shadow-2xl sm:text-6xl xl:text-7xl">
              Portal de<br />
              Notificacoes EDP
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/88 drop-shadow md:text-xl">
              Centralize regularizacoes, notificacoes, fluxos documentais e acompanhamento operacional em uma unica plataforma.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button onClick={() => enterModule("Portal de Regularizacao", "/regularizacao")} className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-[#00E676] px-7 py-4 text-sm font-bold text-[#061427] shadow-2xl shadow-[#00E676]/25 transition hover:-translate-y-0.5 hover:bg-[#00C853]">
                Acessar Portal de Regularizacao
                <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </button>
              <button onClick={() => enterModule("Notifica Facil", "/notifica-facil")} className="group inline-flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/[0.08] px-7 py-4 text-sm font-bold text-white shadow-2xl shadow-black/15 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#00E676]/70 hover:bg-white/[0.13]">
                Acessar Notifica Facil
                <BellRing size={18} className="transition group-hover:text-[#00E676]" />
              </button>
            </div>
          </div>

          <HeroDashboard />
        </div>

        <div className="mx-auto grid w-full max-w-[1680px] gap-8 px-5 pb-7 md:px-10 xl:grid-cols-[0.96fr_1fr]">
          <section>
            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_0.7fr] md:items-end">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-[#00E676]">Escolha o sistema</div>
                <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">Dois modulos, uma experiencia integrada</h2>
              </div>
              <p className="text-xs leading-5 text-[#C7D0DA]">
                Entre no modulo ideal para sua operacao. A Home permanece clara e institucional; os sistemas internos mantem o ambiente operacional EDP.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {modules.map((module) => (
                <ModuleSelectorCard key={module.href} module={module} onEnter={enterModule} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-[#00E676]">Radar do Setor Eletrico</div>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#C7D0DA]">
                  Acompanhe tendencias e movimentacoes relevantes.
                </p>
              </div>
              <div className="hidden rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white backdrop-blur-xl sm:block">
                {newsLoading ? "Atualizando" : "Ver todas as noticias"}
                <ArrowRight size={14} className="ml-2 inline text-[#00E676]" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {news.slice(0, 3).map((item) => <SectorNewsCard key={item.id || item.title} item={item} />)}
            </div>
          </section>
        </div>

        <section className="mx-auto w-full max-w-[1680px] px-5 pb-5 md:px-10">
          <div className="grid gap-0 overflow-hidden rounded-[28px] border border-white/12 bg-white/[0.06] shadow-2xl shadow-black/20 backdrop-blur-2xl md:grid-cols-2 xl:grid-cols-4">
            {operations.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-4 border-white/10 p-6 md:border-r">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-[#00E676]/25 bg-[#00E676]/10 text-[#00E676]">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#C7D0DA]">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

function HeroDashboard() {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute -inset-5 rounded-[38px] bg-[#00E676]/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-[34px] border border-white/18 bg-[#0c1d35]/58 p-7 shadow-2xl shadow-black/30 backdrop-blur-2xl">
        <div className="absolute inset-x-0 top-20 h-px bg-[#00E676]/65 shadow-[0_0_36px_rgba(0,230,118,0.7)]" />
        <div className="absolute right-8 top-8 h-36 w-56 rounded-full bg-[#00E676]/20 blur-3xl" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00E676] text-[#061427]">
              <CloudLightning size={24} />
            </div>
            <div>
              <div className="font-bold text-white">Operacao EDP</div>
              <div className="text-sm text-[#C7D0DA]">Painel documental integrado</div>
            </div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/12 px-4 py-1.5 text-xs font-bold text-white">Online</span>
        </div>

        <div className="relative mt-8 rounded-[28px] bg-[#132744]/78 p-5 backdrop-blur">
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Notificacoes" value="1.9k" tone="green" />
            <MiniMetric label="Pendencias" value="86" tone="blue" />
            <MiniMetric label="Fluxos" value="2" tone="white" />
          </div>

          <div className="mt-5 rounded-3xl border border-white/8 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs font-bold uppercase text-white/80">Rede operacional</div>
              <Zap size={17} className="text-[#00E676]" />
            </div>
            <div className="relative h-28 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b2532] to-[#16324e]">
              <div className="absolute left-9 top-6 h-20 w-px bg-white/32" />
              <div className="absolute left-8 top-5 h-2.5 w-2.5 rounded-full bg-[#00E676] shadow-[0_0_20px_rgba(0,230,118,0.9)]" />
              <div className="absolute left-12 top-6 h-px w-[72%] rotate-[14deg] bg-[#00E676]/75" />
              <div className="absolute right-16 top-11 h-16 w-px bg-white/32" />
              <div className="absolute right-16 top-10 h-2.5 w-2.5 rounded-full bg-[#00E676] shadow-[0_0_20px_rgba(0,230,118,0.9)]" />
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {["PDF gerado e armazenado", "Historico centralizado", "Assinatura e anexos rastreaveis"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.035] px-4 py-3">
                <CheckCircle2 size={18} className="text-[#00E676]" />
                <span className="text-sm font-bold text-white">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: "green" | "blue" | "white" }) {
  const tones = {
    green: "text-[#00E676]",
    blue: "text-[#28C7FF]",
    white: "text-white"
  };

  return (
    <div className="rounded-2xl bg-white/[0.055] p-5">
      <div className={`text-xs font-bold uppercase ${tones[tone]}`}>{label}</div>
      <div className={`mt-3 text-3xl font-bold ${tones[tone]}`}>{value}</div>
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
      className="group relative min-h-64 overflow-hidden rounded-[26px] border border-white/16 bg-[#0c1d35]/58 p-7 text-left shadow-2xl shadow-black/20 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-[#00E676]/70 hover:bg-[#102744]/72"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[#00E676] opacity-90 shadow-[0_0_24px_rgba(0,230,118,0.85)]" />
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[#00E676]/10 blur-3xl transition group-hover:bg-[#00E676]/20" />
      <div className="flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.06] text-[#00E676]">
          <Icon size={26} />
        </div>
        <ArrowRight className="text-white/65 transition group-hover:translate-x-1 group-hover:text-[#00E676]" size={24} />
      </div>
      <h3 className="mt-8 text-2xl font-bold text-white">{module.title}</h3>
      <p className="mt-4 max-w-md text-sm leading-7 text-[#C7D0DA]">{module.description}</p>
    </button>
  );
}

function SectorNewsCard({ item }: { item: EnergyNewsArticle }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-white/16 bg-[#0c1d35]/58 shadow-2xl shadow-black/20 backdrop-blur-2xl transition hover:-translate-y-1 hover:border-[#00E676]/60">
      <a href={item.url} target="_blank" rel="noreferrer" className="block">
        <div className="relative h-32 overflow-hidden bg-[#061427]">
          <img
            src={item.imageUrl || "/edp-energy-hero.svg"}
            alt=""
            className="h-full w-full object-cover opacity-85 transition duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.src = "/edp-energy-hero.svg";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#061427]/78 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase text-[#008E4A]">
            {item.category}
          </div>
          <div className="absolute bottom-3 right-3 text-xs font-semibold text-white/85">{item.date}</div>
        </div>
      </a>
      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-5 text-white">{item.title}</h3>
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-[#C7D0DA]">{item.summary}</p>
        <a href={item.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#00E676]">
          Ver detalhes
          <ArrowRight size={14} className="transition group-hover:translate-x-1" />
        </a>
      </div>
    </article>
  );
}

function TransitionOverlay({ transition }: { transition: { label: string; href: string } | null }) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#061427] transition duration-500 ${transition ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 overflow-hidden bg-white/10">
        <div className={`h-full w-1/2 bg-gradient-to-r from-transparent via-[#00E676] to-transparent transition-transform duration-700 ${transition ? "translate-x-[200%]" : "-translate-x-full"}`} />
      </div>
      <div className={`relative rounded-[30px] border border-white/12 bg-white/[0.06] px-10 py-8 text-center shadow-2xl shadow-black/25 backdrop-blur-xl transition duration-500 ${transition ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#00E676]/15">
          <Image src="/edp-logo-white.svg" alt="EDP" width={78} height={34} className="h-9 w-auto animate-pulse" />
        </div>
        <div className="mt-6 text-xl font-bold text-white">Carregando modulo...</div>
        <div className="mt-2 text-sm text-[#C7D0DA]">{transition?.label}</div>
      </div>
    </div>
  );
}
