ALTER TABLE "Empresa"
  ADD COLUMN IF NOT EXISTS "bairro" TEXT,
  ADD COLUMN IF NOT EXISTS "numero_parceiro" TEXT,
  ADD COLUMN IF NOT EXISTS "status_envio_notificacao" TEXT,
  ADD COLUMN IF NOT EXISTS "vencimento_contrato" TEXT,
  ADD COLUMN IF NOT EXISTS "ano_vencimento_contrato" TEXT,
  ADD COLUMN IF NOT EXISTS "ac" TEXT,
  ADD COLUMN IF NOT EXISTS "numero_nome_empresa" TEXT,
  ADD COLUMN IF NOT EXISTS "empresa_incorporada" TEXT,
  ADD COLUMN IF NOT EXISTS "texto_contrato_7_14" TEXT,
  ADD COLUMN IF NOT EXISTS "texto_ocupacao_revelia" TEXT,
  ADD COLUMN IF NOT EXISTS "texto_23_3" TEXT,
  ADD COLUMN IF NOT EXISTS "texto_24_1" TEXT,
  ADD COLUMN IF NOT EXISTS "texto_24_3" TEXT,
  ADD COLUMN IF NOT EXISTS "valor_atualizado" TEXT,
  ADD COLUMN IF NOT EXISTS "multa" TEXT,
  ADD COLUMN IF NOT EXISTS "retroativo" TEXT;

ALTER TABLE "NotificaFacilNotification"
  ADD COLUMN IF NOT EXISTS "quantidade_postes" INTEGER,
  ADD COLUMN IF NOT EXISTS "quantidade_postes_regularizados" INTEGER;

CREATE INDEX IF NOT EXISTS "Empresa_numero_parceiro_idx" ON "Empresa"("numero_parceiro");
