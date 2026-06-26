ALTER TABLE "NotificaFacilNotification"
ADD COLUMN IF NOT EXISTS "lote_nome" TEXT,
ADD COLUMN IF NOT EXISTS "lote_id" TEXT;

UPDATE "NotificaFacilNotification"
SET
  "lote_nome" = COALESCE("lote_nome", "observacoes"),
  "lote_id" = COALESCE("lote_id", NULLIF("numero_notificacao", ''), "observacoes")
WHERE
  "pendencia_tecnica" = true
  AND "numero_notificacao" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "NotificaFacilNotification_lote_id_idx"
ON "NotificaFacilNotification"("lote_id");

CREATE INDEX IF NOT EXISTS "NotificaFacilNotification_lote_nome_idx"
ON "NotificaFacilNotification"("lote_nome");
