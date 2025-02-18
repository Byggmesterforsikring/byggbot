const { Pool } = require('pg');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const electronLog = require('electron-log');

electronLog.info('userRoleService: Starter lasting av konfigurasjon');
electronLog.info('userRoleService: Miljø er:', isDev ? 'development' : 'production');

// Importer database config
let dbConfig;
try {
    electronLog.info('userRoleService: Prøver å laste dbConfig');
    dbConfig = require('../config/dbConfig');
    electronLog.info('userRoleService: dbConfig lastet');
} catch (error) {
    electronLog.error('userRoleService: Feil ved lasting av dbConfig:', error);
    process.exit(1);
}

electronLog.info('userRoleService: Initialiserer pool');
const { pool } = dbConfig;

if (!pool) {
    electronLog.error('userRoleService: Pool er ikke tilgjengelig fra dbConfig');
    process.exit(1);
}

class UserRoleService {
    async getUserRole(email) {
        try {
            electronLog.info('Henter brukerrolle for:', email);
            const result = await pool.query(
                'SELECT role FROM user_roles WHERE email = $1',
                [email]
            );
            electronLog.info('Database resultat:', result.rows);
            return result.rows[0]?.role || 'USER';
        } catch (error) {
            electronLog.error('Database-feil ved henting av brukerrolle:', error);
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
            electronLog.error('Database-feil ved oppdatering av brukerrolle:', error);
            return null;
        }
    }

    async getAllUserRoles() {
        try {
            const result = await pool.query('SELECT * FROM user_roles ORDER BY created_at DESC');
            return result.rows;
        } catch (error) {
            electronLog.error('Database-feil ved henting av brukerroller:', error);
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
            electronLog.error('Database-feil ved sletting av brukerrolle:', error);
            return null;
        }
    }
}

module.exports = new UserRoleService(); 