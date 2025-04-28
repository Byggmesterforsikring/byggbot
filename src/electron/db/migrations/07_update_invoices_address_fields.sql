-- Oppdaterer invoices tabell med mer detaljerte adressefelt
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS mottaker_gateadresse VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mottaker_postnummer VARCHAR(10),
  ADD COLUMN IF NOT EXISTS mottaker_poststed VARCHAR(100);

-- Merk: beholder mottaker_adresse kolonne for bakoverkompatibilitet
-- Den originale adressekolonnen vil fremdeles lagre den fullstendige adressen 