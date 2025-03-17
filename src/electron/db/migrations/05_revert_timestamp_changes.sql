-- Dropp eventuelle indekser som ble opprettet i forrige migrasjon
DROP INDEX IF EXISTS idx_dashboard_stats_date_timestamp;
DROP INDEX IF EXISTS idx_dashboard_stats_date_latest;

-- Fjern timestamp-kolonnen da den ikke behøves
ALTER TABLE IF EXISTS dashboard_stats 
DROP COLUMN IF EXISTS timestamp;

-- Gjenopprett unique constraint på date-kolonnen for å sikre at vi bare har én rad per dato
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_date ON dashboard_stats(date);