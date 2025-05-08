-- Opprett tabell for system prompter (brukes til AI-prompter)
CREATE TABLE IF NOT EXISTS system_prompts (
    id SERIAL PRIMARY KEY,
    prompt_type VARCHAR(50) NOT NULL,
    prompt_text TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER NOT NULL REFERENCES user_roles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indekser for raskere søk
CREATE INDEX IF NOT EXISTS idx_system_prompts_type ON system_prompts(prompt_type);
CREATE INDEX IF NOT EXISTS idx_system_prompts_active ON system_prompts(is_active); 