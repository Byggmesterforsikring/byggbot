import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
    BarChart3,
    TrendingUp,
    AlertTriangle,
    Target,
    Calendar,
    PieChart,
    Activity,
    FileText,
    Users,
    Building
} from 'lucide-react';

const REPORT_TYPES = {
    r12: {
        id: 'r12',
        title: 'R12 Rapport',
        description: 'Rolling 12 måneder analyse - kontinuerlig 12-måneders oversikt',
        icon: Calendar,
        color: 'bg-white border-gray-200 hover:bg-gray-50',
        iconColor: 'text-blue-600',
        features: ['Rolling 12-måneders data', 'Trend-analyse', 'Sammenligning mot forrige periode', 'Sesongvariasjoner'],
        enabled: false
    },
    portfolio: {
        id: 'portfolio',
        title: 'Porteføljeanalyse',
        description: 'Komplett analyse av hele forsikringsporteføljen',
        icon: BarChart3,
        color: 'bg-white border-gray-200 hover:bg-gray-50',
        iconColor: 'text-purple-600',
        features: ['Portefølje-oversikt', 'Produktlinje-analyse', 'Risikoprofil', 'Lønnsomhetsanalyse'],
        enabled: true
    },
    claims: {
        id: 'claims',
        title: 'Skaderapport',
        description: 'Detaljert analyse av skader og skadeutvikling',
        icon: AlertTriangle,
        color: 'bg-white border-gray-200 hover:bg-gray-50',
        iconColor: 'text-red-600',
        features: ['Skadefrekvens', 'Skadestørrelse', 'Skadeutvikling', 'Loss triangles'],
        enabled: true  // KUN SKADERAPPORT ER AKTIV
    },
    underwriting: {
        id: 'underwriting',
        title: 'UW-analyse',
        description: 'Underwriting performance og risikoselektion',
        icon: Target,
        color: 'bg-white border-gray-200 hover:bg-gray-50',
        iconColor: 'text-green-600',
        features: ['UW-årganger', 'Combined ratio', 'Risk selection', 'Pricing adequacy'],
        enabled: false
    },
    quarterly: {
        id: 'quarterly',
        title: 'Kvartalsrapport',
        description: 'Kvartalvis analyse og sammenligning',
        icon: PieChart,
        color: 'bg-white border-gray-200 hover:bg-gray-50',
        iconColor: 'text-orange-600',
        features: ['Kvartal-sammenligning', 'Sesongmønstre', 'YoY analyse', 'Trend-indikatorer'],
        enabled: false
    },
    customer: {
        id: 'customer',
        title: 'Kunderapport',
        description: 'Kundeanalyse og segmentering',
        icon: Users,
        color: 'bg-white border-gray-200 hover:bg-gray-50',
        iconColor: 'text-teal-600',
        features: ['Kunde-segmentering', 'Lønnsomhet per kunde', 'Risikoprofiler', 'Retention analyse'],
        enabled: false
    },
    product: {
        id: 'product',
        title: 'Produktrapport',
        description: 'Analyse per produktlinje og dekning',
        icon: Building,
        color: 'bg-white border-gray-200 hover:bg-gray-50',
        iconColor: 'text-indigo-600',
        features: ['Produktlinje-performance', 'Dekning-analyse', 'Cross-selling', 'Pricing analyse'],
        enabled: false
    }
};

const ReportTypeSelector = ({ portefoljeData, onReportSelect }) => {
    const handleReportSelect = (reportType) => {
        if (!reportType.enabled) {
            console.log(`⚠️ Rapport ${reportType.title} er deaktivert`);
            return;
        }
        console.log(`📊 Starter ${reportType.title} analyse direkte`);
        onReportSelect?.(reportType); // Start analyse direkte
    };

    const enabledReports = Object.values(REPORT_TYPES).filter(r => r.enabled).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Velg rapport-type
                        <Badge variant="outline" className="ml-2">
                            {enabledReports} aktiv{enabledReports !== 1 ? 'e' : ''} / {Object.keys(REPORT_TYPES).length} rapporter
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-600">
                        Velg hvilken type analyse du ønsker å kjøre på porteføljedataen.
                        Hver rapport-type har spesialiserte verktøy og visualiseringer.
                    </p>
                </CardContent>
            </Card>

            {/* Rapport-kort */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.values(REPORT_TYPES).map((report) => {
                    const Icon = report.icon;
                    const isDisabled = !report.enabled;

                    return (
                        <Card
                            key={report.id}
                            className={`transition-all duration-200 ${
                                isDisabled
                                    ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200'
                                    : `cursor-pointer ${report.color} hover:shadow-md`
                            }`}
                            onClick={() => handleReportSelect(report)}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <Icon className={`h-6 w-6 ${isDisabled ? 'text-gray-400' : report.iconColor}`} />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-lg">{report.title}</CardTitle>
                                            {isDisabled && (
                                                <Badge variant="secondary" className="text-xs">
                                                    Kommer snart
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className={`text-sm mb-4 ${isDisabled ? 'text-gray-500' : 'text-gray-700'}`}>
                                    {report.description}
                                </p>

                                <div className="space-y-1">
                                    <p className={`text-xs font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Inkluderer:
                                    </p>
                                    {report.features.map((feature, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <div className={`w-1 h-1 rounded-full ${isDisabled ? 'bg-gray-300' : 'bg-gray-400'}`}></div>
                                            <span className={`text-xs ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {feature}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>


            {/* Datasett-info */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-sm text-gray-600">Kunder</p>
                            <p className="text-lg font-bold text-blue-600">
                                {portefoljeData?.customers?.length?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Poliser</p>
                            <p className="text-lg font-bold text-green-600">
                                {portefoljeData?.customers?.reduce((sum, customer) =>
                                    sum + (customer.PolicyList?.length || 0), 0
                                )?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Skader</p>
                            <p className="text-lg font-bold text-red-600">
                                {portefoljeData?.claimData?.SkadeDetaljer?.length?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Dataspenn</p>
                            <p className="text-sm font-bold text-purple-600">
                                {portefoljeData?._metadata?.periode ?
                                    `${new Date(portefoljeData._metadata.periode.startDate).toLocaleDateString('nb-NO')} - ${new Date(portefoljeData._metadata.periode.endDate).toLocaleDateString('nb-NO')}` :
                                    'Ukjent'
                                }
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReportTypeSelector;
