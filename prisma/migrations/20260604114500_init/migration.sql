CREATE TABLE "Notificacao" (
  "id" TEXT NOT NULL,
  "created_date" TIMESTAMP(3),
  "updated_date" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_by" TEXT,
  "is_sample" BOOLEAN NOT NULL DEFAULT false,
  "tipo_notificacao" TEXT,
  "numero_oficio" TEXT,
  "data_notificacao" TEXT,
  "nota_atendimento" TEXT,
  "empresa" TEXT,
  "status_envio" TEXT,
  "vencimento" TEXT,
  "ano_vencimento" TEXT,
  "endereco" TEXT,
  "bairro" TEXT,
  "cidade" TEXT,
  "estado" TEXT,
  "contrato_numero" TEXT,
  "ac" TEXT,
  "numero_nome" TEXT,
  "celebrado_em" TEXT,
  "numero_parceiro" TEXT,
  "cnpj" TEXT,
  "empresa_rep" TEXT,
  "endereco_rep" TEXT,
  "bairro_rep" TEXT,
  "cidade_rep" TEXT,
  "estado_rep" TEXT,
  "campo_11_6_3" TEXT,
  "empresa_1" TEXT,
  "rua_empresa_1" TEXT,
  "cidade_empresa_1" TEXT,
  "estado_empresa_1" TEXT,
  "cnpj_empresa_1" TEXT,
  "numero_contrato_1" TEXT,
  "empresa_2" TEXT,
  "endereco_empresa_2" TEXT,
  "cnpj_empresa_2" TEXT,
  "numero_contrato_2" TEXT,
  "endereco_notificacao" TEXT,
  "razao_social_condominio" TEXT,
  "endereco_condominio" TEXT,
  "cidade_condominio" TEXT,
  "estado_condominio" TEXT,
  "cnpj_condominio" TEXT,
  "condominio_identificado" TEXT,
  "data_reuniao" TEXT,
  "prazo_dias" TEXT,
  "prazo_resposta" TEXT,
  "lote_nome" TEXT,
  "lote_id" TEXT,
  "pdf_base64" TEXT,
  "pdfUrl" TEXT,
  "html_content" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Pendente',
  "observacoes" TEXT,
  "retorno_cliente" TEXT,
  "anexo_url" TEXT,
  "anexo_nome" TEXT,
  "anexos" JSONB,
  "origem" TEXT NOT NULL DEFAULT 'manual',
  "visualizada" BOOLEAN NOT NULL DEFAULT false,
  "arquivada" BOOLEAN NOT NULL DEFAULT false,
  "sem_projeto" BOOLEAN NOT NULL DEFAULT false,
  "encaminhado_prefeitura" BOOLEAN NOT NULL DEFAULT false,
  "download_count" INTEGER NOT NULL DEFAULT 0,
  "last_downloaded_at" TIMESTAMP(3),
  "last_downloaded_by" TEXT,
  CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Empresa" (
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
  CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HistoricoDownload" (
  "id" TEXT NOT NULL,
  "created_date" TIMESTAMP(3),
  "updated_date" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_by" TEXT,
  "is_sample" BOOLEAN NOT NULL DEFAULT false,
  "tipo" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "quantidade_arquivos" INTEGER NOT NULL DEFAULT 0,
  "ids_baixados" TEXT[],
  "usuario_nome" TEXT,
  CONSTRAINT "HistoricoDownload_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "created_date" TIMESTAMP(3),
  "updated_date" TIMESTAMP(3),
  "full_name" TEXT,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'user',
  "pode_editar_importar" BOOLEAN NOT NULL DEFAULT false,
  "password_hash" TEXT,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Notificacao_status_idx" ON "Notificacao"("status");
CREATE INDEX "Notificacao_origem_idx" ON "Notificacao"("origem");
CREATE INDEX "Notificacao_empresa_idx" ON "Notificacao"("empresa");
CREATE INDEX "Notificacao_cidade_idx" ON "Notificacao"("cidade");
CREATE INDEX "Notificacao_lote_id_idx" ON "Notificacao"("lote_id");
CREATE INDEX "Notificacao_lote_nome_idx" ON "Notificacao"("lote_nome");
CREATE INDEX "Notificacao_vencimento_idx" ON "Notificacao"("vencimento");
CREATE INDEX "Notificacao_arquivada_idx" ON "Notificacao"("arquivada");
CREATE INDEX "Notificacao_visualizada_idx" ON "Notificacao"("visualizada");
CREATE INDEX "Notificacao_created_date_idx" ON "Notificacao"("created_date");
CREATE INDEX "Empresa_nome_idx" ON "Empresa"("nome");
CREATE INDEX "Empresa_cnpj_idx" ON "Empresa"("cnpj");
CREATE INDEX "Empresa_contrato_numero_idx" ON "Empresa"("contrato_numero");
CREATE INDEX "Empresa_cidade_idx" ON "Empresa"("cidade");
CREATE INDEX "HistoricoDownload_tipo_idx" ON "HistoricoDownload"("tipo");
CREATE INDEX "HistoricoDownload_created_date_idx" ON "HistoricoDownload"("created_date");
CREATE INDEX "User_role_idx" ON "User"("role");
