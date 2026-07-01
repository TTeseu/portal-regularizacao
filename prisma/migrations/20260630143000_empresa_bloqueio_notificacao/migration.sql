ALTER TABLE "Empresa" ADD COLUMN "bloqueio_notificacao" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Empresa_bloqueio_notificacao_idx" ON "Empresa"("bloqueio_notificacao");
