import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../ui/card';
import { TrendingUp } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';

export default function TimelineView({
  hasCompare,
  timeSeriesA,
  combinedTimeSeries,
  selectedMetricLabel,
  chartLabels,
  periodLabels
}) {
    if (!hasCompare && (!Array.isArray(timeSeriesA) || timeSeriesA.length === 0)) return null;
    if (hasCompare && (!Array.isArray(combinedTimeSeries) || combinedTimeSeries.length === 0)) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {selectedMetricLabel || chartLabels?.valueFieldName} - Tidstrend
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        {!hasCompare ? (
                            <AreaChart data={timeSeriesA} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                <YAxis />
                                <RechartsTooltip formatter={(value) => [
                                    chartLabels?.valueFieldName === 'Antall'
                                        ? Number(value).toLocaleString('nb-NO')
                                        : new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0 }).format(value),
                                    selectedMetricLabel || chartLabels?.valueFieldName
                                ]} />
                                <Area type="monotone" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
                            </AreaChart>
                        ) : (
                            <LineChart data={combinedTimeSeries} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                <YAxis />
                                <RechartsTooltip formatter={(value, name) => [
                                    typeof value === 'number' ? value.toLocaleString('nb-NO') : value,
                                    name
                                ]} />
                <Legend />
                <Line type="monotone" dataKey="A" name={periodLabels?.a || 'Periode A'} stroke="#7c3aed" dot={false} />
                <Line type="monotone" dataKey="B" name={periodLabels?.b || 'Periode B'} stroke="#10b981" dot={false} />
                            </LineChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}


