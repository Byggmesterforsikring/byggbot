const path = require('path');
const { app } = require('electron');
const isDev = process.env.NODE_ENV === 'development';

// In-memory storage for production
const inMemoryUserRoles = new Map();

class UserRoleService {
    constructor() {
        if (isDev) {
            try {
                const dbConfigPath = '../config/dbConfig';
                this.db = require(dbConfigPath);
            } catch (error) {
                console.error('Kunne ikke laste database konfigurasjon:', error);
                this.db = null;
            }
        }
    }

    async getUserRole(email) {
        if (isDev && this.db) {
            try {
                const result = await this.db.query(
                    'SELECT role FROM user_roles WHERE email = $1',
                    [email]
                );
                return result.rows[0]?.role || 'USER';
            } catch (error) {
                console.error('Database-feil ved henting av brukerrolle:', error);
                return 'USER';
            }
        } else {
            return inMemoryUserRoles.get(email) || 'USER';
        }
    }

    async upsertUserRole(email, role) {
        if (isDev && this.db) {
            try {
                const result = await this.db.query(
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
        } else {
            inMemoryUserRoles.set(email, role);
            return { email, role, created_at: new Date(), updated_at: new Date() };
        }
    }

    async getAllUserRoles() {
        if (isDev && this.db) {
            try {
                const result = await this.db.query('SELECT * FROM user_roles ORDER BY created_at DESC');
                return result.rows;
            } catch (error) {
                console.error('Database-feil ved henting av brukerroller:', error);
                return [];
            }
        } else {
            return Array.from(inMemoryUserRoles.entries()).map(([email, role]) => ({
                email,
                role,
                created_at: new Date(),
                updated_at: new Date()
            }));
        }
    }

    async deleteUserRole(email) {
        if (isDev && this.db) {
            try {
                const result = await this.db.query(
                    'DELETE FROM user_roles WHERE email = $1 RETURNING *',
                    [email]
                );
                return result.rows[0];
            } catch (error) {
                console.error('Database-feil ved sletting av brukerrolle:', error);
                return null;
            }
        } else {
            const hadRole = inMemoryUserRoles.has(email);
            inMemoryUserRoles.delete(email);
            return hadRole ? { email, role: null } : null;
        }
    }
}

module.exports = new UserRoleService(); 