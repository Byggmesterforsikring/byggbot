const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    ssl: {
        rejectUnauthorized: false // For development. I produksjon bør dette være true
    }
});

pool.on('error', (err) => {
    console.error('Database-tilkoblingsfeil:', err);
    process.exit(-1);
});

// Test tilkoblingen ved oppstart
pool.query('SELECT NOW()', (err) => {
    if (err) {
        console.error('Kunne ikke koble til databasen:', err);
        process.exit(-1);
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
}; 