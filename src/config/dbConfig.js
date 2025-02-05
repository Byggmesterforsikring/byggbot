const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    // Fjerner SSL siden vi kjører lokalt
    ssl: false
});

// Test database-tilkoblingen
pool.on('connect', () => {
    console.log('Koblet til lokal PostgreSQL database');
    console.log(`Database: ${process.env.POSTGRES_DB}`);
    console.log(`Bruker: ${process.env.POSTGRES_USER}`);
    console.log(`Host: ${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}`);
});

pool.on('error', (err) => {
    console.error('Uventet feil på database-tilkobling:', err);
    console.error('Sjekk at PostgreSQL kjører lokalt og at innstillingene i .env er korrekte');
    process.exit(-1);
});

// Test tilkoblingen ved oppstart
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Kunne ikke koble til databasen:', err);
        console.error('Sjekk at PostgreSQL kjører og at innstillingene er korrekte');
        process.exit(-1);
    } else {
        console.log('Database-tilkobling bekreftet:', res.rows[0].now);
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
}; 