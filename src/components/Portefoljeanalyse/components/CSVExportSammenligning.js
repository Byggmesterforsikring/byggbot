import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { PORTFOLIO_HELPERS } from '../utils/portfolioBusinessRules';
import {
    Download,
    FileText,
    BarChart3,
    AlertTriangle,
    CheckCircle
} from 'lucide-react';

const CSVExportSammenligning = ({ portefoljeData }) => {
    const [exportStatus, setExportStatus] = useState(null);

    // Konverter portfolio JSON til samme struktur som original SQL
    const originalSQLFormat = useMemo(() => {
        if (!portefoljeData?.customers) return [];

        console.log('🔄 Konverterer portfolio JSON til original SQL-format...');

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
                            // KUNDE-INFO (som original SQL)
                            CustomerNumber: kunde.InsuredNumber,
                            CustomerCompanyName: kunde.CustomerType === 'Bedriftskunde' ? kunde.Name : null,
                            CustomerFirstName: kunde.CustomerType === 'Privatkunde' ? kunde.GivenName : null,
                            CustomerSurname: kunde.CustomerType === 'Privatkunde' ? kunde.Surname : null,
                            OrganizationNumber: kunde.CustomerType === 'Bedriftskunde' ? kunde.IdentificationNumber : null,
                            SocialSecurityNumber: kunde.CustomerType === 'Privatkunde' ? kunde.IdentificationNumber : null,
                            IsBusiness: kunde.CustomerType === 'Bedriftskunde' ? 1 : 0,
                            CustomerEmail: kunde.EMail,

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
                            ObjectNumber: product.InsurableObject?.ExternalID,
                            InsuredObjectAdress: product.InsurableObject?.Name,

                            // PREMIE-INFO (som original SQL)
                            PeriodPremium: cover.Premium || 0,
                            BMFProvisjon: 0, // Ikke tilgjengelig i API
                            NetPremium: 0,   // Ikke tilgjengelig i API
                            Naturskade: cover.NaturePremium || 0,
                            AnnualPremium: cover.NetYearPremium || 0,
                            SumInsured: cover.InsuranceAmount || 0,

                            // METADATA
                            CoverStartDate: policy.InceptionDate,
                            CoverEndDate: policy.EndDate,

                            // BEREGNET INFO
                            _PolicyStatusID: policy.PolicyStatusID,
                            _ProductPremium: product.Premium || 0,
                            _IsValidForUI: ['Aktiv', 'Utgått'].includes(policy.PolicyStatusName),
                            _IsValidForHistorical: ['Aktiv', 'Utgått', 'Fornyet'].includes(policy.PolicyStatusName)
                        };

                        rows.push(row);
                    });
                });
            });
        });

        console.log(`✅ Konvertert ${rows.length} rader til original SQL-format`);
        return rows;
    }, [portefoljeData]);

    // Beregn sammendrag
    const summary = useMemo(() => {
        if (originalSQLFormat.length === 0) return null;

        const totalRows = originalSQLFormat.length;
        const uniquePolicies = new Set(originalSQLFormat.map(r => r.PolicyNumber)).size;
        const uniqueCustomers = new Set(originalSQLFormat.map(r => r.CustomerNumber)).size;

        // Beregn premie-totaler
        const totalPremiumAll = originalSQLFormat.reduce((sum, row) => sum + row.PeriodPremium, 0);
        const totalPremiumUILogic = originalSQLFormat
            .filter(row => row._IsValidForUI)
            .reduce((sum, row) => sum + row.PeriodPremium, 0);

        // Policy status-fordeling
        const statusFordeling = {};
        originalSQLFormat.forEach(row => {
            statusFordeling[row.PolicyStatus] = (statusFordeling[row.PolicyStatus] || 0) + 1;
        });

        return {
            totalRows,
            uniquePolicies,
            uniqueCustomers,
            totalPremiumAll,
            totalPremiumUILogic,
            filtreringseffekt: totalPremiumAll - totalPremiumUILogic,
            filtreringsProsent: ((totalPremiumAll - totalPremiumUILogic) / totalPremiumAll * 100).toFixed(1),
            statusFordeling,
            periode: portefoljeData.summary?.periode
        };
    }, [originalSQLFormat, portefoljeData]);

    const exportToCSV = () => {
        if (originalSQLFormat.length === 0) {
            setExportStatus({ type: 'error', message: 'Ingen data å eksportere' });
            return;
        }

        try {
            setExportStatus({ type: 'loading', message: 'Genererer CSV...' });

            // CSV-header (samme som original SQL)
            const headers = [
                'CustomerNumber', 'CustomerCompanyName', 'CustomerFirstName', 'CustomerSurname',
                'OrganizationNumber', 'SocialSecurityNumber', 'IsBusiness', 'CustomerEmail',
                'PolicyNumber', 'PolicyVersionNumber', 'PolicyStatus', 'PolicyStartDate', 'PolicyEndDate',
                'ProductNumber', 'ProductName', 'Cover', 'Insurer',
                'ObjectNumber', 'InsuredObjectAdress',
                'PeriodPremium', 'BMFProvisjon', 'NetPremium', 'Naturskade', 'AnnualPremium', 'SumInsured',
                'CoverStartDate', 'CoverEndDate',
                '_PolicyStatusID', '_ProductPremium', '_IsValidForUI', '_IsValidForHistorical'
            ];

            // Bygg CSV-innhold
            const csvContent = [
                headers.join(','),
                ...originalSQLFormat.map(row =>
                    headers.map(header => {
                        let value = row[header];
                        if (value === null || value === undefined) value = '';
                        if (typeof value === 'string' && value.includes(',')) {
                            value = `"${value}"`;
                        }
                        return value;
                    }).join(',')
                )
            ].join('\n');

            // Last ned CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `portfolio-sql-format-${summary.periode.startDate}-${summary.periode.endDate}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setExportStatus({
                type: 'success',
                message: `CSV eksportert: ${originalSQLFormat.length} rader`
            });

            // Fjern status etter 3 sekunder
            setTimeout(() => setExportStatus(null), 3000);

        } catch (error) {
            console.error('❌ Feil ved CSV-eksport:', error);
            setExportStatus({ type: 'error', message: `Eksport feilet: ${error.message}` });
        }
    };

    if (!portefoljeData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        CSV Export Sammenligning
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Ingen porteføljedata tilgjengelig</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        CSV Export Sammenligning
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        Eksporter porteføljedata i samme format som original SQL for sammenligning.
                    </div>

                    {summary && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                                <div className="text-sm font-medium">Data-oversikt</div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <div>Totalt rader: {summary.totalRows.toLocaleString('no-NO')}</div>
                                    <div>Unike policies: {summary.uniquePolicies.toLocaleString('no-NO')}</div>
                                    <div>Unike kunder: {summary.uniqueCustomers.toLocaleString('no-NO')}</div>
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium">Premie-sammenligning</div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <div>Alle policies: {summary.totalPremiumAll.toLocaleString('no-NO')} NOK</div>
                                    <div>UI-logikk (Aktiv+Utgått): {summary.totalPremiumUILogic.toLocaleString('no-NO')} NOK</div>
                                    <div>Filtreringseffekt: {summary.filtreringseffekt.toLocaleString('no-NO')} NOK ({summary.filtreringsProsent}%)</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {summary && (
                        <div className="space-y-2">
                            <div className="text-sm font-medium">Policy Status-fordeling</div>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(summary.statusFordeling).map(([status, count]) => (
                                    <Badge
                                        key={status}
                                        variant={['Aktiv', 'Utgått'].includes(status) ? 'default' : 'secondary'}
                                        className="text-xs"
                                    >
                                        {status}: {count}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={exportToCSV}
                            disabled={originalSQLFormat.length === 0 || exportStatus?.type === 'loading'}
                            className="flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            {exportStatus?.type === 'loading' ? 'Eksporterer...' : 'Eksporter CSV'}
                        </Button>

                        {exportStatus && (
                            <div className={`flex items-center gap-2 text-sm ${exportStatus.type === 'success' ? 'text-green-600' :
                                    exportStatus.type === 'error' ? 'text-red-600' :
                                        'text-blue-600'
                                }`}>
                                {exportStatus.type === 'success' && <CheckCircle className="h-4 w-4" />}
                                {exportStatus.type === 'error' && <AlertTriangle className="h-4 w-4" />}
                                {exportStatus.type === 'loading' && <BarChart3 className="h-4 w-4 animate-spin" />}
                                {exportStatus.message}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CSVExportSammenligning;








