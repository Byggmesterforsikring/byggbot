import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { SimplePortfolioAnalysis, POLICY_STATUS_RULES, PORTFOLIO_HELPERS, EARNED_PREMIUM_RULES } from '../utils/portfolioBusinessRules';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Users,
    FileText,
    Target,
    DollarSign,
    Percent,
    Calendar,
    Shield,
    AlertTriangle,
    Activity
} from 'lucide-react';

const PortefoljeOversikt = ({ portefoljeData, filename }) => {
    // Memoized beregninger for bedre performance
    // Bruk filename som hovednøkkel for å sikre re-beregning ved ny fil
    const analysisResults = useMemo(() => {
        if (!portefoljeData) return null;

        console.log(`🔄 Beregner porteføljeanalyse for fil: ${filename}`);

        try {
            const engine = new SimplePortfolioAnalysis(portefoljeData);

            // Beregn alle nødvendige data på en gang
            const grunnleggende = engine.getGrunnleggendeOversikt();
            const aktiveOversikt = engine.beregnAktivePortefoljeOversikt();

            console.log(`✅ Analyse komplett for ${filename}:`, {
                kunder: grunnleggende.kunder,
                policies: aktiveOversikt.validerte.validePolicies,
                skaderatio: aktiveOversikt.økonomi.skadeRatio.toFixed(1) + '%'
            });

            return {
                grunnleggende,
                aktiveOversikt,
                engine
            };
        } catch (error) {
            console.error(`❌ Feil ved beregning av porteføljeanalyse for ${filename}:`, error);
            return null;
        }
    }, [filename, portefoljeData]);

    if (!analysisResults) {
        return (
            <div className="p-8 text-center">
                <p className="text-muted-foreground">Laster porteføljedata...</p>
            </div>
        );
    }

    const { grunnleggende, aktiveOversikt } = analysisResults;

    // Hjelpefunksjon for formatering
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('nb-NO', {
            style: 'currency',
            currency: 'NOK',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatNumber = (number) => {
        return new Intl.NumberFormat('nb-NO').format(number || 0);
    };

    const formatPercent = (percent) => {
        return `${(percent || 0).toFixed(1)}%`;
    };

    // Få risiko-badge basert på skaderatio
    const getRiskBadge = (skadeRatio) => {
        if (skadeRatio <= 50) {
            return <Badge className="bg-green-100 text-green-800 border-green-200">Utmerket</Badge>;
        } else if (skadeRatio <= 75) {
            return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Akseptabel</Badge>;
        } else {
            return <Badge className="bg-red-100 text-red-800 border-red-200">Problematisk</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Hovedoversikt - Inspirert av KundeOversikt */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                        Porteføljeanalyse
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-5 w-5 text-purple-600" />
                                <span className="font-medium">Kunder</span>
                            </div>
                            <p className="text-2xl font-bold text-purple-800">
                                {formatNumber(grunnleggende.kunder)}
                            </p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <span className="font-medium">Aktive poliser</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-800">
                                {formatNumber(aktiveOversikt.validerte.validePolicies)}
                            </p>
                            <p className="text-xs text-blue-600">Validerte statuser</p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="h-5 w-5 text-green-600" />
                                <span className="font-medium">Dekninger</span>
                            </div>
                            <p className="text-2xl font-bold text-green-800">
                                {formatNumber(aktiveOversikt.validerte.totalCovers)}
                            </p>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Target className="h-5 w-5 text-orange-600" />
                                <span className="font-medium">Skader</span>
                            </div>
                            <p className="text-2xl font-bold text-orange-800">
                                {formatNumber(aktiveOversikt.validerte.valideSkader)}
                            </p>
                        </div>
                    </div>

                    {/* Periode info */}
                    <div className="bg-gray-50 p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Analyseperiode:</span>
                            <span className="text-sm font-bold text-gray-800">
                                {grunnleggende.periode?.startDate} - {grunnleggende.periode?.endDate}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Økonomisk oversikt */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            Premie og inntekter
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-600">Total premie (brutto)</span>
                                <span className="font-semibold text-blue-600">
                                    {formatCurrency(aktiveOversikt.økonomi.totalPremie)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-600">Opptjent premie</span>
                                <span className="font-semibold text-green-600">
                                    {formatCurrency(aktiveOversikt.økonomi.earnedPremium)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-gray-600">Naturskadeavgift</span>
                                <span className="font-semibold text-blue-600">
                                    {formatCurrency(aktiveOversikt.økonomi.naturskade)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            Skadekostnader og ratio
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-600">Total skadekostnad</span>
                                <span className="font-semibold text-red-600">
                                    {formatCurrency(aktiveOversikt.økonomi.totalSkadekostnad)}
                                </span>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Skaderatio</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-bold text-gray-800">
                                            {formatPercent(aktiveOversikt.økonomi.skadeRatio)}
                                        </span>
                                        {getRiskBadge(aktiveOversikt.økonomi.skadeRatio)}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Beregnet som: Skadekostnad / Opptjent premie × 100
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Netto resultat og nøkkeltall */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-purple-600" />
                        Netto resultat og nøkkeltall
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Netto teknisk resultat */}
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="h-5 w-5 text-purple-600" />
                                <span className="font-medium text-gray-700">Netto teknisk resultat</span>
                            </div>
                            <p className={`text-2xl font-bold ${(aktiveOversikt.økonomi.earnedPremium - aktiveOversikt.økonomi.totalSkadekostnad) >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                                }`}>
                                {formatCurrency(aktiveOversikt.økonomi.earnedPremium - aktiveOversikt.økonomi.totalSkadekostnad)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Opptjent premie - Skadekostnad
                            </p>
                        </div>

                        {/* Gjennomsnittlig premie per polise */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <span className="font-medium text-blue-700">Gj.snitt premie/polise</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-800">
                                {formatCurrency(aktiveOversikt.økonomi.earnedPremium / aktiveOversikt.validerte.validePolicies)}
                            </p>
                        </div>

                        {/* Gjennomsnittlig skadekostnad per skade */}
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Target className="h-5 w-5 text-red-600" />
                                <span className="font-medium text-red-700">Gj.snitt kostnad/skade</span>
                            </div>
                            <p className="text-2xl font-bold text-red-800">
                                {aktiveOversikt.validerte.valideSkader > 0
                                    ? formatCurrency(aktiveOversikt.økonomi.totalSkadekostnad / aktiveOversikt.validerte.valideSkader)
                                    : formatCurrency(0)
                                }
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PortefoljeOversikt;
