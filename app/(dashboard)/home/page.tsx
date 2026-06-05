import Link from "next/link";
import { ArrowRight, BellRing, FileText, RadioTower, ShieldCheck, Zap } from "lucide-react";
import { requireUser } from "@/lib/auth";

const modules = [
  {
    title: "Portal de Regularização",
    description: "Gerencie notificações formais, lotes, regularizações, downloads, anexos, status e acompanhamento operacional.",
    href: "/regularizacao",
    icon: FileText,
    label: "Acessar Portal de Regularização"
  },
  {
    title: "Notifica Fácil",
    description: "Gerencie notificações vindas do censo, pendências técnicas, respostas de clientes, anexos, assinaturas e fluxo documental.",
    href: "/notifica-facil",
    icon: BellRing,
    label: "Acessar Notifica Fácil"
  }
];

const radar = [
  {
    category: "Redes inteligentes",
    title: "Redes inteligentes ganham espaço na distribuição de energia",
    summary: "Automação, telemetria e análise operacional ampliam a capacidade de resposta das distribuidoras.",
    date: "05/06/2026"
  },
  {
    category: "Operação",
    title: "Setor elétrico avança em automação e monitoramento de ativos",
    summary: "Ferramentas digitais reduzem retrabalho e dão mais rastreabilidade a notificações e evidências técnicas.",
    date: "05/06/2026"
  },
  {
    category: "Infraestrutura",
    title: "Compartilhamento de postes exige controle operacional mais eficiente",
    summary: "Integração entre campo, contratos, anexos e PDFs aumenta a governança sobre ocupações em postes.",
    date: "05/06/2026"
  },
  {
    category: "Mercado",
    title: "Mercado livre de energia impulsiona novas soluções digitais",
    summary: "Plataformas corporativas ganham importância para gestão documental, compliance e atendimento regulatório.",
    date: "05/06/2026"
  }
];

export default async function HomePage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="overflow-hidden rounded-3xl border border-line bg-card shadow-2xl shadow-black/10">
        <div className="relative min-h-[360px] bg-[url('/edp-energy-hero.svg')] bg-cover bg-center">
          <div className="absolute inset-0 bg-gradient-to-r from-edp-navy via-edp-navy/92 to-edp-navy/58" />
          <div className="relative z-10 flex min-h-[360px] flex-col justify-between p-8 lg:p-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-32 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-5">
                  <img src="/edp-logo-white.svg" alt="EDP" className="h-10 w-auto" />
                </div>
                <div>
                  <div className="text-sm font-bold uppercase tracking-wide text-edp">Portal Central</div>
                  <div className="text-lg font-bold text-white">Portal de Notificações EDP</div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-right">
                <div className="text-sm font-bold text-white">{user.full_name || user.name || user.email}</div>
                <div className="text-xs text-edp-muted">{user.role === "admin" ? "Administrador" : "Usuário aprovado"}</div>
              </div>
            </div>

            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-edp/25 bg-edp/10 px-4 py-2 text-xs font-bold uppercase text-edp">
                <Zap size={15} />
                Gestão integrada de notificações
              </div>
              <h1 className="text-4xl font-bold leading-tight text-white lg:text-6xl">Portal de Notificações EDP</h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-edp-muted">
                Gestão integrada de regularizações, notificações, infraestrutura compartilhada e acompanhamento operacional.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href} className="group panel p-6 transition hover:border-edp/35 hover:bg-white/[0.035]">
              <div className="flex items-start justify-between gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-edp/25 bg-edp/10 text-edp">
                  <Icon size={26} />
                </div>
                <ArrowRight className="text-edp-muted transition group-hover:translate-x-1 group-hover:text-edp" size={22} />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-white">{module.title}</h2>
              <p className="mt-3 min-h-20 text-sm leading-relaxed text-edp-muted">{module.description}</p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-edp px-4 py-2 text-sm font-bold text-edp-navy transition group-hover:bg-edp-hover">
                {module.label}
              </div>
            </Link>
          );
        })}
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold text-white">
              <RadioTower className="text-edp" size={22} />
              Radar do Setor Elétrico
            </div>
            <p className="mt-1 text-sm text-edp-muted">Cards preparados para futura integração com API de notícias.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-edp/25 bg-edp/10 px-4 py-2 text-xs font-bold uppercase text-edp">
            <ShieldCheck size={14} />
            Conteúdo institucional
          </div>
        </div>
        <div className="grid gap-4 p-6 lg:grid-cols-4">
          {radar.map((item) => (
            <article key={item.title} className="rounded-2xl border border-line bg-surface p-4">
              <div className="text-xs font-bold uppercase text-edp">{item.category}</div>
              <h3 className="mt-3 text-base font-bold leading-snug text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-edp-muted">{item.summary}</p>
              <div className="mt-5 flex items-center justify-between text-xs text-edp-muted">
                <span>{item.date}</span>
                <span className="font-bold text-edp">Ver detalhes</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
