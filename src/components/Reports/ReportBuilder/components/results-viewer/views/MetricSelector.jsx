import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../ui/card';
import { Button } from '../../../../../ui/button';

const MetricSelector = ({ 
    availableTimelineMetrics, 
    selectedTimelineMetric, 
    onMetricChange 
}) => {
    if (availableTimelineMetrics.length <= 1) return null;

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium">Velg datapunkt for tidslinje</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                    {availableTimelineMetrics.map(metric => (
                        <Button
                            key={metric.key}
                            variant={selectedTimelineMetric === metric.key ? "default" : "outline"}
                            size="sm"
                            onClick={() => onMetricChange(metric.key)}
                            className="text-xs"
                        >
                            {metric.isCurrency && "💰 "}
                            {metric.isCount && "📊 "}
                            {metric.label}
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default MetricSelector;
