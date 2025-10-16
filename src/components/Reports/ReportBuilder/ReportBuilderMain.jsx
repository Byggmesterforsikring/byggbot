import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { ToggleGroup, ToggleGroupItem } from '../../ui/toggle-group';
import { Calendar, Database, BarChart3, Loader2, Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import FieldsPalette from './components/FieldsPalette';
import PipelineCanvas from './components/PipelineCanvas';
import OperationsPalette from './components/OperationsPalette';
import ResultsViewer from './components/ResultsViewer';
import ChunkingInfo from './components/ChunkingInfo';
import { ToastProvider, useToast } from './components/ui/toast-context';

const ReportBuilderContent = () => {
    const { toast } = useToast();
    const autoExecuteRef = useRef(false); // Prevent duplicate auto-execution
    const [selectedReportType, setSelectedReportType] = useState('');
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    // Sammenligning: periode 2
    const [compareMode, setCompareMode] = useState(false);
    const [dateRangeB, setDateRangeB] = useState({ startDate: '', endDate: '' });
    const [selectedDatePreset, setSelectedDatePreset] = useState('last30');
    const [selectedDatePresetB, setSelectedDatePresetB] = useState('last30');
    const [useCustomDates, setUseCustomDates] = useState(false);
    const [useCustomDatesB, setUseCustomDatesB] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [rawData, setRawData] = useState(null);
    const [rawDataCompare, setRawDataCompare] = useState(null);
    const [dataSchema, setDataSchema] = useState(null);
    const [currentStep, setCurrentStep] = useState('setup'); // 'setup', 'building', 'results'
    const [pipelineResult, setPipelineResult] = useState(null);
    const [pipelineResultCompare, setPipelineResultCompare] = useState(null);
    const [pipelineOperations, setPipelineOperations] = useState([]); // behold pipeline på tvers av navigasjon
    // Hurtigvalg for sammenligningsperiode
    // 'manual' | 'same_period_last_year' | 'previous_same_length'
    const [compareQuickPreset, setCompareQuickPreset] = useState('same_period_last_year');
    // Kvartalmodus
    const [quarterMode, setQuarterMode] = useState(false);
    const [quarterYearA, setQuarterYearA] = useState(new Date().getFullYear());
    const [quartersA, setQuartersA] = useState([]); // ['Q1','Q2',...]
    const [quarterYearB, setQuarterYearB] = useState(new Date().getFullYear() - 1);
    const [quartersB, setQuartersB] = useState([]);

    // Overlapp-varsel for sammenligningsperioder
    const isOverlap = (() => {
        if (!compareMode) return false;
        if (quarterMode) {
            if (!quartersA.length || !quartersB.length) return false;
            const setA = new Set(quartersA.map(q => `${quarterYearA}-${q}`));
            return quartersB.some(q => setA.has(`${quarterYearB}-${q}`));
        }
        if (!dateRange?.startDate || !dateRange?.endDate || !dateRangeB?.startDate || !dateRangeB?.endDate) return false;
        const aStart = new Date(dateRange.startDate);
        const aEnd = new Date(dateRange.endDate);
        const bStart = new Date(dateRangeB.startDate);
        const bEnd = new Date(dateRangeB.endDate);
        aStart.setHours(0, 0, 0, 0); aEnd.setHours(0, 0, 0, 0); bStart.setHours(0, 0, 0, 0); bEnd.setHours(0, 0, 0, 0);
        return aStart <= bEnd && bStart <= aEnd;
    })();

    // Available report types - Dette vil kunne utvides
    const reportTypes = [
        {
            id: 'skade',
            name: 'Skaderapport',
            description: 'Analyse av skader og utbetalinger',
            apiName: 'API_Byggbot_skaderapport',
            Icon: Shield
        },
        {
            id: 'nysalg',
            name: 'Nysalgsrapport',
            description: 'Nye kunder og poliser',
            apiName: 'API_Byggbot_nysalgsrapport',
            Icon: TrendingUp
        }
    ];

    // Hjelper for lokal datoformat (unngå UTC-avvik)
    const formatLocalDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Date presets configuration
    const datePresets = [
        {
            id: 'last7',
            name: 'Siste 7 dager',
            getDates: () => {
                const today = new Date();
                const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
                return {
                    startDate: formatLocalDate(start),
                    endDate: formatLocalDate(today)
                };
            }
        },
        {
            id: 'last30',
            name: 'Siste 30 dager',
            getDates: () => {
                const today = new Date();
                const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
                return {
                    startDate: formatLocalDate(start),
                    endDate: formatLocalDate(today)
                };
            }
        },
        {
            id: 'last90',
            name: 'Siste 90 dager',
            getDates: () => {
                const today = new Date();
                const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 89);
                return {
                    startDate: formatLocalDate(start),
                    endDate: formatLocalDate(today)
                };
            }
        },
        {
            id: 'last12months',
            name: 'Siste 12 måneder',
            getDates: () => {
                const today = new Date();
                const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 364);
                return {
                    startDate: formatLocalDate(start),
                    endDate: formatLocalDate(today)
                };
            }
        },
        {
            id: 'thisMonth',
            name: 'Denne måneden',
            getDates: () => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                return {
                    startDate: formatLocalDate(firstDay),
                    endDate: formatLocalDate(today)
                };
            }
        },
        {
            id: 'lastMonth',
            name: 'Forrige måned',
            getDates: () => {
                const today = new Date();
                const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                return {
                    startDate: formatLocalDate(firstDayLastMonth),
                    endDate: formatLocalDate(lastDayLastMonth)
                };
            }
        },
        {
            id: 'thisQuarter',
            name: 'Dette kvartal',
            getDates: () => {
                const today = new Date();
                const q = Math.floor(today.getMonth() / 3); // 0-3
                const firstDayQuarter = new Date(today.getFullYear(), q * 3, 1);
                return {
                    startDate: formatLocalDate(firstDayQuarter),
                    endDate: formatLocalDate(today)
                };
            }
        },
        {
            id: 'lastQuarter',
            name: 'Forrige kvartal',
            getDates: () => {
                const today = new Date();
                const q = Math.floor(today.getMonth() / 3); // current quarter index
                const lastQMonth = (q * 3) - 1; // end month of previous quarter
                const end = new Date(today.getFullYear(), lastQMonth + 1, 0); // last day previous quarter
                const start = new Date(today.getFullYear(), lastQMonth - 2, 1); // first day previous quarter
                return {
                    startDate: formatLocalDate(start),
                    endDate: formatLocalDate(end)
                };
            }
        },
        {
            id: 'thisYear',
            name: 'Dette året',
            getDates: () => {
                const today = new Date();
                const firstDayYear = new Date(today.getFullYear(), 0, 1);
                return {
                    startDate: formatLocalDate(firstDayYear),
                    endDate: formatLocalDate(today)
                };
            }
        },
        {
            id: 'lastYear',
            name: 'Forrige år',
            getDates: () => {
                const today = new Date();
                const firstDayLastYear = new Date(today.getFullYear() - 1, 0, 1);
                const lastDayLastYear = new Date(today.getFullYear() - 1, 11, 31);
                return {
                    startDate: formatLocalDate(firstDayLastYear),
                    endDate: formatLocalDate(lastDayLastYear)
                };
            }
        },
        {
            id: 'custom',
            name: 'Egendefinert periode',
            getDates: () => null // Will use manual input
        }
    ];

    // Set default date range based on preset
    useEffect(() => {
        if (selectedDatePreset !== 'custom') {
            const preset = datePresets.find(p => p.id === selectedDatePreset);
            if (preset && preset.getDates) {
                const dates = preset.getDates();
                if (dates) {
                    setDateRange(dates);
                    setUseCustomDates(false);
                }
            }
        } else {
            setUseCustomDates(true);
        }
    }, [selectedDatePreset]);

    // Set dates for periode 2
    useEffect(() => {
        if (selectedDatePresetB !== 'custom') {
            const preset = datePresets.find(p => p.id === selectedDatePresetB);
            if (preset && preset.getDates) {
                const dates = preset.getDates();
                if (dates) {
                    setDateRangeB(dates);
                    setUseCustomDatesB(false);
                }
            }
        } else {
            setUseCustomDatesB(true);
        }
    }, [selectedDatePresetB]);

    // Re-beregn Periode 2 automatisk ut fra hurtigvalg (når Periode 1 endres)
    useEffect(() => {
        if (!compareMode) return;
        if (quarterMode) {
            if (compareQuickPreset === 'same_period_last_year') {
                setQuarterYearB(quarterYearA - 1);
                setQuartersB(quartersA);
            } else if (compareQuickPreset === 'previous_same_length') {
                if (quartersA.length === 0) return;
                const order = ['Q1', 'Q2', 'Q3', 'Q4'];
                const count = quartersA.length;
                const minIdx = Math.min(...quartersA.map(q => order.indexOf(q)));
                let endIdx = minIdx - 1;
                let year = quarterYearA;
                if (endIdx < 0) { endIdx = 3; year = quarterYearA - 1; }
                const list = [];
                for (let i = 0; i < count; i++) {
                    list.unshift(order[endIdx]);
                    endIdx--; if (endIdx < 0) { endIdx = 3; year--; }
                }
                // Hvis vi krysset år, legg året til B korrekt
                setQuarterYearB(year);
                setQuartersB(list);
            }
            return;
        }
        if (!dateRange.startDate || !dateRange.endDate) return;
        if (compareQuickPreset === 'manual') return;

        const toDate = (s) => { const d = new Date(s); d.setHours(0, 0, 0, 0); return d; };
        const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
        const shiftYears = (d, n) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; };

        const aStart = toDate(dateRange.startDate);
        const aEnd = toDate(dateRange.endDate);
        const lenDays = Math.floor((aEnd - aStart) / (1000 * 60 * 60 * 24)) + 1;

        let bStart; let bEnd;
        if (compareQuickPreset === 'same_period_last_year') {
            bStart = shiftYears(aStart, -1);
            bEnd = shiftYears(aEnd, -1);
        } else if (compareQuickPreset === 'previous_same_length') {
            bEnd = addDays(aStart, -1);
            bStart = addDays(bEnd, -(lenDays - 1));
        }

        if (bStart && bEnd) {
            setSelectedDatePresetB('custom');
            setUseCustomDatesB(true);
            setDateRangeB({ startDate: formatLocalDate(bStart), endDate: formatLocalDate(bEnd) });
        }
    }, [compareMode, compareQuickPreset, dateRange.startDate, dateRange.endDate]);



    // Handle preset change
    const handleDatePresetChange = (presetId) => {
        setSelectedDatePreset(presetId);
        if (presetId === 'custom') {
            setUseCustomDates(true);
        }
    };

    const handleDatePresetChangeB = (presetId) => {
        setSelectedDatePresetB(presetId);
        if (presetId === 'custom') {
            setUseCustomDatesB(true);
        }
    };

    // Analyze JSON data structure and infer types
    const analyzeDataSchema = (jsonData) => {
        if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
            return null;
        }

        const sampleSize = Math.min(100, jsonData.length); // Analyze first 100 records
        const sample = jsonData.slice(0, sampleSize);
        const fields = {};

        // Analyze each field in the sample
        sample.forEach(record => {
            Object.keys(record).forEach(fieldName => {
                if (!fields[fieldName]) {
                    fields[fieldName] = {
                        name: fieldName,
                        values: [],
                        nullCount: 0,
                        types: new Set()
                    };
                }

                const value = record[fieldName];
                if (value === null || value === undefined || value === '') {
                    fields[fieldName].nullCount++;
                } else {
                    fields[fieldName].values.push(value);
                    fields[fieldName].types.add(typeof value);
                }
            });
        });

        // Infer types and metadata for each field
        const schema = Object.keys(fields).map(fieldName => {
            const field = fields[fieldName];
            const nonNullValues = field.values;
            const uniqueValues = [...new Set(nonNullValues)];

            let inferredType = 'string';
            let suggestedCategory = 'text';
            let isGroupable = false;
            let isAggregatable = false;
            let sampleValues = uniqueValues.slice(0, 10);

            // Type inference logic
            if (field.types.has('number')) {
                inferredType = 'number';
                isAggregatable = true;

                // Check if it might be currency
                const hasLargeNumbers = nonNullValues.some(v => v > 1000);
                const hasDecimals = nonNullValues.some(v => v % 1 !== 0);
                if (hasLargeNumbers && (fieldName.toLowerCase().includes('utbetalt') ||
                    fieldName.toLowerCase().includes('premie') ||
                    fieldName.toLowerCase().includes('beløp'))) {
                    suggestedCategory = 'currency';
                }

                // Check if it might be an ID or identifier
                const isUnique = uniqueValues.length === nonNullValues.length;
                const isHighlyUnique = uniqueValues.length > (nonNullValues.length * 0.8);
                if ((isUnique || isHighlyUnique) && !hasDecimals) {
                    suggestedCategory = 'id';
                    isAggregatable = false;
                }
            } else if (field.types.has('string')) {
                // Check if it's a date
                const datePattern = /^\d{4}-\d{2}-\d{2}/;
                if (nonNullValues.some(v => datePattern.test(v))) {
                    inferredType = 'date';
                    suggestedCategory = 'date';
                }
                // Check if it might be an ID field (name pattern)
                else if (fieldName.toLowerCase().includes('number') ||
                    fieldName.toLowerCase().includes('id') ||
                    fieldName.toLowerCase().includes('customer') ||
                    fieldName.toLowerCase().includes('kunde') ||
                    fieldName.toLowerCase().includes('policy')) {
                    suggestedCategory = 'id';
                    isGroupable = true; // IDs can be grouped for DISTINCT counts
                }
                // Check if it's categorical (limited unique values)
                else if (uniqueValues.length <= Math.min(20, sampleSize * 0.5)) {
                    suggestedCategory = 'category';
                    isGroupable = true;
                } else {
                    suggestedCategory = 'text';
                }
            }

            return {
                name: fieldName,
                type: inferredType,
                category: suggestedCategory,
                isGroupable,
                isAggregatable,
                uniqueCount: uniqueValues.length,
                totalCount: nonNullValues.length,
                nullPercentage: (field.nullCount / sampleSize) * 100,
                sampleValues,
                displayName: fieldName // Can be customized later
            };
        });

        return {
            totalRecords: jsonData.length,
            analyzedRecords: sampleSize,
            fields: schema.sort((a, b) => {
                // Sort by usefulness: groupable first, then aggregatable, then others
                if (a.isGroupable !== b.isGroupable) return b.isGroupable - a.isGroupable;
                if (a.isAggregatable !== b.isAggregatable) return b.isAggregatable - a.isAggregatable;
                return a.name.localeCompare(b.name);
            })
        };
    };


    const handleFetchData = async () => {
        if (!selectedReportType) { toast.warning('Velg rapporttype'); return; }
        if (!quarterMode && (!dateRange.startDate || !dateRange.endDate)) { toast.warning('Velg datoperiode'); return; }
        if (quarterMode && quartersA.length === 0) { toast.warning('Velg minst ett kvartal for Periode 1'); return; }

        setIsLoading(true);

        try {
            const reportConfig = reportTypes.find(r => r.id === selectedReportType);

            // Advarsel ved overlapp
            if (compareMode && isOverlap) {
                const proceed = window.confirm('Advarsel: Periode 1 og Periode 2 overlapper. Vil du fortsette?');
                if (!proceed) {
                    setIsLoading(false);
                    return;
                }
            }
            const fetchOne = async (params) => {
                console.log('🔍 Henter data med parametere:', params);

                // Check if this might be a chunked request
                const startDate = new Date(params.StartDate);
                const endDate = new Date(params.EndDate);
                const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth();

                if (monthsDiff > 6) {
                    const chunks = Math.ceil(monthsDiff / 6);
                    setLoadingStatus(`Henter data i ${chunks} deler (${monthsDiff} måneder er mye data)...`);
                } else {
                    setLoadingStatus('Henter data...');
                }

                const res = await window.electron.dashboard.fetchStats(params);
                console.log('📊 API respons mottatt:', res);
                let arr = [];
                if (selectedReportType === 'skade') {
                    arr = res?.SkadeDetaljer || [];
                } else if (selectedReportType === 'nysalg') {
                    arr = Array.isArray(res) ? res : [];
                }
                return arr;
            };

            const quarterToRange = (year, q) => {
                const m = { Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11] }[q];
                const start = new Date(year, m[0], 1);
                const end = new Date(year, m[1] + 1, 0);
                return { StartDate: formatLocalDate(start), EndDate: formatLocalDate(end) };
            };

            let dataArrayA = [];
            let dataArrayB = null;

            if (quarterMode) {
                // A
                for (const q of quartersA) {
                    const r = quarterToRange(quarterYearA, q);
                    const a = await fetchOne({ reportName: reportConfig.apiName, ...r });
                    dataArrayA = dataArrayA.concat(a);
                }
                if (compareMode) {
                    if (quartersB.length === 0) { alert('Velg kvartaler for Periode 2'); return; }
                    dataArrayB = [];
                    for (const q of quartersB) {
                        const r = quarterToRange(quarterYearB, q);
                        const b = await fetchOne({ reportName: reportConfig.apiName, ...r });
                        dataArrayB = dataArrayB.concat(b);
                    }
                }
            } else {
                const paramsA = { reportName: reportConfig.apiName, StartDate: dateRange.startDate, EndDate: dateRange.endDate };
                if (compareMode) {
                    if (!dateRangeB.startDate || !dateRangeB.endDate) { alert('Velg periode 2'); return; }
                    const paramsB = { reportName: reportConfig.apiName, StartDate: dateRangeB.startDate, EndDate: dateRangeB.endDate };
                    const [a, b] = await Promise.all([fetchOne(paramsA), fetchOne(paramsB)]);
                    dataArrayA = a; dataArrayB = b;
                } else {
                    dataArrayA = await fetchOne(paramsA);
                }
            }

            console.log('📋 Ekstrahert data A:', dataArrayA.length, 'poster', compareMode ? `| B: ${dataArrayB?.length || 0}` : '');

            if (dataArrayA.length === 0) {
                toast.warning('Ingen data funnet for valgt periode');
                return;
            }

            // Analyze schema basert på A
            const schema = analyzeDataSchema(dataArrayA);
            console.log('🧬 Analysert data schema:', schema);
            console.log('📋 Available fields for aggregation:', schema?.fields?.map(f => ({ name: f.name, type: f.type, category: f.category, isAggregatable: f.isAggregatable })));

            // Find actual field names in the data
            const sampleRow = dataArrayA[0] || {};
            console.log('🔍 Sample data row (first record):', Object.keys(sampleRow));
            console.log('🔍 Looking for damage/premium fields:', Object.keys(sampleRow).filter(key =>
                key.toLowerCase().includes('utbetalt') ||
                key.toLowerCase().includes('premie') ||
                key.toLowerCase().includes('reserve') ||
                key.toLowerCase().includes('sum')
            ));

            setRawData(dataArrayA);
            setRawDataCompare(compareMode ? (dataArrayB || []) : null);
            setDataSchema(schema);

            setCurrentStep('building');

        } catch (error) {
            console.error('❌ Feil ved henting av data:', error);
            toast.error('Feil ved henting av data: ' + error.message);
        } finally {
            setIsLoading(false);
            setLoadingStatus('');
        }
    };

    const selectedReport = reportTypes.find(r => r.id === selectedReportType);

    // Handle pipeline execution
    const handleExecutePipeline = (resultObj) => {
        // Støtt både enkel og sammenligningsmodus
        if (resultObj && resultObj.primary) {
            console.log('Pipeline execution completed (compare):', resultObj);
            setPipelineResult(resultObj.primary);
            setPipelineResultCompare(resultObj.compare || null);
        } else {
            console.log('Pipeline execution completed:', resultObj);
            setPipelineResult(resultObj);
            setPipelineResultCompare(null);
        }
        setCurrentStep('results');
    };

    const handleBackToPipeline = () => {
        setCurrentStep('building');
        setPipelineResult(null);
        setPipelineResultCompare(null);
    };

    if (currentStep === 'results') {
        const buildQuarterLabel = (year, quarters) => {
            if (!quarters || quarters.length === 0) return '';
            const order = ['Q1', 'Q2', 'Q3', 'Q4'];
            const sorted = [...quarters].sort((a, b) => order.indexOf(a) - order.indexOf(b));
            const consecutive = sorted.every((q, idx) => idx === 0 || order.indexOf(q) === order.indexOf(sorted[idx - 1]) + 1);
            if (consecutive) {
                return `${sorted[0]}–${sorted[sorted.length - 1]} ${year}`;
            }
            return `${sorted.join(', ')} ${year}`;
        };
        const labelA = quarterMode
            ? buildQuarterLabel(quarterYearA, quartersA)
            : `${dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString('nb-NO') : ''} - ${dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString('nb-NO') : ''}`;
        const labelB = compareMode ? (quarterMode
            ? buildQuarterLabel(quarterYearB, quartersB)
            : `${dateRangeB.startDate ? new Date(dateRangeB.startDate).toLocaleDateString('nb-NO') : ''} - ${dateRangeB.endDate ? new Date(dateRangeB.endDate).toLocaleDateString('nb-NO') : ''}`) : null;
        return (
            <div className="h-screen flex flex-col">
                <ResultsViewer
                    result={pipelineResult}
                    compareResult={pipelineResultCompare}
                    rawData={rawData}
                    onBack={handleBackToPipeline}
                    onExport={(result) => console.log('Export requested:', result)}
                    periodLabels={{ a: labelA, b: labelB }}
                    reportType={selectedReportType} // Pass the selected report type explicitly
                />
            </div>
        );
    }

    if (currentStep === 'building') {
        return (
            <div className="h-screen flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 p-4 border-b border-border bg-background">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">Rapport-bygger</h1>
                            <p className="text-sm text-muted-foreground">
                                {dataSchema?.totalRecords} poster fra {selectedReport?.name} · {dateRange.startDate} til {dateRange.endDate}
                                {compareMode && dateRangeB.startDate && dateRangeB.endDate ? (
                                    <>
                                        {' '}· Periode 2: {dateRangeB.startDate} til {dateRangeB.endDate}
                                    </>
                                ) : null}
                            </p>
                        </div>
                        <Button onClick={() => setCurrentStep('setup')} variant="outline">
                            Tilbake til innstillinger
                        </Button>
                    </div>
                </div>

                {/* Main workspace */}
                <div className="flex-1 flex overflow-hidden">
                    <FieldsPalette
                        schema={dataSchema}
                        onFieldDrag={(field) => console.log('Field dragged:', field)}
                    />
                    <PipelineCanvas
                        schema={dataSchema}
                        rawData={rawData}
                        rawDataCompare={compareMode ? rawDataCompare : null}
                        compareMode={compareMode}
                        reportType={selectedReportType}
                        dateRange={dateRange}
                        operations={pipelineOperations}
                        onOperationsChange={setPipelineOperations}
                        onExecutePipeline={handleExecutePipeline}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">Rapport-bygger</h1>
                <p className="text-muted-foreground">
                    Lag tilpassede rapporter og analyser med drag & drop
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Rapport Type Velger */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Velg rapporttype
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ToggleGroup
                            type="single"
                            value={selectedReportType}
                            onValueChange={(value) => { if (value) setSelectedReportType(value); }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                        >
                            {reportTypes.map((report) => (
                                <ToggleGroupItem
                                    key={report.id}
                                    value={report.id}
                                    aria-label={report.name}
                                    className="group w-full justify-start px-4 py-6 rounded-md border text-left data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                >
                                    <div className="flex items-center gap-2">
                                        <report.Icon className="h-5 w-5" />
                                        <div>
                                            <div className="font-medium">{report.name}</div>
                                            <div className="text-xs text-muted-foreground group-data-[state=on]:text-primary-foreground/80">{report.description}</div>
                                        </div>
                                    </div>
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>

                        {selectedReport && (
                            <div className="p-3 bg-muted rounded">
                                <div className="flex items-center gap-2 mb-1">
                                    <selectedReport.Icon className="h-5 w-5" />
                                    <span className="font-medium">{selectedReport.name}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{selectedReport.description}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Dato Periode */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Velg periode
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                            <input
                                id="compare-toggle"
                                type="checkbox"
                                checked={compareMode}
                                onChange={(e) => setCompareMode(e.target.checked)}
                            />
                            <label htmlFor="compare-toggle" className="text-sm">Sammenlign to perioder</label>
                        </div>
                        {/* Kvartalmodus-bryter */}
                        <div className="flex items-center gap-3">
                            <input id="quarter-mode" type="checkbox" checked={quarterMode} onChange={(e) => setQuarterMode(e.target.checked)} />
                            <label htmlFor="quarter-mode" className="text-sm">Kvartalmodus</label>
                        </div>

                        {!quarterMode && (
                            <div>
                                <ToggleGroup
                                    type="single"
                                    value={selectedDatePreset}
                                    onValueChange={(value) => { if (value) handleDatePresetChange(value); }}
                                    className="flex flex-wrap gap-2 justify-start"
                                >
                                    {datePresets.map((preset) => (
                                        <ToggleGroupItem
                                            key={preset.id}
                                            value={preset.id}
                                            aria-label={preset.name}
                                            className="px-3 py-2 rounded-md border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                        >
                                            {preset.name}
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                            </div>
                        )}

                        {/* Custom Date Inputs - Only show when custom is selected */}
                        {!quarterMode && useCustomDates && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Fra dato</label>
                                    <input
                                        type="date"
                                        value={dateRange.startDate}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full mt-1 px-3 py-2 border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Til dato</label>
                                    <input
                                        type="date"
                                        value={dateRange.endDate}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                        className="w-full mt-1 px-3 py-2 border rounded-md"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Periode 1 visning */}
                        {!quarterMode ? (
                            <div className="p-3 bg-muted rounded">
                                <p className="text-sm text-muted-foreground">
                                    <strong>Valgt periode:</strong><br />
                                    {dateRange.startDate && dateRange.endDate ? (
                                        <>
                                            {new Date(dateRange.startDate).toLocaleDateString('nb-NO')} til {' '}
                                            {new Date(dateRange.endDate).toLocaleDateString('nb-NO')}
                                            <span className="block mt-1">
                                                ({Math.ceil((new Date(dateRange.endDate) - new Date(dateRange.startDate)) / (1000 * 60 * 60 * 24)) + 1} dager)
                                            </span>
                                        </>
                                    ) : (
                                        'Velg periode'
                                    )}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-medium">Periode 1 · År</label>
                                    <input type="number" value={quarterYearA} onChange={(e) => setQuarterYearA(parseInt(e.target.value || `${new Date().getFullYear()}`))} className="w-28 px-3 py-2 border rounded-md" />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                                        <Button key={q} variant={quartersA.includes(q) ? 'default' : 'outline'} size="sm" onClick={() => setQuartersA(prev => prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q])}>{q}</Button>
                                    ))}
                                </div>
                                <div className="p-3 bg-muted rounded text-sm text-muted-foreground">Valgt: {quartersA.length ? quartersA.sort().join(', ') : 'Ingen'} {quartersA.length ? `· ${quarterYearA}` : ''}</div>
                            </div>
                        )}

                        {compareMode && (
                            <div className="space-y-4 border-t pt-4">
                                <div className="text-sm font-medium">Periode 2</div>
                                {/* Hurtigvalg for sammenligning */}
                                <div className="space-y-2">
                                    <div className="text-xs text-muted-foreground">Hurtigvalg</div>
                                    <ToggleGroup
                                        type="single"
                                        value={compareQuickPreset}
                                        onValueChange={(val) => { if (val) setCompareQuickPreset(val); }}
                                        className="flex flex-wrap gap-2"
                                    >
                                        <ToggleGroupItem value="same_period_last_year" className="px-3 py-2 rounded-md border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                                            Samme periode i fjor
                                        </ToggleGroupItem>
                                        <ToggleGroupItem value="previous_same_length" className="px-3 py-2 rounded-md border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                                            Forrige like lang periode
                                        </ToggleGroupItem>
                                        <ToggleGroupItem value="manual" className="px-3 py-2 rounded-md border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                                            Manuelt valg
                                        </ToggleGroupItem>
                                    </ToggleGroup>
                                </div>
                                {(!quarterMode && compareQuickPreset === 'manual') && (
                                    <div className="space-y-4">
                                        <div>
                                            <ToggleGroup
                                                type="single"
                                                value={selectedDatePresetB}
                                                onValueChange={(value) => { if (value) handleDatePresetChangeB(value); }}
                                                className="flex flex-wrap gap-2 justify-start"
                                            >
                                                {datePresets.map((preset) => (
                                                    <ToggleGroupItem
                                                        key={preset.id}
                                                        value={preset.id}
                                                        aria-label={preset.name}
                                                        className="px-3 py-2 rounded-md border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                                    >
                                                        {preset.name}
                                                    </ToggleGroupItem>
                                                ))}
                                            </ToggleGroup>
                                        </div>

                                        {useCustomDatesB && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium">Fra dato</label>
                                                    <input
                                                        type="date"
                                                        value={dateRangeB.startDate}
                                                        onChange={(e) => setDateRangeB(prev => ({ ...prev, startDate: e.target.value }))}
                                                        className="w-full mt-1 px-3 py-2 border rounded-md"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium">Til dato</label>
                                                    <input
                                                        type="date"
                                                        value={dateRangeB.endDate}
                                                        onChange={(e) => setDateRangeB(prev => ({ ...prev, endDate: e.target.value }))}
                                                        className="w-full mt-1 px-3 py-2 border rounded-md"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!quarterMode ? (
                                    <div className="p-3 bg-muted rounded">
                                        <p className="text-sm text-muted-foreground">
                                            <strong>Periode 2:</strong><br />
                                            {dateRangeB.startDate && dateRangeB.endDate ? (
                                                <>
                                                    {new Date(dateRangeB.startDate).toLocaleDateString('nb-NO')} til {' '}
                                                    {new Date(dateRangeB.endDate).toLocaleDateString('nb-NO')}
                                                    <span className="block mt-1">
                                                        ({Math.ceil((new Date(dateRangeB.endDate) - new Date(dateRangeB.startDate)) / (1000 * 60 * 60 * 24)) + 1} dager)
                                                    </span>
                                                </>
                                            ) : (
                                                'Velg periode 2'
                                            )}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <label className="text-sm font-medium">Periode 2 · År</label>
                                            <input type="number" value={quarterYearB} onChange={(e) => setQuarterYearB(parseInt(e.target.value || `${new Date().getFullYear() - 1}`))} className="w-28 px-3 py-2 border rounded-md" />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                                                <Button key={q} variant={quartersB.includes(q) ? 'default' : 'outline'} size="sm" onClick={() => setQuartersB(prev => prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q])}>{q}</Button>
                                            ))}
                                        </div>
                                        <div className="p-3 bg-muted rounded text-sm text-muted-foreground">Valgt: {quartersB.length ? quartersB.sort().join(', ') : 'Ingen'} {quartersB.length ? `· ${quarterYearB}` : ''}</div>
                                    </div>
                                )}

                                {isOverlap && (
                                    <div className="flex items-start gap-2 p-3 rounded border border-amber-300 bg-amber-50 text-amber-800">
                                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                                        <div className="text-sm">
                                            De valgte periodene overlapper. Dette kan gi misvisende sammenligning.
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Chunking Info */}
            <div className="mt-4">
                <ChunkingInfo
                    startDate={quarterMode ? null : dateRange.startDate}
                    endDate={quarterMode ? null : dateRange.endDate}
                    visible={!quarterMode && selectedReportType}
                />
            </div>

            {/* Hent Data Knapp */}
            <div className="mt-6 text-center">
                <Button
                    onClick={handleFetchData}
                    disabled={!selectedReportType || !dateRange.startDate || !dateRange.endDate || (compareMode && (!dateRangeB.startDate || !dateRangeB.endDate)) || isLoading}
                    size="lg"
                    className="px-8"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {loadingStatus || 'Henter data...'}
                        </>
                    ) : (
                        <>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Hent data og bygg rapport
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

const ReportBuilderMain = () => {
    return (
        <ToastProvider>
            <ReportBuilderContent />
        </ToastProvider>
    );
};

export default ReportBuilderMain;