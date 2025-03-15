-- Create table for storing daily dashboard statistics
CREATE TABLE IF NOT EXISTS dashboard_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_customers INTEGER NOT NULL,
    private_customers INTEGER NOT NULL,
    business_customers INTEGER NOT NULL,
    total_premium DECIMAL(14, 4) NOT NULL,
    private_premium DECIMAL(14, 4) NOT NULL,
    business_premium DECIMAL(14, 4) NOT NULL,
    claims_reported_ytd INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index to prevent duplicate entries for the same date
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_date ON dashboard_stats(date);

-- Create table for storing claim category statistics
CREATE TABLE IF NOT EXISTS claim_categories (
    id SERIAL PRIMARY KEY,
    dashboard_stats_id INTEGER NOT NULL REFERENCES dashboard_stats(id) ON DELETE CASCADE,
    claim_category VARCHAR(100) NOT NULL,
    claim_count INTEGER NOT NULL,
    total_amount DECIMAL(14, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups by dashboard_stats_id
CREATE INDEX IF NOT EXISTS idx_claim_categories_dashboard_stats_id ON claim_categories(dashboard_stats_id);

-- Create index for faster lookups by category
CREATE INDEX IF NOT EXISTS idx_claim_categories_category ON claim_categories(claim_category);