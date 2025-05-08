-- Opprett tabell for system prompter (brukes til AI-prompter)
CREATE TABLE IF NOT EXISTS system_prompts (
    id SERIAL PRIMARY KEY,
    prompt_type VARCHAR(50) NOT NULL,  -- f.eks. 'invoice_extraction'
    prompt_text TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indekser for raskere søk
CREATE INDEX IF NOT EXISTS idx_system_prompts_type ON system_prompts(prompt_type);
CREATE INDEX IF NOT EXISTS idx_system_prompts_active ON system_prompts(is_active);

-- Opprett en initial prompt i databasen
-- Erstatt 1 med ID på admin-brukeren
DO $$
DECLARE 
    admin_id INTEGER;
BEGIN
    -- Finn første admin bruker
    SELECT id INTO admin_id FROM users WHERE is_admin = true LIMIT 1;
    
    -- Hvis ingen admin finnes, bruk ID 1
    IF admin_id IS NULL THEN 
        admin_id := 1;
    END IF;
    
    -- Sett inn initial prompt
    INSERT INTO system_prompts (prompt_type, prompt_text, is_active, created_by)
    VALUES (
        'invoice_extraction',
        'Dette er tekst ekstrahert fra en faktura:

{{extracted_text}}

Ekstraher følgende felt og returner dem i JSON-format:
- Skadenummer (Et 5-sifret nummer som starter med tallet 3. Returner null hvis ikke funnet.)
- Registreringsnummer (Bilens registreringsnummer. Kan ha ulike formater som AB12345, DT98765 osv. Returner null hvis ikke funnet.)
- KID (betalingsreferanse)
- Kontonummer (bankkonto/IBAN)
- Beløp (total sum å betale)
- Mottaker navn (navn på leverandør/selskapet som har utstedt fakturaen)

For mottakerens adresse, finn den fullstendige adressen til SELSKAPET SOM HAR UTSTEDT FAKTURAEN (ikke adressen til betaleren).
Del adressen opp slik:
- Mottaker gateadresse (kun gate og husnummer)
- Mottaker postnummer (kun postnummer)
- Mottaker poststed (kun poststed)

Returner data i følgende strenge JSON-format uten kommentarer:
{
  "skadenummer": "value or null",
  "registreringsnummer": "value or null",
  "kid": "value or null",
  "kontonummer": "value or null",
  "beloep": value or null,
  "mottaker_navn": "value or null",
  "mottaker_gateadresse": "value or null",
  "mottaker_postnummer": "value or null",
  "mottaker_poststed": "value or null"
}',
        true,
        admin_id
    );
END $$; 