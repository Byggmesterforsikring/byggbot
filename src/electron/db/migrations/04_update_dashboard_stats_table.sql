-- Dropp eksisterende indekser for å gjøre endringer
DROP INDEX IF EXISTS idx_dashboard_stats_date;

-- Legg til timestamp kolonne for mer granulert tidssporing
ALTER TABLE IF EXISTS dashboard_stats 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Oppdater eksisterende rader til å ha et tidspunkt (hvis nødvendig)
UPDATE dashboard_stats SET timestamp = created_at WHERE timestamp IS NULL;

-- Fjern unique constraint på date kolonnen ved å opprette ny indeks uten unique
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_date_timestamp ON dashboard_stats(date, timestamp);

-- Legg til ny indeksbegrensning for å enkelt finne siste datainnsamling per dag
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_date_latest ON dashboard_stats(date, timestamp DESC);