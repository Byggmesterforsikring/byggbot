const { pool } = require('../src/config/dbConfig');

async function testConnection() {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('Database tilkobling vellykket!', result.rows[0]);
        await pool.end();
    } catch (err) {
        console.error('Feil ved tilkobling til database:', err);
        process.exit(1);
    }
}

testConnection(); 