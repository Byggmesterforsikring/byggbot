import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    LineChart,
    Line
} from 'recharts';
import {
    PieChart as PieIcon,
    BarChart3,
    Calendar,
    User,
    TrendingUp,
    AlertCircle,
    Eye,
    Filter,
    Clock,
    DollarSign,
    ChevronDown,
    ChevronRight,
    MousePointer,
    X
} from 'lucide-react';
import {
    processClaimData,
    groupClaimsByType,
    getMonthlyClaimPattern,
    calculateVehicleRiskProfile,
    formatCurrency,
    formatNumber
} from '../utils/dataProcessing';
import SkadeDetailModal from './SkadeDetailModal';

const SkadeAnalyse = ({ kundeData }) => {
    const [activeView, setActiveView] = useState('typer');
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('alle');
    const [expandedVehicles, setExpandedVehicles] = useState(new Set());
    const [groupingMode, setGroupingMode] = useState('skadekode1'); // Ny state for gruppering

    const handleClaimClick = (skade) => {
        setSelectedClaim(skade);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedClaim(null);
    };

    if (!kundeData) return null;

    const skadeData = processClaimData(kundeData.skadehistorikk);
    const månedligeMønstre = getMonthlyClaimPattern(skadeData);
    const kjøretøyRisiko = calculateVehicleRiskProfile(skadeData);

    // Fleksible gruppering-funksjoner
    const groupByMode = (mode) => {
        const grouped = {};

        skadeData.forEach(skade => {
            let groupKey = 'Ukjent';

            switch (mode) {
                case 'produkt':
                    groupKey = skade.produktNavn || 'Ukjent produkt';
                    break;
                case 'skadekode1':
                    groupKey = skade.skadekoder?.nivå1 || 'Ukjent skadetype';
                    break;
                case 'skadekode2':
                    groupKey = skade.skadekoder?.nivå2 || 'Ukjent underkategori';
                    break;
                case 'skadekode3':
                    groupKey = skade.skadekoder?.nivå3 || 'Ukjent detaljkategori';
                    break;
                default:
                    groupKey = skade.skadekoder?.nivå1 || 'Ukjent';
            }

            if (!grouped[groupKey]) {
                grouped[groupKey] = {
                    name: groupKey,
                    antall: 0,
                    totalKostnad: 0,
                    skader: []
                };
            }
            grouped[groupKey].antall++;
            grouped[groupKey].totalKostnad += skade.totalKostnad || 0;
            grouped[groupKey].skader.push(skade);
        });

        return Object.values(grouped).sort((a, b) => b.totalKostnad - a.totalKostnad);
    };

    const skadeTyperGruppert = {
        all: groupByMode(groupingMode),
        forPieChart: groupByMode(groupingMode) // Forenklet for nå
    };

    // Debug: Sammenlign antall
    console.log(`SkadeAnalyse: ${kundeData.skadehistorikk?.length} rå skader → ${skadeData.length} prosesserte skader`);

    // Filtrerte skader
    const filteredClaims = useMemo(() => {
        let filtered = skadeData;

        // Status filter
        if (filterStatus === 'åpne') {
            filtered = filtered.filter(skade => skade.åpen === 1);
        } else if (filterStatus === 'lukkede') {
            filtered = filtered.filter(skade => skade.åpen === 0);
        }

        return filtered.sort((a, b) => b.skadeDato - a.skadeDato);
    }, [skadeData, filterStatus]);

    // Farger for pie chart
    const COLORS = ['#7c3aed', '#ef4444', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#84cc16', '#f97316'];

    const toggleVehicleExpansion = (regNr) => {
        const newExpanded = new Set(expandedVehicles);
        if (newExpanded.has(regNr)) {
            newExpanded.delete(regNr);
        } else {
            newExpanded.add(regNr);
        }
        setExpandedVehicles(newExpanded);
    };

    const viewOptions = [
        { key: 'typer', label: 'Skadetyper', icon: PieIcon },
        { key: 'månedlig', label: 'Månedlige mønstre', icon: Calendar },
        { key: 'kjøretøy', label: 'Kjøretøy-risiko', icon: BarChart3 },
        { key: 'liste', label: 'Skadeliste', icon: Eye }
    ];

    const renderSkadeTyperView = () => (
        <div className="space-y-6">
            {/* Visuell sammenligning */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie chart (grupperte data) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieIcon className="h-5 w-5" />
                            {groupingMode === 'produkt' ? 'Produkter' : 'Skadetyper'} - Fordeling (kostnad)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={skadeTyperGruppert.forPieChart}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        fill="#7c3aed"
                                        dataKey="totalKostnad"
                                        label={({ name, percent }) =>
                                            percent > 0.05 ? `${name}: ${(percent * 100).toFixed(1)}%` : ''
                                        }
                                    >
                                        {skadeTyperGruppert.forPieChart.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        formatter={(value, name) => [formatCurrency(value), 'Total kostnad']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Bar chart (alle data) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            {groupingMode === 'produkt' ? 'Produkter' : 'Skadetyper'} - Antall
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={skadeTyperGruppert.all.slice(0, 8)}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="name"
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                        fontSize={11}
                                    />
                                    <YAxis />
                                    <RechartsTooltip
                                        formatter={(value, name) => {
                                            if (name === 'Antall skader') return [formatNumber(value), name];
                                            return [formatCurrency(value), name];
                                        }}
                                    />
                                    <Bar dataKey="antall" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Antall skader" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detaljert statistikk-tabell */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span>Komplett skadetype-oversikt</span>
                            <Badge variant="outline" className="text-xs">
                                {skadeTyperGruppert.all.length} kategorier
                            </Badge>
                        </div>
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                            <Button
                                size="sm"
                                variant={groupingMode === 'produkt' ? 'default' : 'ghost'}
                                onClick={() => setGroupingMode('produkt')}
                                className="text-xs"
                            >
                                Produkt
                            </Button>
                            <Button
                                size="sm"
                                variant={groupingMode === 'skadekode1' ? 'default' : 'ghost'}
                                onClick={() => setGroupingMode('skadekode1')}
                                className="text-xs"
                            >
                                Nivå 1
                            </Button>
                            <Button
                                size="sm"
                                variant={groupingMode === 'skadekode2' ? 'default' : 'ghost'}
                                onClick={() => setGroupingMode('skadekode2')}
                                className="text-xs"
                            >
                                Nivå 2
                            </Button>
                            <Button
                                size="sm"
                                variant={groupingMode === 'skadekode3' ? 'default' : 'ghost'}
                                onClick={() => setGroupingMode('skadekode3')}
                                className="text-xs"
                            >
                                Nivå 3
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Beskrivelse av valgt visning */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                            <span className="font-medium">Viser gruppering etter:</span> {
                                groupingMode === 'produkt' ? 'Forsikringsprodukt - se hvilke produkter som har flest skader' :
                                    groupingMode === 'skadekode1' ? 'Hovedskadetype (nivå 1) - overordnede skadekategorier' :
                                        groupingMode === 'skadekode2' ? 'Skade-underkategori (nivå 2) - mer spesifikke skadetyper' :
                                            'Detaljert skadeklassifikasjon (nivå 3) - mest detaljerte skadekoder'
                            }
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">{
                                        groupingMode === 'produkt' ? 'Produkt' : 'Skadetype'
                                    }</th>
                                    <th className="text-right p-2">Antall</th>
                                    <th className="text-right p-2">Total kostnad</th>
                                    <th className="text-right p-2">Ø per skade</th>
                                    <th className="text-right p-2">% av total kostnad</th>
                                </tr>
                            </thead>
                            <tbody>
                                {skadeTyperGruppert.all.map((type, index) => {
                                    const totalCost = skadeTyperGruppert.all.reduce((sum, t) => sum + t.totalKostnad, 0);
                                    const percentage = totalCost > 0 ? (type.totalKostnad / totalCost) * 100 : 0;

                                    return (
                                        <tr key={index} className="border-b hover:bg-gray-50">
                                            <td className="p-2">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                    />
                                                    <span className="font-medium">{type.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-2 text-right">{formatNumber(type.antall)}</td>
                                            <td className="p-2 text-right font-medium">{formatCurrency(type.totalKostnad)}</td>
                                            <td className="p-2 text-right">{formatCurrency(type.totalKostnad / type.antall)}</td>
                                            <td className="p-2 text-right">
                                                <span className={`font-medium ${percentage > 20 ? 'text-red-600' :
                                                    percentage > 10 ? 'text-yellow-600' :
                                                        'text-green-600'
                                                    }`}>
                                                    {percentage.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    const renderMånedligeMønstreView = () => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Månedlige skademønstre
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={månedligeMønstre} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="månedNavn"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                fontSize={12}
                            />
                            <YAxis yAxisId="left" label={{ value: 'Antall skader', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" label={{ value: 'Total kostnad (NOK)', angle: 90, position: 'insideRight' }} />
                            <RechartsTooltip
                                formatter={(value, name) => {
                                    if (name === 'Total kostnad') return [formatCurrency(value), name];
                                    return [formatNumber(value), name];
                                }}
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="antallSkader" fill="#7c3aed" name="Antall skader" />
                            <Line yAxisId="right" type="monotone" dataKey="totalKostnad" stroke="#ef4444" strokeWidth={2} name="Total kostnad" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );

    const renderKjøretøyRisikoView = () => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top 10 mest skadeutsatte kjøretøy
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={kjøretøyRisiko} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="registreringsNummer"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    fontSize={11}
                                />
                                <YAxis label={{ value: 'Antall skader', angle: -90, position: 'insideLeft' }} />
                                <RechartsTooltip
                                    formatter={(value, name) => {
                                        if (name === 'Total kostnad') return [formatCurrency(value), name];
                                        return [formatNumber(value), name];
                                    }}
                                />
                                <Bar dataKey="antallSkader" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                        {kjøretøyRisiko.slice(0, 10).map((vehicle, index) => (
                            <div key={index} className="border rounded-lg">
                                {/* Kjøretøy-header (klikkbar) */}
                                <div
                                    className="p-4 cursor-pointer hover:bg-gray-50"
                                    onClick={() => toggleVehicleExpansion(vehicle.registreringsNummer)}
                                >
                                    <div className="flex items-center gap-3">
                                        {expandedVehicles.has(vehicle.registreringsNummer) ? (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-medium">{vehicle.registreringsNummer}</h4>
                                                <Badge variant={vehicle.antallSkader >= 5 ? 'error' : vehicle.antallSkader >= 3 ? 'secondary' : 'outline'}>
                                                    {formatNumber(vehicle.antallSkader)} skader
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="font-medium text-gray-900">{formatCurrency(vehicle.totalKostnad)}</span>
                                                    <span className="text-xs block text-muted-foreground">Total kostnad</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-900">{formatCurrency(vehicle.totalKostnad / vehicle.antallSkader)}</span>
                                                    <span className="text-xs block text-muted-foreground">Gj.snitt skadekostnad</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-900">
                                                        {vehicle.skader.filter(s => s.åpen === 1).length > 0 ?
                                                            `${vehicle.skader.filter(s => s.åpen === 1).length} åpen(e)` :
                                                            'Ingen åpne'
                                                        }
                                                    </span>
                                                    <span className="text-xs block text-muted-foreground">Status</span>
                                                </div>
                                            </div>
                                            {/* Mest vanlige skadetype */}
                                            <div className="mt-2 text-xs text-muted-foreground">
                                                <span className="font-medium">Vanligste skadetype:</span> {
                                                    (() => {
                                                        const typeCount = {};
                                                        vehicle.skader.forEach(skade => {
                                                            const type = skade.skadekoder?.nivå2 || skade.skadekoder?.nivå1 || skade.skadeType;
                                                            typeCount[type] = (typeCount[type] || 0) + 1;
                                                        });
                                                        const mostCommon = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];
                                                        return mostCommon ? `${mostCommon[0]} (${mostCommon[1]}x)` : 'Ikke spesifisert';
                                                    })()
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Utvidbar skadeliste for kjøretøyet */}
                                {expandedVehicles.has(vehicle.registreringsNummer) && (
                                    <div className="border-t bg-gray-50 p-4">
                                        <h5 className="font-medium mb-3">Skadehistorikk for {vehicle.registreringsNummer}</h5>
                                        <div className="space-y-2">
                                            {vehicle.skader
                                                .sort((a, b) => b.skadeDato - a.skadeDato)
                                                .map((skade, skadeIndex) => (
                                                    <div key={skadeIndex} className="bg-white border rounded-lg p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-sm">#{skade.skadeNummer}</span>
                                                                <Badge variant={skade.åpen === 1 ? 'error' : 'default'} className="text-xs">
                                                                    {skade.status}
                                                                </Badge>
                                                            </div>
                                                            <span className="font-medium">{formatCurrency(skade.totalKostnad)}</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                                                            <div>
                                                                <p><strong>Dato:</strong> {skade.skadeDato.toLocaleDateString('nb-NO')}</p>
                                                                <p><strong>Type:</strong> {skade.skadeType}</p>
                                                            </div>
                                                            <div>
                                                                <p><strong>Saksbehandler:</strong> {skade.saksbehandler}</p>
                                                                <p><strong>Produkt:</strong> {skade.produktNavn}</p>
                                                            </div>
                                                            <div>
                                                                <p><strong>Skadekode:</strong> {skade.skadekoder?.nivå1}</p>
                                                                {skade.skadekoder?.nivå2 && (
                                                                    <p><strong>Detalj:</strong> {skade.skadekoder.nivå2}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {skade.åpen === 1 && (
                                                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                                                <strong>Åpen sak</strong> - Reservert: {formatCurrency(skade.reservert)}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    const renderSkadeListeView = () => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Detaljert skadeliste ({filteredClaims.length} skader - siste 5 år)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Filtre */}
                    <div className="flex gap-2">
                        <Button
                            variant={filterStatus === 'alle' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterStatus('alle')}
                        >
                            Alle ({skadeData.length})
                        </Button>
                        <Button
                            variant={filterStatus === 'åpne' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterStatus('åpne')}
                        >
                            Åpne ({skadeData.filter(s => s.åpen === 1).length})
                        </Button>
                        <Button
                            variant={filterStatus === 'lukkede' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterStatus('lukkede')}
                        >
                            Lukkede ({skadeData.filter(s => s.åpen === 0).length})
                        </Button>
                    </div>
                </div>

                {/* Skadeliste */}
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white border-b">
                            <tr>
                                <th className="text-left p-2">Skade nr.</th>
                                <th className="text-left p-2">Dato</th>
                                <th className="text-left p-2">Status</th>
                                <th className="text-left p-2">Type</th>
                                <th className="text-left p-2">Reg.nr</th>
                                <th className="text-right p-2">Kostnad</th>
                                <th className="text-left p-2">Saksbehandler</th>
                                <th className="text-left p-2">Skadekode</th>
                                <th className="text-center p-2">Vis</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClaims.map((skade, index) => (
                                <tr
                                    key={index}
                                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => handleClaimClick(skade)}
                                >
                                    <td className="p-2">
                                        <div className="flex items-center gap-2">
                                            <MousePointer className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">{skade.skadeNummer}</span>
                                        </div>
                                    </td>
                                    <td className="p-2">{skade.skadeDato.toLocaleDateString('nb-NO')}</td>
                                    <td className="p-2">
                                        <Badge variant={skade.åpen === 1 ? 'destructive' : 'default'}>
                                            {skade.status}
                                        </Badge>
                                    </td>
                                    <td className="p-2">{skade.skadeType}</td>
                                    <td className="p-2 font-mono text-xs">
                                        {skade.registreringsNummer || '-'}
                                    </td>
                                    <td className="p-2 text-right font-medium">
                                        {formatCurrency(skade.totalKostnad)}
                                    </td>
                                    <td className="p-2 text-xs">{skade.saksbehandler}</td>
                                    <td className="p-2 text-xs">
                                        {skade.skadekoder?.nivå1}
                                        {skade.skadekoder?.nivå2 && ` > ${skade.skadekoder.nivå2}`}
                                    </td>
                                    <td className="p-2 text-center">
                                        <Eye className="h-4 w-4 text-gray-400" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );

    const renderSelectedView = () => {
        switch (activeView) {
            case 'typer': return renderSkadeTyperView();
            case 'månedlig': return renderMånedligeMønstreView();
            case 'kjøretøy': return renderKjøretøyRisikoView();
            case 'liste': return renderSkadeListeView();
            default: return renderSkadeTyperView();
        }
    };

    // Saksbehandler-statistikk
    const saksbehandlerStats = useMemo(() => {
        const stats = {};
        skadeData.forEach(skade => {
            const saksbehandler = skade.saksbehandler || 'Ukjent';
            if (!stats[saksbehandler]) {
                stats[saksbehandler] = { antall: 0, totalKostnad: 0, åpne: 0 };
            }
            stats[saksbehandler].antall++;
            stats[saksbehandler].totalKostnad += skade.totalKostnad;
            if (skade.åpen === 1) stats[saksbehandler].åpne++;
        });

        return Object.entries(stats)
            .map(([navn, data]) => ({ navn, ...data }))
            .sort((a, b) => b.antall - a.antall);
    }, [skadeData]);

    return (
        <div className="space-y-6">
            {/* View selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Skadeanalyse
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* 5-års perspektiv info */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-700 text-sm">
                                <Calendar className="h-4 w-4" />
                                <span>
                                    <strong>Analyseperiode:</strong> Alle analyser nedenfor er basert på siste 5 års skadedata
                                    ({skadeData.length} skader) - standard for fornyelsevurdering.
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {viewOptions.map(option => {
                                const Icon = option.icon;
                                return (
                                    <Button
                                        key={option.key}
                                        variant={activeView === option.key ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setActiveView(option.key)}
                                        className="flex items-center gap-2"
                                    >
                                        <Icon className="h-4 w-4" />
                                        {option.label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Nøkkelstatistikk */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-500" />
                            <div>
                                <p className="text-2xl font-bold">{formatNumber(skadeData.length)}</p>
                                <p className="text-xs text-muted-foreground">Totale skader</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-500" />
                            <div>
                                <p className="text-2xl font-bold">{formatNumber(skadeData.filter(s => s.åpen === 1).length)}</p>
                                <p className="text-xs text-muted-foreground">Åpne skader</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <div>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(skadeData.reduce((sum, s) => sum + s.totalKostnad, 0))}
                                </p>
                                <p className="text-xs text-muted-foreground">Total skadekostnad</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-purple-500" />
                            <div>
                                <p className="text-2xl font-bold">{saksbehandlerStats.length}</p>
                                <p className="text-xs text-muted-foreground">Saksbehandlere</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Hovedinnhold basert på valgt view */}
            {renderSelectedView()}

            {/* Saksbehandler-oversikt */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Saksbehandler-oversikt
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {saksbehandlerStats.slice(0, 6).map((saksbehandler, index) => (
                            <div key={index} className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-sm">{saksbehandler.navn}</h4>
                                    {saksbehandler.åpne > 0 && (
                                        <Badge variant="outline" className="text-red-600">
                                            {saksbehandler.åpne} åpne
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <p>Totalt: {formatNumber(saksbehandler.antall)} skader</p>
                                    <p>Total kostnad: {formatCurrency(saksbehandler.totalKostnad)}</p>
                                    <p>Ø per skade: {formatCurrency(saksbehandler.totalKostnad / saksbehandler.antall)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Skadedetalj Modal */}
            <SkadeDetailModal
                skade={selectedClaim}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </div>
    );
};

export default SkadeAnalyse;
