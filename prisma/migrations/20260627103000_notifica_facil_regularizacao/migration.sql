ALTER TABLE "NotificaFacilNotification"
  ADD COLUMN IF NOT EXISTS "regularizacao" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "regularizacao_notificada" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "regularizacao_data_notificada" TEXT;

CREATE INDEX IF NOT EXISTS "NotificaFacilNotification_regularizacao_idx" ON "NotificaFacilNotification"("regularizacao");
