-- Opprett brukerroller-tabell
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    entra_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'EDITOR', 'USER')),
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
INSERT INTO user_roles (entra_id, email, role)
VALUES ('default_admin_id', 'oyvind@bmf.no', 'ADMIN')
ON CONFLICT (entra_id) DO NOTHING; 