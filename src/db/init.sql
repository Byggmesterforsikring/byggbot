-- Sjekk om tabellen eksisterer før opprettelse
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'EDITOR', 'USER');
    END IF;
END $$;

-- Opprett brukerroller-tabell hvis den ikke eksisterer
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Opprett en funksjon for å oppdatere updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Opprett en trigger for å automatisk oppdatere updated_at
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Legg til en standard admin-bruker (du kan endre dette senere)
INSERT INTO user_roles (email, role)
VALUES ('oyvind@bmf.no', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- Legg til i src/db/init.sql
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'uploaded', -- e.g., uploaded, processing, processed, error
    mistral_request_id VARCHAR(255), -- Hvis Mistral returnerer en ID
    extracted_data JSONB, -- Lagrer JSON-responsen fra Mistral
    -- Felter ekstrahert fra JSON for enkelhets skyld (kan være NULL hvis ikke funnet)
    skadenummer VARCHAR(100),
    registreringsnummer VARCHAR(100),
    kid VARCHAR(100),
    kontonummer VARCHAR(100),
    beloep DECIMAL(10, 2),
    mottaker_navn VARCHAR(255),
    mottaker_adresse TEXT,
    -- Tilbakemelding fra bruker
    feedback_status VARCHAR(50), -- e.g., correct, incorrect
    feedback_details TEXT,
    feedback_at TIMESTAMP WITH TIME ZONE,
    -- Link til bruker hvis relevant (kan legges til senere)
    -- uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    -- Link til eventuell lagret PDF i arkiv (legges til senere)
    -- archive_document_id VARCHAR(255)
    error_message TEXT -- For å lagre feilmeldinger under prosessering
);

-- Sikre at kolonnen finnes selv om tabellen allerede eksisterte
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' -- Eller ditt skjema hvis det er annerledes
        AND table_name = 'invoices' 
        AND column_name = 'registreringsnummer'
    ) THEN
        ALTER TABLE invoices ADD COLUMN registreringsnummer VARCHAR(100);
    END IF;
END $$;

-- Indekser
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_uploaded_at ON invoices(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_invoices_skadenummer ON invoices(skadenummer);
CREATE INDEX IF NOT EXISTS idx_invoices_registreringsnummer ON invoices(registreringsnummer); 