-- Tabell for brukere
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Indeks for raskere oppslag på e-post
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Legg til constraint for gyldige roller
ALTER TABLE users 
ADD CONSTRAINT check_valid_role 
CHECK (role IN ('ADMIN', 'EDITOR', 'USER')); 