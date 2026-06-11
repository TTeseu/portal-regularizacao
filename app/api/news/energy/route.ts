import { NextResponse } from "next/server";

const CACHE_SECONDS = 60 * 60 * 6;
const GNEWS_URL = "https://gnews.io/api/v4/search";

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

type GNewsArticle = {
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  image?: string | null;
  publishedAt?: string;
  source?: {
    name?: string;
    url?: string;
  };
};

let memoryCache: {
  expiresAt: number;
  payload: {
    articles: EnergyNewsArticle[];
    source: "gnews" | "fallback";
    updatedAt: string;
  };
} | null = null;

const fallbackArticles: EnergyNewsArticle[] = [
  {
    id: "fallback-smart-grid",
    category: "Redes Inteligentes",
    title: "Redes inteligentes ampliam monitoramento e resposta na distribuicao",
    summary: "Automacao, telemetria e analise operacional ajudam distribuidoras a acompanhar ativos, reduzir falhas e priorizar tratativas.",
    date: "05/06/2026",
    imageUrl: "/edp-energy-hero.svg",
    url: "https://www.edp.com.br/"
  },
  {
    id: "fallback-infraestrutura",
    category: "Infraestrutura",
    title: "Compartilhamento de postes exige governanca documental integrada",
    summary: "Fluxos centralizados conectam censo, regularização, anexos, notificações e históricos para melhorar rastreabilidade operacional.",
    date: "05/06/2026",
    imageUrl: "/edp-energy-hero.svg",
    url: "https://www.edp.com.br/"
  },
  {
    id: "fallback-mercado-livre",
    category: "Mercado Livre",
    title: "Digitalizacao ganha espaco nos processos do mercado de energia",
    summary: "Portais corporativos fortalecem controle de prazos, padronizacao documental e acompanhamento de contratos em escala.",
    date: "05/06/2026",
    imageUrl: "/edp-energy-hero.svg",
    url: "https://www.edp.com.br/"
  },
  {
    id: "fallback-regulacao",
    category: "Regulacao",
    title: "Rastreabilidade se torna pilar para auditorias e comunicações formais",
    summary: "Históricos, evidências e PDFs consistentes ajudam a sustentar governança e compliance em ciclos de notificação.",
    date: "05/06/2026",
    imageUrl: "/edp-energy-hero.svg",
    url: "https://www.edp.com.br/"
  },
  {
    id: "fallback-inovacao",
    category: "Inovacao",
    title: "Energia renovavel impulsiona novas plataformas de acompanhamento",
    summary: "Solucoes digitais aproximam dados de campo, documentacao e operacao para dar mais visibilidade a processos criticos.",
    date: "05/06/2026",
    imageUrl: "/edp-energy-hero.svg",
    url: "https://www.edp.com.br/"
  },
  {
    id: "fallback-seguranca",
    category: "Seguranca Operacional",
    title: "Controle de ocupacoes apoia prevencao de riscos em redes eletricas",
    summary: "Acompanhamento contínuo melhora priorização de pendências técnicas e ajuda equipes a atuar com mais segurança.",
    date: "05/06/2026",
    imageUrl: "/edp-energy-hero.svg",
    url: "https://www.edp.com.br/"
  }
];

function fallbackPayload() {
  return {
    articles: fallbackArticles,
    source: "fallback" as const,
    updatedAt: new Date().toISOString()
  };
}

function categoryFor(article: GNewsArticle) {
  const text = `${article.title || ""} ${article.description || ""} ${article.content || ""}`.toLowerCase();
  if (text.includes("aneel") || text.includes("regula") || text.includes("tarifa")) return "Regulacao";
  if (text.includes("smart grid") || text.includes("rede inteligente") || text.includes("medidor")) return "Redes Inteligentes";
  if (text.includes("mercado livre") || text.includes("free market")) return "Mercado Livre";
  if (text.includes("subest") || text.includes("transmiss") || text.includes("poste") || text.includes("grid") || text.includes("infra")) return "Infraestrutura";
  if (text.includes("risco") || text.includes("seguran")) return "Seguranca Operacional";
  return "Inovacao";
}

function formatDate(value?: string) {
  if (!value) return new Intl.DateTimeFormat("pt-BR").format(new Date());
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Intl.DateTimeFormat("pt-BR").format(new Date());
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function normalizeArticle(article: GNewsArticle, index: number): EnergyNewsArticle | null {
  if (!article.title || !article.url) return null;
  return {
    id: article.url || `gnews-${index}`,
    category: categoryFor(article),
    title: article.title,
    summary: article.description || article.content || "Leia a noticia completa para mais detalhes sobre o setor eletrico.",
    date: formatDate(article.publishedAt),
    imageUrl: article.image || "/edp-energy-hero.svg",
    url: article.url,
    sourceName: article.source?.name
  };
}

async function fetchGNews() {
  const apiKey = process.env.GNEWS_API_KEY?.trim();
  if (!apiKey) return fallbackPayload();

  const query = [
    "\"energia eletrica\"",
    "\"distribuicao de energia\"",
    "\"energia solar\"",
    "\"mercado livre de energia\"",
    "ANEEL",
    "\"smart grid\"",
    "\"power grid\"",
    "\"energy sector\""
  ].join(" OR ");

  const params = new URLSearchParams({
    q: query,
    lang: "pt",
    country: "br",
    max: "9",
    in: "title,description",
    nullable: "description,image",
    apikey: apiKey
  });

  const response = await fetch(`${GNEWS_URL}?${params.toString()}`, {
    next: { revalidate: CACHE_SECONDS }
  });

  if (!response.ok) return fallbackPayload();

  const data = await response.json() as { articles?: GNewsArticle[] };
  const articles = (data.articles || [])
    .map(normalizeArticle)
    .filter((article): article is EnergyNewsArticle => Boolean(article))
    .slice(0, 6);

  if (articles.length === 0) return fallbackPayload();

  return {
    articles,
    source: "gnews" as const,
    updatedAt: new Date().toISOString()
  };
}

export async function GET() {
  if (memoryCache && memoryCache.expiresAt > Date.now()) {
    return NextResponse.json(memoryCache.payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`
      }
    });
  }

  const payload = await fetchGNews().catch(() => fallbackPayload());
  memoryCache = {
    expiresAt: Date.now() + CACHE_SECONDS * 1000,
    payload
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`
    }
  });
}
