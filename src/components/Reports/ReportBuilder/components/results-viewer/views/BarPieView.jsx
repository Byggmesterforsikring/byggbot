import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../ui/card';
import { BarChart3, PieChart as PieIcon } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

export default function BarPieView({
    chartData,
    comparativeChartData,
    hasCompare,
    chartLabels,
    onDrillDown,
    periodLabels,
}) {
    if (!Array.isArray(chartData) || chartData.length === 0) return null;
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {chartLabels.chartTitle}
                    {hasCompare && (
                        <span className="text-xs text-muted-foreground ml-2">(sammenligning aktiv)</span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {!hasCompare && (
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                <YAxis />
                                <RechartsTooltip formatter={(value) => [
                                    chartLabels.valueFieldName !== 'Antall' ?
                                        new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0 }).format(value) :
                                        Number(value).toLocaleString('nb-NO'),
                                    chartLabels.valueFieldName
                                ]} />
                                <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} onClick={(data) => onDrillDown?.(data.originalData)} style={{ cursor: 'pointer' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
                {hasCompare && comparativeChartData && (
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparativeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                <YAxis />
                                <RechartsTooltip formatter={(value, name) => [
                                    chartLabels.valueFieldName !== 'Antall' ?
                                        new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0 }).format(value) :
                                        Number(value).toLocaleString('nb-NO'),
                                    name
                                ]} />
                                <Legend />
                                <Bar dataKey="A" name={(periodLabels?.a || 'Periode A')} fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="B" name={(periodLabels?.b || 'Periode B')} fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


