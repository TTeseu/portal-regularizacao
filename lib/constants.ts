export const STATUS_OPTIONS = [
  "Notificado",
  "Regularizado",
  "Vencido"
] as const;

export const LEGACY_NOTIFICADO_STATUSES = [
  "Notificado",
  "Pendente",
  "Em Análise",
  "Em Analise"
] as const;

export const ORIGEM_OPTIONS = ["manual", "importacao"] as const;
export const DOWNLOAD_TYPES = ["lote", "selecao", "todos"] as const;
export const ROLE_OPTIONS = ["admin", "user"] as const;

export const EDIT_RESTRICTED_MESSAGE =
  "Seu usuario nao tem permissao para editar ou importar dados.";

export const CLAUSULA_11_6_3_TEXT =
  "Não sendo possível a regularização em razão de risco elevado, a DETENTORA poderá atuar imediatamente, independentemente de qualquer notificação prévia à OCUPANTE, devendo, posteriormente, a OCUPANTE reembolsar a DETENTORA dos custos por esta suportados.";
