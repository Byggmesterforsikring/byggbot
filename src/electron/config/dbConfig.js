const { Pool } = require('pg');
const isDev = process.env.NODE_ENV === 'development';
const electronLog = require('electron-log');

electronLog.info('dbConfig: Starter initialisering');
electronLog.info('dbConfig: Miljø er:', isDev ? 'development' : 'production');

let config;
if (isDev) {
    electronLog.info('dbConfig: Laster development konfigurasjon');
    require('dotenv').config();
    config = {
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        ssl: {
            rejectUnauthorized: false
        }
    };
    electronLog.info('dbConfig: Development konfigurasjon lastet');
} else {
    electronLog.info('dbConfig: Laster produksjonskonfigurasjon');
    try {
        const prodConfig = require('../config');
        electronLog.info('dbConfig: Produksjonskonfigurasjon lastet');
        config = {
            host: prodConfig.POSTGRES_HOST,
            port: prodConfig.POSTGRES_PORT,
            database: prodConfig.POSTGRES_DB,
            user: prodConfig.POSTGRES_USER,
            password: prodConfig.POSTGRES_PASSWORD,
            ssl: prodConfig.POSTGRES_SSL
        };
    } catch (error) {
        electronLog.error('dbConfig: Feil ved lasting av produksjonskonfigurasjon:', error);
        process.exit(1);
    }
}

electronLog.info('dbConfig: Oppretter database pool');
const pool = new Pool(config);

pool.on('error', (err) => {
    electronLog.error('dbConfig: Database-tilkoblingsfeil:', err);
    process.exit(-1);
});

// Funksjon for å sikre databaseskjema
const ensureSchema = async () => {
    let client;
    try {
        client = await pool.connect();
        electronLog.info('dbConfig: Sikrer at registreringsnummer-kolonnen finnes i invoices-tabellen...');
        await client.query(`
            ALTER TABLE invoices
            ADD COLUMN IF NOT EXISTS registreringsnummer VARCHAR(100);
        `);
        electronLog.info('dbConfig: Kolonnen registreringsnummer er sikret.');

        // Kan legge til flere ALTER TABLE her for fremtidige endringer

    } catch (err) {
        electronLog.error('dbConfig: Feil ved sikring av databaseskjema:', err);
        // Vurder om appen skal krasje her eller fortsette med potensielt feil skjema
        // process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
    }
};

// Test tilkoblingen ved oppstart og sikre skjema
pool.query('SELECT NOW()', async (err) => {
    if (err) {
        electronLog.error('dbConfig: Kunne ikke koble til databasen:', err);
        process.exit(-1);
    }
    electronLog.info('dbConfig: Database-tilkobling testet og OK');
    // Kjør skjemasikring etter at tilkoblingen er bekreftet
    await ensureSchema();
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
}; 