import React from 'react';
import { Button } from "~/components/ui/button";
import { History } from 'lucide-react';
import {
    HENDELSE_IKON_OG_NAVN_MAP,
    parseEndringsBeskrivelse,
    getAnsvarligDisplay,
    formatDato,
    INITIALT_ANTALL_VISTE_ELEMENTER
} from './ProsjektDetailUtils';

const ProsjektHendelserSection = ({
    hendelser,
    antallVisteHendelser,
    onToggleShowAllEvents
}) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Hendelseslogg ({hendelser.length})
                </h3>
            </div>

            {hendelser.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <History className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-gray-500 font-medium">Ingen hendelser registrert ennå</p>
                    <p className="text-sm text-gray-400 mt-1">Hendelser vil vises her når prosjektet oppdateres</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border p-6">
                    <div className="space-y-1 text-sm relative">
                        {(() => {
                            const synligeHendelser = hendelser.slice(0, antallVisteHendelser);
                            const alleHendelserVises = antallVisteHendelser >= hendelser.length;

                            return (
                                <>
                                    {synligeHendelser.length > 0 && (
                                        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700 -z-10"></div>
                                    )}
                                    {synligeHendelser.map((hendelse) => {
                                        const hendelseInfo = HENDELSE_IKON_OG_NAVN_MAP[hendelse.hendelseType] || HENDELSE_IKON_OG_NAVN_MAP.DEFAULT;
                                        const Ikon = hendelseInfo.ikon;
                                        let beskrivelseInnhold;

                                        // Prøv alltid parsing først
                                        const parsedBeskrivelse = parseEndringsBeskrivelse(hendelse.beskrivelse, hendelse.hendelseType);

                                        if (parsedBeskrivelse[0]?.type === 'document') {
                                            // Spesialhåndtering for dokumentopplasting
                                            const doc = parsedBeskrivelse[0];
                                            beskrivelseInnhold = (
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Fil:</span>
                                                        <span className="font-mono text-indigo-700 dark:text-indigo-400">{doc.filename}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="font-medium">Type:</span>
                                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                                                            {doc.documentType}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        } else if (parsedBeskrivelse[0]?.field || parsedBeskrivelse.some(p => p.field)) {
                                            // Håndter endringer (felt-baserte endringer)
                                            beskrivelseInnhold = (
                                                <ul className="list-none pl-0 mt-0.5 text-xs text-muted-foreground">
                                                    {parsedBeskrivelse.map((endring, idx) => (
                                                        <li key={idx} className="mb-0.5">
                                                            {endring.field ? (
                                                                <>
                                                                    <span className="font-medium">{endring.field}:</span>
                                                                    {' '}
                                                                    {endring.oldValue !== null && (
                                                                        <span className="line-through text-slate-400 dark:text-slate-500 mr-1">
                                                                            {endring.oldValue}
                                                                        </span>
                                                                    )}
                                                                    {endring.oldValue !== null && endring.newValue !== null && ' → '}
                                                                    <span className="font-semibold text-indigo-700 dark:text-indigo-400 ml-1">
                                                                        {endring.newValue || 'ikke satt'}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span>{endring.content}</span>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            );
                                        } else {
                                            // Standard råtekst
                                            beskrivelseInnhold = (
                                                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                                                    {hendelse.beskrivelse}
                                                </p>
                                            );
                                        }

                                        return (
                                            <div key={hendelse.id} className="flex items-start space-x-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                                                <div className="flex-shrink-0 pt-0.5">
                                                    <Ikon size={18} className={hendelseInfo.fargeClassName || 'text-slate-500'} />
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-baseline justify-between flex-wrap">
                                                        <h4 className="font-semibold text-sm text-foreground">
                                                            {hendelseInfo.navn}
                                                        </h4>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {formatDato(hendelse.dato)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        av {getAnsvarligDisplay(hendelse.utfoertAv) || 'System'}
                                                    </p>
                                                    {beskrivelseInnhold}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {hendelser.length > INITIALT_ANTALL_VISTE_ELEMENTER && (
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="mt-2 p-0 h-auto text-xs"
                                            onClick={onToggleShowAllEvents}
                                        >
                                            {alleHendelserVises ? 'Vis færre' : `Vis alle ${hendelser.length} hendelser`}
                                        </Button>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProsjektHendelserSection; 