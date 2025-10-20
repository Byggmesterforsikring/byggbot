import React from 'react';
import { Button } from "~/components/ui/button";
import { MessageSquarePlus, MessageSquare } from 'lucide-react';
import { getAnsvarligDisplay, formatDato, INITIALT_ANTALL_VISTE_ELEMENTER } from './ProsjektDetailUtils';

const ProsjektKommentarSection = ({
    kundeKommentarer,
    interneKommentarer,
    antallVisteInterneKommentarer,
    onOpenNewKommentar,
    onShowMoreComments
}) => {
    return (
        <div className="space-y-6">
            {/* Kunde-kommentarer - vis bare hvis det finnes noen */}
            {kundeKommentarer.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-blue-700">Forespørsel fra Kunde</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                K
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900 mb-1">Kunde</p>
                                <p className="text-gray-800 whitespace-pre-wrap">{kundeKommentarer[0].tekst}</p>
                                <p className="text-xs text-blue-600 mt-2">{formatDato(kundeKommentarer[0].opprettetDato)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Interne kommentarer */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Interne Kommentarer</h3>
                    <Button onClick={onOpenNewKommentar} size="sm">
                        <MessageSquarePlus className="mr-2 h-4 w-4" />
                        Ny kommentar
                    </Button>
                </div>

                {interneKommentarer.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                        <p className="text-gray-500 font-medium">Ingen interne kommentarer ennå</p>
                        <p className="text-sm text-gray-400 mt-1">Klikk "Ny kommentar" for å legge til den første kommentaren</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {interneKommentarer.slice(0, antallVisteInterneKommentarer).map((kommentar, index) => (
                            <div key={kommentar.id} className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                                    {kommentar.opprettetAv?.navn?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="text-sm font-medium text-gray-900">
                                            {getAnsvarligDisplay(kommentar.opprettetAv)}
                                        </p>
                                        <span className="text-xs text-gray-400">•</span>
                                        <p className="text-xs text-gray-500">
                                            {formatDato(kommentar.opprettet_dato)}
                                        </p>
                                    </div>
                                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                        {kommentar.kommentar}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {interneKommentarer.length > antallVisteInterneKommentarer && (
                            <div className="text-center pt-2">
                                <Button
                                    variant="outline"
                                    onClick={onShowMoreComments}
                                    size="sm"
                                >
                                    Vis flere kommentarer ({interneKommentarer.length - antallVisteInterneKommentarer} til)
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProsjektKommentarSection; 