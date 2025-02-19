-- Tabell for tegningsregler
CREATE TABLE IF NOT EXISTS drawing_rules (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) REFERENCES user_roles(email),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255) REFERENCES user_roles(email)
);

-- Tabell for versjoner av tegningsregler
CREATE TABLE IF NOT EXISTS drawing_rule_versions (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES drawing_rules(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) REFERENCES user_roles(email),
    is_current BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(rule_id, version_number)
);

-- Tabell for bilder tilknyttet tegningsregler
CREATE TABLE IF NOT EXISTS drawing_rule_images (
    id SERIAL PRIMARY KEY,
    rule_version_id INTEGER REFERENCES drawing_rule_versions(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_data BYTEA NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) REFERENCES user_roles(email)
);

-- Indekser for bedre ytelse
CREATE INDEX IF NOT EXISTS idx_drawing_rules_slug ON drawing_rules(slug);
CREATE INDEX IF NOT EXISTS idx_drawing_rule_versions_rule_id ON drawing_rule_versions(rule_id);
CREATE INDEX IF NOT EXISTS idx_drawing_rule_versions_current ON drawing_rule_versions(rule_id) WHERE is_current = true; 