export const STATUS_OPTIONS = [
  "Pendente",
  "Notificado",
  "Em Análise",
  "Regularizado",
  "Vencido"
] as const;

export const ORIGEM_OPTIONS = ["manual", "importacao"] as const;
export const DOWNLOAD_TYPES = ["lote", "selecao", "todos"] as const;
export const ROLE_OPTIONS = ["admin", "user"] as const;

export const EDIT_RESTRICTED_MESSAGE =
  "Seu usuario nao tem permissao para editar ou importar dados.";
