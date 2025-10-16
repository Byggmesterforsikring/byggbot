import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getOrderKey, MONTHS, normalizeTimeLabelSimple, sortCanonicalLabels } from './utils/time';
import { parseNumeric, toRaw, formatValue } from './utils/formatters';
import { getFieldDisplayName, getValueDisplayName } from './utils/labels';
import { useFilteredData } from './hooks/useFilteredData';
import { useSummary } from './hooks/useSummary';
import { copyTable, copyDrilldown } from './hooks/useClipboard';
import InteractiveFilters from './results-viewer/views/InteractiveFilters';
import BarPieView from './results-viewer/views/BarPieView';
import TableView from './results-viewer/views/TableView';
import TimelineView from './results-viewer/views/TimelineView';
import TimelineSeriesView from './results-viewer/views/TimelineSeriesView';
import SummaryCards from './results-viewer/views/SummaryCards';
import DrilldownModal from './results-viewer/views/DrilldownModal';
import MetricSelector from './results-viewer/views/MetricSelector';
import SeriesDimensionSelector from './results-viewer/views/SeriesDimensionSelector';
import AnalysisSelector from './results-viewer/views/AnalysisSelector';
import AnalysisResults from './results-viewer/views/AnalysisResults';
import { useTimelineData } from './hooks/useTimelineData';
import { useChartData } from './hooks/useChartData';
import { getAvailableAnalyses, executeAnalysis } from './analysis/index';
import { useToast } from './ui/toast-context';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import {
    Table as TableIcon,
    Download,
    Copy,
    BarChart3,
    ArrowLeft,
    CheckCircle,
    PieChart,
    Grid3X3,
    TrendingUp,
    Eye,
    ChevronDown,
    ChevronRight,
    X,
    Columns,
    MoreHorizontal,
    CheckCircle2,
    Clock,
    Filter,
    FilterX,
    Search,
    Brain
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Treemap, LineChart, Line, AreaChart, Area } from 'recharts';

const ResultsViewer = ({ result, compareResult, onBack, onExport, rawData, periodLabels, reportType }) => {
    const { toast } = useToast();
    const [viewMode, setViewMode] = useState('table');
    const DEBUG_TIMELINE = true;
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [drillDownData, setDrillDownData] = useState(null);

    // Interactive filtering state
    const [activeFilters, setActiveFilters] = useState({});
    const [showFilters, setShowFilters] = useState(false);

    // Timeline metric selection state
    const [selectedTimelineMetric, setSelectedTimelineMetric] = useState(null);
    // Serie-dimensjon (for tidslinje) – valgfri
    const [seriesDimension, setSeriesDimension] = useState(null);
    const [seriesTopN, setSeriesTopN] = useState(5);

    // Analysis state
    const [currentAnalysis, setCurrentAnalysis] = useState(null);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

    // Debug: Log all received data
    console.log('🔍 ResultsViewer received:', {
        result,
        compareResult,
        hasRawData: !!rawData,
        rawDataCount: rawData?.length || 0,
        reportType
    });
    console.log('🔍 Result success check:', result?.success);
    console.log('🔍 Result error check:', result?.error);
    console.log('🔍 Result data check:', result?.data?.length);

    if (!result || !result.success) {
        return (
            <Card className="m-4">
                <CardContent className="p-8 text-center">
                    <div className="text-red-500 mb-4">
                        <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                            ❌
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Pipeline feilet</h3>
                        <p className="text-muted-foreground">
                            {result?.error || 'Ukjent feil oppstod under kjøring'}
                        </p>

                        {/* Debug information */}
                        <details className="mt-4 text-left">
                            <summary className="cursor-pointer text-sm text-muted-foreground">
                                Debug info
                            </summary>
                            <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto text-left">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </details>
                    </div>
                    <Button onClick={onBack} variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Tilbake til pipeline
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const { data, steps, totalRecords } = result;
    const hasCompare = !!compareResult && !!compareResult.success && Array.isArray(compareResult.data);
    const dataB = hasCompare ? compareResult.data : null;

    // Bruk utdratte hooks for filtrering - with error handling
    let filteredData, filteredDataB, filterOptions;
    try {
        const filterResult = useFilteredData(data, dataB, activeFilters, hasCompare);
        filteredData = filterResult.filteredData || [];
        filteredDataB = filterResult.filteredDataB || [];
        filterOptions = filterResult.filterOptions || {};
        console.log('🔍 Filter result:', {
            filteredDataLength: filteredData?.length,
            filteredDataBLength: filteredDataB?.length,
            hasFilterOptions: !!filterOptions
        });
    } catch (error) {
        console.error('❌ Error in useFilteredData:', error);
        filteredData = data || [];
        filteredDataB = dataB || [];
        filterOptions = {};
    }

    // Detect if this is time-series data
    const isTimeSeriesData = useMemo(() => {
        if (!filteredData || (filteredData?.length || 0) === 0) return false;

        const columns = Object.keys(filteredData[0]);
        return columns.some(col => {
            const value = filteredData[0][col];
            if (typeof value === 'string') {
                // Check for Norwegian month formats like "Jan 2025", "Q1 2025", or dates
                return /^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s\d{4}$/.test(value) ||
                    /^Q[1-4]\s\d{4}$/.test(value) ||
                    /^\d{4}-\d{2}$/.test(value) ||
                    /^\d{2}\.\d{2}\.\d{4}$/.test(value);
            }
            return false;
        });
    }, [filteredData]);

    // Auto-switch to timeline view for time-series data (DISABLED - let user choose)
    // React.useEffect(() => {
    //     if (isTimeSeriesData && viewMode === 'table') {
    //         console.log('🕐 Time-series data detected, switching to timeline view');
    //         setViewMode('timeline');
    //     }
    // }, [isTimeSeriesData, viewMode]);

    // Use timeline data hook
    const timelineData = useTimelineData(
        filteredData,
        filteredDataB,
        hasCompare,
        null, // We'll handle detectTimeField inside the hook
        selectedTimelineMetric,
        seriesDimension,
        seriesTopN
    );

    const {
        availableTimelineMetrics,
        timeField: detectTimeField,
        timeSeriesA,
        timeSeriesB,
        combinedTimeSeries,
        seriesDimensionOptions,
        categorySeriesData,
        categorySeriesCompareData,
        seriesChartKeyCompare,
        seriesChartKeySingle,
        expectedKeysCompare
    } = timelineData;

    // Set default timeline metric if not already set
    React.useEffect(() => {
        if (!selectedTimelineMetric && (availableTimelineMetrics?.length || 0) > 0) {
            const defaultMetric = availableTimelineMetrics.find(m => m.isCurrency) ||
                availableTimelineMetrics.find(m => m.isCount) ||
                availableTimelineMetrics[0];
            if (defaultMetric) {
                setSelectedTimelineMetric(defaultMetric.key);
            }
        }
    }, [availableTimelineMetrics, selectedTimelineMetric]);

    // Use chart data hook
    const { chartData, comparativeChartData, chartLabels } = useChartData(
        filteredData,
        filteredDataB,
        hasCompare,
        isTimeSeriesData,
        selectedTimelineMetric
    );





    // All timeline calculations are now handled in the useTimelineData hook

    // Debug and chart keys are handled in the useTimelineData hook

    // Ref for compare chart container
    const compareChartDivRef = useRef(null);

    // Summary cards data
    const summaryData = useSummary(filteredData);

    // Available analyses based on current data
    const availableAnalyses = useMemo(() => {
        try {
            // Use the passed reportType prop if available, otherwise detect from URL
            const detectedReportType = reportType === 'skadefrekvens' ? 'skade' :
                reportType || (window.location.pathname.includes('skade') ? 'skade' :
                    window.location.pathname.includes('garanti') ? 'garanti' :
                        'general');

            console.log('🔍 Determining available analyses for reportType:', detectedReportType);

            return getAvailableAnalyses(
                filteredData || [],
                filteredDataB || [],
                hasCompare,
                detectedReportType,
                chartLabels || {}
            );
        } catch (error) {
            console.error('❌ Error in availableAnalyses useMemo:', error);
            return [];
        }
    }, [filteredData, filteredDataB, hasCompare, chartLabels, reportType]);

    // Handle drill-down
    const handleDrillDown = (rowData) => {
        if (!rawData) return;

        console.log('🔍 Drill-down for rowData:', rowData);

        // Find source records that contributed to this aggregated row
        const sourceRecords = rawData.filter(record => {
            // Match based on grouping fields
            const columns = Object.keys(rowData);
            return columns.every(col => {
                if (col.includes('Sum') || col === 'Antall') return true; // Skip aggregated fields

                const aggregatedValue = rowData[col];
                const rawValue = record[col];

                // Special handling for boolean fields like ErBedriftskunde
                if (col === 'ErBedriftskunde') {
                    const recordValue = rawValue === true || rawValue === 1 ? 'Bedriftskunde' : 'Privatkunde';
                    return recordValue === aggregatedValue;
                }

                // Special handling for timeline/date fields
                if (typeof rawValue === 'string' && rawValue.includes('T')) {
                    try {
                        const date = new Date(rawValue);
                        // Check if aggregatedValue matches any of the possible time transformations
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

                        // Month format: "Jul 2025"
                        const monthFormat = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
                        if (aggregatedValue === monthFormat) return true;

                        // Year format: "2025"
                        const yearFormat = date.getFullYear().toString();
                        if (aggregatedValue === yearFormat) return true;

                        // Quarter format: "Q3 2025"
                        const quarter = Math.ceil((date.getMonth() + 1) / 3);
                        const quarterFormat = `Q${quarter} ${date.getFullYear()}`;
                        if (aggregatedValue === quarterFormat) return true;

                        // Day format: Norwegian locale
                        const dayFormat = date.toLocaleDateString('nb-NO');
                        if (aggregatedValue === dayFormat) return true;

                    } catch (e) {
                        console.warn('Failed to parse date for drill-down:', rawValue);
                    }
                }

                // Default exact match
                return rawValue === aggregatedValue;
            });
        });

        console.log('🎯 Found source records:', sourceRecords?.length || 0);

        setDrillDownData({
            summary: rowData,
            sourceRecords
        });
    };

    // Close drill-down modal
    const closeDrillDown = () => {
        setDrillDownData(null);
    };

    // flyttet til utils/formatters.js – behold wrapper for bakoverkompabilitet
    // formatValue importeres nå fra utils

    // Filter management functions
    const updateFilter = (field, values) => {
        setActiveFilters(prev => ({
            ...prev,
            [field]: (values?.length || 0) > 0 ? values : undefined
        }));
    };

    const clearFilter = (field) => {
        setActiveFilters(prev => {
            const newFilters = { ...prev };
            delete newFilters[field];
            return newFilters;
        });
    };

    const clearAllFilters = () => {
        setActiveFilters({});
    };

    // Handle analysis execution
    const handleSelectAnalysis = async (analysisPlugin, userConfig = null) => {
        setIsAnalysisLoading(true);
        try {
            // Prepare parameters based on analysis requirements
            const params = userConfig ? {
                data: filteredData,
                dataB: filteredDataB,
                hasCompare,
                ...userConfig
            } : {
                data: filteredData,
                dataB: filteredDataB,
                hasCompare,
                selectedMetric: selectedTimelineMetric || chartLabels.valueFieldName,
                groupField: chartLabels.groupFieldName,
                timeField: detectTimeField,
                topN: seriesTopN
            };

            const result = executeAnalysis(analysisPlugin.id, params);
            setCurrentAnalysis(result);
        } catch (error) {
            console.error('Analysis execution failed:', error);

            // More user-friendly error messages
            if (error.message.includes('not yet implemented')) {
                toast.info(`"${analysisPlugin.name}" er under utvikling og kommer snart! 🚧\n\nPrøv en av de andre tilgjengelige analysene i mellomtiden.`);
            } else {
                toast.error(`Analyse "${analysisPlugin.name}" feilet:\n${error.message}`);
            }
        } finally {
            setIsAnalysisLoading(false);
        }
    };

    const handleBackFromAnalysis = () => {
        setCurrentAnalysis(null);
    };

    // Copy table to clipboard
    const copyToClipboard = async () => {
        try {
            await copyTable(filteredData, filteredDataB, hasCompare);
            toast.success('Tabell(er) kopiert til utklippstavlen!');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            toast.error('Kunne ikke kopiere til utklippstavlen');
        }
    };



    // Get table columns from first data row - with safety check
    const columns = (filteredData && (filteredData?.length || 0) > 0) ? Object.keys(filteredData[0]) : [];
    console.log('🔍 Columns determined:', columns?.length || 0, 'columns found');

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-border bg-background">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button onClick={onBack} variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Tilbake
                        </Button>
                        <div>
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Pipeline Resultater
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {totalRecords} poster etter {steps?.length || 0} operasjoner
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Mode Toggles */}
                        <div className="flex items-center border rounded-md">
                            <Button
                                onClick={() => setViewMode('table')}
                                variant={viewMode === 'table' ? 'default' : 'ghost'}
                                size="sm"
                                className="rounded-r-none border-r"
                            >
                                <TableIcon className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={() => setViewMode('chart')}
                                variant={viewMode === 'chart' ? 'default' : 'ghost'}
                                size="sm"
                                className="rounded-none border-r"
                            >
                                <BarChart3 className="h-4 w-4" />
                            </Button>
                            {/* Timeline button - only show if time-series data detected */}
                            {isTimeSeriesData && (
                                <Button
                                    onClick={() => setViewMode('timeline')}
                                    variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                                    size="sm"
                                    className="rounded-none border-r relative"
                                    title="Timeline view tilgjengelig - tidsdata oppdaget"
                                >
                                    <Clock className="h-4 w-4" />
                                    {/* Small indicator dot */}
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                                </Button>
                            )}
                            <Button
                                onClick={() => setViewMode('pie')}
                                variant={viewMode === 'pie' ? 'default' : 'ghost'}
                                size="sm"
                                className="rounded-none border-r"
                            >
                                <PieChart className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={() => setViewMode('cards')}
                                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                                size="sm"
                                className="rounded-none border-r"
                            >
                                <Grid3X3 className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={() => setViewMode('analysis')}
                                variant={viewMode === 'analysis' ? 'default' : 'ghost'}
                                size="sm"
                                className="rounded-l-none relative"
                                title={`${availableAnalyses?.length || 0} analyser tilgjengelig`}
                            >
                                <Brain className="h-4 w-4" />
                                {(availableAnalyses?.length || 0) > 0 && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full"></div>
                                )}
                            </Button>
                        </div>

                        {/* Filter Toggle */}
                        <Button
                            onClick={() => setShowFilters(!showFilters)}
                            variant={showFilters ? "default" : "outline"}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            Filter
                            {(Object.keys(activeFilters)?.length || 0) > 0 && (
                                <Badge variant="secondary" className="ml-1">
                                    {Object.keys(activeFilters)?.length || 0}
                                </Badge>
                            )}
                        </Button>

                        <Button onClick={copyToClipboard} variant="outline" size="sm">
                            <Copy className="h-4 w-4 mr-2" />
                            Kopier tabell
                        </Button>
                        {onExport && (
                            <Button onClick={() => onExport(result)} variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Eksporter
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Pipeline Steps Summary */}
            <div className="flex-shrink-0 p-4 bg-muted/30 border-b border-border">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 overflow-x-auto">
                        <span className="text-sm font-medium whitespace-nowrap">Pipeline flyt:</span>
                        <Badge variant="secondary" className="whitespace-nowrap">
                            Start: {rawData?.length || 'Ukjent'} poster
                        </Badge>
                        {(steps || []).map((step, index) => (
                            <React.Fragment key={index}>
                                <span className="text-muted-foreground">→</span>
                                <Badge variant="outline" className="whitespace-nowrap">
                                    {step.operation.title} ({step.recordCount})
                                </Badge>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Detailed step information */}
                    <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Vis detaljert pipeline-info
                        </summary>
                        <div className="mt-2 space-y-2 p-3 bg-background rounded border">
                            {(steps || []).map((step, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <Badge variant="outline" className="text-xs">
                                        Steg {index + 1}
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium">{step.operation.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                            Type: {step.operation.type} · Resultater: {step.recordCount} poster
                                        </div>
                                        {step.operation.config && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Konfigurasjon: {JSON.stringify(step.operation.config, null, 2)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            </div>

            {/* Interactive Filters Panel */}
            <InteractiveFilters
                visible={showFilters}
                filterOptions={filterOptions}
                activeFilters={activeFilters}
                onToggleVisible={() => setShowFilters(!showFilters)}
                onUpdateFilter={updateFilter}
                onClearFilter={clearFilter}
                onClearAll={clearAllFilters}
                filteredCount={filteredData?.length || 0}
                totalCount={data?.length || 0}
            />

            {/* Results - Multiple View Modes */}
            <div className="flex-1 overflow-auto">
                {(filteredData?.length || 0) === 0 ? (
                    <div className="p-8 text-center">
                        <TableIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">Ingen resultater</h3>
                        <p className="text-muted-foreground">
                            Pipeline kjørte uten å returnere noen data.
                            Sjekk filter-betingelsene dine.
                        </p>
                    </div>
                ) : (
                    <div className="p-4 space-y-6">
                        {/* Summary Cards */}
                        {viewMode === 'cards' && (
                            <SummaryCards summaryData={summaryData} chartLabels={chartLabels} />
                        )}

                        {/* Chart Views */}
                        {viewMode === 'chart' && (chartData?.length || 0) > 0 && (
                            <BarPieView
                                chartData={chartData}
                                comparativeChartData={comparativeChartData}
                                hasCompare={hasCompare}
                                chartLabels={chartLabels}
                                onDrillDown={handleDrillDown}
                                periodLabels={periodLabels}
                            />
                        )}

                        {/* Pie Chart */}
                        {viewMode === 'pie' && (chartData?.length || 0) > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <PieChart className="h-5 w-5" />
                                        {chartLabels.pieTitle}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-96">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RechartsPieChart>
                                                <Pie
                                                    data={chartData.slice(0, 8)}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={120}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {(chartData || []).slice(0, 8).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip
                                                    formatter={(value) => [
                                                        chartLabels.valueFieldName !== 'Antall' ?
                                                            new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0 }).format(value) :
                                                            value.toLocaleString('nb-NO'),
                                                        chartLabels.valueFieldName
                                                    ]}
                                                />
                                            </RechartsPieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Timeline Chart */}
                        {viewMode === 'timeline' && (
                            ((chartData?.length || 0) > 0 ||
                                (timeSeriesA && (timeSeriesA?.length || 0) > 0) ||
                                (combinedTimeSeries && (combinedTimeSeries?.length || 0) > 0) ||
                                (categorySeriesData?.rows && (categorySeriesData.rows?.length || 0) > 0) ||
                                (categorySeriesCompareData?.rows && (categorySeriesCompareData.rows?.length || 0) > 0))
                        ) && (
                                <div className="space-y-6">
                                    {/* Metric Selector */}
                                    <MetricSelector
                                        availableTimelineMetrics={availableTimelineMetrics}
                                        selectedTimelineMetric={selectedTimelineMetric}
                                        onMetricChange={setSelectedTimelineMetric}
                                    />

                                    {/* Series Dimension Selector */}
                                    <SeriesDimensionSelector
                                        seriesDimensionOptions={seriesDimensionOptions}
                                        seriesDimension={seriesDimension}
                                        seriesTopN={seriesTopN}
                                        onSeriesDimensionChange={setSeriesDimension}
                                        onSeriesTopNChange={setSeriesTopN}
                                    />

                                    {/* Single period timeline view */}
                                    {!hasCompare && (!seriesDimension || !categorySeriesData || (categorySeriesData?.rows && (categorySeriesData.rows?.length || 0) === 0)) && (
                                        <TimelineView
                                            hasCompare={false}
                                            timeSeriesA={timeSeriesA}
                                            combinedTimeSeries={null}
                                            selectedMetricLabel={availableTimelineMetrics.find(m => m.key === selectedTimelineMetric)?.label}
                                            chartLabels={chartLabels}
                                            availableTimelineMetrics={availableTimelineMetrics}
                                            selectedTimelineMetric={selectedTimelineMetric}
                                        />
                                    )}

                                    {/* Single period series view */}
                                    {!hasCompare && seriesDimension && categorySeriesData?.rows && (categorySeriesData.rows?.length || 0) > 0 && (
                                        <TimelineSeriesView
                                            hasCompare={false}
                                            categorySeriesData={categorySeriesData}
                                            categorySeriesCompareData={null}
                                            selectedMetricLabel={availableTimelineMetrics.find(m => m.key === selectedTimelineMetric)?.label}
                                            chartLabels={chartLabels}
                                            seriesChartKeySingle={seriesChartKeySingle}
                                            seriesChartKeyCompare={null}
                                        />
                                    )}

                                    {/* Compare period timeline view */}
                                    {hasCompare && !seriesDimension && (combinedTimeSeries?.length || 0) > 0 && (
                                        <TimelineView
                                            hasCompare={true}
                                            timeSeriesA={null}
                                            combinedTimeSeries={combinedTimeSeries}
                                            selectedMetricLabel={availableTimelineMetrics.find(m => m.key === selectedTimelineMetric)?.label}
                                            chartLabels={chartLabels}
                                            periodLabels={periodLabels}
                                        />
                                    )}

                                    {/* Compare period series view */}
                                    {hasCompare && seriesDimension && categorySeriesCompareData?.rows && (categorySeriesCompareData.rows?.length || 0) > 0 && (
                                        <TimelineSeriesView
                                            hasCompare={true}
                                            categorySeriesData={null}
                                            categorySeriesCompareData={categorySeriesCompareData}
                                            selectedMetricLabel={availableTimelineMetrics.find(m => m.key === selectedTimelineMetric)?.label}
                                            chartLabels={chartLabels}
                                            seriesChartKeySingle={null}
                                            seriesChartKeyCompare={seriesChartKeyCompare}
                                            periodLabels={periodLabels}
                                            compareChartDivRef={compareChartDivRef}
                                            expectedKeysCompare={expectedKeysCompare}
                                        />
                                    )}
                                </div>
                            )}

                        {/* Enhanced Table View */}
                        {viewMode === 'table' && (
                            <TableView
                                data={filteredData}
                                dataB={filteredDataB || dataB}
                                hasCompare={hasCompare}
                                periodLabels={periodLabels}
                                onDrillDown={rawData ? handleDrillDown : undefined}
                            />
                        )}

                        {/* Analysis View */}
                        {viewMode === 'analysis' && (
                            <>
                                {currentAnalysis ? (
                                    <AnalysisResults
                                        analysisResult={currentAnalysis}
                                        onBack={handleBackFromAnalysis}
                                    />
                                ) : (
                                    <AnalysisSelector
                                        availableAnalyses={availableAnalyses}
                                        onSelectAnalysis={handleSelectAnalysis}
                                        isLoading={isAnalysisLoading}
                                        data={filteredData}
                                        hasCompare={hasCompare}
                                        reportType={reportType === 'skadefrekvens' ? 'skade' :
                                            reportType || (window.location.pathname.includes('skade') ? 'skade' :
                                                window.location.pathname.includes('garanti') ? 'garanti' :
                                                    'general')}
                                        chartLabels={chartLabels}
                                    />
                                )}
                            </>
                        )}



                    </div>
                )}
            </div>

            {/* Drill-down Modal */}
            <DrilldownModal
                drillDownData={drillDownData}
                onClose={closeDrillDown}
            />
        </div>
    );
};

export default ResultsViewer;