import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
    Calendar,
    TrendingUp
} from 'lucide-react';

const AutoComparisonFilter = ({ portefoljeData, onFilterChange }) => {
    const [selectedPeriods, setSelectedPeriods] = useState([]);

    // Finn tilgjengelige år automatisk
    const availableYears = useMemo(() => {
        if (!portefoljeData?.customers) return [];

        const years = new Set();
        portefoljeData.customers.forEach(customer => {
            customer.PolicyList?.forEach(policy => {
                if (policy.InceptionDate) {
                    years.add(new Date(policy.InceptionDate).getFullYear());
                }
                policy.PolicyProduct?.forEach(product => {
                    if (product.InceptionDate) {
                        years.add(new Date(product.InceptionDate).getFullYear());
                    }
                });
            });
        });

        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [portefoljeData?.customers]);

    // Sjekk om periode er tilgjengelig (ikke fremtidig)
    const isPeriodAvailable = (periodId) => {
        const now = new Date();
        const norskTid = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
        const currentYear = norskTid.getFullYear();
        const currentQuarter = Math.floor((norskTid.getMonth() + 3) / 3);

        // Hurtigvalg er alltid tilgjengelig
        if (['alle', 'siste12', 'iaar'].includes(periodId)) {
            return true;
        }

        // År er tilgjengelig hvis det er <= inneværende år
        if (!periodId.includes('-')) {
            return parseInt(periodId) <= currentYear;
        }

        // Kvartaler
        if (periodId.includes('-')) {
            const [quarter, year] = periodId.split('-');
            const qNum = parseInt(quarter.substring(1)); // q1 -> 1
            const yearNum = parseInt(year);

            // Tidligere år: alle kvartaler tilgjengelig
            if (yearNum < currentYear) {
                return true;
            }

            // Inneværende år: kun kvartaler som er ferdige
            if (yearNum === currentYear) {
                return qNum < currentQuarter; // Q1, Q2 tilgjengelig hvis vi er i Q3
            }

            // Fremtidige år: ikke tilgjengelig
            return false;
        }

        return true;
    };

    // Sjekk om periode kan legges til (samme kategori)
    const canAddPeriod = (periodId) => {
        if (selectedPeriods.length === 0) {
            return isPeriodAvailable(periodId);
        }

        // Sjekk kategori-kompatibilitet
        const firstPeriod = selectedPeriods[0];

        // Hurtigvalg kan ikke blandes med andre
        if (['alle', 'siste12', 'iaar'].includes(firstPeriod) ||
            ['alle', 'siste12', 'iaar'].includes(periodId)) {
            return false;
        }

        // År kan kun sammenlignes med år
        const firstIsYear = !firstPeriod.includes('-');
        const newIsYear = !periodId.includes('-');

        if (firstIsYear && !newIsYear) {
            return false; // Kan ikke blande år og kvartal
        }
        if (!firstIsYear && newIsYear) {
            return false; // Kan ikke blande kvartal og år
        }

        return isPeriodAvailable(periodId);
    };

    // Toggle periode (legg til eller fjern)
    const togglePeriod = (periodId) => {
        const isSelected = selectedPeriods.includes(periodId);

        if (isSelected) {
            // Fjern periode
            const newPeriods = selectedPeriods.filter(p => p !== periodId);
            setSelectedPeriods(newPeriods);
        } else {
            // Legg til periode hvis kompatibel
            if (canAddPeriod(periodId)) {
                const newPeriods = [...selectedPeriods, periodId];
                setSelectedPeriods(newPeriods);
            }
        }
    };

    const isSelected = (periodId) => selectedPeriods.includes(periodId);
    const isComparison = selectedPeriods.length > 1;

    // Finn faktisk datospann i datasettet
    const getDatasetDateRange = () => {
        if (!portefoljeData?.customers) return { start: null, end: null };

        const alleDatoer = [];
        portefoljeData.customers.forEach(customer => {
            customer.PolicyList?.forEach(policy => {
                if (policy.InceptionDate) {
                    alleDatoer.push(new Date(policy.InceptionDate));
                }
                policy.PolicyProduct?.forEach(product => {
                    if (product.InceptionDate) {
                        alleDatoer.push(new Date(product.InceptionDate));
                    }
                });
            });
        });

        if (alleDatoer.length === 0) return { start: null, end: null };
        alleDatoer.sort((a, b) => a - b);
        return {
            start: alleDatoer[0],
            end: alleDatoer[alleDatoer.length - 1]
        };
    };

    // Beregn eksakte datoer for periode
    const getPeriodDates = (period) => {
        const now = new Date();
        const norskTid = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
        const yesterday = new Date(norskTid);
        yesterday.setDate(yesterday.getDate() - 1);

        switch (period) {
            case 'alle':
                const dataRange = getDatasetDateRange();
                if (dataRange.start) {
                    return {
                        start: dataRange.start.toLocaleDateString('nb-NO'),
                        end: yesterday.toLocaleDateString('nb-NO'),
                        label: 'Alle data'
                    };
                }
                return { start: 'Alle', end: 'Alle', label: 'Alle data' };

            case 'siste12':
                const siste12Start = new Date(yesterday);
                siste12Start.setFullYear(siste12Start.getFullYear() - 1);
                siste12Start.setDate(siste12Start.getDate() + 1);
                return {
                    start: siste12Start.toLocaleDateString('nb-NO'),
                    end: yesterday.toLocaleDateString('nb-NO'),
                    label: 'Siste 12 måneder'
                };

            case 'iaar':
                // Finn første dato i inneværende år fra datasettet
                let aarStart = new Date(norskTid.getFullYear(), 0, 1);
                const currentYear = norskTid.getFullYear();
                const alleDatoer = [];

                portefoljeData.customers?.forEach(customer => {
                    customer.PolicyList?.forEach(policy => {
                        if (policy.InceptionDate) {
                            const policyDate = new Date(policy.InceptionDate);
                            if (policyDate.getFullYear() === currentYear) {
                                alleDatoer.push(policyDate);
                            }
                        }
                    });
                });

                if (alleDatoer.length > 0) {
                    alleDatoer.sort((a, b) => a - b);
                    aarStart = alleDatoer[0];
                }

                return {
                    start: aarStart.toLocaleDateString('nb-NO'),
                    end: yesterday.toLocaleDateString('nb-NO'),
                    label: `I år (${norskTid.getFullYear()})`
                };

            default:
                // År eller kvartal
                if (period.includes('-')) {
                    const [quarter, year] = period.split('-');
                    const yearNum = parseInt(year);

                    let startMonth, endMonth, endDay;
                    switch (quarter) {
                        case 'q1':
                            startMonth = 0; endMonth = 2; endDay = 31;
                            break;
                        case 'q2':
                            startMonth = 3; endMonth = 5; endDay = 30;
                            break;
                        case 'q3':
                            startMonth = 6; endMonth = 8; endDay = 30;
                            break;
                        case 'q4':
                            startMonth = 9; endMonth = 11; endDay = 31;
                            break;
                    }

                    const qStart = new Date(yearNum, startMonth, 1);
                    let qEnd = new Date(yearNum, endMonth, endDay);

                    // Hvis inneværende år, bruk gårsdagen som slutt hvis før kvartalets slutt
                    if (yearNum === norskTid.getFullYear() && yesterday < qEnd) {
                        qEnd = yesterday;
                    }

                    return {
                        start: qStart.toLocaleDateString('nb-NO'),
                        end: qEnd.toLocaleDateString('nb-NO'),
                        label: `${quarter.toUpperCase()} ${year}`
                    };
                } else {
                    // Helt år
                    const year = parseInt(period);
                    const currentYear = norskTid.getFullYear();

                    // Hvis inneværende år, bruk gårsdagen som slutt
                    if (year === currentYear) {
                        return {
                            start: `01.01.${year}`,
                            end: yesterday.toLocaleDateString('nb-NO'),
                            label: `År ${year}`
                        };
                    } else {
                        // Historiske år: hele året
                        return {
                            start: `01.01.${year}`,
                            end: `31.12.${year}`,
                            label: `År ${year}`
                        };
                    }
                }
        }
    };

    // Beregn periode-beskrivelse (kort versjon)
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Velg periode{isComparison ? 'r for sammenligning' : ''}
                    {isComparison && (
                        <Badge variant="default" className="ml-2">
                            {selectedPeriods.length} valgt
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Hurtigvalg */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Hurtigvalg</h4>
                        <div className="space-y-2">
                            {['alle', 'siste12', 'iaar'].map(periodId => {
                                const selected = isSelected(periodId);
                                const canAdd = canAddPeriod(periodId);
                                const labels = {
                                    'alle': 'Alle data',
                                    'siste12': 'Siste 12 mnd',
                                    'iaar': 'I år (2025)'
                                };

                                return (
                                    <Button
                                        key={periodId}
                                        variant={selected ? "default" : "outline"}
                                        onClick={() => togglePeriod(periodId)}
                                        disabled={!selected && !canAdd}
                                        className={`w-full justify-start ${!canAdd && !selected ? "opacity-60" : ""}`}
                                        title={!canAdd && !selected ? "Kan ikke blandes med andre kategorier" : ""}
                                    >
                                        {labels[periodId]}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* År-valg */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">År</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {availableYears.map(year => {
                                const yearId = year.toString();
                                const available = isPeriodAvailable(yearId);
                                const canAdd = canAddPeriod(yearId);
                                const selected = isSelected(yearId);

                                return (
                                    <Button
                                        key={String(year)}
                                        variant={selected ? "default" : "outline"}
                                        onClick={() => togglePeriod(yearId)}
                                        disabled={!available || (!selected && !canAdd)}
                                        className={`${!available ? "opacity-50" : ""}`}
                                        size="sm"
                                    >
                                        {year}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Kvartal-valg */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Kvartaler</h4>
                        <div className="space-y-3">
                            {availableYears.slice(0, 3).map(year => (
                                <div key={String(year)}>
                                    <p className="text-xs text-gray-500 mb-2">{year}:</p>
                                    <div className="grid grid-cols-4 gap-1">
                                        {['q1', 'q2', 'q3', 'q4'].map(quarter => {
                                            const periodId = `${quarter}-${year}`;
                                            const available = isPeriodAvailable(periodId);
                                            const canAdd = canAddPeriod(periodId);
                                            const selected = isSelected(periodId);

                                            return (
                                                <Button
                                                    key={periodId}
                                                    size="sm"
                                                    variant={selected ? "default" : "outline"}
                                                    onClick={() => togglePeriod(periodId)}
                                                    disabled={!available || (!selected && !canAdd)}
                                                    className={`text-xs ${!available ? "opacity-50" : ""} ${!canAdd && !selected ? "opacity-60" : ""}`}
                                                    title={
                                                        !available ? "Ikke ferdig" :
                                                            !canAdd && !selected ? "Inkompatibel" :
                                                                ""
                                                    }
                                                >
                                                    {quarter.toUpperCase()}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Valgte perioder og analyse-knapp */}
                {selectedPeriods.length > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-blue-800">
                                {isComparison ? 'Sammenligning:' : 'Valgt periode:'}
                            </h4>
                            <Button
                                onClick={() => onFilterChange?.(selectedPeriods, isComparison)}
                                className="flex items-center gap-2"
                                size="sm"
                            >
                                <TrendingUp className="h-4 w-4" />
                                Analyser {isComparison ? `${selectedPeriods.length} perioder` : 'periode'}
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {selectedPeriods.map((period, index) => {
                                const dates = getPeriodDates(period);
                                return (
                                    <div key={period} className="flex items-center justify-between p-2 bg-white rounded border">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className="text-xs">
                                                {index + 1}
                                            </Badge>
                                            <span className="font-medium text-sm">{dates.label}</span>
                                        </div>
                                        <span className="text-xs text-gray-600">
                                            {dates.start} - {dates.end}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default AutoComparisonFilter;
