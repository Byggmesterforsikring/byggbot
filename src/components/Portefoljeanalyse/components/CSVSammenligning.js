import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { PORTFOLIO_HELPERS } from '../utils/portfolioBusinessRules';
import {
    FileText,
    BarChart3,
    AlertTriangle,
    CheckCircle,
    Upload,
    Download,
    TrendingUp,
    TrendingDown
} from 'lucide-react';

const CSVSammenligning = ({ portefoljeData }) => {
    const [originalCSVData, setOriginalCSVData] = useState(null);
    const [csvFile, setCsvFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Last inn Result_3_2.csv automatisk
    useEffect(() => {
        const loadOriginalCSV = async () => {
            try {
                setLoading(true);
                const response = await fetch('/Result_3_2.csv');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const csvText = await response.text();
                const parsedData = parseCSV(csvText);
                setOriginalCSVData(parsedData);
                console.log('✅ Original SQL CSV lastet:', parsedData.length, 'rader');
            } catch (err) {
                console.error('❌ Feil ved lasting av original CSV:', err);
                setError(`Kunne ikke laste Result_3_2.csv: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        loadOriginalCSV();
    }, []);

    // Konverter portfolio JSON til samme format som original SQL
    const portfolioCSVFormat = useMemo(() => {
        if (!portefoljeData?.customers) return [];

        console.log('🔄 Konverterer portfolio JSON til CSV-format...');

        const rows = [];

        portefoljeData.customers.forEach(kunde => {
            if (!kunde.PolicyList) return;

            kunde.PolicyList.forEach(policy => {
                if (!policy.PolicyProduct) return;

                policy.PolicyProduct.forEach(product => {
                    if (!product.PolicyCover) return;

                    product.PolicyCover.forEach(cover => {
                        // Bygg en rad som matcher original SQL-struktur
                        const row = {
                            CustomerNumber: kunde.InsuredNumber,
                            CustomerCompanyName: kunde.CustomerType === 'Bedriftskunde' ? kunde.Name : '',
                            CustomerFirstName: kunde.CustomerType === 'Privatkunde' ? (kunde.GivenName || '') : '',
                            CustomerSurname: kunde.CustomerType === 'Privatkunde' ? (kunde.Surname || '') : '',
                            OrganizationNumber: kunde.CustomerType === 'Bedriftskunde' ? (kunde.IdentificationNumber || '') : '',
                            SocialSecurityNumber: kunde.CustomerType === 'Privatkunde' ? (kunde.IdentificationNumber || '') : '',
                            IsBusiness: kunde.CustomerType === 'Bedriftskunde' ? 1 : 0,
                            CustomerEmail: kunde.EMail || '',

                            // POLICY-INFO
                            PolicyNumber: policy.PolicyNumber,
                            PolicyVersionNumber: policy.PolicyVersion,
                            PolicyStatus: policy.PolicyStatusName,
                            PolicyStartDate: policy.InceptionDate,
                            PolicyEndDate: policy.EndDate,
                            ProductNumber: product.ProductNumber,
                            ProductName: product.ProductName,

                            // COVER-INFO  
                            Cover: cover.CoverName,
                            Insurer: cover.InsurerName,

                            // OBJEKT-INFO
                            ObjectNumber: product.InsurableObject?.ExternalID || '',
                            InsuredObjectAdress: product.InsurableObject?.Name || '',

                            // PREMIE-INFO (som original SQL)
                            PeriodPremium: parseFloat(cover.Premium || 0),
                            BMFProvisjon: 0, // Ikke tilgjengelig i API
                            NetPremium: 0,   // Ikke tilgjengelig i API
                            Naturskade: parseFloat(cover.NaturePremium || 0),
                            AnnualPremium: parseFloat(cover.NetYearPremium || 0),
                            SumInsured: parseFloat(cover.InsuranceAmount || 0),

                            // METADATA
                            CoverStartDate: policy.InceptionDate,
                            CoverEndDate: policy.EndDate,

                            // BEREGNET INFO
                            _PolicyStatusID: policy.PolicyStatusID,
                            _ProductPremium: parseFloat(product.Premium || 0),
                            _IsValidForUI: ['Aktiv', 'Utgått'].includes(policy.PolicyStatusName)
                        };

                        rows.push(row);
                    });
                });
            });
        });

        console.log(`✅ Portfolio JSON konvertert: ${rows.length} rader`);
        return rows;
    }, [portefoljeData]);

    // Sammenlign dataene
    const comparison = useMemo(() => {
        if (!originalCSVData || !portfolioCSVFormat.length) return null;

        console.log('🔍 Starter detaljert sammenligning...');

        // Grunnleggende statistikk
        const originalCount = originalCSVData.length;
        const portfolioCount = portfolioCSVFormat.length;
        const rowDifference = originalCount - portfolioCount;
        const rowDifferencePercent = ((rowDifference / originalCount) * 100).toFixed(1);

        // Premie-sammenligning
        const originalTotalPremium = originalCSVData.reduce((sum, row) =>
            sum + parseFloat(row.PeriodPremium || 0), 0);
        const portfolioTotalPremium = portfolioCSVFormat.reduce((sum, row) =>
            sum + row.PeriodPremium, 0);
        const premiumDifference = originalTotalPremium - portfolioTotalPremium;
        const premiumDifferencePercent = ((premiumDifference / originalTotalPremium) * 100).toFixed(1);

        // Policy Status-fordeling
        const originalStatusDist = {};
        const portfolioStatusDist = {};

        originalCSVData.forEach(row => {
            const status = row.PolicyStatus;
            originalStatusDist[status] = (originalStatusDist[status] || 0) + 1;
        });

        portfolioCSVFormat.forEach(row => {
            const status = row.PolicyStatus;
            portfolioStatusDist[status] = (portfolioStatusDist[status] || 0) + 1;
        });

        // Kunde-sammenligning
        const originalCustomers = new Set(originalCSVData.map(r => r.CustomerNumber)).size;
        const portfolioCustomers = new Set(portfolioCSVFormat.map(r => r.CustomerNumber)).size;

        // Policy-sammenligning
        const originalPolicies = new Set(originalCSVData.map(r => r.PolicyNumber)).size;
        const portfolioPolicies = new Set(portfolioCSVFormat.map(r => r.PolicyNumber)).size;

        // Finn manglende policies
        const originalPolicySet = new Set(originalCSVData.map(r => r.PolicyNumber));
        const portfolioPolicySet = new Set(portfolioCSVFormat.map(r => r.PolicyNumber));

        const missingInPortfolio = [...originalPolicySet].filter(p => !portfolioPolicySet.has(p));
        const extraInPortfolio = [...portfolioPolicySet].filter(p => !originalPolicySet.has(p));

        // Periode-analyse (kun data innenfor 2025-01-01 til 2025-08-31)
        const isInPeriod = (dateStr) => {
            if (!dateStr) return false;
            const date = new Date(dateStr);
            const start = new Date('2025-01-01');
            const end = new Date('2025-08-31');
            return date >= start && date <= end;
        };

        const originalInPeriod = originalCSVData.filter(row =>
            isInPeriod(row.PolicyStartDate) || isInPeriod(row.CoverStartDate));
        const portfolioInPeriod = portfolioCSVFormat.filter(row =>
            isInPeriod(row.PolicyStartDate) || isInPeriod(row.CoverStartDate));

        return {
            grunnleggende: {
                originalCount,
                portfolioCount,
                rowDifference,
                rowDifferencePercent,
                originalCustomers,
                portfolioCustomers,
                customerDifference: originalCustomers - portfolioCustomers,
                originalPolicies,
                portfolioPolicies,
                policyDifference: originalPolicies - portfolioPolicies
            },
            premie: {
                originalTotalPremium,
                portfolioTotalPremium,
                premiumDifference,
                premiumDifferencePercent
            },
            statusFordeling: {
                original: originalStatusDist,
                portfolio: portfolioStatusDist
            },
            manglendePolicies: {
                missingInPortfolio: missingInPortfolio.slice(0, 10), // Første 10
                extraInPortfolio: extraInPortfolio.slice(0, 10),
                totalMissing: missingInPortfolio.length,
                totalExtra: extraInPortfolio.length
            },
            periode: {
                originalInPeriod: originalInPeriod.length,
                portfolioInPeriod: portfolioInPeriod.length,
                periodeDifference: originalInPeriod.length - portfolioInPeriod.length
            }
        };
    }, [originalCSVData, portfolioCSVFormat]);

    // CSV Parser
    const parseCSV = (csvText) => {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;

            const values = lines[i].split(',');
            const row = {};

            headers.forEach((header, index) => {
                row[header.trim()] = values[index] ? values[index].trim() : '';
            });

            data.push(row);
        }

        return data;
    };

    const exportComparison = () => {
        if (!comparison) return;

        const reportData = {
            timestamp: new Date().toISOString(),
            summary: comparison,
            details: {
                originalSample: originalCSVData.slice(0, 5),
                portfolioSample: portfolioCSVFormat.slice(0, 5)
            }
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `csv-sammenligning-rapport-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>CSV Sammenligning</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 animate-spin" />
                        <span>Laster original CSV...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>CSV Sammenligning</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    if (!comparison) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>CSV Sammenligning</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Venter på data...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        CSV Sammenligning: Original SQL vs Portfolio JSON
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Grunnleggende sammenligning */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <div className="text-sm font-medium text-blue-900">Totalt Rader</div>
                            <div className="text-2xl font-bold text-blue-700">
                                {comparison.grunnleggende.originalCount.toLocaleString('no-NO')}
                            </div>
                            <div className="text-xs text-blue-600">Original SQL</div>
                        </div>

                        <div className="p-4 bg-green-50 rounded-lg">
                            <div className="text-sm font-medium text-green-900">Portfolio JSON</div>
                            <div className="text-2xl font-bold text-green-700">
                                {comparison.grunnleggende.portfolioCount.toLocaleString('no-NO')}
                            </div>
                            <div className="text-xs text-green-600">API-basert data</div>
                        </div>

                        <div className={`p-4 rounded-lg ${comparison.grunnleggende.rowDifference > 0 ? 'bg-red-50' : 'bg-green-50'
                            }`}>
                            <div className={`text-sm font-medium ${comparison.grunnleggende.rowDifference > 0 ? 'text-red-900' : 'text-green-900'
                                }`}>
                                Forskjell
                            </div>
                            <div className={`text-2xl font-bold flex items-center gap-1 ${comparison.grunnleggende.rowDifference > 0 ? 'text-red-700' : 'text-green-700'
                                }`}>
                                {comparison.grunnleggende.rowDifference > 0 ? <TrendingDown className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                                {Math.abs(comparison.grunnleggende.rowDifference).toLocaleString('no-NO')}
                            </div>
                            <div className={`text-xs ${comparison.grunnleggende.rowDifference > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                ({comparison.grunnleggende.rowDifferencePercent}%)
                            </div>
                        </div>
                    </div>

                    {/* Premie-sammenligning */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <div className="text-sm font-medium text-blue-900">Original SQL Premie</div>
                            <div className="text-2xl font-bold text-blue-700">
                                {comparison.premie.originalTotalPremium.toLocaleString('no-NO')} NOK
                            </div>
                        </div>

                        <div className="p-4 bg-green-50 rounded-lg">
                            <div className="text-sm font-medium text-green-900">Portfolio JSON Premie</div>
                            <div className="text-2xl font-bold text-green-700">
                                {comparison.premie.portfolioTotalPremium.toLocaleString('no-NO')} NOK
                            </div>
                        </div>

                        <div className={`p-4 rounded-lg ${comparison.premie.premiumDifference > 0 ? 'bg-red-50' : 'bg-green-50'
                            }`}>
                            <div className={`text-sm font-medium ${comparison.premie.premiumDifference > 0 ? 'text-red-900' : 'text-green-900'
                                }`}>
                                Premie-forskjell
                            </div>
                            <div className={`text-2xl font-bold flex items-center gap-1 ${comparison.premie.premiumDifference > 0 ? 'text-red-700' : 'text-green-700'
                                }`}>
                                {comparison.premie.premiumDifference > 0 ? <TrendingDown className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                                {Math.abs(comparison.premie.premiumDifference).toLocaleString('no-NO')} NOK
                            </div>
                            <div className={`text-xs ${comparison.premie.premiumDifference > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                ({comparison.premie.premiumDifferencePercent}%)
                            </div>
                        </div>
                    </div>

                    {/* Policy Status-sammenligning */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Policy Status-fordeling</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm font-medium mb-2">Original SQL</div>
                                <div className="flex flex-wrap gap-1">
                                    {Object.entries(comparison.statusFordeling.original).map(([status, count]) => (
                                        <Badge key={status} variant="secondary" className="text-xs">
                                            {status}: {count}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-medium mb-2">Portfolio JSON</div>
                                <div className="flex flex-wrap gap-1">
                                    {Object.entries(comparison.statusFordeling.portfolio).map(([status, count]) => (
                                        <Badge key={status} variant="default" className="text-xs">
                                            {status}: {count}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Manglende policies */}
                    {(comparison.manglendePolicies.totalMissing > 0 || comparison.manglendePolicies.totalExtra > 0) && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Policy-forskjeller</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {comparison.manglendePolicies.totalMissing > 0 && (
                                    <div className="p-3 bg-red-50 rounded-lg">
                                        <div className="text-sm font-medium text-red-900 mb-2">
                                            Mangler i Portfolio ({comparison.manglendePolicies.totalMissing})
                                        </div>
                                        <div className="text-xs text-red-700 space-y-1">
                                            {comparison.manglendePolicies.missingInPortfolio.map(policy => (
                                                <div key={policy}>Policy {policy}</div>
                                            ))}
                                            {comparison.manglendePolicies.totalMissing > 10 && (
                                                <div>... og {comparison.manglendePolicies.totalMissing - 10} flere</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {comparison.manglendePolicies.totalExtra > 0 && (
                                    <div className="p-3 bg-yellow-50 rounded-lg">
                                        <div className="text-sm font-medium text-yellow-900 mb-2">
                                            Ekstra i Portfolio ({comparison.manglendePolicies.totalExtra})
                                        </div>
                                        <div className="text-xs text-yellow-700 space-y-1">
                                            {comparison.manglendePolicies.extraInPortfolio.map(policy => (
                                                <div key={policy}>Policy {policy}</div>
                                            ))}
                                            {comparison.manglendePolicies.totalExtra > 10 && (
                                                <div>... og {comparison.manglendePolicies.totalExtra - 10} flere</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-4 border-t">
                        <Button onClick={exportComparison} className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Eksporter Sammenligning
                        </Button>
                        <div className="text-sm text-muted-foreground">
                            Detaljert JSON-rapport med alle funn
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CSVSammenligning;








