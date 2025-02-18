const { Pool } = require('pg');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let config;
if (isDev) {
    require('dotenv').config();
    config = {
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        ssl: {
            rejectUnauthorized: false // For development. I produksjon bør dette være true
        }
    };
} else {
    const prodConfig = require(path.join(process.resourcesPath, 'app.asar/src/electron/config'));
    config = {
        host: prodConfig.POSTGRES_HOST,
        port: prodConfig.POSTGRES_PORT,
        database: prodConfig.POSTGRES_DB,
        user: prodConfig.POSTGRES_USER,
        password: prodConfig.POSTGRES_PASSWORD,
        ssl: prodConfig.POSTGRES_SSL
    };
}

const pool = new Pool(config);

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