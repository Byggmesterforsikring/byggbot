import React from 'react';
import { Button } from "~/components/ui/button";
import { ArrowLeft, ExternalLink, Calendar, Clock } from 'lucide-react';
import { formatDato } from './ProsjektDetailUtils';

const ProsjektDetailHeader = ({ prosjekt, onNavigateBack, onNavigateToSelskap }) => {
    return (
        <div className="flex items-center justify-between gap-4">
            <Button variant="outline" size="icon" onClick={onNavigateBack} className="h-9 w-9 flex-shrink-0">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Tilbake</span>
            </Button>
            <div className='flex-grow'>
                <h1 className="text-2xl font-semibold text-foreground">
                    {prosjekt.navn || 'Navnløst prosjekt'}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {prosjekt.selskap?.selskapsnavn} • Prosjekt ID: {prosjekt.id}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Opprettet: {formatDato(prosjekt.opprettetDato)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Sist endret: {formatDato(prosjekt.updated_at)}</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                {prosjekt.selskap && (
                    <Button variant="outline" onClick={() => onNavigateToSelskap(prosjekt.selskap.id)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Gå til selskap
                    </Button>
                )}
            </div>
        </div>
    );
};

export default ProsjektDetailHeader; 