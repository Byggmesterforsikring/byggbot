const db = require('../config/dbConfig');

class UserRoleService {
    // Hent brukerrolle basert på Entra ID
    async getUserRole(entraId) {
        try {
            const result = await db.query(
                'SELECT role FROM user_roles WHERE entra_id = $1',
                [entraId]
            );
            return result.rows[0]?.role || 'USER'; // Standard rolle hvis ingen er satt
        } catch (error) {
            console.error('Feil ved henting av brukerrolle:', error);
            throw error;
        }
    }

    // Opprett eller oppdater brukerrolle
    async upsertUserRole(entraId, email, role) {
        try {
            const result = await db.query(
                `INSERT INTO user_roles (entra_id, email, role)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (entra_id)
                 DO UPDATE SET email = $2, role = $3, updated_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [entraId, email, role]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Feil ved oppdatering av brukerrolle:', error);
            throw error;
        }
    }

    // Hent alle brukere med deres roller
    async getAllUserRoles() {
        try {
            const result = await db.query('SELECT * FROM user_roles ORDER BY created_at DESC');
            return result.rows;
        } catch (error) {
            console.error('Feil ved henting av alle brukerroller:', error);
            throw error;
        }
    }

    // Slett en brukerrolle
    async deleteUserRole(entraId) {
        try {
            const result = await db.query(
                'DELETE FROM user_roles WHERE entra_id = $1 RETURNING *',
                [entraId]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Feil ved sletting av brukerrolle:', error);
            throw error;
        }
    }
}

module.exports = new UserRoleService(); 