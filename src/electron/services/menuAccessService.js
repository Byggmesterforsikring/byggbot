const { Pool } = require('pg');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const electronLog = require('electron-log');

electronLog.info('menuAccessService: Starter lasting av konfigurasjon');
electronLog.info('menuAccessService: Miljø er:', isDev ? 'development' : 'production');

// Importer database config
let dbConfig;
try {
    electronLog.info('menuAccessService: Prøver å laste dbConfig');
    dbConfig = require('../config/dbConfig');
    electronLog.info('menuAccessService: dbConfig lastet');
} catch (error) {
    electronLog.error('menuAccessService: Feil ved lasting av dbConfig:', error);
    process.exit(1);
}

electronLog.info('menuAccessService: Initialiserer pool');
const { pool } = dbConfig;

if (!pool) {
    electronLog.error('menuAccessService: Pool er ikke tilgjengelig fra dbConfig');
    process.exit(1);
}

class MenuAccessService {
    async createTableIfNotExists() {
        try {
            electronLog.info('Oppretter menu_access tabell hvis den ikke finnes');
            await pool.query(`
                CREATE TABLE IF NOT EXISTS menu_access (
                    id VARCHAR(50) PRIMARY KEY,
                    required_role VARCHAR(20),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            return true;
        } catch (error) {
            electronLog.error('Feil ved oppretting av menu_access tabell:', error);
            return false;
        }
    }

    async getMenuAccessSettings() {
        try {
            await this.createTableIfNotExists();

            electronLog.info('Henter menytilgangsinnstillinger');
            const result = await pool.query('SELECT id, required_role AS "requiredRole" FROM menu_access');
            electronLog.info(`Hentet ${result.rows.length} menytilgangsinnstillinger`);
            return result.rows;
        } catch (error) {
            electronLog.error('Feil ved henting av menytilgangsinnstillinger:', error);
            return [];
        }
    }

    async saveMenuAccessSettings(items) {
        try {
            await this.createTableIfNotExists();

            electronLog.info(`Lagrer ${items.length} menytilgangsinnstillinger`);

            // Bruk en transaksjon for å sikre at alle oppdateringer utføres eller ingen
            await pool.query('BEGIN');

            for (const item of items) {
                // Nullverdier må håndteres spesielt i SQL
                const role = item.requiredRole === null ? null : item.requiredRole;

                await pool.query(
                    `INSERT INTO menu_access (id, required_role, updated_at)
                     VALUES ($1, $2, CURRENT_TIMESTAMP)
                     ON CONFLICT (id)
                     DO UPDATE SET required_role = $2, updated_at = CURRENT_TIMESTAMP`,
                    [item.id, role]
                );
            }

            await pool.query('COMMIT');
            electronLog.info('Menytilgangsinnstillinger lagret');
            return true;
        } catch (error) {
            await pool.query('ROLLBACK');
            electronLog.error('Feil ved lagring av menytilgangsinnstillinger:', error);
            return false;
        }
    }

    async resetMenuAccessSettings() {
        try {
            await this.createTableIfNotExists();

            electronLog.info('Tilbakestiller alle menytilgangsinnstillinger');
            await pool.query('DELETE FROM menu_access');
            electronLog.info('Menytilgangsinnstillinger tilbakestilt');
            return true;
        } catch (error) {
            electronLog.error('Feil ved tilbakestilling av menytilgangsinnstillinger:', error);
            return false;
        }
    }
}

module.exports = new MenuAccessService(); 