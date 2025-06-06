import React, { useState, useEffect, memo } from 'react';
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { BarChart3, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useToast } from "~/hooks/use-toast";
import { formatCurrency } from '../../../utils/tilbud-konstanter';

const RammeOvervakning = memo(({ selskapId, navarendeProsjektId = null }) => {
    const [rammeData, setRammeData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    // Hent rammedata
    const fetchRammeData = async () => {
        if (!selskapId) return;

        setIsLoading(true);
        try {
            const params = { selskapId, navarendeProsjektId };
            const result = await window.electron.tilbud.getRammeForbruk(params);
            if (result.success) {
                setRammeData(result.data);
            } else {
                throw new Error(result.error || 'Kunne ikke hente rammedata');
            }
        } catch (error) {
            console.error('Feil ved henting av rammedata:', error);
            toast({
                title: "Feil ved lasting",
                description: "Kunne ikke laste rammeforbruk",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Hent data ved mount og når selskapId/prosjektId endres
    useEffect(() => {
        fetchRammeData();
    }, [selskapId, navarendeProsjektId]);

    // Få riktig status-ikon basert på forbruksnivå
    const getStatusIcon = () => {
        if (!rammeData) return <BarChart3 className="h-4 w-4" />;

        const prosent = rammeData.forbruksProsent || 0;
        if (prosent >= 90) return <AlertTriangle className="h-4 w-4 text-destructive" />;
        if (prosent >= 75) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    };

    // Få riktig tekstfarge basert på forbruksnivå
    const getStatusColor = () => {
        if (!rammeData) return 'text-muted-foreground';

        const prosent = rammeData.forbruksProsent || 0;
        if (prosent >= 90) return 'text-destructive';
        if (prosent >= 75) return 'text-yellow-600';
        return 'text-green-600';
    };

    if (isLoading) {
        return (
            <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Rammeovervåking - Kundeforhold</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="h-8 bg-muted rounded animate-pulse mb-2"></div>
                            <div className="h-4 bg-muted rounded animate-pulse"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!rammeData) {
        return (
            <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Rammeovervåking - Kundeforhold</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchRammeData}>
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Prøv igjen
                    </Button>
                </div>
                <p className="text-muted-foreground text-center py-4">Kunne ikke laste rammedata</p>
            </div>
        );
    }

    return (
        <div className="bg-white border rounded-lg p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Rammeovervåking - Kundeforhold</h3>
                </div>
                <div className="flex items-center gap-3">
                    {getStatusIcon()}
                    <span className={`text-sm font-medium ${getStatusColor()}`}>
                        {rammeData.forbruksProsent.toFixed(1)}% brukt
                    </span>
                    <Button variant="outline" size="sm" onClick={fetchRammeData}>
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Oppdater
                    </Button>
                </div>
            </div>

            {/* Kundeforhold oversikt */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">
                        {formatCurrency(rammeData.totalRamme)}
                    </div>
                    <div className="text-sm text-blue-700">Total ramme</div>
                    <div className="text-xs text-blue-600 mt-1">{rammeData.selskapsnavn}</div>
                </div>

                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">
                        {formatCurrency(rammeData.navarendeProsjektBelop)}
                    </div>
                    <div className="text-sm text-green-700">Nåværende prosjekt</div>
                    <div className="text-xs text-green-600 mt-1">Dette prosjektet</div>
                </div>

                <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="text-2xl font-bold text-orange-900">
                        {formatCurrency(rammeData.forbruktPaAndreProsjekter)}
                    </div>
                    <div className="text-sm text-orange-700">Andre prosjekter</div>
                    <div className="text-xs text-orange-600 mt-1">{rammeData.antallAndreProsjekter} produserte</div>
                </div>

                <div className="text-center p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900">
                        {formatCurrency(rammeData.tilgjengeligRamme)}
                    </div>
                    <div className="text-sm text-slate-700">Tilgjengelig</div>
                    <div className="text-xs text-slate-600 mt-1">Inkl. nåværende</div>
                </div>
            </div>

            {/* Varsler for høyt forbruk */}
            {rammeData.forbruksProsent >= 90 && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Høyt rammeforbruk!</strong> Kundeforholdet har brukt{' '}
                        <strong>{rammeData.forbruksProsent.toFixed(1)}%</strong> av den totale rammen.
                    </AlertDescription>
                </Alert>
            )}

            {rammeData.forbruksProsent >= 75 && rammeData.forbruksProsent < 90 && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Advarsel:</strong> Kundeforholdet nærmer seg rammekapasitet med{' '}
                        <strong>{rammeData.forbruksProsent.toFixed(1)}%</strong> forbruk.
                    </AlertDescription>
                </Alert>
            )}

            {/* Footer info */}
            <div className="text-xs text-muted-foreground border-t pt-4">
                Sist oppdatert: {rammeData.sistOppdatert ?
                    new Date(rammeData.sistOppdatert).toLocaleDateString('nb-NO', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : 'Ukjent'
                }
            </div>
        </div>
    );
});

export default RammeOvervakning; 