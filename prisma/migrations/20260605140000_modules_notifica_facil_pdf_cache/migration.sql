ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pode_acessar_regularizacao" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pode_acessar_notifica_facil" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pode_editar_regularizacao" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pode_editar_notifica_facil" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pode_importar_dados" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pode_gerenciar_usuarios" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "NotificaFacilNotification" (
  "id" TEXT NOT NULL,
  "created_date" TIMESTAMP(3),
  "updated_date" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_by" TEXT,
  "is_sample" BOOLEAN NOT NULL DEFAULT false,
  "empresa" TEXT NOT NULL,
  "tipo_servico" TEXT,
  "numero_protocolo" TEXT,
  "numero_notificacao" TEXT,
  "numero_registro_censo" TEXT,
  "destinatario_nome" TEXT,
  "destinatario_cpf" TEXT,
  "destinatario_endereco" TEXT,
  "valor_cobrado" DOUBLE PRECISION,
  "data_notificacao" TEXT,
  "prazo_resposta" TEXT,
  "data_email_encaminhado" TEXT,
  "qtd_notificacoes_enviadas" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Aguardando assinatura Gestor',
  "is_draft" BOOLEAN NOT NULL DEFAULT false,
  "is_standby" BOOLEAN NOT NULL DEFAULT false,
  "pendencia_tecnica" BOOLEAN NOT NULL DEFAULT false,
  "pt_notificado" BOOLEAN NOT NULL DEFAULT false,
  "pt_data_notificado" TEXT,
  "pdf_url" TEXT,
  "pdf_base64" TEXT,
  "html_content" TEXT,
  "regularizacao_assinada_url" TEXT,
  "notificacao_assinada_anexos" JSONB,
  "anexos_resposta_email" JSONB,
  "observacoes" TEXT,
  "status_envio_notificacao" TEXT,
  "vencimento_contrato" TEXT,
  "ano_vencimento_contrato" TEXT,
  "celebrado_em" TEXT,
  "mostrar_celebrado_em" BOOLEAN NOT NULL DEFAULT true,
  "empresa_endereco" TEXT,
  "empresa_bairro" TEXT,
  "empresa_cidade" TEXT,
  "empresa_estado" TEXT,
  "empresa_incorporada" TEXT,
  "contrato_numero" TEXT,
  "ac" TEXT,
  "numero_nome_empresa" TEXT,
  "numero_parceiro" TEXT,
  "cnpj" TEXT,
  "texto_contrato_7_14" TEXT,
  "texto_ocupacao_revelia" TEXT,
  "texto_23_3" TEXT,
  "texto_24_1" TEXT,
  "texto_24_3" TEXT,
  "valor_atualizado" DOUBLE PRECISION,
  "multa" DOUBLE PRECISION,
  "retroativo" TEXT,
  "enderecos_revelia" JSONB,
  "total_ids_identificados" INTEGER,
  "ordem_venda" TEXT,
  "censo_registro_id" TEXT,
  "censo_draft_id" TEXT,
  "censo_finalizado" BOOLEAN NOT NULL DEFAULT false,
  "numero_poste" TEXT,
  "dados_plaqueta" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "fotos_censo" JSONB,
  "ocr_legendas" JSONB,
  "download_count" INTEGER NOT NULL DEFAULT 0,
  "last_downloaded_at" TIMESTAMP(3),
  "last_downloaded_by" TEXT,
  CONSTRAINT "NotificaFacilNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificaFacilBaseNotificacao" (
  "id" TEXT NOT NULL,
  "created_date" TIMESTAMP(3),
  "updated_date" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_by" TEXT,
  "is_sample" BOOLEAN NOT NULL DEFAULT false,
  "empresa" TEXT NOT NULL,
  "status_envio_notificacao" TEXT,
  "vencimento_contrato" TEXT,
  "ano_vencimento_contrato" TEXT,
  "empresa_endereco" TEXT,
  "empresa_bairro" TEXT,
  "empresa_cidade" TEXT,
  "empresa_estado" TEXT,
  "contrato_numero" TEXT,
  "ac" TEXT,
  "numero_nome_empresa" TEXT,
  "celebrado_em" TEXT,
  "repetido_empresa" TEXT,
  "repetido_endereco" TEXT,
  "repetido_bairro" TEXT,
  "repetido_cidade" TEXT,
  "repetido_estado" TEXT,
  "numero_parceiro" TEXT,
  "cnpj" TEXT,
  "texto_contrato_7_14" TEXT,
  "texto_ocupacao_revelia" TEXT,
  "texto_23_3" TEXT,
  "texto_24_1" TEXT,
  "texto_24_3" TEXT,
  "valor_atualizado" TEXT,
  "multa" TEXT,
  "retroativo" TEXT,
  CONSTRAINT "NotificaFacilBaseNotificacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificaFacilEmpresa" (
  "id" TEXT NOT NULL,
  "created_date" TIMESTAMP(3),
  "updated_date" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_by" TEXT,
  "is_sample" BOOLEAN NOT NULL DEFAULT false,
  "nome" TEXT NOT NULL,
  "cnpj" TEXT,
  "contrato_numero" TEXT,
  "endereco" TEXT,
  "cidade" TEXT,
  "estado" TEXT,
  "celebrado_em" TEXT,
  "tem_clausula_11_6_3" BOOLEAN NOT NULL DEFAULT false,
  "campo_11_6_3" TEXT,
  CONSTRAINT "NotificaFacilEmpresa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificaFacilActivityLog" (
  "id" TEXT NOT NULL,
  "created_date" TIMESTAMP(3),
  "updated_date" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_by" TEXT,
  "is_sample" BOOLEAN NOT NULL DEFAULT false,
  "notification_id" TEXT NOT NULL,
  "notification_number" TEXT,
  "action" TEXT NOT NULL,
  "field_changed" TEXT,
  "old_value" TEXT,
  "new_value" TEXT,
  "user_email" TEXT NOT NULL,
  "user_name" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "details" TEXT,
  CONSTRAINT "NotificaFacilActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificaFacilNotificationCounter" (
  "id" TEXT NOT NULL,
  "created_date" TIMESTAMP(3),
  "updated_date" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_by" TEXT,
  "is_sample" BOOLEAN NOT NULL DEFAULT false,
  "year" TEXT NOT NULL,
  "current" INTEGER NOT NULL,
  CONSTRAINT "NotificaFacilNotificationCounter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificaFacilRelatorioEmpresaClandestina" (
  "id" TEXT NOT NULL,
  "created_date" TIMESTAMP(3),
  "updated_date" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_by" TEXT,
  "is_sample" BOOLEAN NOT NULL DEFAULT false,
  "empresa" TEXT NOT NULL,
  "numero_registro_censo" TEXT,
  "endereco" TEXT,
  "bairro" TEXT,
  "cidade" TEXT,
  "numero_poste" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "fotos_censo" JSONB,
  "motivo" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Pendente',
  "observacoes" TEXT,
  "data_relatorio" TEXT,
  "responsaveis" TEXT,
  "data_envio_email" TEXT,
  "censo_draft_id" TEXT,
  CONSTRAINT "NotificaFacilRelatorioEmpresaClandestina_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NotificaFacilNotification_empresa_idx" ON "NotificaFacilNotification"("empresa");
CREATE INDEX IF NOT EXISTS "NotificaFacilNotification_status_idx" ON "NotificaFacilNotification"("status");
CREATE INDEX IF NOT EXISTS "NotificaFacilNotification_numero_notificacao_idx" ON "NotificaFacilNotification"("numero_notificacao");
CREATE INDEX IF NOT EXISTS "NotificaFacilNotification_numero_registro_censo_idx" ON "NotificaFacilNotification"("numero_registro_censo");
CREATE INDEX IF NOT EXISTS "NotificaFacilNotification_is_draft_idx" ON "NotificaFacilNotification"("is_draft");
CREATE INDEX IF NOT EXISTS "NotificaFacilNotification_is_standby_idx" ON "NotificaFacilNotification"("is_standby");
CREATE INDEX IF NOT EXISTS "NotificaFacilNotification_pendencia_tecnica_idx" ON "NotificaFacilNotification"("pendencia_tecnica");
CREATE INDEX IF NOT EXISTS "NotificaFacilNotification_created_date_idx" ON "NotificaFacilNotification"("created_date");
CREATE INDEX IF NOT EXISTS "NotificaFacilBaseNotificacao_empresa_idx" ON "NotificaFacilBaseNotificacao"("empresa");
CREATE INDEX IF NOT EXISTS "NotificaFacilBaseNotificacao_cnpj_idx" ON "NotificaFacilBaseNotificacao"("cnpj");
CREATE INDEX IF NOT EXISTS "NotificaFacilBaseNotificacao_contrato_numero_idx" ON "NotificaFacilBaseNotificacao"("contrato_numero");
CREATE INDEX IF NOT EXISTS "NotificaFacilBaseNotificacao_empresa_cidade_idx" ON "NotificaFacilBaseNotificacao"("empresa_cidade");
CREATE INDEX IF NOT EXISTS "NotificaFacilEmpresa_nome_idx" ON "NotificaFacilEmpresa"("nome");
CREATE INDEX IF NOT EXISTS "NotificaFacilEmpresa_cnpj_idx" ON "NotificaFacilEmpresa"("cnpj");
CREATE INDEX IF NOT EXISTS "NotificaFacilEmpresa_contrato_numero_idx" ON "NotificaFacilEmpresa"("contrato_numero");
CREATE INDEX IF NOT EXISTS "NotificaFacilActivityLog_notification_id_idx" ON "NotificaFacilActivityLog"("notification_id");
CREATE INDEX IF NOT EXISTS "NotificaFacilActivityLog_action_idx" ON "NotificaFacilActivityLog"("action");
CREATE INDEX IF NOT EXISTS "NotificaFacilActivityLog_timestamp_idx" ON "NotificaFacilActivityLog"("timestamp");
CREATE INDEX IF NOT EXISTS "NotificaFacilActivityLog_user_email_idx" ON "NotificaFacilActivityLog"("user_email");
CREATE UNIQUE INDEX IF NOT EXISTS "NotificaFacilNotificationCounter_year_key" ON "NotificaFacilNotificationCounter"("year");
CREATE INDEX IF NOT EXISTS "NotificaFacilRelatorioEmpresaClandestina_empresa_idx" ON "NotificaFacilRelatorioEmpresaClandestina"("empresa");
CREATE INDEX IF NOT EXISTS "NotificaFacilRelatorioEmpresaClandestina_status_idx" ON "NotificaFacilRelatorioEmpresaClandestina"("status");
CREATE INDEX IF NOT EXISTS "NotificaFacilRelatorioEmpresaClandestina_numero_registro_censo_idx" ON "NotificaFacilRelatorioEmpresaClandestina"("numero_registro_censo");
