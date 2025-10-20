import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import {
    Database,
    Download,
    Trash2,
    BarChart3,
    Clock,
    Calendar,
    Users,
    FileText,
    HardDrive,
    AlertTriangle,
    XCircle
} from 'lucide-react';

const PortefoljeDataAdministrasjon = () => {
    const navigate = useNavigate();
    const [cachedPeriods, setCachedPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('1aar');
    const [loading, setLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [error, setError] = useState(null);
    const [filePermissions, setFilePermissions] = useState(null);
    const [currentPhase, setCurrentPhase] = useState('');
    const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [itemsProcessed, setItemsProcessed] = useState(0);
    const [totalItems, setTotalItems] = useState(0);


    // Last cached perioder og test fil-tilganger ved oppstart
    useEffect(() => {
        loadCachedPeriods();
        testFilePermissions();
    }, []);

    const testFilePermissions = async () => {
        try {
            const result = await window.electron.portfolioFile.testPermissions();
            setFilePermissions(result);
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

    // Beregn periode basert på valg
    const beregnPeriodeDatoer = (periode) => {
        // Bruk norsk tidssone for alle beregninger
        const nå = new Date();

        // Slutt: siste dag forrige måned (norsk tid)
        const norskNå = new Date(nå.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
        const forrigeMåned = new Date(norskNå.getFullYear(), norskNå.getMonth() - 1, 1); // Første dag forrige måned
        const sisteDagForrigeMåned = new Date(forrigeMåned.getFullYear(), forrigeMåned.getMonth() + 1, 0); // Siste dag forrige måned

        // Formatér som YYYY-MM-DD i norsk tidssone (unngår timezone-problemer)
        const endDate = sisteDagForrigeMåned.getFullYear() + '-' +
            String(sisteDagForrigeMåned.getMonth() + 1).padStart(2, '0') + '-' +
            String(sisteDagForrigeMåned.getDate()).padStart(2, '0');

        // Start: basert på valgt periode
        let startDate;
        const endYear = sisteDagForrigeMåned.getFullYear();

        switch (periode) {
            case '12mnd':
                const tolv_mnd_siden = new Date(sisteDagForrigeMåned);
                tolv_mnd_siden.setFullYear(tolv_mnd_siden.getFullYear() - 1);
                startDate = tolv_mnd_siden.getFullYear() + '-' +
                    String(tolv_mnd_siden.getMonth() + 1).padStart(2, '0') + '-' +
                    String(tolv_mnd_siden.getDate()).padStart(2, '0');
                break;
            case '1aar':
                startDate = `${endYear}-01-01`;
                break;
            case '2aar':
                startDate = `${endYear - 1}-01-01`;
                break;
            case '3aar':
                startDate = `${endYear - 2}-01-01`;
                break;
            case '5aar':
                startDate = `${endYear - 4}-01-01`;
                break;
            default:
                startDate = `${endYear}-01-01`;
        }

        return { startDate, endDate };
    };

    const getPeriodeBeskrivelse = (periode) => {
        const { startDate, endDate } = beregnPeriodeDatoer(periode);
        const perioderMap = {
            '12mnd': 'Siste 12 måneder',
            '1aar': 'Inneværende år',
            '2aar': 'Siste 2 år',
            '3aar': 'Siste 3 år',
            '5aar': 'Siste 5 år'
        };
        return `${perioderMap[periode]} (${formatNorskDato(startDate)} - ${formatNorskDato(endDate)})`;
    };

    const formatNorskDato = (dateString) => {
        return new Date(dateString).toLocaleDateString('nb-NO');
    };

    const avbrytDatahenting = async () => {
        try {
            console.log('🛑 Bruker avbryter datahenting...');
            const result = await window.electron.portfolioFile.abortFetch();

            if (result.success) {
                setLoadingStatus('Avbryter datahenting...');
                setError(null);
            } else {
                console.log('⚠️ Ingen pågående datahenting å avbryte');
            }
        } catch (err) {
            console.error('Feil ved avbryt:', err);
            setError('Kunne ikke avbryte datahenting');
        }
    };

    const hentNyePortefoljedata = async () => {
        if (!filePermissions?.success) {
            setError('Fil-tilganger er ikke tilgjengelige');
            return;
        }

        setLoading(true);
        setLoadingProgress(0);
        setError(null);
        setLoadingStatus('Forbereder datahenting...');
        setItemsProcessed(0);
        setTotalItems(0);
        setCurrentPhase('');
        setEstimatedTimeRemaining(null);

        // Bruk lokal variabel for starttid (ikke state) for å unngå closure-problemer
        const actualStartTime = Date.now();
        setStartTime(actualStartTime);

        try {
            const { startDate, endDate } = beregnPeriodeDatoer(selectedPeriod);

            console.log('🚀 Starter porteføljedata-henting:', {
                periode: selectedPeriod,
                startDate,
                endDate
            });

            // Helper function til å beregne gjenstående tid
            const calculateTimeRemaining = (current, total, elapsedMs) => {
                // Valideringer for å unngå rare beregninger
                if (!current || !total || current === 0 || total === 0) return null;
                if (current >= total) return 'nesten ferdig';
                if (elapsedMs < 100) return null; // For tidlig til å beregne

                const avgTimePerItem = elapsedMs / current;
                const itemsRemaining = total - current;
                const msRemaining = avgTimePerItem * itemsRemaining;

                // Konverter til sekunder/minutter
                const secondsRemaining = Math.ceil(msRemaining / 1000);

                // Sikkerhet: Hvis estimatet er helt urealistisk (>1 time), vis ikke
                if (secondsRemaining > 3600) return 'beregner...';

                if (secondsRemaining < 60) {
                    return `ca. ${secondsRemaining} sek`;
                } else {
                    const minutesRemaining = Math.ceil(secondsRemaining / 60);
                    return `ca. ${minutesRemaining} min`;
                }
            };

            // Progress tracking
            const progressHandler = (progressData) => {
                console.log('📊 Progress:', progressData);
                const elapsed = Date.now() - actualStartTime;

                if (progressData.phase === 'kunde_liste') {
                    setCurrentPhase('📋 Henter kunde-liste');
                    setLoadingStatus('Henter liste over kunder...');
                    setLoadingProgress(5);
                    setEstimatedTimeRemaining(null);
                } else if (progressData.phase === 'kunde_detaljer') {
                    setCurrentPhase('👤 Henter kundedetaljer');
                    const detailedMessage = progressData.total
                        ? `Henter kunde ${progressData.current}/${progressData.total}`
                        : progressData.message;
                    setLoadingStatus(detailedMessage);
                    setLoadingProgress(5 + (progressData.progress * 0.50)); // 5-55%

                    // Beregn estimert tid
                    if (progressData.current && progressData.total) {
                        setItemsProcessed(progressData.current);
                        setTotalItems(progressData.total);
                        const timeEst = calculateTimeRemaining(progressData.current, progressData.total, elapsed);
                        setEstimatedTimeRemaining(timeEst);
                    }
                } else if (progressData.phase === 'skade_data_start') {
                    setCurrentPhase('🔍 Forbereder skadedata');
                    setLoadingStatus('Starter henting av skadedata...');
                    setLoadingProgress(55);
                    setEstimatedTimeRemaining(null);
                } else if (progressData.phase === 'skade_chunks') {
                    setCurrentPhase('📦 Henter skadedata');
                    setLoadingStatus(progressData.message || `Henter skadedata chunk ${progressData.current}/${progressData.total}`);
                    setLoadingProgress(55 + (progressData.progress * 0.30)); // 55-85%

                    // Beregn estimert tid for chunks
                    if (progressData.current && progressData.total) {
                        setItemsProcessed(progressData.current);
                        setTotalItems(progressData.total);
                        const timeEst = calculateTimeRemaining(progressData.current, progressData.total, elapsed);
                        setEstimatedTimeRemaining(timeEst);
                    }
                } else if (progressData.phase === 'skade_filtering') {
                    setCurrentPhase('⚙️ Prosesserer skadedata');
                    setLoadingStatus(progressData.message || 'Filtrerer og prosesserer skadedata...');
                    setLoadingProgress(90);
                    setEstimatedTimeRemaining('nesten ferdig');
                } else if (progressData.phase === 'lagring') {
                    setCurrentPhase('💾 Lagrer data');
                    setLoadingStatus(progressData.message);
                    setLoadingProgress(95);
                    setEstimatedTimeRemaining('nesten ferdig');
                } else if (progressData.phase === 'ferdig') {
                    setCurrentPhase('✅ Ferdig');
                    setLoadingStatus(progressData.message);
                    setLoadingProgress(100);
                    setEstimatedTimeRemaining(null);
                } else if (progressData.phase === 'avbrutt') {
                    setCurrentPhase('❌ Avbrutt');
                    setLoadingStatus('Datahenting avbrutt av bruker');
                    setLoadingProgress(0);
                    setEstimatedTimeRemaining(null);
                }
            };

            // Registrer progress listener
            window.electron.portfolioFile.onFetchProgress(progressHandler);

            try {
                const response = await window.electron.portfolioFile.fetchAndSave({
                    StartDate: startDate,
                    EndDate: endDate
                });

                if (response.success) {
                    setLoadingStatus(`Data lagret til ${response.filResult.filename} (${response.filResult.sizeMB}MB)`);
                    await loadCachedPeriods(); // Refresh cache-liste
                } else if (response.aborted) {
                    // Operasjonen ble avbrutt - ikke vis som feil
                    setLoadingStatus('❌ Datahenting avbrutt');
                    setError(null);
                } else {
                    throw new Error(response.error || 'Ukjent feil fra API');
                }
            } finally {
                window.electron.portfolioFile.offFetchProgress();
            }

        } catch (err) {
            console.error('Feil ved henting av porteføljedata:', err);
            // Ikke vis feil hvis det var en avbryt-operasjon
            if (err.message !== 'ABORT') {
                setError(err.message || 'En uventet feil oppstod');
            }
            setLoadingStatus('');
        } finally {
            setLoading(false);
            setLoadingProgress(0);
        }
    };

    // DEBUG: Test-funksjon med faste datoer
    const hentTestData = async () => {
        setLoading(true);
        setLoadingProgress(0);
        setError(null);
        setLoadingStatus('Starter test-henting...');
        setItemsProcessed(0);
        setTotalItems(0);
        setCurrentPhase('🧪 Test-modus');
        setEstimatedTimeRemaining(null);

        // Bruk lokal variabel for starttid (ikke state)
        const actualStartTime = Date.now();
        setStartTime(actualStartTime);

        try {
            const startDate = '2025-01-01';
            const endDate = '2025-01-02';

            console.log('DEBUG: Starter test-henting med faste datoer:', { startDate, endDate });

            // Helper function til å beregne gjenstående tid
            const calculateTimeRemaining = (current, total, elapsedMs) => {
                if (!current || !total || current === 0 || total === 0) return null;
                if (current >= total) return 'nesten ferdig';
                if (elapsedMs < 100) return null;

                const avgTimePerItem = elapsedMs / current;
                const itemsRemaining = total - current;
                const msRemaining = avgTimePerItem * itemsRemaining;

                const secondsRemaining = Math.ceil(msRemaining / 1000);
                if (secondsRemaining > 3600) return 'beregner...';

                if (secondsRemaining < 60) {
                    return `ca. ${secondsRemaining} sek`;
                } else {
                    const minutesRemaining = Math.ceil(secondsRemaining / 60);
                    return `ca. ${minutesRemaining} min`;
                }
            };

            // Progress tracking (samme som hovedfunksjonen)
            const progressHandler = (progressData) => {
                console.log('Test Progress:', progressData);
                const elapsed = Date.now() - actualStartTime;

                if (progressData.phase === 'kunde_liste') {
                    setCurrentPhase('🧪 TEST: Henter kunde-liste');
                    setLoadingStatus('Henter liste over kunder (test)...');
                    setLoadingProgress(5);
                } else if (progressData.phase === 'kunde_detaljer') {
                    setCurrentPhase('🧪 TEST: Kundedetaljer');
                    const detailedMessage = progressData.total
                        ? `TEST: Henter kunde ${progressData.current}/${progressData.total}`
                        : progressData.message;
                    setLoadingStatus(detailedMessage);
                    setLoadingProgress(5 + (progressData.progress * 0.50));

                    if (progressData.current && progressData.total) {
                        setItemsProcessed(progressData.current);
                        setTotalItems(progressData.total);
                        const timeEst = calculateTimeRemaining(progressData.current, progressData.total, elapsed);
                        setEstimatedTimeRemaining(timeEst);
                    }
                } else if (progressData.phase === 'skade_data_start') {
                    setCurrentPhase('🧪 TEST: Skadedata');
                    setLoadingStatus('Starter henting av skadedata...');
                    setLoadingProgress(55);
                } else if (progressData.phase === 'skade_chunks') {
                    setCurrentPhase('🧪 TEST: Skadedata chunks');
                    setLoadingStatus(progressData.message);
                    setLoadingProgress(55 + (progressData.progress * 0.30));

                    if (progressData.current && progressData.total) {
                        setItemsProcessed(progressData.current);
                        setTotalItems(progressData.total);
                        const timeEst = calculateTimeRemaining(progressData.current, progressData.total, elapsed);
                        setEstimatedTimeRemaining(timeEst);
                    }
                } else if (progressData.phase === 'skade_filtering') {
                    setCurrentPhase('🧪 TEST: Prosessering');
                    setLoadingStatus(progressData.message);
                    setLoadingProgress(90);
                    setEstimatedTimeRemaining('nesten ferdig');
                } else if (progressData.phase === 'lagring') {
                    setCurrentPhase('🧪 TEST: Lagring');
                    setLoadingStatus('Lagrer test-data...');
                    setLoadingProgress(95);
                    setEstimatedTimeRemaining('nesten ferdig');
                } else if (progressData.phase === 'ferdig') {
                    setCurrentPhase('🧪 TEST: Ferdig');
                    setLoadingStatus(progressData.message);
                    setLoadingProgress(100);
                    setEstimatedTimeRemaining(null);
                } else if (progressData.phase === 'avbrutt') {
                    setCurrentPhase('🧪 TEST: Avbrutt');
                    setLoadingStatus('Test avbrutt av bruker');
                    setLoadingProgress(0);
                    setEstimatedTimeRemaining(null);
                }
            };

            // Registrer progress listener
            window.electron.portfolioFile.onFetchProgress(progressHandler);

            try {
                const response = await window.electron.portfolioFile.fetchAndSave({
                    StartDate: startDate,
                    EndDate: endDate
                });

                if (response.success) {
                    setLoadingStatus(`TEST KOMPLETT! Data lagret til ${response.filResult.filename} (${response.filResult.sizeMB}MB)`);
                    await loadCachedPeriods(); // Refresh cache-liste
                } else if (response.aborted) {
                    setLoadingStatus('🧪 TEST: Avbrutt');
                    setError(null);
                } else {
                    throw new Error(response.error || 'Ukjent feil fra API');
                }
            } finally {
                window.electron.portfolioFile.offFetchProgress();
            }

        } catch (err) {
            console.error('Feil ved test-henting:', err);
            if (err.message !== 'ABORT') {
                setError(err.message || 'En uventet feil oppstod');
            }
            setLoadingStatus('');
        } finally {
            setLoading(false);
            setLoadingProgress(0);
        }
    };

    const åpneAnalyse = (period) => {
        console.log(`📊 Åpner analyse for fil: ${period.filename}`);
        navigate(`/portefoljeanalyse/analyse?file=${period.filename}`);
    };

    // Debug: Inspiser fil-struktur
    const inspiserFilStruktur = async (period) => {
        try {
            console.log(`🔍 Inspiserer fil-struktur: ${period.filename}`);
            const result = await window.electron.portfolioFile.loadData(period.filename);

            if (result.success) {
                const data = result.data;

                // Analyser fil-struktur
                const struktur = {
                    topLevelKeys: Object.keys(data),
                    hasCustomers: !!data.customers,
                    hasClaimData: !!data.claimData,
                    customerCount: data.customers ? data.customers.length : 0,
                    claimDataKeys: data.claimData ? Object.keys(data.claimData) : [],
                    claimCount: data.claimData?.SkadeDetaljer ? data.claimData.SkadeDetaljer.length : 0,
                    summaryKeys: data.summary ? Object.keys(data.summary) : []
                };

                console.log('📋 Fil-struktur analyse:', struktur);

                // Vis eksempel på første kunde
                if (data.customers && data.customers.length > 0) {
                    console.log('👤 Første kunde eksempel:', {
                        InsuredNumber: data.customers[0].InsuredNumber,
                        Name: data.customers[0].Name,
                        keys: Object.keys(data.customers[0])
                    });
                }

                // Vis eksempel på første skade
                if (data.claimData?.SkadeDetaljer && data.claimData.SkadeDetaljer.length > 0) {
                    console.log('🔍 Første skade eksempel:', {
                        Skadenummer: data.claimData.SkadeDetaljer[0].Skadenummer,
                        InsuredNumber: data.claimData.SkadeDetaljer[0].InsuredNumber,
                        Hendelsesdato: data.claimData.SkadeDetaljer[0].Hendelsesdato,
                        keys: Object.keys(data.claimData.SkadeDetaljer[0])
                    });
                }

                // Sjekk mapping mellom policies og skader
                if (data.customers && data.claimData?.SkadeDetaljer) {
                    // Samle alle PolicyNumbers fra porteføljedata
                    const allePolicyNumbers = [];
                    data.customers.forEach(kunde => {
                        if (kunde.PolicyList) {
                            kunde.PolicyList.forEach(policy => {
                                allePolicyNumbers.push(policy.PolicyNumber);
                            });
                        }
                    });

                    // Samle PolicyNumbers fra skade-data
                    const skadePolicyNumbers = [...new Set(data.claimData.SkadeDetaljer.map(s => s.Polisenummer))];

                    // Finn matchende policies
                    const matchendePolicies = skadePolicyNumbers.filter(pn => allePolicyNumbers.includes(pn));

                    console.log('🔗 Policy-skade mapping:', {
                        policyNummerIPortefolje: allePolicyNumbers.slice(0, 10), // Første 10
                        policyNummerISkader: skadePolicyNumbers,
                        matchendePolicies: matchendePolicies,
                        matchingRate: `${matchendePolicies.length}/${skadePolicyNumbers.length} policies matcher`
                    });

                    // Vis eksempel på mapping
                    if (matchendePolicies.length > 0) {
                        const eksempelPolicy = matchendePolicies[0];
                        const relatertSkade = data.claimData.SkadeDetaljer.find(s => s.Polisenummer === eksempelPolicy);
                        const relatertKunde = data.customers.find(k =>
                            k.PolicyList && k.PolicyList.some(p => p.PolicyNumber === eksempelPolicy)
                        );

                        console.log('💡 Eksempel på policy-mapping:', {
                            policyNumber: eksempelPolicy,
                            kunde: relatertKunde ? relatertKunde.Name : 'Ikke funnet',
                            skade: relatertSkade ? `${relatertSkade.Skadenummer} (${relatertSkade.Utbetalt} kr)` : 'Ikke funnet'
                        });
                    }
                }

                // Navigerer til JSON inspector i stedet for å vise alert
                navigate(`/portefoljeanalyse/inspiser?file=${period.filename}`);
            }
        } catch (err) {
            console.error('❌ Feil ved inspeksjon av fil:', err);
            setError(err.message);
        }
    };

    const slettCachedData = async (period) => {
        try {
            const result = await window.electron.portfolioFile.deleteCache(period.filename);
            if (result.success) {
                setLoadingStatus(`${period.filename} slettet`);
                await loadCachedPeriods(); // Refresh liste
            }
        } catch (err) {
            console.error('Feil ved sletting:', err);
            setError(err.message);
        }
    };

    const periodeKnapper = [
        { id: '12mnd', label: 'Siste 12 måneder', icon: Clock },
        { id: '1aar', label: 'Inneværende år', icon: Calendar },
        { id: '2aar', label: 'Siste 2 år', icon: Calendar },
        { id: '3aar', label: 'Siste 3 år', icon: Calendar },
        { id: '5aar', label: 'Siste 5 år', icon: Database }
    ];


    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-purple-600" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Porteføljedata-administrasjon</h1>
                    <p className="text-muted-foreground">
                        Hent og administrer porteføljedata for analyse
                    </p>
                </div>
            </div>

            {/* Fil-tilgang status - kun vis hvis problemer */}
            {filePermissions && !filePermissions.success && (
                <Alert className="border-red-200 bg-red-50">
                    <HardDrive className="h-4 w-4" />
                    <AlertDescription>
                        {filePermissions.error}
                        <br />
                        <small>Cache directory: {filePermissions.cacheDir}</small>
                    </AlertDescription>
                </Alert>
            )}

            {/* Periode-velger for ny datahenting */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-purple-600" />
                        Hent nye porteføljedata
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Periode-knapper */}
                    <div>
                        <Label className="text-sm font-medium mb-3 block">Velg periode for datahenting:</Label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {periodeKnapper.map((periode) => {
                                const IconComponent = periode.icon;
                                return (
                                    <Button
                                        key={periode.id}
                                        variant={selectedPeriod === periode.id ? 'default' : 'outline'}
                                        className={`p-4 h-auto flex flex-col gap-2 ${selectedPeriod === periode.id
                                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                            : 'hover:bg-purple-50'
                                            }`}
                                        onClick={() => setSelectedPeriod(periode.id)}
                                    >
                                        <IconComponent className="h-5 w-5" />
                                        <span className="text-sm font-medium">{periode.label}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Periode-beskrivelse */}
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-800">
                            <strong>Valgt periode:</strong> {getPeriodeBeskrivelse(selectedPeriod)}
                        </p>
                    </div>

                    {/* Hent data knapper */}
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <Button
                                onClick={hentNyePortefoljedata}
                                disabled={loading || !filePermissions?.success}
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                                size="lg"
                            >
                                {loading ? (
                                    <>
                                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                                        Henter data...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-2" />
                                        Hent porteføljedata ({selectedPeriod === '12mnd' ? '12 mnd' : selectedPeriod.replace('aar', ' år')})
                                    </>
                                )}
                            </Button>

                            {/* Avbryt-knapp (vises kun når loading) */}
                            {loading && (
                                <Button
                                    onClick={avbrytDatahenting}
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                    size="lg"
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Avbryt
                                </Button>
                            )}
                        </div>

                        {/* DEBUG: Test-knapp med faste datoer */}
                        <Button
                            onClick={hentTestData}
                            disabled={loading || !filePermissions?.success}
                            variant="outline"
                            className="w-full border-orange-200 text-orange-600 hover:bg-orange-50"
                            size="sm"
                        >
                            <Database className="h-4 w-4 mr-2" />
                            DEBUG: Test med 1-2 jan 2025 (rask test)
                        </Button>
                    </div>

                    {/* Progress bar */}
                    {loading && (
                        <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                            {/* Fase-indikator */}
                            {currentPhase && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-purple-900">
                                        {currentPhase}
                                    </span>
                                    {estimatedTimeRemaining && (
                                        <div className="flex items-center gap-2 text-sm text-purple-700">
                                            <Clock className="h-4 w-4" />
                                            <span className="font-medium">{estimatedTimeRemaining}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Progress bar */}
                            <Progress
                                value={loadingProgress}
                                className="w-full h-3"
                                color="#9333ea"
                                backgroundColor="rgba(147, 51, 234, 0.1)"
                            />

                            {/* Status og prosent */}
                            <div className="flex items-center justify-between text-sm">
                                <p className="text-purple-700">{loadingStatus}</p>
                                <p className="text-xs font-semibold text-purple-600">
                                    {Math.round(loadingProgress)}%
                                </p>
                            </div>

                            {/* Items prosessert (hvis relevant) */}
                            {totalItems > 0 && (
                                <p className="text-xs text-purple-600">
                                    Prosessert: {itemsProcessed}/{totalItems}
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Cached data oversikt */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HardDrive className="h-5 w-5 text-purple-600" />
                        Cached porteføljedata
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {cachedPeriods.length > 0 ? (
                        <div className="space-y-3">
                            {cachedPeriods.map(period => (
                                <div key={period.filename} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                                    <div className="flex items-center gap-4">
                                        <Database className="h-5 w-5 text-purple-600" />
                                        <div>
                                            <p className="font-medium text-lg flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                {formatNorskDato(period.startDate)} - {formatNorskDato(period.endDate)}
                                            </p>
                                            <p className="text-sm text-muted-foreground mb-1">
                                                <Users className="h-4 w-4 inline mr-1" />
                                                {period.totalCustomers} kunder ·
                                                <FileText className="h-4 w-4 inline mx-1" />
                                                {period.totalCovers} covers ·
                                                <HardDrive className="h-4 w-4 inline mx-1" />
                                                {period.fileSize}
                                            </p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Download className="h-3 w-3" />
                                                Hentet: {new Date(period.lastUpdated).toLocaleString('nb-NO', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => åpneAnalyse(period)}
                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                            size="sm"
                                        >
                                            <BarChart3 className="h-4 w-4 mr-1" />
                                            Åpne analyse
                                        </Button>
                                        <Button
                                            onClick={() => inspiserFilStruktur(period)}
                                            variant="outline"
                                            size="sm"
                                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        >
                                            <FileText className="h-4 w-4 mr-1" />
                                            Inspiser
                                        </Button>
                                        <Button
                                            onClick={() => slettCachedData(period)}
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Slett
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Database className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>Ingen cached porteføljedata funnet</p>
                            <p className="text-sm">Hent data ved å velge en periode ovenfor</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Feil-visning */}
            {error && (
                <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            {/* Status-melding */}
            {loadingStatus && !loading && !error && (
                <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                        {loadingStatus}
                    </AlertDescription>
                </Alert>
            )}

        </div>
    );
};

export default PortefoljeDataAdministrasjon;
