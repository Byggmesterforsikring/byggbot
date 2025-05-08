import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.jsx";
import { Button } from "../ui/button.jsx";
import { Textarea } from "../ui/textarea.jsx";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert.jsx";
import { AlertCircle, Save, History, RefreshCw, Undo2, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog.jsx";
import { useAuth } from "../Auth/AuthContext";
import { Badge } from "../ui/badge.js";
import { Separator } from "../ui/separator.jsx";
import { format } from 'date-fns';

// Formaterer dato for visning
const formatDateTime = (dateString) => {
    if (!dateString) return 'Ukjent dato';
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm');
};

function SystemPromptEditor() {
    const { user } = useAuth();
    const [promptType, setPromptType] = useState("invoice_extraction");
    const [promptText, setPromptText] = useState("");
    const [originalPromptText, setOriginalPromptText] = useState("");
    const [promptHistory, setPromptHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

    // Hent gjeldende prompt når komponenten lastes eller promptType endres
    useEffect(() => {
        fetchCurrentPrompt();
    }, [promptType]);

    // Henter gjeldende aktive prompt fra databasen
    const fetchCurrentPrompt = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await window.electron.invoice.getPrompt(promptType);

            if (result.success) {
                setPromptText(result.data.prompt_text);
                setOriginalPromptText(result.data.prompt_text);
            } else {
                setError(`Kunne ikke hente prompt: ${result.error}`);
            }
        } catch (err) {
            setError(`En feil oppstod: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Henter prompt-historikk
    const fetchPromptHistory = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await window.electron.invoice.getPromptHistory(promptType);

            if (result.success) {
                setPromptHistory(result.data);
            } else {
                setError(`Kunne ikke hente prompt-historikk: ${result.error}`);
            }
        } catch (err) {
            setError(`En feil oppstod: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Åpner historikk-dialog og laster inn historikk
    const handleOpenHistory = async () => {
        await fetchPromptHistory();
        setHistoryOpen(true);
    };

    // Setter tilbake til original tekst
    const handleResetPrompt = () => {
        setPromptText(originalPromptText);
    };

    // Lagrer endret prompt
    const handleSavePrompt = async () => {
        setIsLoading(true);
        setError(null);
        setSaveSuccess(false);

        try {
            const result = await window.electron.invoice.setPrompt(promptType, promptText);

            if (result.success) {
                setSaveSuccess(true);
                setOriginalPromptText(promptText);
                // Oppdater prompt-historikk hvis dialogen er åpen
                if (historyOpen) {
                    await fetchPromptHistory();
                }
            } else {
                setError(`Kunne ikke lagre prompt: ${result.error}`);
            }
        } catch (err) {
            setError(`En feil oppstod: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Setter en historisk prompt som aktiv
    const activateHistoricalPrompt = async (promptId) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await window.electron.invoice.activatePrompt(promptId);

            if (result.success) {
                await fetchCurrentPrompt();
                await fetchPromptHistory();
                setHistoryOpen(false);
            } else {
                setError(`Kunne ikke aktivere prompt: ${result.error}`);
            }
        } catch (err) {
            setError(`En feil oppstod: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Viser detaljer for en historisk prompt
    const viewHistoricalPrompt = (prompt) => {
        setSelectedHistoryItem(prompt);
    };

    // Beregn om det er endringer i prompten
    const hasChanges = promptText !== originalPromptText;

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>System Prompt Editor</CardTitle>
                <CardDescription>Administrer AI-systemets prompter</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Feil</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {saveSuccess && (
                    <Alert variant="default" className="mb-4 bg-green-50 border border-green-500 text-green-700">
                        <AlertCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle>Lagret</AlertTitle>
                        <AlertDescription>Prompten ble lagret og aktivert.</AlertDescription>
                    </Alert>
                )}

                <div>
                    <label className="block text-sm font-medium mb-2">Prompt Type</label>
                    <Select
                        value={promptType}
                        onValueChange={(value) => setPromptType(value)}
                        disabled={isLoading}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Velg prompt type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="invoice_extraction">Faktura Ekstrahering</SelectItem>
                            {/* Flere prompt-typer kan legges til her */}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium">Prompt Tekst</label>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleOpenHistory}
                                disabled={isLoading}
                            >
                                <History className="h-4 w-4 mr-2" />
                                Historikk
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleResetPrompt}
                                disabled={isLoading || !hasChanges}
                            >
                                <Undo2 className="h-4 w-4 mr-2" />
                                Tilbakestill
                            </Button>
                        </div>
                    </div>

                    <Textarea
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        className="min-h-[400px] font-mono"
                        placeholder="Angi system prompt..."
                        disabled={isLoading}
                    />

                    <p className="text-xs text-muted-foreground mt-2">
                        * Bruk <code>{'{{extracted_text}}'}</code> der teksten fra fakturaen skal settes inn.
                    </p>
                </div>
            </CardContent>

            <CardFooter className="flex justify-between">
                <p className="text-sm text-muted-foreground">
                    {hasChanges ? "Endringer er ikke lagret." : "Ingen endringer."}
                </p>

                <Button
                    onClick={handleSavePrompt}
                    disabled={isLoading || !hasChanges}
                >
                    {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Lagre Endringer
                </Button>
            </CardFooter>

            {/* Historie Dialog */}
            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Prompt Historikk</DialogTitle>
                        <DialogDescription>
                            Tidligere versjoner av prompten. Klikk på en rad for å se detaljer.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[500px] overflow-y-auto">
                        {promptHistory.length === 0 ? (
                            <p className="text-center py-4 text-muted-foreground">
                                {isLoading ? "Laster historikk..." : "Ingen historikk funnet"}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {promptHistory.map(prompt => (
                                    <div
                                        key={prompt.id}
                                        className={`p-3 rounded-md cursor-pointer hover:bg-muted ${prompt.is_active ? 'bg-primary-50 border border-primary-200' : 'border'}`}
                                        onClick={() => viewHistoricalPrompt(prompt)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="font-medium flex items-center gap-2">
                                                {prompt.is_active && <Badge>Aktiv</Badge>}
                                                <span>Lagret {formatDateTime(prompt.created_at)}</span>
                                            </div>

                                            {!prompt.is_active && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        activateHistoricalPrompt(prompt.id);
                                                    }}
                                                >
                                                    Aktiver
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1 truncate">
                                            {prompt.prompt_text.substring(0, 100)}...
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Detalj Dialog */}
            <Dialog open={!!selectedHistoryItem} onOpenChange={(open) => !open && setSelectedHistoryItem(null)}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Prompt Detaljer</DialogTitle>
                        <DialogDescription>
                            Prompt lagret {selectedHistoryItem && formatDateTime(selectedHistoryItem.created_at)}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedHistoryItem && (
                        <>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Badge variant={selectedHistoryItem.is_active ? "default" : "outline"}>
                                        {selectedHistoryItem.is_active ? 'Aktiv' : 'Inaktiv'}
                                    </Badge>
                                    <p className="text-sm text-muted-foreground">
                                        ID: {selectedHistoryItem.id}
                                    </p>
                                </div>

                                <Textarea
                                    value={selectedHistoryItem.prompt_text}
                                    className="min-h-[300px] font-mono"
                                    readOnly
                                />
                            </div>

                            <DialogFooter>
                                {!selectedHistoryItem.is_active && (
                                    <Button
                                        onClick={() => {
                                            activateHistoricalPrompt(selectedHistoryItem.id);
                                        }}
                                    >
                                        Aktiver denne prompten
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}

export default SystemPromptEditor; 