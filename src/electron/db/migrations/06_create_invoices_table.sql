-- Oppretter invoices tabell for fakturabehandling
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

-- Lag indekser for raskere søk og filtrering
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_uploaded_at ON invoices(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_invoices_skadenummer ON invoices(skadenummer);
CREATE INDEX IF NOT EXISTS idx_invoices_registreringsnummer ON invoices(registreringsnummer); 