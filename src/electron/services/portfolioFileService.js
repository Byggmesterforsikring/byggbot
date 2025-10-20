const path = require('path');
const fs = require('fs').promises;
const { app } = require('electron');
const log = require('electron-log');

class PortfolioFileService {
    constructor() {
        // Bruk Electron's userData directory (vanligvis tillatt på managed PCer)
        this.cacheDir = path.join(app.getPath('userData'), 'portfolio-cache');
        log.info(`📁 Portfolio cache directory: ${this.cacheDir}`);
    }

    async testFilePermissions() {
        try {
            await this.ensureCacheDir();

            // Test skriving
            const testFile = path.join(this.cacheDir, 'test-permissions.json');
            const testData = {
                test: true,
                timestamp: new Date().toISOString(),
                message: "Fil-skriving fungerer på denne PC-en!"
            };

            await fs.writeFile(testFile, JSON.stringify(testData, null, 2));
            log.info('✅ Test-fil skrevet suksessfullt');

            // Test lesing
            const readData = await fs.readFile(testFile, 'utf8');
            const parsed = JSON.parse(readData);
            log.info('✅ Test-fil lest suksessfullt:', parsed.message);

            // Prøv å rydd opp test-fil (ikke kritisk hvis det feiler)
            try {
                await fs.unlink(testFile);
                log.info('✅ Test-fil slettet - fil-operasjoner fungerer perfekt!');
            } catch (deleteError) {
                log.warn('⚠️ Kunne ikke slette test-fil (ikke kritisk):', deleteError.message);
                // Ikke kast feil - skriving og lesing fungerte!
            }

            return {
                success: true,
                cacheDir: this.cacheDir,
                message: "Fil-operasjoner fungerer på denne PC-en (skriving og lesing OK)"
            };

        } catch (error) {
            log.error('❌ Fil-operasjoner feiler:', error);
            return {
                success: false,
                error: error.message,
                cacheDir: this.cacheDir
            };
        }
    }

    async ensureCacheDir() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
            log.info(`📁 Cache directory sikret: ${this.cacheDir}`);
        } catch (error) {
            log.error(`❌ Kunne ikke lage cache directory: ${error.message}`);
            throw error;
        }
    }

    async savePortfolioData(data, startDate, endDate) {
        await this.ensureCacheDir();

        const filename = `portfolio-${startDate}-${endDate}.json`;
        const filepath = path.join(this.cacheDir, filename);

        log.info(`💾 Lagrer porteføljedata til: ${filepath}`);
        const startTime = Date.now();

        // Lagre hoveddata
        await fs.writeFile(filepath, JSON.stringify(data, null, 2));

        const saveTime = Date.now() - startTime;
        const fileStats = await fs.stat(filepath);
        const fileSizeMB = Math.round(fileStats.size / 1024 / 1024 * 100) / 100;

        log.info(`✅ Porteføljedata lagret på ${saveTime}ms - ${fileSizeMB}MB`);

        // Oppdater metadata
        await this.updateMetadata(filename, startDate, endDate, data, fileStats.size);

        return {
            filename,
            filepath,
            size: fileStats.size,
            sizeMB: fileSizeMB,
            saveTimeMs: saveTime
        };
    }

    // Lagre debug-data (original skade-data før filtrering)
    async saveDebugData(data, filename) {
        await this.ensureCacheDir();

        // Lagre i cache-dir
        const cacheFilepath = path.join(this.cacheDir, filename);
        log.info(`🔍 Lagrer debug-data til cache: ${cacheFilepath}`);
        await fs.writeFile(cacheFilepath, JSON.stringify(data, null, 2));

        // OGSÅ lagre i project root for enkel Python-analyse
        const projectRoot = path.resolve(__dirname, '../../..');
        const rootFilepath = path.join(projectRoot, filename);
        log.info(`🔍 Lagrer debug-data til root: ${rootFilepath}`);
        await fs.writeFile(rootFilepath, JSON.stringify(data, null, 2));

        const fileStats = await fs.stat(cacheFilepath);
        const fileSizeMB = Math.round(fileStats.size / 1024 / 1024 * 100) / 100;
        log.info(`✅ Debug-data lagret i både cache og root - ${fileSizeMB}MB`);

        return { filename, filepath: cacheFilepath, rootPath: rootFilepath, size: fileStats.size, sizeMB: fileSizeMB };
    }

    async loadPortfolioData(filename) {
        const filepath = path.join(this.cacheDir, filename);

        log.info(`📂 Laster porteføljedata fra: ${filepath}`);
        const startTime = Date.now();

        const rawData = await fs.readFile(filepath, 'utf8');
        const data = JSON.parse(rawData);

        const loadTime = Date.now() - startTime;
        log.info(`✅ Porteføljedata lastet på ${loadTime}ms`);

        return data;
    }

    async getCachedPeriods() {
        try {
            await this.ensureCacheDir();
            const metadataPath = path.join(this.cacheDir, 'metadata.json');

            const metadata = await fs.readFile(metadataPath, 'utf8');
            const parsed = JSON.parse(metadata);

            return parsed.cachedPeriods || [];
        } catch (error) {
            log.info('📝 Ingen metadata funnet - returnerer tom liste');
            return [];
        }
    }

    async updateMetadata(filename, startDate, endDate, data, fileSize) {
        const metadataPath = path.join(this.cacheDir, 'metadata.json');

        let metadata = { cachedPeriods: [] };
        try {
            const existing = await fs.readFile(metadataPath, 'utf8');
            metadata = JSON.parse(existing);
        } catch {
            // Ny metadata-fil
        }

        // Fjern eksisterende periode hvis den finnes
        metadata.cachedPeriods = metadata.cachedPeriods.filter(p => p.filename !== filename);

        // Legg til ny periode
        metadata.cachedPeriods.push({
            filename,
            startDate,
            endDate,
            totalCustomers: data.summary.totalCustomers,
            totalPolicies: data.summary.totalPolicies,
            totalCovers: data.summary.totalCovers,
            fileSize: Math.round(fileSize / 1024 / 1024 * 100) / 100 + 'MB',
            lastUpdated: new Date().toISOString()
        });

        // Sorter etter dato (nyeste først)
        metadata.cachedPeriods.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        log.info(`📋 Metadata oppdatert med ${metadata.cachedPeriods.length} perioder`);
    }

    async deletePortfolioCache(filename) {
        const filepath = path.join(this.cacheDir, filename);

        try {
            await fs.unlink(filepath);
            log.info(`🗑️ Slettet cache-fil: ${filename}`);

            // Oppdater metadata
            const metadataPath = path.join(this.cacheDir, 'metadata.json');
            const metadata = await fs.readFile(metadataPath, 'utf8');
            const parsed = JSON.parse(metadata);

            parsed.cachedPeriods = parsed.cachedPeriods.filter(p => p.filename !== filename);
            await fs.writeFile(metadataPath, JSON.stringify(parsed, null, 2));

            return { success: true, message: `Cache-fil ${filename} slettet` };
        } catch (error) {
            log.error(`❌ Kunne ikke slette cache-fil ${filename}:`, error);
            throw error;
        }
    }
}

module.exports = new PortfolioFileService();
