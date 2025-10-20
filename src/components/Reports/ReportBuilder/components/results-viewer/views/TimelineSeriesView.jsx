import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../ui/card';
import { TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';

export default function TimelineSeriesView({
    hasCompare,
    categorySeriesData,
    categorySeriesCompareData,
    seriesChartKeySingle,
    seriesChartKeyCompare,
}) {
    const singleRows = categorySeriesData?.rows || [];
    const singleCats = categorySeriesData?.categories || [];
    const compareRows = categorySeriesCompareData?.rows || [];
    const compareCats = categorySeriesCompareData?.categories || [];

    if (!hasCompare && singleRows.length === 0) return null;
    if (hasCompare && compareRows.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Serie per kategori
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        {!hasCompare ? (
                            <LineChart key={`single-${seriesChartKeySingle}`} data={singleRows} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                <YAxis />
                                <RechartsTooltip />
                                <Legend />
                                {singleCats.map((c, idx) => (
                                    <Line key={`single-${c.id || c}`} type="monotone" dataKey={c.id || c} name={c.label || c} stroke={`hsl(${(idx * 50) % 360},70%,45%)`} dot={false} />
                                ))}
                            </LineChart>
                        ) : (
                            <LineChart key={`compare-${seriesChartKeyCompare}`} data={compareRows} margin={{ top: 10, right: 30, left: 20, bottom: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                <YAxis />
                                <RechartsTooltip />
                                <Legend />
                                {compareCats.map((c, idx) => (
                                    <React.Fragment key={`cat-${c.id}`}>
                                        <Line key={`${c.id}_A`} type="monotone" dataKey={`${c.id}_A`} name={`${c.label} (A)`} stroke={`hsl(${(idx * 50) % 360},70%,45%)`} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                                        <Line key={`${c.id}_B`} type="monotone" dataKey={`${c.id}_B`} name={`${c.label} (B)`} stroke={`hsl(${(idx * 50 + 20) % 360},70%,45%)`} strokeWidth={2} dot={{ r: 2 }} strokeDasharray="4 3" isAnimationActive={false} />
                                    </React.Fragment>
                                ))}
                            </LineChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}


