const db = require('../config/dbConfig');
const electronLog = require('electron-log');

class DrawingRulesService {
    // Hent alle tegningsregler
    async getAllRules() {
        try {
            const query = `
                SELECT r.*, 
                       v.content, 
                       v.version_number,
                       v.created_at as version_created_at,
                       r.created_by,
                       r.last_updated_by,
                       cr.email as created_by_email,
                       ur.email as last_updated_by_email
                FROM drawing_rules r
                LEFT JOIN drawing_rule_versions v ON r.id = v.rule_id AND v.is_current = true
                LEFT JOIN user_roles cr ON r.created_by = cr.email
                LEFT JOIN user_roles ur ON r.last_updated_by = ur.email
                ORDER BY r.title ASC
            `;
            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            electronLog.error('Feil ved henting av tegningsregler:', error);
            throw error;
        }
    }

    // Hent en spesifikk tegningsregel med versjon
    async getRuleBySlug(slug, versionNumber = null) {
        try {
            let query;
            let params;

            if (versionNumber) {
                query = `
                    SELECT r.*, 
                           v.content, 
                           v.version_number,
                           v.created_at as version_created_at,
                           r.created_by,
                           r.last_updated_by,
                           cr.email as created_by_email,
                           ur.email as last_updated_by_email
                    FROM drawing_rules r
                    LEFT JOIN drawing_rule_versions v ON r.id = v.rule_id AND v.version_number = $2
                    LEFT JOIN user_roles cr ON r.created_by = cr.email
                    LEFT JOIN user_roles ur ON r.last_updated_by = ur.email
                    WHERE r.slug = $1
                `;
                params = [slug, versionNumber];
            } else {
                query = `
                    SELECT r.*, 
                           v.content, 
                           v.version_number,
                           v.created_at as version_created_at,
                           r.created_by,
                           r.last_updated_by,
                           cr.email as created_by_email,
                           ur.email as last_updated_by_email
                    FROM drawing_rules r
                    LEFT JOIN drawing_rule_versions v ON r.id = v.rule_id 
                    LEFT JOIN user_roles cr ON r.created_by = cr.email
                    LEFT JOIN user_roles ur ON r.last_updated_by = ur.email
                    WHERE r.slug = $1 AND v.is_current = true
                `;
                params = [slug];
            }

            const result = await db.query(query, params);
            return result.rows[0];
        } catch (error) {
            electronLog.error('Feil ved henting av tegningsregel:', error);
            throw error;
        }
    }

    // Opprett ny tegningsregel
    async createRule(title, content, userEmail) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Generer slug fra tittel
            let baseSlug = title.toLowerCase()
                .replace(/[æå]/g, 'a')
                .replace(/[ø]/g, 'o')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            // Sjekk om slug allerede eksisterer og legg til et tall hvis nødvendig
            let slug = baseSlug;
            let counter = 1;
            while (true) {
                const existingRule = await client.query(
                    'SELECT id FROM drawing_rules WHERE slug = $1',
                    [slug]
                );
                if (existingRule.rows.length === 0) break;
                slug = `${baseSlug}-${counter}`;
                counter++;
            }

            // Opprett tegningsregel
            const ruleQuery = `
                INSERT INTO drawing_rules (title, slug, created_by, last_updated_by)
                VALUES ($1, $2, $3, $3)
                RETURNING id
            `;
            const ruleResult = await client.query(ruleQuery, [title, slug, userEmail]);
            const ruleId = ruleResult.rows[0].id;

            // Opprett første versjon
            const versionQuery = `
                INSERT INTO drawing_rule_versions (rule_id, version_number, content, created_by, is_current)
                VALUES ($1, 1, $2, $3, true)
            `;
            await client.query(versionQuery, [ruleId, content, userEmail]);

            await client.query('COMMIT');

            // Hent den nyopprettede regelen
            const newRule = await this.getRuleBySlug(slug);
            console.log('Opprettet ny regel:', {
                id: newRule.id,
                title: newRule.title,
                slug: newRule.slug
            });
            return newRule;
        } catch (error) {
            await client.query('ROLLBACK');
            electronLog.error('Feil ved opprettelse av tegningsregel:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Slett tegningsregel
    async deleteRule(slug) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Slett regelen (dette vil kaskadere til versjoner og bilder pga. ON DELETE CASCADE)
            const deleteQuery = `
                DELETE FROM drawing_rules
                WHERE slug = $1
                RETURNING id
            `;
            const result = await client.query(deleteQuery, [slug]);

            await client.query('COMMIT');
            return result.rowCount > 0;
        } catch (error) {
            await client.query('ROLLBACK');
            electronLog.error('Feil ved sletting av tegningsregel:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Oppdater tegningsregel
    async updateRule(slug, title, content, userEmail) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Hent eksisterende regel
            const existingRule = await this.getRuleBySlug(slug);
            if (!existingRule) {
                throw new Error('Tegningsregel ikke funnet');
            }

            // Oppdater hovedinformasjon
            const updateRuleQuery = `
                UPDATE drawing_rules 
                SET title = $1, last_updated_at = CURRENT_TIMESTAMP, last_updated_by = $2
                WHERE id = $3
                RETURNING id
            `;
            await client.query(updateRuleQuery, [title, userEmail, existingRule.id]);

            // Hent høyeste versjonsnummer
            const versionQuery = `
                SELECT MAX(version_number) as max_version 
                FROM drawing_rule_versions 
                WHERE rule_id = $1
            `;
            const versionResult = await client.query(versionQuery, [existingRule.id]);
            const nextVersion = (versionResult.rows[0].max_version || 0) + 1;

            // Sett alle tidligere versjoner som ikke-gjeldende
            await client.query(
                'UPDATE drawing_rule_versions SET is_current = false WHERE rule_id = $1',
                [existingRule.id]
            );

            // Opprett ny versjon
            const newVersionQuery = `
                INSERT INTO drawing_rule_versions (rule_id, version_number, content, created_by, is_current)
                VALUES ($1, $2, $3, $4, true)
            `;
            await client.query(newVersionQuery, [existingRule.id, nextVersion, content, userEmail]);

            await client.query('COMMIT');

            // Hent den oppdaterte regelen
            const updatedRule = await this.getRuleBySlug(slug);
            console.log('Oppdatert regel:', {
                id: updatedRule.id,
                title: updatedRule.title,
                slug: updatedRule.slug,
                version: nextVersion
            });
            return updatedRule;
        } catch (error) {
            await client.query('ROLLBACK');
            electronLog.error('Feil ved oppdatering av tegningsregel:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Hent versjonshistorikk for en regel
    async getRuleVersions(slug) {
        try {
            const query = `
                SELECT v.*, 
                       v.created_by as created_by_email,
                       r.title
                FROM drawing_rules r
                JOIN drawing_rule_versions v ON r.id = v.rule_id
                WHERE r.slug = $1
                ORDER BY v.version_number DESC
            `;
            const result = await db.query(query, [slug]);
            return result.rows;
        } catch (error) {
            electronLog.error('Feil ved henting av versjonshistorikk:', error);
            throw error;
        }
    }

    // Lagre bilde
    async saveImage(ruleVersionId, filename, fileData, mimeType, userEmail) {
        try {
            const query = `
                INSERT INTO drawing_rule_images (rule_version_id, filename, file_data, mime_type, created_by)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `;
            const result = await db.query(query, [ruleVersionId, filename, fileData, mimeType, userEmail]);
            return result.rows[0];
        } catch (error) {
            electronLog.error('Feil ved lagring av bilde:', error);
            throw error;
        }
    }

    // Hent bilde
    async getImage(imageId) {
        try {
            const query = `
                SELECT * FROM drawing_rule_images WHERE id = $1
            `;
            const result = await db.query(query, [imageId]);
            return result.rows[0];
        } catch (error) {
            electronLog.error('Feil ved henting av bilde:', error);
            throw error;
        }
    }
}

module.exports = new DrawingRulesService(); 