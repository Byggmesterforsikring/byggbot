import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../ui/card';
import { Button } from '../../../../../ui/button';
import { Badge } from '../../../../../ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, HelpCircle, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../../../ui/dialog';

const AnalysisResults = ({ analysisResult, onBack }) => {
    const [showExplanation, setShowExplanation] = useState(false);

    if (!analysisResult) return null;

    // Get user-friendly explanations for different analysis types
    const getAnalysisExplanation = (type) => {
        switch (type) {
            case 'topMovers':
                return {
                    title: 'Hvordan lese "Største Endringer"?',
                    explanation: 'Denne grafen viser deg hvem/hva som har endret seg mest mellom de to periodene. Søyler som går oppover (grønne) betyr økning, søyler som går nedover (røde) betyr nedgang.',
                    tips: [
                        'Se på de øverste resultatene - dette er dine største vinnere og tapere',
                        'Grønne søyler = positive endringer (dette er bra!)',
                        'Røde søyler = negative endringer (dette trenger oppmerksomhet)',
                        'Jo høyere søyle, jo større endring'
                    ]
                };
            case 'changeRates':
                return {
                    title: 'Hvordan lese "Månedlig og Årlig Vekst"?',
                    explanation: 'Denne grafen viser hvor raskt virksomheten vokser måned for måned og år for år. Positiv vekst er bra, negativ vekst kan være et varsel.',
                    tips: [
                        'MoM = "Month over Month" - endring fra forrige måned',
                        'YoY = "Year over Year" - endring fra samme måned i fjor',
                        'Over 0% = vekst (bra!)',
                        'Under 0% = nedgang (trenger oppmerksomhet)',
                        'YoY er ofte mer pålitelig enn MoM pga sesongvariasjoner'
                    ]
                };
            case 'pareto':
                return {
                    title: 'Hvordan lese "80/20 Analyse"?',
                    explanation: 'Denne analysen viser deg hvilke få kunder/produkter som gir mesteparten av inntektene dine. Fokuser ekstra på de som er helt til venstre!',
                    tips: [
                        'De første elementene (venstre side) er dine "gullkunder"',
                        'Den røde linjen viser kumulativ prosent (samlet)',
                        'Når den røde linjen når 80%, har du funnet dine viktigste bidragsytere',
                        'Gi disse ekstra oppmerksomhet og service'
                    ]
                };
            case 'skadefrekvens':
                return analysisResult.explanation || {
                    title: 'Hvordan lese skadefrekvens?',
                    explanation: 'Skadefrekvens viser hvor risikabelt ulike kategorier er basert på skademønstre.',
                    tips: ['Sammenlign kategorier for å identifisere høyrisiko områder']
                };
            default:
                return null;
        }
    };

    const explanation = getAnalysisExplanation(analysisResult.type);

    const renderTopMoversChart = (data, config) => (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                />
                <YAxis />
                <RechartsTooltip
                    formatter={(value, name) => [
                        typeof value === 'number' ? value.toLocaleString('nb-NO') : value,
                        name
                    ]}
                />
                <Legend />
                <Bar dataKey="Periode A" fill="#3b82f6" name="Periode A" />
                <Bar dataKey="Periode B" fill="#10b981" name="Periode B" />
                <Bar dataKey="Endring" fill={(entry) => {
                    return entry?.direction === 'up' ? '#10b981' :
                        entry?.direction === 'down' ? '#ef4444' : '#6b7280';
                }} name="Endring" />
            </BarChart>
        </ResponsiveContainer>
    );

    const renderChangeRatesChart = (data, config) => (
        <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                />
                <YAxis />
                <RechartsTooltip
                    formatter={(value, name) => [
                        `${value?.toFixed(1)}%`,
                        name
                    ]}
                />
                <Legend />
                {config.yAxes.map((axis, index) => (
                    <Line
                        key={axis}
                        type="monotone"
                        dataKey={axis}
                        stroke={config.colors[axis] || `hsl(${index * 60}, 70%, 50%)`}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name={axis}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );

    const renderBarChart = (data, config) => {
        const { xField, yField, title, subtitle } = config || {};

        return (
            <div className="space-y-4">
                <div>
                    <h4 className="text-lg font-semibold">{title || 'Stolpediagram'}</h4>
                    {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                </div>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 40, bottom: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey={xField || 'category'}
                            angle={-45}
                            textAnchor="end"
                            height={120}
                            interval={0}
                        />
                        <YAxis />
                        <RechartsTooltip
                            formatter={(value, name) => {
                                if (name === 'frequency') {
                                    return [`${value}%`, 'Skadefrekvens'];
                                }
                                return [value, name];
                            }}
                        />
                        <Bar
                            dataKey={yField || 'value'}
                            fill="#8884d8"
                            name={yField === 'frequency' ? 'Skadefrekvens' : yField}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderParetoChart = (data) => (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <RechartsTooltip
                    formatter={(value, name) => {
                        if (name.includes('%')) {
                            return [`${value.toFixed(1)}%`, name];
                        }
                        return [value.toLocaleString('nb-NO'), name];
                    }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="value" fill="#3b82f6" name="Verdi" />

            </BarChart>
        </ResponsiveContainer>
    );

    const renderVisualization = () => {
        const { visualization, data } = analysisResult;

        switch (visualization?.type) {
            case 'barChart':
                return renderTopMoversChart(data, visualization.config);
            case 'lineChart':
                return renderChangeRatesChart(data, visualization.config);
            case 'paretoChart':
                return renderParetoChart(data);
            case 'bar':
                return renderBarChart(data, visualization.config);
            default:
                return (
                    <div className="h-40 flex items-center justify-center text-muted-foreground">
                        Visualisering ikke implementert for {visualization?.type}
                    </div>
                );
        }
    };

    const renderSummary = () => {
        const { summary, insights } = analysisResult;

        // Get user-friendly labels for summary stats
        const getSummaryLabel = (key) => {
            const labels = {
                'totalCategories': 'Antall kategorier',
                'biggestGainer': 'Størst økning',
                'biggestLoser': 'Størst nedgang',
                'averageChange': 'Gjennomsnittlig endring',
                'avgMoMChange': 'Gjennomsnitt månedlig endring',
                'avgYoYChange': 'Gjennomsnitt årlig endring',
                'totalPeriods': 'Antall perioder',
                'hasYoYData': 'Har årlige data',
                'top80Count': 'Antall i top 80%',
                'top80Percentage': 'Prosent av top 80%',
                'top20PercentCount': 'Antall i top 20%',
                'top20PercentContribution': 'Bidrag fra top 20%',
                'paretoEfficiency': 'Pareto-effektivitet'
            };
            return labels[key] || key.replace(/([A-Z])/g, ' $1').toLowerCase();
        };

        // Get user-friendly value display
        const getSummaryValue = (key, value) => {
            if (typeof value === 'object' && value !== null) {
                return value.group || 'N/A';
            }
            if (typeof value === 'boolean') {
                return value ? 'Ja' : 'Nei';
            }
            if (typeof value === 'number') {
                if (key.includes('Percentage') || key.includes('Change') || key.includes('Contribution')) {
                    return `${value.toFixed(1)}%`;
                }
                return value.toLocaleString('nb-NO');
            }
            return value;
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Summary Stats */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Viktige tall
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(summary || {}).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">
                                        {getSummaryLabel(key)}
                                    </span>
                                    <span className="font-medium">
                                        {getSummaryValue(key, value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Insights */}
                {insights && insights.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                Viktige oppdagelser
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {insights.map((insight, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <span className="text-blue-600 mt-0.5">💡</span>
                                        <span className="text-sm text-blue-900">{insight}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    const getDirectionIcon = (direction) => {
        switch (direction) {
            case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
            case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
            default: return <Minus className="h-4 w-4 text-gray-600" />;
        }
    };

    const getDirectionText = (direction) => {
        switch (direction) {
            case 'up': return 'Økning';
            case 'down': return 'Nedgang';
            case 'stable': return 'Stabil';
            default: return direction;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Tilbake
                        </Button>
                        <h2 className="text-xl font-semibold">{analysisResult.title}</h2>
                        {explanation && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                                        <HelpCircle className="h-4 w-4 mr-1" />
                                        Hvordan lese dette?
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                            <Info className="h-5 w-5 text-blue-600" />
                                            {explanation.title}
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <p className="text-sm text-muted-foreground">
                                            {explanation.explanation}
                                        </p>
                                        <div>
                                            <h4 className="text-sm font-medium mb-2">Tips for å lese resultatene:</h4>
                                            <ul className="space-y-1">
                                                {explanation.tips.map((tip, index) => (
                                                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                                        <span className="text-blue-500 mt-1">•</span>
                                                        <span>{tip}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                    {analysisResult.subtitle && (
                        <p className="text-muted-foreground mt-1">{analysisResult.subtitle}</p>
                    )}
                </div>
                <Badge variant="outline">{analysisResult.type}</Badge>
            </div>

            {/* Summary Cards */}
            {(analysisResult.summary || analysisResult.insights) && renderSummary()}

            {/* Main Visualization */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Graf
                        {explanation && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                💡 Klikk "Hvordan lese dette?" ovenfor for hjelp
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {renderVisualization()}
                </CardContent>
            </Card>

            {/* Data Table (for detailed inspection) */}
            {analysisResult.data && analysisResult.data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Detaljerte Data
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                📋 Rådata for egen analyse
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        {Object.keys(analysisResult.data[0]).map(key => {
                                            // Get user-friendly column names
                                            const friendlyNames = {
                                                'name': 'Navn',
                                                'Periode A': 'Første periode',
                                                'Periode B': 'Andre periode',
                                                'Endring': 'Absolutt endring',
                                                'Endring %': 'Prosentvis endring',
                                                'direction': 'Retning',
                                                'value': 'Verdi',
                                                'percentage': 'Prosent av total',
                                                'cumulativePercentage': 'Kumulativ prosent'
                                            };

                                            return (
                                                <th key={key} className="text-left p-3 font-medium">
                                                    {friendlyNames[key] || key}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {analysisResult.data.slice(0, 20).map((row, index) => (
                                        <tr key={index} className="border-b hover:bg-muted/30">
                                            {Object.entries(row).map(([key, value]) => (
                                                <td key={key} className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        {key === 'direction' && getDirectionIcon(value)}
                                                        <span>
                                                            {key === 'direction' ? getDirectionText(value) :
                                                                typeof value === 'number' ?
                                                                    (key.includes('Percentage') || key.includes('%') ?
                                                                        `${value.toFixed(1)}%` :
                                                                        value.toLocaleString('nb-NO')
                                                                    ) :
                                                                    value
                                                            }
                                                        </span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {analysisResult.data.length > 20 && (
                                <div className="p-3 text-center text-muted-foreground border-t">
                                    Viser første 20 av {analysisResult.data.length} rader
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AnalysisResults;
