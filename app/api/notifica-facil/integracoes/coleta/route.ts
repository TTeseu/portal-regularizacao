import { randomUUID, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PayloadRecord = Record<string, unknown>;
type NormalizedCenso =
  | { inputs: Prisma.NotificaFacilNotificationUncheckedCreateInput[]; error?: never }
  | { error: string; inputs?: never };

const MAX_REGISTROS_POR_REQUISICAO = 500;
const MAX_LINHAS_NORMALIZADAS = 1000;
const FINAL_CENSO_STATUSES = new Set(["finalizado", "excluido", "excluído"]);
const OPERADORAS_CONHECIDAS = [
  "telefonica",
  "telefônica",
  "vivo",
  "claro",
  "embratel",
  "tim",
  "oi",
  "algar",
  "sercomtel",
  "sky"
];

function configuredToken() {
  return (
    process.env.COLETA_DADOS_API_KEY?.trim() ||
    process.env.NOTIFICA_FACIL_INTEGRATION_TOKEN?.trim() ||
    ""
  );
}

function providedToken(request: Request) {
  const auth = request.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return (
    request.headers.get("x-api-key")?.trim() ||
    request.headers.get("x-coleta-dados-token")?.trim() ||
    ""
  );
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function authorize(request: Request) {
  const expected = configuredToken();
  if (!expected) {
    return {
      ok: false,
      status: 503,
      message: "COLETA_DADOS_API_KEY nao configurada."
    };
  }

  const received = providedToken(request);
  if (!received || !safeEqual(received, expected)) {
    return { ok: false, status: 401, message: "Token invalido." };
  }

  return { ok: true, status: 200, message: "Autorizado." };
}

function asText(value: unknown) {
  if (typeof value === "string") {
    const text = value.trim();
    return text || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function firstText(record: PayloadRecord, keys: string[]) {
  for (const key of keys) {
    const value = asText(record[key]);
    if (value) return value;
  }
  return null;
}

function firstRaw(record: PayloadRecord, keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key) && record[key] != null) {
      return record[key];
    }
  }
  return undefined;
}

function parseDate(value: string | null) {
  if (!value) return new Date();
  const br = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (br) {
    const [, day, month, year, hour = "0", minute = "0"] = br;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function isFinalCensoStatus(status: string | null) {
  return FINAL_CENSO_STATUSES.has((status || "").trim().toLowerCase());
}

function normalizePayload(body: unknown) {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];

  const record = body as PayloadRecord;
  const nested = firstRaw(record, ["registros", "records", "items", "data"]);
  if (Array.isArray(nested)) return nested;
  return [record];
}

function normalizePhotos(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (!item || typeof item !== "object") return "";
        const row = item as PayloadRecord;
        return asText(row.url) || asText(row.file_url) || asText(row.href) || asText(row.link) || "";
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return normalizePhotos(parsed);
    } catch {
      // Strings simples podem vir separados por linha, ponto e virgula ou virgula.
    }
    return text
      .split(/\r?\n|;|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeCompanyKey(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function shouldSplitByConjunction(text: string) {
  const normalized = normalizeCompanyKey(text);
  const operators = OPERADORAS_CONHECIDAS.filter((operator) => normalized.includes(normalizeCompanyKey(operator)));
  if (operators.length >= 2) return true;
  const corporateWords = /\b(ltda|eireli|telecom|telecomunicacoes|telecomunicacao|comunicacao|informatica|provedor|servicos|comercio|industria|fibra|net)\b/i;
  return !corporateWords.test(normalized) && normalized.split(/\s+/).length <= 5;
}

function normalizeCompanies(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueCompanies(value.flatMap((item) => normalizeCompanies(item)));
  }

  if (value && typeof value === "object") {
    const record = value as PayloadRecord;
    return normalizeCompanies(firstRaw(record, ["nome", "name", "empresa", "razao_social", "razaoSocial"]));
  }

  const text = asText(value);
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return normalizeCompanies(parsed);
  } catch {
    // Segue com texto simples.
  }

  const delimiterParts = text
    .split(/\r?\n|;|\|/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (delimiterParts.length > 1) return uniqueCompanies(delimiterParts);

  const commaParts = text.split(",").map((item) => item.trim()).filter(Boolean);
  if (commaParts.length > 1) return uniqueCompanies(commaParts);

  const slashParts = text.split(/\s+\/\s+/).map((item) => item.trim()).filter(Boolean);
  if (slashParts.length > 1) return uniqueCompanies(slashParts);

  const conjunctionParts = text.split(/\s+(?:e|&)\s+/i).map((item) => item.trim()).filter(Boolean);
  if (conjunctionParts.length > 1 && shouldSplitByConjunction(text)) return uniqueCompanies(conjunctionParts);

  return [text];
}

function uniqueCompanies(companies: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const company of companies) {
    const text = company.trim();
    const key = normalizeCompanyKey(text);
    if (!text || seen.has(key)) continue;
    seen.add(key);
    unique.push(text);
  }
  return unique;
}

function companyNamesFrom(record: PayloadRecord) {
  const multiCompanyValue = firstRaw(record, [
    "empresas",
    "empresas_identificadas",
    "empresasIdentificadas",
    "empresas_a_notificar",
    "empresasANotificar",
    "ocupantes"
  ]);
  const multi = normalizeCompanies(multiCompanyValue);
  if (multi.length) return multi;

  const singleCompanyValue = firstRaw(record, [
    "empresa",
    "empresa_nome",
    "empresaNome",
    "empresa_a_notificar",
    "empresaNotificar",
    "ocupante"
  ]);
  return normalizeCompanies(singleCompanyValue);
}

function coordinates(record: PayloadRecord) {
  const raw = firstText(record, ["coordenadas", "coordenadas_fotos", "coordenadasPelasFotos"]);
  return {
    latitude:
      asNumber(firstRaw(record, ["latitude", "lat"])) ??
      parseCoordinate(raw, "lat"),
    longitude:
      asNumber(firstRaw(record, ["longitude", "lng", "lon"])) ??
      parseCoordinate(raw, "lng")
  };
}

function parseCoordinate(value: string | null, type: "lat" | "lng") {
  if (!value) return null;
  const matches = value.match(/-?\d+(?:[.,]\d+)?/g);
  if (!matches?.length) return null;
  const index = type === "lat" ? 0 : 1;
  const parsed = Number(matches[index]?.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function toCensoInput(record: PayloadRecord, index: number): NormalizedCenso {
  const registro = firstText(record, [
    "numero_registro_censo",
    "numeroRegistroCenso",
    "numero_registro",
    "numeroRegistro",
    "registro",
    "id_censo",
    "idCenso",
    "censo_id",
    "censoId"
  ]);

  if (!registro) {
    return {
      error: `Registro ${index + 1}: numero_registro_censo obrigatorio.`
    };
  }

  const dataText = firstText(record, ["data", "data_censo", "dataCenso", "created_date", "criado_em", "criadoEm"]);
  const status = firstText(record, ["status", "status_banco", "statusBanco"]) || "Recebido do COLETA DE DADOS";
  const { latitude, longitude } = coordinates(record);
  const fotos = normalizePhotos(firstRaw(record, ["fotos_censo", "fotos", "imagens", "anexos", "evidencias", "arquivos"]));
  const empresas = companyNamesFrom(record);
  const observacoes =
    firstText(record, ["observacoes", "observacao", "analise_humana", "analiseHumana", "legenda", "comentario"]) ||
    firstText(record, ["dados_plaqueta", "dadosPlaqueta", "plaqueta"]);

  const baseInput = {
    id: randomUUID(),
    created_date: parseDate(dataText),
    updated_date: new Date(),
    created_by_id: "coleta-dados-api",
    created_by: firstText(record, ["usuario_que_enviou", "usuarioQueEnviou", "usuario", "email_usuario"]) || "coleta-dados-api",
    tipo_servico: "CENSO",
    numero_registro_censo: registro,
    data_notificacao: dataText,
    status,
    censo_finalizado: isFinalCensoStatus(status),
    censo_registro_id: firstText(record, ["id_censo", "idCenso", "censo_id", "censoId"]) || registro,
    empresa_incorporada: firstText(record, ["empresa_incorporada", "empresaIncorporada"]),
    empresa_endereco: firstText(record, ["empresa_endereco", "endereco", "logradouro", "endereco_revelia", "enderecoRevelia"]),
    empresa_bairro: firstText(record, ["empresa_bairro", "bairro", "bairro_revelia", "bairroRevelia"]),
    empresa_cidade: firstText(record, ["empresa_cidade", "cidade", "municipio", "município", "cidade_revelia", "cidadeRevelia"]),
    numero_poste: firstText(record, ["numero_poste", "numeroPoste", "poste", "id_poste", "idPoste"]),
    latitude,
    longitude,
    fotos_censo: fotos.length ? fotos : undefined,
    observacoes,
    ordem_venda: firstText(record, ["ordem_venda", "ordemVenda", "ov", "numero_ov", "numeroOv"]),
    status_envio_notificacao: status,
    numero_notificacao: null,
    is_draft: false,
    is_standby: false,
    pendencia_tecnica: false
  } satisfies Omit<Prisma.NotificaFacilNotificationUncheckedCreateInput, "empresa">;

  const inputs = (empresas.length ? empresas : ["SEM PLAQUETA"]).map((empresa) => ({
    ...baseInput,
    id: randomUUID(),
    empresa
  })) satisfies Prisma.NotificaFacilNotificationUncheckedCreateInput[];

  return { inputs };
}

function notificationKey(registro: string | null | undefined, empresa: string | null | undefined) {
  return `${registro || "sem-registro"}::${normalizeCompanyKey(empresa) || "sem-empresa"}`;
}

function canUpdateExistingCenso(existing: {
  numero_notificacao: string | null;
  censo_finalizado: boolean;
  is_standby: boolean;
  pendencia_tecnica: boolean;
}) {
  return !existing.numero_notificacao && !existing.censo_finalizado && !existing.is_standby && !existing.pendencia_tecnica;
}

export async function GET() {
  return NextResponse.json({
    success: true,
    endpoint: "/api/notifica-facil/integracoes/coleta",
    method: "POST",
    auth: "Authorization: Bearer <COLETA_DADOS_API_KEY> ou x-api-key",
    formato: {
      registro_unico: {
        numero_registro_censo: "CS01003723",
        empresa: ["TELEFONICA", "CLARO"],
        endereco: "Avenida Francisco Ferreira Lopes",
        bairro: "Vila Rubens",
        cidade: "Mogi das Cruzes",
        numero_poste: "343462114",
        fotos: ["https://exemplo.com/foto-1.jpg"]
      },
      lote: {
        registros: []
      }
    }
  });
}

export async function POST(request: Request) {
  const auth = authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "JSON invalido." }, { status: 400 });
  }

  const rawRecords = normalizePayload(body);
  if (!rawRecords.length) {
    return NextResponse.json({ success: false, error: "Nenhum registro informado." }, { status: 400 });
  }
  if (rawRecords.length > MAX_REGISTROS_POR_REQUISICAO) {
    return NextResponse.json({
      success: false,
      error: `Envie no maximo ${MAX_REGISTROS_POR_REQUISICAO} registros por requisicao.`
    }, { status: 413 });
  }

  const normalized = rawRecords.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { error: `Registro ${index + 1}: objeto JSON invalido.` };
    }
    return toCensoInput(item as PayloadRecord, index);
  });

  const invalid = normalized
    .map((item, index) => item.error ? { index, error: item.error } : null)
    .filter((item): item is { index: number; error: string } => Boolean(item));
  const validInputs = normalized
    .flatMap((item) => item.inputs || [])
    .filter((item): item is Prisma.NotificaFacilNotificationUncheckedCreateInput => Boolean(item.numero_registro_censo));

  if (!validInputs.length) {
    return NextResponse.json({ success: false, error: "Nenhum registro valido.", detalhes: invalid }, { status: 400 });
  }
  if (validInputs.length > MAX_LINHAS_NORMALIZADAS) {
    return NextResponse.json({
      success: false,
      error: `Os registros recebidos geram ${validInputs.length} linhas de CENSO. Envie no maximo ${MAX_LINHAS_NORMALIZADAS} linhas normalizadas por requisicao.`
    }, { status: 413 });
  }

  const uniqueInputs = Array.from(new Map(validInputs.map((input) => [notificationKey(input.numero_registro_censo, input.empresa), input])).values());
  const registros = uniqueInputs.map((input) => input.numero_registro_censo).filter(Boolean) as string[];
  const existing = await prisma.notificaFacilNotification.findMany({
    where: { numero_registro_censo: { in: registros } },
    select: {
      id: true,
      empresa: true,
      numero_registro_censo: true,
      numero_notificacao: true,
      censo_finalizado: true,
      is_standby: true,
      pendencia_tecnica: true
    },
    orderBy: [{ updated_date: "desc" }, { created_date: "desc" }]
  });

  const existingByRegistroEmpresa = new Map<string, (typeof existing)[number]>();
  for (const row of existing) {
    if (!row.numero_registro_censo) continue;
    const key = notificationKey(row.numero_registro_censo, row.empresa);
    const current = existingByRegistroEmpresa.get(key);
    if (!current || canUpdateExistingCenso(row)) existingByRegistroEmpresa.set(key, row);
  }

  const created: Array<{ id: string; numero_registro_censo: string | null; empresa: string }> = [];
  const updated: Array<{ id: string; numero_registro_censo: string | null; empresa: string }> = [];
  const skipped: Array<{ numero_registro_censo: string | null; empresa: string; motivo: string }> = [];

  for (const input of uniqueInputs) {
    const registro = input.numero_registro_censo || null;
    const empresa = String(input.empresa || "");
    const registroEmpresaKey = notificationKey(registro, empresa);
    const current = existingByRegistroEmpresa.get(registroEmpresaKey);
    const rawPayload = JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;

    if (!current) {
      const row = await prisma.notificaFacilNotification.create({ data: input });
      await prisma.notificaFacilRawEntity.upsert({
        where: { entity_name_base44_id: { entity_name: "ColetaDadosCenso", base44_id: registroEmpresaKey } },
        create: {
          entity_name: "ColetaDadosCenso",
          base44_id: registroEmpresaKey,
          payload: rawPayload,
          created_date: row.created_date,
          updated_date: row.updated_date
        },
        update: { payload: rawPayload, updated_date: row.updated_date }
      });
      created.push({ id: row.id, numero_registro_censo: row.numero_registro_censo, empresa: row.empresa });
      continue;
    }

    if (!canUpdateExistingCenso(current)) {
      skipped.push({ numero_registro_censo: registro, empresa, motivo: "Registro ja processado, finalizado, em stand-by ou marcado como pendencia tecnica." });
      continue;
    }

    const updateInput = { ...input } as Prisma.NotificaFacilNotificationUncheckedUpdateInput & { id?: string };
    delete updateInput.id;
    const row = await prisma.notificaFacilNotification.update({
      where: { id: current.id },
      data: { ...updateInput, updated_date: new Date() }
    });
    await prisma.notificaFacilRawEntity.upsert({
      where: { entity_name_base44_id: { entity_name: "ColetaDadosCenso", base44_id: registroEmpresaKey } },
      create: {
        entity_name: "ColetaDadosCenso",
        base44_id: registroEmpresaKey,
        payload: rawPayload,
        created_date: row.created_date,
        updated_date: row.updated_date
      },
      update: { payload: rawPayload, updated_date: row.updated_date }
    });
    updated.push({ id: row.id, numero_registro_censo: row.numero_registro_censo, empresa: row.empresa });
  }

  revalidatePath("/notifica-facil");
  revalidatePath("/notifica-facil/importar-censo");
  revalidatePath("/notifica-facil/historico-censo");

  return NextResponse.json({
    success: invalid.length === 0,
    total_recebidos: rawRecords.length,
    validos: validInputs.length,
    duplicados_no_payload: validInputs.length - uniqueInputs.length,
    criados: created.length,
    atualizados: updated.length,
    ignorados: skipped.length,
    erros: invalid,
    registros: { criados: created, atualizados: updated, ignorados: skipped }
  }, { status: invalid.length ? 207 : 200 });
}
