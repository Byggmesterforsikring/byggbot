import React, { useState, useEffect } from 'react';

const PortfolioFileTest = () => {
    const [filePermissions, setFilePermissions] = useState(null);
    const [cachedPeriods, setCachedPeriods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        testFilePermissions();
        loadCachedPeriods();
    }, []);

    const testFilePermissions = async () => {
        try {
            const result = await window.electron.portfolioFile.testPermissions();
            setFilePermissions(result);
            console.log('📁 Fil-tilgang test:', result);
        } catch (err) {
            console.error('Feil ved test av fil-tilganger:', err);
            setError(err.message);
        }
    };

    const loadCachedPeriods = async () => {
        try {
            const result = await window.electron.portfolioFile.getCachedPeriods();
            if (result.success) {
                setCachedPeriods(result.data);
            }
        } catch (err) {
            console.error('Feil ved henting av cached perioder:', err);
        }
    };

    const hentOgLagreData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Test med kort periode først
            const startDate = '2025-01-01';
            const endDate = '2025-01-02';

            console.log('🚀 Starter henting og lagring av porteføljedata...');

            // Progress tracking
            window.electron.portfolioFile.onFetchProgress((progressData) => {
                console.log('📊 Fetch progress:', progressData);
            });

            const result = await window.electron.portfolioFile.fetchAndSave({
                StartDate: startDate,
                EndDate: endDate
            });

            if (result.success) {
                console.log('✅ Data hentet og lagret:', result);
                await loadCachedPeriods(); // Refresh liste
            } else {
                throw new Error(result.error);
            }

        } catch (err) {
            console.error('❌ Feil ved henting og lagring:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            window.electron.portfolioFile.offFetchProgress();
        }
    };

    const lastPortfolioData = async (period) => {
        try {
            console.log(`📂 Laster data fra: ${period.filename}`);
            const result = await window.electron.portfolioFile.loadData(period.filename);

            if (result.success) {
                console.log('✅ Portfolio data lastet:', result.data.summary);
                // Her kan du sette data til state for analyse
            }
        } catch (err) {
            console.error('❌ Feil ved lasting av data:', err);
            setError(err.message);
        }
    };

    const slettCache = async (period) => {
        try {
            const result = await window.electron.portfolioFile.deleteCache(period.filename);
            if (result.success) {
                console.log('🗑️ Cache slettet:', period.filename);
                await loadCachedPeriods(); // Refresh liste
            }
        } catch (err) {
            console.error('❌ Feil ved sletting:', err);
            setError(err.message);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Portfolio Fil-Cache Test</h2>

            {/* FIL-TILGANG TEST */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <h3 className="text-lg font-semibold mb-3">Fil-tilgang Test</h3>
                {filePermissions ? (
                    <div className={`p-3 rounded ${filePermissions.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {filePermissions.success ? '✅' : '❌'} {filePermissions.message || filePermissions.error}
                        <br />
                        <small>Cache directory: {filePermissions.cacheDir}</small>
                    </div>
                ) : (
                    <div className="text-gray-500">Tester fil-tilganger...</div>
                )}
            </div>

            {/* CACHED PERIODER */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <h3 className="text-lg font-semibold mb-3">Tilgjengelige datasett</h3>
                {cachedPeriods.length > 0 ? (
                    <div className="space-y-2">
                        {cachedPeriods.map(period => (
                            <div key={period.filename} className="flex items-center justify-between p-3 border rounded">
                                <div>
                                    <strong>{period.startDate} - {period.endDate}</strong>
                                    <br />
                                    <small>{period.totalCustomers} kunder, {period.totalCovers} covers ({period.fileSize})</small>
                                </div>
                                <div className="space-x-2">
                                    <button
                                        onClick={() => lastPortfolioData(period)}
                                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        📂 Last inn
                                    </button>
                                    <button
                                        onClick={() => slettCache(period)}
                                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                    >
                                        🗑️ Slett
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-gray-500">Ingen cached data funnet</div>
                )}
            </div>

            {/* HENT NYE DATA */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <h3 className="text-lg font-semibold mb-3">Hent nye porteføljedata</h3>
                <button
                    onClick={hentOgLagreData}
                    disabled={loading || !filePermissions?.success}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                >
                    {loading ? '📥 Henter data...' : '📥 Hent porteføljedata (test: 1-2 jan 2025)'}
                </button>

                {loading && (
                    <div className="mt-3 text-blue-600">
                        ⏳ Dette kan ta 2-3 minutter for test-periode...
                    </div>
                )}
            </div>

            {/* FEIL-VISNING */}
            {error && (
                <div className="bg-red-100 text-red-800 p-4 rounded-lg">
                    ❌ {error}
                </div>
            )}
        </div>
    );
};

export default PortfolioFileTest;
