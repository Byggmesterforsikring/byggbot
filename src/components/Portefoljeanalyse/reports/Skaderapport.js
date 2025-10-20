import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import {
    AlertTriangle,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Activity,
    Target,
    Calendar,
    Users,
    FileText,
    Search,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronLeft,
    ChevronRight,
    BarChart3
} from 'lucide-react';

const Skaderapport = ({
    portefoljeData,
    selectedPeriods = [],
    selectedProducts = [],
    selectedCustomerType = 'alle'
}) => {

    // State for skadeliste-tabell
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState('Utbetalt');
    const [sortDirection, setSortDirection] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(25);

    // State for månedlig chart-visning
    const [chartMetric, setChartMetric] = useState('antall'); // 'antall', 'utbetalt', 'reserver'

    // Helper: Konverter Date til YYYY-MM-DD string for sammenligning
    const toDateString = (date) => {
        if (!date) return null;
        const d = new Date(date);
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    // Helper: Generer periode-beskrivelse for visning
    const getPeriodLabel = (periodId) => {
        if (periodId === 'alle') return 'Alle data';
        if (periodId === 'siste12') return 'Siste 12 måneder';
        if (periodId === 'iaar') return 'I år (2025)';
        if (periodId.includes('-')) {
            const [quarter, year] = periodId.split('-');
            return `${quarter.toUpperCase()} ${year}`;
        }
        return `År ${periodId}`;
    };

    // Helper: Konverter periode-ID til faktiske datoer (som YYYY-MM-DD strings)
    const getPeriodDateRange = (periodId) => {
        const now = new Date();
        const norskTid = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
        const yesterday = new Date(norskTid);
        yesterday.setDate(yesterday.getDate() - 1);

        switch (periodId) {
            case 'alle':
                return { start: null, end: null }; // Null = ingen filtrering

            case 'siste12':
                const siste12Start = new Date(yesterday);
                siste12Start.setFullYear(siste12Start.getFullYear() - 1);
                siste12Start.setDate(siste12Start.getDate() + 1);
                return { start: toDateString(siste12Start), end: toDateString(yesterday) };

            case 'iaar':
                return {
                    start: `${norskTid.getFullYear()}-01-01`,
                    end: toDateString(yesterday)
                };

            default:
                // Kvartal (q1-2024) eller helt år (2024)
                if (periodId.includes('-')) {
                    const [quarter, year] = periodId.split('-');
                    const yearNum = parseInt(year);

                    let startMonth, endMonth, endDay;
                    switch (quarter) {
                        case 'q1':
                            startMonth = '01'; endMonth = '03'; endDay = '31';
                            break;
                        case 'q2':
                            startMonth = '04'; endMonth = '06'; endDay = '30';
                            break;
                        case 'q3':
                            startMonth = '07'; endMonth = '09'; endDay = '30';
                            break;
                        case 'q4':
                            startMonth = '10'; endMonth = '12'; endDay = '31';
                            break;
                    }

                    const qStart = `${yearNum}-${startMonth}-01`;
                    let qEnd = `${yearNum}-${endMonth}-${endDay}`;

                    // Hvis inneværende år og kvartal, bruk yesterday som slutt
                    if (yearNum === norskTid.getFullYear() && toDateString(yesterday) < qEnd) {
                        qEnd = toDateString(yesterday);
                    }

                    return { start: qStart, end: qEnd };
                } else {
                    // Helt år
                    const year = parseInt(periodId);
                    const currentYear = norskTid.getFullYear();

                    if (year === currentYear) {
                        return {
                            start: `${year}-01-01`,
                            end: toDateString(yesterday)
                        };
                    } else {
                        return {
                            start: `${year}-01-01`,
                            end: `${year}-12-31`
                        };
                    }
                }
        }
    };

    // Filtrer skader basert på valgte perioder, produkter og kundetype
    const filteredClaims = useMemo(() => {
        if (!portefoljeData?.claimData?.SkadeDetaljer) {
            return [];
        }

        let claims = portefoljeData.claimData.SkadeDetaljer;

        // FILTER 1: Perioder
        if (selectedPeriods.length > 0 && !selectedPeriods.includes('alle')) {
            claims = claims.filter(skade => {
                if (!skade.Hendelsesdato) return false;

                // Konverter hendelsesdato til YYYY-MM-DD string for sammenligning
                const hendelsesdatoStr = toDateString(skade.Hendelsesdato);
                if (!hendelsesdatoStr) return false;

                // Sjekk om skaden faller innenfor noen av de valgte periodene
                return selectedPeriods.some(periodId => {
                    const { start, end } = getPeriodDateRange(periodId);

                    // Hvis ingen start/end (alle), inkluder alt
                    if (!start && !end) return true;

                    // String-sammenligning av YYYY-MM-DD (alfabetisk = kronologisk)
                    return hendelsesdatoStr >= start && hendelsesdatoStr <= end;
                });
            });
        }

        // FILTER 2: Produkter
        if (selectedProducts.length > 0) {
            claims = claims.filter(skade => {
                return selectedProducts.includes(skade.Produktnavn);
            });
        }

        // FILTER 3: Kundetype
        if (selectedCustomerType !== 'alle') {
            claims = claims.filter(skade => {
                const isBedrift = !!skade.Bedriftsnavn;
                if (selectedCustomerType === 'bedrift') {
                    return isBedrift;
                } else if (selectedCustomerType === 'privat') {
                    return !isBedrift;
                }
                return true;
            });
        }

        return claims;
    }, [portefoljeData?.claimData?.SkadeDetaljer, selectedPeriods, selectedProducts, selectedCustomerType]);

    // Beregn metrics per periode for sammenligning
    const periodeMetrics = useMemo(() => {
        if (!portefoljeData?.claimData?.SkadeDetaljer || selectedPeriods.length === 0) {
            return [];
        }

        const metrics = selectedPeriods.map(periodId => {
            const { start, end } = getPeriodDateRange(periodId);

            // Start med alle skader
            let periodeClaims = portefoljeData.claimData.SkadeDetaljer;

            // Filtrer etter periode
            if (start && end) {
                periodeClaims = periodeClaims.filter(skade => {
                    if (!skade.Hendelsesdato) return false;
                    const hendelsesdatoStr = toDateString(skade.Hendelsesdato);
                    if (!hendelsesdatoStr) return false;
                    return hendelsesdatoStr >= start && hendelsesdatoStr <= end;
                });
            }

            // Filtrer etter produkter
            if (selectedProducts.length > 0) {
                periodeClaims = periodeClaims.filter(skade => {
                    return selectedProducts.includes(skade.Produktnavn);
                });
            }

            // Filtrer etter kundetype
            if (selectedCustomerType !== 'alle') {
                periodeClaims = periodeClaims.filter(skade => {
                    const isBedrift = !!skade.Bedriftsnavn;
                    if (selectedCustomerType === 'bedrift') {
                        return isBedrift;
                    } else if (selectedCustomerType === 'privat') {
                        return !isBedrift;
                    }
                    return true;
                });
            }

            const totalSkader = periodeClaims.length;
            const totalUtbetalt = periodeClaims.reduce((sum, s) => sum + (s.Utbetalt || 0), 0);
            const totalReserver = periodeClaims.reduce((sum, s) => sum + (s.Skadereserve || 0), 0);
            const gjennomsnittsSkadeUtbetalt = totalSkader > 0 ? totalUtbetalt / totalSkader : 0;
            const gjennomsnittsSkadeReservert = totalSkader > 0 ? totalReserver / totalSkader : 0;

            return {
                periodId,
                periodLabel: getPeriodLabel(periodId),
                totalSkader,
                totalUtbetalt,
                totalReserver,
                gjennomsnittsSkadeUtbetalt,
                gjennomsnittsSkadeReservert,
                gjennomsnittsSkade: gjennomsnittsSkadeUtbetalt + gjennomsnittsSkadeReservert
            };
        });

        // Sorter kronologisk (eldst først)
        return metrics.sort((a, b) => {
            const aId = a.periodId;
            const bId = b.periodId;

            // Spesialtilfeller først (i denne rekkefølgen)
            const specialOrder = { 'alle': 0, 'siste12': 1, 'iaar': 2 };
            if (specialOrder[aId] !== undefined && specialOrder[bId] !== undefined) {
                return specialOrder[aId] - specialOrder[bId];
            }
            if (specialOrder[aId] !== undefined) return -1;
            if (specialOrder[bId] !== undefined) return 1;

            // Kvartal vs kvartal
            if (aId.includes('-') && bId.includes('-')) {
                const [aQ, aYear] = aId.split('-');
                const [bQ, bYear] = bId.split('-');
                const aYearNum = parseInt(aYear);
                const bYearNum = parseInt(bYear);

                if (aYearNum !== bYearNum) {
                    return aYearNum - bYearNum; // Sorter etter år først
                }

                // Samme år, sorter etter kvartal
                const quarterOrder = { 'q1': 1, 'q2': 2, 'q3': 3, 'q4': 4 };
                return quarterOrder[aQ] - quarterOrder[bQ];
            }

            // År vs år
            if (!aId.includes('-') && !bId.includes('-')) {
                return parseInt(aId) - parseInt(bId);
            }

            // Kvartal kommer etter år (hvis man blander, men det skal ikke skje)
            return aId.includes('-') ? 1 : -1;
        });
    }, [portefoljeData?.claimData?.SkadeDetaljer, selectedPeriods, selectedProducts, selectedCustomerType]);

    // Analyser skadedata basert på filtrerte skader
    const skadeAnalyse = useMemo(() => {
        if (filteredClaims.length === 0) {
            return {
                totalSkader: 0,
                totalUtbetalt: 0,
                totalReserver: 0,
                gjennomsnittsSkade: 0,
                skadetyper: [],
                månedligUtvikling: [],
                comparison: null
            };
        }

        const skader = filteredClaims;

        // Grunnleggende statistikk
        const totalSkader = skader.length;
        const totalUtbetalt = skader.reduce((sum, skade) => sum + (skade.Utbetalt || 0), 0);
        const totalReserver = skader.reduce((sum, skade) => sum + (skade.Skadereserve || 0), 0);
        const gjennomsnittsSkade = totalSkader > 0 ? totalUtbetalt / totalSkader : 0;

        // Skadetype-fordeling
        const skadetypeCount = {};
        skader.forEach(skade => {
            const type = skade.SkadekodeNivå1 || skade.Skadetype || 'Ukjent';
            skadetypeCount[type] = (skadetypeCount[type] || 0) + 1;
        });

        const skadetyper = Object.entries(skadetypeCount)
            .map(([type, count]) => ({
                name: type,
                value: count,
                prosent: ((count / totalSkader) * 100).toFixed(1)
            }))
            .sort((a, b) => b.value - a.value);

        // Månedlig utvikling
        const månedligData = {};
        skader.forEach(skade => {
            if (skade.Hendelsesdato) {
                const måned = new Date(skade.Hendelsesdato).toISOString().substr(0, 7); // YYYY-MM
                if (!månedligData[måned]) {
                    månedligData[måned] = {
                        måned: måned,
                        antall: 0,
                        utbetalt: 0,
                        reserver: 0,
                        total: 0
                    };
                }
                månedligData[måned].antall += 1;
                månedligData[måned].utbetalt += skade.Utbetalt || 0;
                månedligData[måned].reserver += skade.Skadereserve || 0;
                månedligData[måned].total += (skade.Utbetalt || 0) + (skade.Skadereserve || 0);
            }
        });

        const månedligUtvikling = Object.values(månedligData)
            .sort((a, b) => a.måned.localeCompare(b.måned))
            // Ikke hardkod "siste 12 måneder" - vis hele filtrerte perioden
            .map(item => ({
                ...item,
                måned: new Date(item.måned + '-01').toLocaleDateString('nb-NO', {
                    year: 'numeric',
                    month: 'short'
                }),
                gjennomsnitt: item.antall > 0 ? item.utbetalt / item.antall : 0
            }));

        // Beregn sammenligning hvis flere perioder er valgt
        let comparison = null;
        if (periodeMetrics.length >= 2) {
            const current = periodeMetrics[periodeMetrics.length - 1]; // Siste periode
            const previous = periodeMetrics[0]; // Første periode

            const calculateChange = (currentVal, previousVal) => {
                if (previousVal === 0) return { diff: currentVal, percent: currentVal > 0 ? 100 : 0 };
                const diff = currentVal - previousVal;
                const percent = (diff / previousVal) * 100;
                return { diff, percent };
            };

            comparison = {
                currentLabel: current.periodLabel,
                previousLabel: previous.periodLabel,
                totalSkader: calculateChange(current.totalSkader, previous.totalSkader),
                totalUtbetalt: calculateChange(current.totalUtbetalt, previous.totalUtbetalt),
                totalReserver: calculateChange(current.totalReserver, previous.totalReserver),
                gjennomsnittsSkade: calculateChange(current.gjennomsnittsSkade, previous.gjennomsnittsSkade)
            };
        }

        return {
            totalSkader,
            totalUtbetalt,
            totalReserver,
            gjennomsnittsSkade,
            skadetyper,
            månedligUtvikling,
            comparison
        };
    }, [filteredClaims, periodeMetrics]);

    // Søk, sorter og paginer skadeliste
    const { searchedAndSortedClaims, paginatedClaims, totalPages } = useMemo(() => {
        let processed = [...filteredClaims];

        // 1. SØK - filtrer på søketerm
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            processed = processed.filter(skade =>
                String(skade.Skadenummer || '').toLowerCase().includes(searchLower) ||
                String(skade.CustomerNumber || '').toLowerCase().includes(searchLower) ||
                String(skade.Bedriftsnavn || '').toLowerCase().includes(searchLower) ||
                String(skade.Fornavn || '').toLowerCase().includes(searchLower) ||
                String(skade.Etternavn || '').toLowerCase().includes(searchLower) ||
                String(skade.Produktnavn || '').toLowerCase().includes(searchLower) ||
                String(skade.Skadetype || '').toLowerCase().includes(searchLower) ||
                String(skade.Poststed || '').toLowerCase().includes(searchLower)
            );
        }

        // 2. SORTER
        processed.sort((a, b) => {
            let aVal, bVal;

            switch (sortColumn) {
                case 'Skadenummer':
                    aVal = a.Skadenummer || 0;
                    bVal = b.Skadenummer || 0;
                    break;
                case 'CustomerNumber':
                    aVal = a.CustomerNumber || 0;
                    bVal = b.CustomerNumber || 0;
                    break;
                case 'Kunde':
                    aVal = a.Bedriftsnavn || `${a.Fornavn || ''} ${a.Etternavn || ''}`;
                    bVal = b.Bedriftsnavn || `${b.Fornavn || ''} ${b.Etternavn || ''}`;
                    break;
                case 'Utbetalt':
                    aVal = a.Utbetalt || 0;
                    bVal = b.Utbetalt || 0;
                    break;
                case 'Skadereserve':
                    aVal = a.Skadereserve || 0;
                    bVal = b.Skadereserve || 0;
                    break;
                case 'Hendelsesdato':
                    aVal = a.Hendelsesdato ? new Date(a.Hendelsesdato).getTime() : 0;
                    bVal = b.Hendelsesdato ? new Date(b.Hendelsesdato).getTime() : 0;
                    break;
                case 'Skadestatus':
                    aVal = a.Skadestatus || '';
                    bVal = b.Skadestatus || '';
                    break;
                default:
                    aVal = a.Utbetalt || 0;
                    bVal = b.Utbetalt || 0;
            }

            // Sammenlign
            if (typeof aVal === 'string') {
                return sortDirection === 'asc'
                    ? aVal.localeCompare(bVal, 'nb-NO')
                    : bVal.localeCompare(aVal, 'nb-NO');
            } else {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
        });

        // 3. PAGINERING
        const total = Math.ceil(processed.length / itemsPerPage);
        const startIdx = (currentPage - 1) * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const paginated = processed.slice(startIdx, endIdx);

        return {
            searchedAndSortedClaims: processed,
            paginatedClaims: paginated,
            totalPages: total
        };
    }, [filteredClaims, searchTerm, sortColumn, sortDirection, currentPage, itemsPerPage]);

    // Handler for sortering
    const handleSort = (column) => {
        if (sortColumn === column) {
            // Toggle direction hvis samme kolonne
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Ny kolonne - start med desc for tall-kolonner, asc for tekst
            setSortColumn(column);
            setSortDirection(['Utbetalt', 'Skadereserve', 'Skadenummer', 'CustomerNumber'].includes(column) ? 'desc' : 'asc');
        }
        setCurrentPage(1); // Reset til side 1 ved sortering
    };

    // Reset til side 1 når søk endres
    const handleSearchChange = (value) => {
        setSearchTerm(value);
        setCurrentPage(1);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('nb-NO', {
            style: 'currency',
            currency: 'NOK',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16'];

    return (
        <div className="space-y-6">
            {/* Empty state når ingen skader funnet i valgt periode */}
            {filteredClaims.length === 0 && selectedPeriods.length > 0 && (
                <Card className="bg-gray-50 border-gray-200">
                    <CardContent className="p-12 text-center">
                        <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            Ingen skader funnet i valgt periode
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Det er ingen registrerte skader for{' '}
                            {selectedPeriods.map(getPeriodLabel).join(', ')}
                        </p>
                        <p className="text-xs text-gray-400">
                            Prøv å velge en annen periode eller sjekk at dataene er korrekt lastet
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* KPI-grafer - vis sammenligning hvis flere perioder, ellers kompakte kort */}
            {filteredClaims.length > 0 && (
            <>
            {periodeMetrics.length > 1 ? (
                /* SAMMENLIGNING MED GRAFER */
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-purple-600" />
                            Periode-sammenligning
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Antall skader sammenligning */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Antall skader</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={periodeMetrics}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="periodLabel" fontSize={12} />
                                            <YAxis fontSize={12} />
                                            <Tooltip formatter={(value) => value.toLocaleString('nb-NO')} />
                                            <Bar dataKey="totalSkader" fill="#ef4444" name="Antall skader" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Utbetalt beløp sammenligning */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Total skadekostnad</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={periodeMetrics}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="periodLabel" fontSize={12} />
                                            <YAxis fontSize={12} />
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const utbetalt = payload[0].value;
                                                        const reservert = payload[1].value;
                                                        const total = utbetalt + reservert;
                                                        return (
                                                            <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                                                                <p className="text-sm font-medium mb-1">{payload[0].payload.periodLabel}</p>
                                                                <p className="text-xs text-blue-600">Utbetalt: {formatCurrency(utbetalt)}</p>
                                                                <p className="text-xs text-blue-400">Reservert: {formatCurrency(reservert)}</p>
                                                                <p className="text-xs font-bold text-blue-800 mt-1 pt-1 border-t">Total: {formatCurrency(total)}</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                                cursor={{fill: 'rgba(0, 0, 0, 0.1)'}}
                                            />
                                            <Legend />
                                            <Bar dataKey="totalUtbetalt" stackId="a" fill="#3b82f6" name="Utbetalt" />
                                            <Bar dataKey="totalReserver" stackId="a" fill="#93c5fd" name="Reservert" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Gjennomsnittsskade sammenligning */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Gjennomsnittsskade</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={periodeMetrics}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="periodLabel" fontSize={12} />
                                            <YAxis fontSize={12} />
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const utbetalt = payload[0].value;
                                                        const reservert = payload[1].value;
                                                        const total = utbetalt + reservert;
                                                        return (
                                                            <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                                                                <p className="text-sm font-medium mb-1">{payload[0].payload.periodLabel}</p>
                                                                <p className="text-xs text-green-600">Utbetalt (snitt): {formatCurrency(utbetalt)}</p>
                                                                <p className="text-xs text-green-400">Reservert (snitt): {formatCurrency(reservert)}</p>
                                                                <p className="text-xs font-bold text-green-800 mt-1 pt-1 border-t">Total (snitt): {formatCurrency(total)}</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                                cursor={{fill: 'rgba(0, 0, 0, 0.1)'}}
                                            />
                                            <Legend />
                                            <Bar dataKey="gjennomsnittsSkadeUtbetalt" stackId="a" fill="#10b981" name="Utbetalt (snitt)" />
                                            <Bar dataKey="gjennomsnittsSkadeReservert" stackId="a" fill="#86efac" name="Reservert (snitt)" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Reserver sammenligning */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Skadereserver</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={periodeMetrics}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="periodLabel" fontSize={12} />
                                            <YAxis fontSize={12} />
                                            <Tooltip formatter={(value) => formatCurrency(value)} />
                                            <Bar dataKey="totalReserver" fill="#f59e0b" name="Reserver" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                /* ENKELT-PERIODE KPI-KORT */
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600">Totalt antall skader</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        {skadeAnalyse.totalSkader.toLocaleString('nb-NO')}
                                    </p>
                                </div>
                                <AlertTriangle className="h-8 w-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600">Total utbetalt</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {formatCurrency(skadeAnalyse.totalUtbetalt)}
                                    </p>
                                </div>
                                <DollarSign className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600">Gjennomsnittsskade</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {formatCurrency(skadeAnalyse.gjennomsnittsSkade)}
                                    </p>
                                </div>
                                <Target className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600">Aktive reserver</p>
                                    <p className="text-2xl font-bold text-orange-600">
                                        {formatCurrency(skadeAnalyse.totalReserver)}
                                    </p>
                                </div>
                                <Activity className="h-8 w-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Skadetype-fordeling og månedlig utvikling */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Skadetype-fordeling */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Skadetype-fordeling
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={skadeAnalyse.skadetyper.slice(0, 7)} // Top 7 skadetyper
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={120}
                                        dataKey="value"
                                        label={({ name, prosent }) => `${name} (${prosent}%)`}
                                    >
                                        {skadeAnalyse.skadetyper.slice(0, 7).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [value, 'Antall skader']} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Skadetype-liste */}
                        <div className="mt-4 space-y-2">
                            {skadeAnalyse.skadetyper.slice(0, 5).map((type, index) => (
                                <div key={type.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <span>{type.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{type.value}</span>
                                        <Badge variant="outline">{type.prosent}%</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Månedlig skadeutvikling */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                                Månedlig skadeutvikling
                            </CardTitle>

                            {/* Velger for metrikk */}
                            <div className="flex gap-1">
                                <Button
                                    variant={chartMetric === 'antall' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setChartMetric('antall')}
                                    className="text-xs"
                                >
                                    Antall
                                </Button>
                                <Button
                                    variant={chartMetric === 'utbetalt' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setChartMetric('utbetalt')}
                                    className="text-xs"
                                >
                                    Utbetalt
                                </Button>
                                <Button
                                    variant={chartMetric === 'reserver' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setChartMetric('reserver')}
                                    className="text-xs"
                                >
                                    Reserver
                                </Button>
                                <Button
                                    variant={chartMetric === 'total' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setChartMetric('total')}
                                    className="text-xs"
                                >
                                    Total
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={skadeAnalyse.månedligUtvikling}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="måned"
                                        fontSize={12}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis fontSize={12} />
                                    <Tooltip
                                        formatter={(value, name) => {
                                            // Velg riktig format basert på metric
                                            if (chartMetric === 'antall') {
                                                return [value.toLocaleString('nb-NO'), 'Antall skader'];
                                            } else if (chartMetric === 'utbetalt') {
                                                return [formatCurrency(value), 'Utbetalt beløp'];
                                            } else if (chartMetric === 'reserver') {
                                                return [formatCurrency(value), 'Skadereserver'];
                                            } else {
                                                return [formatCurrency(value), 'Total (Utbetalt + Reserver)'];
                                            }
                                        }}
                                    />
                                    <Legend />
                                    {chartMetric === 'antall' && (
                                        <Bar dataKey="antall" fill="#3b82f6" name="Antall skader" />
                                    )}
                                    {chartMetric === 'utbetalt' && (
                                        <Bar dataKey="utbetalt" fill="#ef4444" name="Utbetalt beløp" />
                                    )}
                                    {chartMetric === 'reserver' && (
                                        <Bar dataKey="reserver" fill="#f59e0b" name="Skadereserver" />
                                    )}
                                    {chartMetric === 'total' && (
                                        <Bar dataKey="total" fill="#8b5cf6" name="Total (Utbetalt + Reserver)" />
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Skade-insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Total skadekostnad</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">
                                {formatCurrency(skadeAnalyse.totalUtbetalt + skadeAnalyse.totalReserver)}
                            </p>
                            <p className="text-sm text-gray-600">utbetalt + reserver</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Største skadetype</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center">
                            <p className="text-lg font-bold text-red-600">
                                {skadeAnalyse.skadetyper[0]?.name || 'Ingen data'}
                            </p>
                            <p className="text-sm text-gray-600">
                                {skadeAnalyse.skadetyper[0]?.prosent || '0'}% av alle skader
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Skadestatus</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {['Oppgjort', 'Under behandling', 'Avslått'].map(status => {
                                const count = filteredClaims.filter(s => s.Skadestatus === status).length;
                                const prosent = skadeAnalyse.totalSkader > 0 ? ((count / skadeAnalyse.totalSkader) * 100).toFixed(1) : '0';

                                return (
                                    <div key={status} className="flex justify-between text-sm">
                                        <span>{status}:</span>
                                        <span className="font-medium">{count} ({prosent}%)</span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
            </>
            )}
        </div>
    );
};

export default Skaderapport;

