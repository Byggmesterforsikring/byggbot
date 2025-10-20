import React from 'react';
import { Card, CardContent } from '../../../ui/card';
import { Info, Clock } from 'lucide-react';

const ChunkingInfo = ({ startDate, endDate, visible = true }) => {
    if (!visible || !startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();

    if (monthsDiff <= 6) return null;

    const chunks = Math.ceil(monthsDiff / 6);

    return (
        <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="text-sm font-medium text-blue-900 mb-1">
                            Smart datahenting aktivert
                        </h4>
                        <p className="text-xs text-blue-800 mb-2">
                            Du har valgt en lang periode ({monthsDiff} måneder). For å unngå API-overbelastning
                            deler vi automatisk opp dataene i {chunks} mindre deler på 6 måneder hver.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-blue-700">
                            <Clock className="h-3 w-3" />
                            <span>Dette kan ta litt lengre tid, men gir deg mye mer data å analysere</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ChunkingInfo;
