const express = require('express');
const cors = require('cors');
const { pool } = require('../config/dbConfig');

const app = express();
const port = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

// Hent alle brukerroller
app.get('/api/users/roles', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM user_roles ORDER BY created_at DESC'
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Feil ved henting av brukerroller:', error);
        res.status(500).json({ error: 'Intern serverfeil' });
    }
});

// Hent brukerrolle for spesifikk bruker
app.get('/api/users/role/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        const result = await pool.query(
            'SELECT role FROM user_roles WHERE email = $1',
            [email]
        );
        
        if (result.rows.length > 0) {
            res.json({ role: result.rows[0].role });
        } else {
            res.json({ role: 'USER' });
        }
    } catch (error) {
        console.error('Feil ved henting av brukerrolle:', error);
        res.status(500).json({ error: 'Intern serverfeil' });
    }
});

// Oppdater brukerrolle
app.put('/api/users/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        const result = await pool.query(
            'UPDATE user_roles SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [role, id]
        );
        
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Bruker ikke funnet' });
        }
    } catch (error) {
        console.error('Feil ved oppdatering av brukerrolle:', error);
        res.status(500).json({ error: 'Intern serverfeil' });
    }
});

// Legg til ny bruker
app.post('/api/users', async (req, res) => {
    try {
        const { email, role } = req.body;
        
        const result = await pool.query(
            'INSERT INTO user_roles (email, role) VALUES ($1, $2) RETURNING *',
            [email, role]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Feil ved opprettelse av bruker:', error);
        res.status(500).json({ error: 'Intern serverfeil' });
    }
});

// Slett bruker
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM user_roles WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length > 0) {
            res.json({ message: 'Bruker slettet' });
        } else {
            res.status(404).json({ error: 'Bruker ikke funnet' });
        }
    } catch (error) {
        console.error('Feil ved sletting av bruker:', error);
        res.status(500).json({ error: 'Intern serverfeil' });
    }
});

app.listen(port, () => {
    console.log(`API-server kjører på port ${port}`);
}); 