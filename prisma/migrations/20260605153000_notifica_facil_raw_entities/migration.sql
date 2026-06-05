CREATE TABLE IF NOT EXISTS "NotificaFacilRawEntity" (
  "id" TEXT NOT NULL,
  "entity_name" TEXT NOT NULL,
  "base44_id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "created_date" TIMESTAMP(3),
  "updated_date" TIMESTAMP(3),
  "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificaFacilRawEntity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificaFacilRawEntity_entity_name_base44_id_key"
  ON "NotificaFacilRawEntity"("entity_name", "base44_id");

CREATE INDEX IF NOT EXISTS "NotificaFacilRawEntity_entity_name_idx"
  ON "NotificaFacilRawEntity"("entity_name");

CREATE INDEX IF NOT EXISTS "NotificaFacilRawEntity_base44_id_idx"
  ON "NotificaFacilRawEntity"("base44_id");
