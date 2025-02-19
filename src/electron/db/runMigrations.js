const fs = require('fs');
const path = require('path');
const { pool } = require('../config/dbConfig');
const electronLog = require('electron-log');

async function runMigrations() {
    const client = await pool.connect();
    try {
        // Opprett migrations-tabell hvis den ikke eksisterer
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Les alle migrasjonsfiler
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        // Hent allerede kjørte migrasjoner
        const { rows: executedMigrations } = await client.query(
            'SELECT name FROM migrations'
        );
        const executedMigrationNames = new Set(executedMigrations.map(m => m.name));

        // Kjør nye migrasjoner
        for (const file of files) {
            if (!executedMigrationNames.has(file)) {
                electronLog.info(`Kjører migrasjon: ${file}`);
                const migrationPath = path.join(migrationsDir, file);
                const migrationSql = fs.readFileSync(migrationPath, 'utf8');

                await client.query('BEGIN');
                try {
                    await client.query(migrationSql);
                    await client.query(
                        'INSERT INTO migrations (name) VALUES ($1)',
                        [file]
                    );
                    await client.query('COMMIT');
                    electronLog.info(`Migrasjon fullført: ${file}`);
                } catch (error) {
                    await client.query('ROLLBACK');
                    electronLog.error(`Feil ved kjøring av migrasjon ${file}:`, error);
                    throw error;
                }
            }
        }
    } catch (error) {
        electronLog.error('Feil ved kjøring av migrasjoner:', error);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = runMigrations; 