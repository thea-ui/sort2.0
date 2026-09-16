-- Reclassify legacy reports that describe assets but were stored as WASTE.
-- Asset reports are identified by the pillar marker in the description
-- (e.g. "[Pillar: FURNITURE]"). This is idempotent.
UPDATE "reports"
SET "report_type" = 'ASSET'
WHERE "report_type" = 'WASTE'
  AND (
    UPPER("description") LIKE '%[PILLAR: FURNITURE]%'
    OR UPPER("description") LIKE '%[PILLAR: ELECTRONICS]%'
    OR UPPER("description") LIKE '%[PILLAR: FIXTURES]%'
    OR UPPER("description") LIKE '%[PILLAR: EQUIPMENT]%'
    OR UPPER("description") LIKE '%[PILLAR: OTHER]%'
  );
