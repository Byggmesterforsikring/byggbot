import React from 'react';
import { Card, CardContent } from '../../../../../ui/card';

const SummaryCards = ({ summaryData, chartLabels }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
                <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                        {summaryData.totalValue && chartLabels.valueFieldName !== 'Antall' ?
                            new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0 }).format(summaryData.totalValue) :
                            summaryData.totalValue.toLocaleString('nb-NO')
                        }
                    </div>
                    <p className="text-sm text-muted-foreground">Total {chartLabels.valueFieldName}</p>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{summaryData.totalCount.toLocaleString('nb-NO')}</div>
                    <p className="text-sm text-muted-foreground">Totalt Saker</p>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">{summaryData.groupCount}</div>
                    <p className="text-sm text-muted-foreground">Unike Grupper</p>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4">
                    <div className="text-lg font-bold text-orange-600 truncate">{summaryData.topPerformer}</div>
                    <p className="text-sm text-muted-foreground">Toppytelse</p>
                </CardContent>
            </Card>
        </div>
    );
};

export default SummaryCards;
