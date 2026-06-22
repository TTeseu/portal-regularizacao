ALTER TABLE "Notificacao" ALTER COLUMN "status" SET DEFAULT 'Notificado';

UPDATE "Notificacao"
SET "status" = 'Notificado'
WHERE "status" IN ('Pendente', 'Em Análise', 'Em Analise');
