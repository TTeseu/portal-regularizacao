-- Reconciles the Base44 raw export with the normalized Notifica Facil table.
-- The first importer treated string values such as "Sim" / "true" too narrowly,
-- so technical pending records could remain unflagged in the application.

UPDATE "NotificaFacilNotification" AS n
SET
  "pendencia_tecnica" = TRUE,
  "pt_notificado" = CASE
    WHEN lower(coalesce(raw.payload ->> 'pt_notificado', '')) IN ('true', 'sim', 'yes', '1', 'x')
      THEN TRUE
    ELSE n."pt_notificado"
  END,
  "pt_data_notificado" = coalesce(nullif(raw.payload ->> 'pt_data_notificado', ''), n."pt_data_notificado"),
  "updated_date" = now()
FROM "NotificaFacilRawEntity" AS raw
WHERE raw."base44_id" = n."id"
  AND raw."entity_name" IN ('Notification', 'Notificacao')
  AND (
    lower(coalesce(raw.payload ->> 'pendencia_tecnica', '')) IN ('true', 'sim', 'yes', '1', 'x')
    OR lower(coalesce(raw.payload ->> 'pt_notificado', '')) IN ('true', 'sim', 'yes', '1', 'x')
    OR nullif(raw.payload ->> 'pt_data_notificado', '') IS NOT NULL
    OR (
      lower(coalesce(raw.payload ->> 'status', '')) LIKE '%pend%'
      AND (
        lower(coalesce(raw.payload ->> 'status', '')) LIKE '%tecn%'
        OR lower(coalesce(raw.payload ->> 'status', '')) LIKE '%técn%'
      )
    )
    OR (
      lower(coalesce(raw.payload ->> 'tipo_servico', '')) LIKE '%pend%'
      AND (
        lower(coalesce(raw.payload ->> 'tipo_servico', '')) LIKE '%tecn%'
        OR lower(coalesce(raw.payload ->> 'tipo_servico', '')) LIKE '%técn%'
      )
    )
  );
