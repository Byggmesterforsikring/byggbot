import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { BarChart3, TrendingUp, Users, Package } from 'lucide-react';

const PortfolioReport = ({
    portefoljeData,
    selectedPeriods = [],
    selectedProducts = [],
    selectedCovers = [],
    selectedInsurers = [],
    selectedCustomerType = 'alle'
}) => {

    // Helper: Hent siste dato fra metadata (fra filnavn)
    const getEndDateFromMetadata = () => {
        // Hent fra summary.periode.endDate (hovedkilde)
        if (portefoljeData?.summary?.periode?.endDate) {
            return portefoljeData.summary.periode.endDate;
        }

        // Fallback til _metadata hvis det finnes
        if (portefoljeData?._metadata?.periode?.endDate) {
            return portefoljeData._metadata.periode.endDate;
        }

        // FALLBACK: Ikke bruk dagens dato - vis error
        console.error('⚠️ Kunne ikke finne endDate i data. Sjekk datastruktur:', portefoljeData);
        return null;
    };

    const endDate = getEndDateFromMetadata();

    // Helper: Beregn periode basert på valg
    const getPeriodDates = (periodId, endDate) => {
        const end = new Date(endDate);
        let start;

        if (periodId === 'alle') {
            // Alle data fra første PolicyStartDate
            return { start: null, end: null }; // null = ingen datofilter
        } else if (periodId === 'siste12') {
            // Siste 12 måneder fra endDate
            start = new Date(end);
            start.setMonth(start.getMonth() - 12);
            return { start: start.toISOString().split('T')[0], end: endDate };
        } else if (periodId === 'iaar') {
            // Inneværende år (2025)
            return { start: '2025-01-01', end: endDate };
        } else if (periodId.includes('-')) {
            // Kvartal: q1-2025
            const [quarter, year] = periodId.split('-');
            const qNum = parseInt(quarter.substring(1));
            const startMonth = (qNum - 1) * 3 + 1;
            const endMonth = qNum * 3;
            return {
                start: `${year}-${String(startMonth).padStart(2, '0')}-01`,
                end: `${year}-${String(endMonth).padStart(2, '0')}-${new Date(year, endMonth, 0).getDate()}`
            };
        } else {
            // År: 2024
            return { start: `${periodId}-01-01`, end: `${periodId}-12-31` };
        }
    };

    // Beregn unike kunder basert på filtre
    const customerStats = useMemo(() => {
        if (!portefoljeData?.customers) return { totalCustomers: 0, churnedCustomers: 0, activeCustomers: 0 };

        // Hvis ingen periode valgt, returner 0
        if (selectedPeriods.length === 0) {
            return { totalCustomers: 0, churnedCustomers: 0, activeCustomers: 0 };
        }

        // For enkelhet, bruk første valgte periode (vi håndterer ikke sammenligning ennå)
        const periodId = selectedPeriods[0];
        const { start: periodStart, end: periodEnd } = getPeriodDates(periodId, endDate);

        const activeCustomers = new Set();
        const churnedCustomers = new Set();

        portefoljeData.customers.forEach(customer => {
            // Filter på kundetype
            if (selectedCustomerType !== 'alle') {
                const isPrivate = !customer.OrganizationNumber || customer.OrganizationNumber.trim() === '';
                if (selectedCustomerType === 'privat' && !isPrivate) return;
                if (selectedCustomerType === 'bedrift' && isPrivate) return;
            }

            // Helper: Sjekk om policy matcher filtre (produkt, dekning, insurer)
            const policyMatchesFilters = (policy) => {
                // Filter på produkt
                if (selectedProducts.length > 0) {
                    const hasSelectedProduct = policy.PolicyProduct?.some(product =>
                        selectedProducts.includes(product.ProductName)
                    );
                    if (!hasSelectedProduct) return false;
                }

                // Filter på dekning
                if (selectedCovers.length > 0) {
                    const hasSelectedCover = policy.PolicyProduct?.some(product =>
                        product.PolicyCover?.some(cover => selectedCovers.includes(cover.Cover))
                    );
                    if (!hasSelectedCover) return false;
                }

                // Filter på forsikringsselskap
                if (selectedInsurers.length > 0) {
                    const hasSelectedInsurer = policy.PolicyProduct?.some(product =>
                        product.PolicyCover?.some(cover => selectedInsurers.includes(cover.Insurer))
                    );
                    if (!hasSelectedInsurer) return false;
                }

                return true;
            };

            // Sjekk om kunde har minst én AKTIV policy med StartDate i perioden
            const hasActivePolicy = customer.PolicyList?.some(policy => {
                if (!policyMatchesFilters(policy)) return false;

                const policyStatus = policy.PolicyStatus;
                const policyStartDate = policy.PolicyStartDate;

                if (policyStatus === 'Aktiv') {
                    if (!policyStartDate) return false;

                    // Hvis "alle", ta med alle aktive
                    if (!periodStart && !periodEnd) return true;

                    // Sjekk om PolicyStartDate er innenfor perioden
                    return policyStartDate >= periodStart && policyStartDate <= periodEnd;
                }

                return false;
            });

            if (hasActivePolicy) {
                activeCustomers.add(customer.CustomerID || customer.CustomerNumber);
                return; // Kunde er aktiv, ikke frafall
            }

            // Sjekk om kunde har frafalt (INGEN aktive, men har utgått med StartDate i perioden)
            const hasAnyActivePolicy = customer.PolicyList?.some(policy => {
                return policyMatchesFilters(policy) && policy.PolicyStatus === 'Aktiv';
            });

            if (!hasAnyActivePolicy) {
                // Kunden har INGEN aktive policies (med filtrering)
                // Sjekk om de har utgått policy med StartDate i perioden
                const hasExpiredInPeriod = customer.PolicyList?.some(policy => {
                    if (!policyMatchesFilters(policy)) return false;

                    const policyStatus = policy.PolicyStatus;
                    const policyStartDate = policy.PolicyStartDate;

                    if (policyStatus === 'Utgått') {
                        if (!policyStartDate) return false;

                        // Hvis "alle", ikke tell som frafall (ingen periode)
                        if (!periodStart && !periodEnd) return false;

                        // Sjekk om PolicyStartDate er innenfor perioden
                        return policyStartDate >= periodStart && policyStartDate <= periodEnd;
                    }

                    return false;
                });

                if (hasExpiredInPeriod) {
                    churnedCustomers.add(customer.CustomerID || customer.CustomerNumber);
                }
            }
        });

        const totalCustomers = activeCustomers.size + churnedCustomers.size;

        return {
            totalCustomers: totalCustomers,
            activeCustomers: activeCustomers.size,
            churnedCustomers: churnedCustomers.size
        };
    }, [portefoljeData, selectedPeriods, selectedProducts, selectedCovers, selectedInsurers, selectedCustomerType, endDate]);

    return (
        <div className="space-y-6">
            {/* Kundestatistikk - Hovedkort */}
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Kundestatistikk
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {selectedPeriods.length === 0 ? (
                        <div className="text-center p-8">
                            <p className="text-gray-600">Velg en periode for å se kundestatistikk</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Totalt antall kunder */}
                            <div className="bg-white rounded-lg p-6 border border-purple-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Totalt kunder</p>
                                        <p className="text-4xl font-bold text-purple-600">
                                            {customerStats.totalCustomers.toLocaleString('nb-NO')}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Startet i perioden
                                        </p>
                                    </div>
                                    <Users className="h-16 w-16 text-purple-200" />
                                </div>
                            </div>

                            {/* Aktive kunder */}
                            <div className="bg-white rounded-lg p-6 border border-green-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Aktive kunder</p>
                                        <p className="text-4xl font-bold text-green-600">
                                            {customerStats.activeCustomers.toLocaleString('nb-NO')}
                                        </p>
                                        {customerStats.totalCustomers > 0 && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {((customerStats.activeCustomers / customerStats.totalCustomers) * 100).toFixed(1)}% aktive
                                            </p>
                                        )}
                                    </div>
                                    <TrendingUp className="h-16 w-16 text-green-200" />
                                </div>
                            </div>

                            {/* Frafall (churned customers) */}
                            <div className="bg-white rounded-lg p-6 border border-red-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Frafall i perioden</p>
                                        <p className="text-4xl font-bold text-red-600">
                                            {customerStats.churnedCustomers.toLocaleString('nb-NO')}
                                        </p>
                                        {customerStats.totalCustomers > 0 && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {((customerStats.churnedCustomers / customerStats.totalCustomers) * 100).toFixed(1)}% frafall
                                            </p>
                                        )}
                                    </div>
                                    <TrendingUp className="h-16 w-16 text-red-200 rotate-180" />
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Debug-info */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                            <p className="text-sm font-medium text-blue-900">Filter-debug info</p>
                        </div>
                        <div className="text-xs text-blue-700 space-y-1">
                            <p><strong>Siste dato i periode:</strong> {endDate}</p>
                            <p><strong>Valgte perioder:</strong> {selectedPeriods.length > 0 ? selectedPeriods.join(', ') : 'Ingen valgt'}</p>
                            <p><strong>Valgte produkter:</strong> {selectedProducts.length > 0 ? selectedProducts.join(', ') : 'Alle'}</p>
                            <p><strong>Valgte dekninger:</strong> {selectedCovers.length > 0 ? selectedCovers.join(', ') : 'Alle'}</p>
                            <p><strong>Valgte forsikringsselskap:</strong> {selectedInsurers.length > 0 ? selectedInsurers.join(', ') : 'Alle'}</p>
                            <p><strong>Kundetype:</strong> {selectedCustomerType}</p>
                            <p><strong>Totalt kunder i dataset:</strong> {portefoljeData?.customers?.length || 0}</p>
                            {selectedPeriods.length > 0 && (
                                <>
                                    <p><strong>Periode-beregning:</strong> {JSON.stringify(getPeriodDates(selectedPeriods[0], endDate))}</p>
                                    <p><strong>Aktive kunder:</strong> {customerStats.activeCustomers} (PolicyStatus='Aktiv' + PolicyStartDate i periode)</p>
                                    <p><strong>Frafall:</strong> {customerStats.churnedCustomers} (Ingen aktive policies, men PolicyStatus='Utgått' + PolicyStartDate i periode)</p>
                                    <p><strong>Total kunder:</strong> {customerStats.totalCustomers} (Aktive + Frafall = {customerStats.activeCustomers} + {customerStats.churnedCustomers})</p>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PortfolioReport;
