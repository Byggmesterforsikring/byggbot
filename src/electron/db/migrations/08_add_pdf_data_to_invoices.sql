-- Oppdaterer invoices tabell med kolonne for lagring av PDF-data
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS pdf_data TEXT; -- Lagrer PDF-innhold som base64-kodet streng

-- Legg til indeks for å optimalisere spørringer som henter fakturaer uten PDF-data
CREATE INDEX IF NOT EXISTS idx_invoices_has_pdf ON invoices((pdf_data IS NOT NULL));

COMMENT ON COLUMN invoices.pdf_data IS 'PDF-data lagret som base64-kodet streng for visning i admin-grensesnittet'; 