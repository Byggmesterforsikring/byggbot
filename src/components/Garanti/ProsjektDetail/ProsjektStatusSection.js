import React, { memo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Loader2, CheckCircle2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { statusValg, formatStatusDisplay } from './ProsjektDetailUtils';

const ProsjektStatusSection = memo(({ prosjekt, onStatusChange, isSaving }) => {
    return (
        <div className="bg-white rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    <h3 className="text-xl font-semibold">Status</h3>
                </div>
                <StatusBadge status={prosjekt.status} />
            </div>

            <div className="flex items-center gap-4">
                <Select
                    value={prosjekt.status || ''}
                    onValueChange={onStatusChange}
                    disabled={isSaving}
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue>
                            {formatStatusDisplay(prosjekt.status) || 'Velg status...'}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {statusValg.filter(status => status !== prosjekt.status).map((status) => (
                            <SelectItem key={status} value={status}>{formatStatusDisplay(status)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {isSaving && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Oppdaterer...</span>
                    </div>
                )}
            </div>
        </div>
    );
});

export default ProsjektStatusSection; 