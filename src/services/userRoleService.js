const path = require('path');
const { app } = require('electron');
const isDev = process.env.NODE_ENV === 'development';

// Importer database config
const dbConfig = require('../config/dbConfig');
const { pool } = dbConfig;

class UserRoleService {
    async getUserRole(email) {
        try {
            const result = await pool.query(
                'SELECT role FROM user_roles WHERE email = $1',
                [email]
            );
            return result.rows[0]?.role || 'USER';
        } catch (error) {
            console.error('Database-feil ved henting av brukerrolle:', error);
            return 'USER';
        }
    }

    async upsertUserRole(email, role) {
        try {
            const result = await pool.query(
                `INSERT INTO user_roles (email, role)
                 VALUES ($1, $2)
                 ON CONFLICT (email)
                 DO UPDATE SET role = $2, updated_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [email, role]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Database-feil ved oppdatering av brukerrolle:', error);
            return null;
        }
    }

    async getAllUserRoles() {
        try {
            const result = await pool.query('SELECT * FROM user_roles ORDER BY created_at DESC');
            return result.rows;
        } catch (error) {
            console.error('Database-feil ved henting av brukerroller:', error);
            return [];
        }
    }

    async deleteUserRole(email) {
        try {
            const result = await pool.query(
                'DELETE FROM user_roles WHERE email = $1 RETURNING *',
                [email]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Database-feil ved sletting av brukerrolle:', error);
            return null;
        }
    }
}

module.exports = new UserRoleService(); 