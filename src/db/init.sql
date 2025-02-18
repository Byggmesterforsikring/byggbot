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