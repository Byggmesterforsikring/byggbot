import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ComposedChart
} from 'recharts';
import {
    TrendingUp,
    TrendingDown,
    Activity,
    DollarSign,
    AlertTriangle,
    Calendar,
    BarChart3
} from 'lucide-react';
import { formatCurrency, formatPercent, formatNumber } from '../utils/dataProcessing';
import { processTimeSeriesDataIsolated, formatTimeSeriesForChart, formatTimeSeriesForTable } from '../utils/timeSeriesProcessor';

const TidsserieAnalyse = ({ kundeData, risikoAnalyse }) => {
    const [activeChart, setActiveChart] = useState('skadeprosent');

    if (!kundeData) return null;

    // Bruk isolert tidsserie-prosessering for å unngå konflikter
    const timeSeriesData = processTimeSeriesDataIsolated(
        kundeData.årsdata,
        kundeData.skadehistorikk,
        kundeData.aktivePolicies
    );

    const chartOptions = [
        { key: 'skadeprosent', label: 'Skadeprosent', icon: Activity, color: '#7c3aed' },
        { key: 'skadefrekvens', label: 'Antall skader', icon: BarChart3, color: '#ef4444' },
        { key: 'premie', label: 'Premie', icon: DollarSign, color: '#10b981' },
        { key: 'skadeutbetalinger', label: 'Skadeutbetalinger', icon: TrendingDown, color: '#ef4444' },
        { key: 'combined', label: 'Kombinert', icon: TrendingUp, color: '#f59e0b' }
    ];

    const renderSkadeprosentChart = () => (
        <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="år"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                />
                <YAxis
                    label={{ value: 'Skadeprosent (%)', angle: -90, position: 'insideLeft' }}
                />
                <RechartsTooltip
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Skadeprosent']}
                    labelFormatter={(label) => `År: ${label}`}
                />
                <Area
                    type="monotone"
                    dataKey="skadeProsent"
                    stroke="#7c3aed"
                    fill="#7c3aed"
                    fillOpacity={0.3}
                />
                {/* Terskel-linje */}
                <Line
                    type="monotone"
                    dataKey={() => 70}
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    dot={false}
                    name="Risiko-terskel (70%)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );

    const renderSkadefrekvensChart = () => (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="år"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                />
                <YAxis
                    label={{ value: 'Antall skader', angle: -90, position: 'insideLeft' }}
                />
                <RechartsTooltip
                    formatter={(value) => [formatNumber(value), 'Antall skader']}
                    labelFormatter={(label) => `År: ${label}`}
                />
                <Bar
                    dataKey="antallSkader"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );

    const renderPremieChart = () => (
        <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="år"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                />
                <YAxis
                    label={{ value: 'Premie (NOK)', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <RechartsTooltip
                    formatter={(value) => [formatCurrency(value), 'Premie']}
                    labelFormatter={(label) => `År: ${label}`}
                />
                <Area
                    type="monotone"
                    dataKey="premie"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                />
            </AreaChart>
        </ResponsiveContainer>
    );

    const renderSkadeutbetalingerChart = () => (
        <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="år"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                />
                <YAxis
                    label={{ value: 'Skadeutbetalinger (NOK)', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <RechartsTooltip
                    formatter={(value) => [formatCurrency(value), 'Skadeutbetalinger']}
                    labelFormatter={(label) => `År: ${label}`}
                />
                <Area
                    type="monotone"
                    dataKey="skadebeløp"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.3}
                />
            </AreaChart>
        </ResponsiveContainer>
    );

    const renderCombinedChart = () => (
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="år"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                />
                <YAxis yAxisId="left" label={{ value: 'Premie (NOK)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Skadeprosent (%)', angle: 90, position: 'insideRight' }} />
                <RechartsTooltip
                    formatter={(value, name) => {
                        if (name === 'Premie') return [formatCurrency(value), name];
                        if (name === 'Skadeprosent') return [`${value.toFixed(1)}%`, name];
                        return [formatNumber(value), name];
                    }}
                    labelFormatter={(label) => `År: ${label}`}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="premie" fill="#10b981" name="Premie" />
                <Bar yAxisId="left" dataKey="skadebeløp" fill="#ef4444" name="Skadeutbetalinger" />
                <Line yAxisId="right" type="monotone" dataKey="skadeProsent" stroke="#7c3aed" strokeWidth={3} name="Skadeprosent" />
                <Line yAxisId="right" type="monotone" dataKey={() => 70} stroke="#ef4444" strokeDasharray="5 5" dot={false} name="Risiko-terskel" />
            </ComposedChart>
        </ResponsiveContainer>
    );

    const renderChart = () => {
        switch (activeChart) {
            case 'skadeprosent': return renderSkadeprosentChart();
            case 'skadefrekvens': return renderSkadefrekvensChart();
            case 'premie': return renderPremieChart();
            case 'skadeutbetalinger': return renderSkadeutbetalingerChart();
            case 'combined': return renderCombinedChart();
            default: return renderSkadeprosentChart();
        }
    };

    const getTrendIcon = (trend) => {
        if (trend?.trend === 'økende') return <TrendingUp className="h-4 w-4 text-red-500" />;
        if (trend?.trend === 'synkende') return <TrendingDown className="h-4 w-4 text-green-500" />;
        return <Activity className="h-4 w-4 text-gray-500" />;
    };

    const getTrendBadge = (trend) => {
        if (!trend) return null;

        const colorMap = {
            økende: trend.severity === 'høy' ? 'destructive' : 'secondary',
            synkende: 'default',
            stabil: 'outline'
        };

        return (
            <Badge variant={colorMap[trend.trend] || 'outline'}>
                {trend.trend} {trend.endring > 0 ? '+' : ''}{trend.endring.toFixed(1)}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            {/* Chart selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Tidsserieanalyse
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {chartOptions.map(option => {
                            const Icon = option.icon;
                            return (
                                <Button
                                    key={option.key}
                                    variant={activeChart === option.key ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setActiveChart(option.key)}
                                    className="flex items-center gap-2"
                                >
                                    <Icon className="h-4 w-4" />
                                    {option.label}
                                </Button>
                            );
                        })}
                    </div>

                    {renderChart()}

                    {/* Info om inneværende år */}
                    {timeSeriesData.some(d => d.år === new Date().getFullYear()) && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-700 text-sm">
                                <Calendar className="h-4 w-4" />
                                <span>
                                    <strong>Merk:</strong> Data for {new Date().getFullYear()} er år-til-dato (august).
                                    Premie og skadeprosent er estimert basert på {new Date().getMonth() + 1} måneder av årspremie.
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Trend-analyse */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Skadefrekvens-trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getTrendIcon(risikoAnalyse?.skadefrekvenseTrend)}
                            Skadefrekvens-trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {risikoAnalyse?.skadefrekvenseTrend && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Status:</span>
                                    {getTrendBadge(risikoAnalyse.skadefrekvenseTrend)}
                                </div>
                            )}

                            {risikoAnalyse?.skadefrekvenseTrend?.trend === 'økende' && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-red-700">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="font-medium">Økende skadefrekvens</span>
                                    </div>
                                    <p className="text-sm text-red-600 mt-1">
                                        Skadefrekvensen øker med gjennomsnittlig {Math.abs(risikoAnalyse.skadefrekvenseTrend.endring).toFixed(1)} skader per år
                                    </p>
                                </div>
                            )}

                            {risikoAnalyse?.skadefrekvenseTrend?.trend === 'synkende' && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-green-700">
                                        <TrendingDown className="h-4 w-4" />
                                        <span className="font-medium">Positiv utvikling</span>
                                    </div>
                                    <p className="text-sm text-green-600 mt-1">
                                        Skadefrekvensen synker med gjennomsnittlig {Math.abs(risikoAnalyse.skadefrekvenseTrend.endring).toFixed(1)} skader per år
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Kostnadstrend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {getTrendIcon(risikoAnalyse?.kostnadsTrend)}
                            Kostnadstrend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {risikoAnalyse?.kostnadsTrend && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Status:</span>
                                    {getTrendBadge(risikoAnalyse.kostnadsTrend)}
                                </div>
                            )}

                            {risikoAnalyse?.kostnadsTrend?.trend === 'økende' && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-red-700">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="font-medium">Økende skadekostnader</span>
                                    </div>
                                    <p className="text-sm text-red-600 mt-1">
                                        Skadekostnadene øker med {risikoAnalyse.kostnadsTrend.endring.toFixed(1)}% per år
                                    </p>
                                </div>
                            )}

                            {risikoAnalyse?.kostnadsTrend?.trend === 'synkende' && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-green-700">
                                        <TrendingDown className="h-4 w-4" />
                                        <span className="font-medium">Synkende kostnader</span>
                                    </div>
                                    <p className="text-sm text-green-600 mt-1">
                                        Skadekostnadene synker med {Math.abs(risikoAnalyse.kostnadsTrend.endring).toFixed(1)}% per år
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detaljert årsdata tabell */}
            <Card>
                <CardHeader>
                    <CardTitle>Detaljerte årsdata</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">År</th>
                                    <th className="text-right p-2">Premie</th>
                                    <th className="text-right p-2">Skadeutbetalinger</th>
                                    <th className="text-right p-2">Skadeprosent</th>
                                    <th className="text-right p-2">Antall skader</th>
                                    <th className="text-right p-2">Åpne skader</th>
                                    <th className="text-right p-2">Aktive produkter</th>
                                </tr>
                            </thead>
                            <tbody>
                                {timeSeriesData.map((row, index) => (
                                    <tr key={index} className={`border-b hover:bg-gray-50 ${row.erEstimert ? 'bg-blue-50' : ''}`}>
                                        <td className="p-2 font-medium">
                                            {row.år}
                                            {row.erEstimert && (
                                                <Badge variant="outline" className="ml-2 text-xs text-blue-600">
                                                    Est.
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="p-2 text-right">
                                            {formatCurrency(row.premie)}
                                            {row.erEstimert && <span className="text-blue-600 text-xs ml-1">*</span>}
                                        </td>
                                        <td className="p-2 text-right">{formatCurrency(row.skadebeløp)}</td>
                                        <td className="p-2 text-right">
                                            <span className={`font-medium ${row.skadeProsent > 70 ? 'text-red-600' :
                                                row.skadeProsent > 50 ? 'text-yellow-600' :
                                                    'text-green-600'
                                                }`}>
                                                {formatPercent(row.skadeProsent)}
                                            </span>
                                        </td>
                                        <td className="p-2 text-right">{formatNumber(row.antallSkader)}</td>
                                        <td className="p-2 text-right">
                                            {row.åpneSkader > 0 ? (
                                                <Badge variant="outline" className="text-red-600">
                                                    {formatNumber(row.åpneSkader)}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">0</span>
                                            )}
                                        </td>
                                        <td className="p-2 text-right">{formatNumber(row.aktiveProdukter)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {timeSeriesData.some(d => d.erEstimert) && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-700">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="font-medium text-sm">Estimerte tall for {new Date().getFullYear()}</span>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">
                                * Premie beregnet pro-rata basert på aktive forsikringer og måneder som har gått.
                                Skadeutbetalinger er faktiske registrerte kostnader fra inneværende år.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Nøkkelinnsikter */}
            <Card>
                <CardHeader>
                    <CardTitle>Nøkkelinnsikter fra tidsserien</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Beste år */}
                        {timeSeriesData.length > 0 && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <h4 className="font-medium text-green-800 mb-2">Beste år</h4>
                                {(() => {
                                    const besteÅr = timeSeriesData.reduce((beste, current) =>
                                        current.skadeProsent < beste.skadeProsent ? current : beste
                                    );
                                    return (
                                        <div className="text-sm text-green-700">
                                            <p><strong>{besteÅr.år}</strong></p>
                                            <p>{formatPercent(besteÅr.skadeProsent)} skadeprosent</p>
                                            <p>{formatNumber(besteÅr.antallSkader)} skader</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Verste år */}
                        {timeSeriesData.length > 0 && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <h4 className="font-medium text-red-800 mb-2">Verste år</h4>
                                {(() => {
                                    const versteÅr = timeSeriesData.reduce((verste, current) =>
                                        current.skadeProsent > verste.skadeProsent ? current : verste
                                    );
                                    return (
                                        <div className="text-sm text-red-700">
                                            <p><strong>{versteÅr.år}</strong></p>
                                            <p>{formatPercent(versteÅr.skadeProsent)} skadeprosent</p>
                                            <p>{formatNumber(versteÅr.antallSkader)} skader</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Gjennomsnitt */}
                        {timeSeriesData.length > 0 && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h4 className="font-medium text-blue-800 mb-2">Gjennomsnitt</h4>
                                {(() => {
                                    const avgSkadeProsent = timeSeriesData.reduce((sum, year) => sum + year.skadeProsent, 0) / timeSeriesData.length;
                                    const avgAntallSkader = timeSeriesData.reduce((sum, year) => sum + year.antallSkader, 0) / timeSeriesData.length;
                                    const avgPremie = timeSeriesData.reduce((sum, year) => sum + year.premie, 0) / timeSeriesData.length;

                                    return (
                                        <div className="text-sm text-blue-700">
                                            <p>{formatPercent(avgSkadeProsent)} skadeprosent</p>
                                            <p>{formatNumber(Math.round(avgAntallSkader))} skader/år</p>
                                            <p>{formatCurrency(avgPremie)} premie/år</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TidsserieAnalyse;
