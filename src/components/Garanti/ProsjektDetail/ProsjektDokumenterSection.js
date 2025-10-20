import React from 'react';
import { Button } from "~/components/ui/button";
import { FilePlus2, Paperclip, Loader2 } from 'lucide-react';
import {
    getFileIcon,
    DOKUMENT_TYPE_BADGE_STYLING,
    getAnsvarligDisplay,
    formatDato
} from './ProsjektDetailUtils';

const ProsjektDokumenterSection = ({
    dokumenter,
    onOpenDokumentUpload,
    onOpenDokument,
    openingDokumentId
}) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Dokumenter ({dokumenter.length})</h3>
                <Button onClick={onOpenDokumentUpload}>
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    Last opp dokument
                </Button>
            </div>

            {dokumenter.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Ingen dokumenter lastet opp ennå.</p>
            ) : (
                <div className="space-y-3">
                    {dokumenter.map((doc) => {
                        const FileIkon = getFileIcon(doc.filnavn);

                        let resolvedBadgeStyle = DOKUMENT_TYPE_BADGE_STYLING[doc.dokumentType];
                        if (!resolvedBadgeStyle) {
                            resolvedBadgeStyle = DOKUMENT_TYPE_BADGE_STYLING["Annet"];
                        }

                        if (!resolvedBadgeStyle || typeof resolvedBadgeStyle.className !== 'string') {
                            resolvedBadgeStyle = { variant: "secondary", className: "bg-gray-500 hover:bg-gray-600 text-white border-gray-600" };
                        }

                        return (
                            <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3 flex-grow">
                                    <FileIkon className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-grow min-w-0">
                                        <p className="font-medium truncate" title={doc.filnavn}>{doc.filnavn}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${resolvedBadgeStyle.className}`}>
                                                {doc.dokumentType}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                Lastet opp av {getAnsvarligDisplay(doc.opplastetAv)} • {formatDato(doc.opplastetDato)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onOpenDokument(doc)}
                                        disabled={openingDokumentId === doc.id}
                                    >
                                        {openingDokumentId === doc.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Paperclip className="h-4 w-4" />
                                        )}
                                        {openingDokumentId === doc.id ? 'Åpner...' : 'Åpne'}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ProsjektDokumenterSection; 