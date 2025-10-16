import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
    Calendar,
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart,
    Shield,
    AlertTriangle,
    DollarSign
} from 'lucide-react';

import {
    EARNED_PREMIUM_RULES,
    PORTFOLIO_HELPERS,
    LOSS_RATIO_RULES,
    POLICY_STATUS_RULES,
    SimplePortfolioAnalysis
} from '../utils/portfolioBusinessRules';

const UWYearAnalyse = ({ portfolioData, claimsData }) => {
    const [yearlyData, setYearlyData] = useState([]);
    const [selectedYear, setSelectedYear] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Test både nested og direct struktur
        const hasValidData = (portfolioData?.data?.customers || portfolioData?.customers) &&
            (portfolioData?.skadeData || portfolioData?.claimData || claimsData?.skadeData);

        if (hasValidData) {
            analyzeByUWYear();
        }
    }, [portfolioData, claimsData]);

    const analyzeByUWYear = () => {
        setLoading(true);
        try {

            // Grupper policies etter UWYear (PolicyStartDate år)
            const yearlyGroups = {};

            // Støtt både nested og direct struktur
            const customers = portfolioData.data?.customers || portfolioData.customers || [];

            customers.forEach(customer => {
                customer.PolicyList?.forEach(policy => {
                    // Finn UWYear for denne policy (basert på første product med dato)
                    let policyUWYear = null;
                    let policyProducts = [];
                    let policyCovers = [];

                    policy.PolicyProduct?.forEach(product => {
                        if (product.PolicyCover && product.InceptionDate) {
                            const uwYear = new Date(product.InceptionDate).getFullYear();

                            // Bruk første products UWYear som policy UWYear
                            if (policyUWYear === null) {
                                policyUWYear = uwYear;
                            }

                            // Samle alle products og covers for denne policy
                            policyProducts.push(product);
                            product.PolicyCover.forEach(cover => {
                                policyCovers.push({
                                    ...cover,
                                    policy: policy,
                                    product: product,
                                    customer: customer,
                                    uwYear: uwYear
                                });
                            });
                        }
                    });

                    // Legg til policy i riktig UWYear (kun en gang per policy!)
                    if (policyUWYear !== null) {
                        if (!yearlyGroups[policyUWYear]) {
                            yearlyGroups[policyUWYear] = {
                                year: policyUWYear,
                                policies: [],
                                covers: [],
                                claims: []
                            };
                        }

                        // Legg til policy EN GANG
                        yearlyGroups[policyUWYear].policies.push({
                            ...policy,
                            customer: customer,
                            products: policyProducts
                        });

                        // Legg til alle covers for denne policy
                        yearlyGroups[policyUWYear].covers.push(...policyCovers);

                        // DEBUG: Log første 2025 policy
                        if (policyUWYear === 2025 && yearlyGroups[policyUWYear].policies.length === 1) {
                            console.log('🎯 Første 2025 policy (fikset):', {
                                customer: customer.InsuredNumber,
                                policy: policy.PolicyNumber,
                                uwYear: policyUWYear,
                                products: policyProducts.length,
                                covers: policyCovers.length,
                                totalPremium: policyCovers.reduce((sum, c) => sum + (c.Premium || 0), 0)
                            });
                        }
                    }
                });
            });

            // Legg til skader per år basert på PolicyStartDate  
            const skadeDetaljer = claimsData?.skadeData?.SkadeDetaljer ||
                portfolioData?.skadeData?.SkadeDetaljer ||
                portfolioData?.claimData?.SkadeDetaljer || [];

            skadeDetaljer.forEach(claim => {
                if (claim.Polisenummer) {
                    // Finn hvilken UWYear denne skaden tilhører
                    const matchingCover = Object.values(yearlyGroups).flat()
                        .find(group => group.covers.some(cover =>
                            cover.policy.PolicyNumber === claim.Polisenummer
                        ));

                    if (matchingCover) {
                        const uwYear = matchingCover.covers.find(cover =>
                            cover.policy.PolicyNumber === claim.Polisenummer
                        )?.uwYear;

                        if (uwYear && yearlyGroups[uwYear]) {
                            yearlyGroups[uwYear].claims.push(claim);
                        }
                    }
                }
            });

            // Debug yearlyGroups før KPI-beregning
            console.log('📊 YearlyGroups sammendrag:', Object.keys(yearlyGroups).map(year => ({
                year: parseInt(year),
                policies: yearlyGroups[year].policies.length,
                covers: yearlyGroups[year].covers.length,
                claims: yearlyGroups[year].claims.length
            })));

            // Beregn KPIer per år
            const yearlyAnalysis = Object.values(yearlyGroups)
                .map(yearGroup => calculateYearlyKPIs(yearGroup))
                .sort((a, b) => b.year - a.year); // Nyeste først

            setYearlyData(yearlyAnalysis);

            // Velg nyeste år som default
            if (yearlyAnalysis.length > 0) {
                setSelectedYear(yearlyAnalysis[0].year);
            }


        } catch (error) {
            console.error('❌ Feil ved UWYear-analyse:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateYearlyKPIs = (yearGroup) => {
        const { year, policies, covers, claims } = yearGroup;

        // Beregn portefølje-KPIer
        const totalPremium = covers.reduce((sum, cover) => sum + (cover.Premium || 0), 0);

        // DEBUG for 2025
        if (year === 2025) {
            console.log('🔍 2025 UWYear beregning:', {
                year,
                policies: policies.length,
                covers: covers.length,
                totalPremium: totalPremium,
                firstCover: covers[0] ? {
                    premium: covers[0].Premium,
                    productStart: covers[0].product?.InceptionDate,
                    productEnd: covers[0].product?.EndDate
                } : null
            });
        }

        // Beregn opptjent premie per cover
        const viewDate = new Date('2025-08-31'); // ViewDate for analyse
        let earnedPremium = 0;

        covers.forEach(cover => {
            // Forenklet opptjent premie-beregning (midlertidig)
            const premium = cover.Premium || 0;

            // Enkel logikk: Hvis policy er utgått, 100% opptjent, ellers pro-rata
            if (cover.product && cover.product.InceptionDate && cover.product.EndDate) {
                const startDate = new Date(cover.product.InceptionDate);
                const endDate = new Date(cover.product.EndDate);

                if (viewDate >= endDate) {
                    // Policy er utgått - 100% opptjent
                    earnedPremium += premium;
                } else if (viewDate >= startDate) {
                    // Policy er aktiv - beregn pro-rata
                    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                    const daysCovered = Math.ceil((viewDate - startDate) / (1000 * 60 * 60 * 24));
                    const ratio = Math.min(daysCovered / totalDays, 1);
                    earnedPremium += premium * ratio;
                }
            } else {
                // Fallback: 50% opptjent hvis ingen datoer
                earnedPremium += premium * 0.5;
            }
        });

        // Beregn skade-KPIer (enkel versjon for å unngå import-problemer)
        const totalClaimCost = claims.reduce((sum, claim) => {
            return sum + (claim.Utbetalt || 0) + (claim.Skadereserve || 0) + (claim.Regress || 0);
        }, 0);

        // Beregn skaderatio
        const lossRatio = earnedPremium > 0 ? (totalClaimCost / earnedPremium) * 100 : 0;

        // Beregn vekst (sammenlign med forrige år hvis tilgjengelig)
        const growth = {
            premiumGrowth: null,
            claimsGrowth: null,
            lossRatioChange: null
        };

        return {
            year,
            summary: {
                totalPolicies: policies.length,
                totalCovers: covers.length,
                totalClaims: claims.length,
                totalCustomers: new Set(policies.map(p => p.customer.InsuredNumber)).size
            },
            financial: {
                totalPremium: Math.round(totalPremium),
                earnedPremium: Math.round(earnedPremium),
                totalClaimCost: Math.round(totalClaimCost),
                lossRatio: Math.round(lossRatio * 10) / 10,
                earnedPremiumRatio: totalPremium > 0 ? Math.round((earnedPremium / totalPremium) * 1000) / 10 : 0
            },
            growth,
            riskProfile: {
                avgClaimSize: claims.length > 0 ? Math.round(totalClaimCost / claims.length) : 0,
                claimFrequency: covers.length > 0 ? Math.round((claims.length / covers.length) * 1000) / 10 : 0
            },
            rawData: { policies, covers, claims }
        };
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('nb-NO', {
            style: 'currency',
            currency: 'NOK',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatPercent = (value) => {
        return `${value}%`;
    };

    const getRiskBadge = (lossRatio) => {
        if (lossRatio > 100) return <Badge variant="destructive">Høy risiko</Badge>;
        if (lossRatio > 70) return <Badge variant="secondary">Moderat risiko</Badge>;
        return <Badge variant="default">Lav risiko</Badge>;
    };

    const selectedYearData = yearlyData.find(y => y.year === selectedYear);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Calendar className="h-6 w-6" />
                            UW-Årgang Analyse
                        </h2>
                        <p className="text-muted-foreground">
                            Analyse basert på PolicyStartDate (Underwriting Year)
                        </p>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-12">
                        <div className="flex items-center justify-center">
                            <div className="text-center space-y-4">
                                <div className="animate-spin h-12 w-12 border-b-2 border-primary mx-auto"></div>
                                <div className="space-y-2">
                                    <p className="text-lg font-medium">Analyserer UW-årganger...</p>
                                    <p className="text-sm text-muted-foreground">
                                        Prosesserer 5 års porteføljedata (1407 kunder, 257k dekninger)
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Dette tar vanligvis 4-5 sekunder
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Calendar className="h-6 w-6" />
                        UW-Årgang Analyse
                    </h2>
                    <p className="text-muted-foreground">
                        Analyse basert på PolicyStartDate (Underwriting Year)
                    </p>
                </div>
                {selectedYearData && (
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {getRiskBadge(selectedYearData.financial.lossRatio)}
                    </div>
                )}
            </div>

            {/* Årgang oversikt */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        UW-Årganger Oversikt
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {yearlyData.map(yearData => (
                            <Card
                                key={yearData.year}
                                className={`cursor-pointer transition-all hover:shadow-md ${selectedYear === yearData.year ? 'ring-2 ring-primary' : ''
                                    }`}
                                onClick={() => setSelectedYear(yearData.year)}
                            >
                                <CardContent className="p-4">
                                    <div className="text-center space-y-2">
                                        <h3 className="text-lg font-semibold">{yearData.year}</h3>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span>Policies:</span>
                                                <span className="font-medium">{yearData.summary.totalPolicies}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Premie:</span>
                                                <span className="font-medium">
                                                    {formatCurrency(yearData.financial.totalPremium)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Skaderatio:</span>
                                                <span className={`font-medium ${yearData.financial.lossRatio > 100 ? 'text-red-600' :
                                                    yearData.financial.lossRatio > 70 ? 'text-yellow-600' :
                                                        'text-green-600'
                                                    }`}>
                                                    {formatPercent(yearData.financial.lossRatio)}
                                                </span>
                                            </div>
                                        </div>
                                        {selectedYear === yearData.year && (
                                            <Badge variant="outline" className="mt-2">Valgt</Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Detaljert analyse for valgt år */}
            {selectedYearData && (
                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Oversikt</TabsTrigger>
                        <TabsTrigger value="financial">Økonomi</TabsTrigger>
                        <TabsTrigger value="claims">Skader</TabsTrigger>
                        <TabsTrigger value="risk">Risiko</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>UW-Årgang {selectedYearData.year} - Oversikt</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center p-4 bg-muted rounded-lg">
                                        <div className="text-2xl font-bold text-primary">
                                            {selectedYearData.summary.totalPolicies}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Policies</div>
                                    </div>
                                    <div className="text-center p-4 bg-muted rounded-lg">
                                        <div className="text-2xl font-bold text-primary">
                                            {selectedYearData.summary.totalCovers}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Dekninger</div>
                                    </div>
                                    <div className="text-center p-4 bg-muted rounded-lg">
                                        <div className="text-2xl font-bold text-primary">
                                            {selectedYearData.summary.totalCustomers}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Kunder</div>
                                    </div>
                                    <div className="text-center p-4 bg-muted rounded-lg">
                                        <div className="text-2xl font-bold text-primary">
                                            {selectedYearData.summary.totalClaims}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Skader</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="financial" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Økonomisk Analyse - UW-Årgang {selectedYearData.year}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="space-y-2">
                                        <div className="text-sm text-muted-foreground">Total Premie</div>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(selectedYearData.financial.totalPremium)}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-sm text-muted-foreground">Opptjent Premie</div>
                                        <div className="text-2xl font-bold text-blue-600">
                                            {formatCurrency(selectedYearData.financial.earnedPremium)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatPercent(selectedYearData.financial.earnedPremiumRatio)} av total
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-sm text-muted-foreground">Skadekostnad</div>
                                        <div className="text-2xl font-bold text-red-600">
                                            {formatCurrency(selectedYearData.financial.totalClaimCost)}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-sm text-muted-foreground">Skaderatio</div>
                                        <div className={`text-2xl font-bold ${selectedYearData.financial.lossRatio > 100 ? 'text-red-600' :
                                            selectedYearData.financial.lossRatio > 70 ? 'text-yellow-600' :
                                                'text-green-600'
                                            }`}>
                                            {formatPercent(selectedYearData.financial.lossRatio)}
                                        </div>
                                        <div className="text-xs">
                                            {getRiskBadge(selectedYearData.financial.lossRatio)}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="claims" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Skadeanalyse - UW-Årgang {selectedYearData.year}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <div className="text-sm text-muted-foreground">Antall Skader</div>
                                        <div className="text-2xl font-bold">
                                            {selectedYearData.summary.totalClaims}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-sm text-muted-foreground">Gjennomsnittlig Skadestørrelse</div>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(selectedYearData.riskProfile.avgClaimSize)}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-sm text-muted-foreground">Skadefrekvens</div>
                                        <div className="text-2xl font-bold">
                                            {selectedYearData.riskProfile.claimFrequency}‰
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            per 1000 dekninger
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="risk" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    Risikoprofil - UW-Årgang {selectedYearData.year}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="p-4 bg-muted rounded-lg">
                                        <h4 className="font-semibold mb-2">Overordnet Risikovurdering</h4>
                                        <div className="flex items-center gap-2">
                                            {getRiskBadge(selectedYearData.financial.lossRatio)}
                                            <span className="text-sm text-muted-foreground">
                                                Basert på skaderatio {formatPercent(selectedYearData.financial.lossRatio)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 border rounded-lg">
                                            <h5 className="font-medium mb-2">Skadefrekvens</h5>
                                            <div className="text-lg font-semibold">
                                                {selectedYearData.riskProfile.claimFrequency}‰
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {selectedYearData.summary.totalClaims} skader av {selectedYearData.summary.totalCovers} dekninger
                                            </div>
                                        </div>

                                        <div className="p-4 border rounded-lg">
                                            <h5 className="font-medium mb-2">Gjennomsnittlig Skadestørrelse</h5>
                                            <div className="text-lg font-semibold">
                                                {formatCurrency(selectedYearData.riskProfile.avgClaimSize)}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Per skadehendelse
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
};

export default UWYearAnalyse;
