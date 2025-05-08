import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { getExtensions, AVAILABLE_LANGUAGES } from './extensions';
import BlockMenu from './BlockMenu';
import { Bold, Italic, List, ListOrdered, Code as CodeIcon, Quote, Link, Table, AlertTriangle, Info as InfoIcon, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';

const DrawingRuleEditor = ({ initialContent, onSave, title, setTitle, readOnly, onCancel, onHasChangesChange }) => {
    const [content, setContent] = useState(initialContent || '');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Dialog states
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [tableDialogOpen, setTableDialogOpen] = useState(false);
    const [alertDialogOpen, setAlertDialogOpen] = useState(false);

    // Form values
    const [linkUrl, setLinkUrl] = useState('');
    const [tableRows, setTableRows] = useState(3);
    const [tableColumns, setTableColumns] = useState(3);
    const [tableWithHeader, setTableWithHeader] = useState(true);
    const [alertType, setAlertType] = useState('warning');
    const [alertTitle, setAlertTitle] = useState('');
    const [alertContent, setAlertContent] = useState('');

    // Refs
    const fileInputRef = useRef();
    const editorRef = useRef(null);
    const initialTitleRef = useRef(null); // Ref for å lagre den opprinnelige tittelen
    // Flagg for å spore initialisering
    const isInitializing = useRef(true);

    const editor = useEditor({
        extensions: getExtensions(),
        content: initialContent || '',
        editable: !readOnly,
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert prose-base max-w-none focus:outline-none',
            },
        },
        // Sjekker isInitializing.current
        onUpdate: ({ editor, transaction }) => {
            const docChanged = transaction.docChanged;
            const newContent = editor.getHTML();
            setContent(newContent);

            // Sett hasChanges kun hvis dokument endret seg ETTER initialisering
            // OG innholdet faktisk er forskjellig fra det opprinnelige
            if (docChanged && !isInitializing.current) {
                // For nye regler (initialContent er tom/undefined) er enhver endring en hasChange
                if (!initialContent) {
                    if (newContent.trim() !== '') {
                        setHasChanges(true);
                        console.log('Nye endringer detektert (ny regel)', { hasContent: newContent.length > 0 });
                    }
                } else if (newContent !== initialContent) {
                    setHasChanges(true);
                    console.log('Nye endringer detektert (eksisterende regel)');
                }
                if (window.handleEditorContentChange) {
                    window.handleEditorContentChange(newContent);
                }
            }
        },
        onCreate: ({ editor }) => {
            editorRef.current = editor;
        },
    });

    // --- REVIDERT useEffect for initialisering ---
    useEffect(() => {
        // Kjør kun når editor finnes, initialContent er definert, OG vi fortsatt initialiserer
        if (editor && initialContent !== undefined && isInitializing.current) {
            console.log('Finalizing initialization, setting isInitializing to false.'); // DEBUG

            // Sett editorinnhold kun hvis det faktisk er nødvendig (første gang eller hvis det avviker)
            if (editor.getHTML() !== initialContent) {
                editor.commands.setContent(initialContent || '');
            }
            setContent(initialContent || ''); // Oppdater lokal state uansett
            setHasChanges(false); // Nullstill endringsflagg ved initialisering

            // Marker at initialisering er fullført
            isInitializing.current = false;
            initialTitleRef.current = title; // Lagre tittelen slik den er ved slutten av initialiseringen
            console.log('Initialization complete. Initial title stored:', initialTitleRef.current); // DEBUG

            // For nye regler uten initialContent, sjekk title umiddelbart
            if (!initialContent && title && title.trim() !== '') {
                console.log('Ny regel med tittel - setter hasChanges umiddelbart');
                setHasChanges(true);
                if (onHasChangesChange) {
                    onHasChangesChange(true);
                }
            }
        }
    }, [editor, initialContent, title, onHasChangesChange]);
    // --- Slutt på REVIDERT useEffect ---

    // Nullstill flagget hvis komponenten går fra redigering til ikke-redigering
    useEffect(() => {
        if (readOnly) {
            // console.log('Setting isInitializing to true (readOnly changed)'); // DEBUG
            isInitializing.current = true;
        }
    }, [readOnly]);

    useEffect(() => {
        if (onHasChangesChange) {
            onHasChangesChange(hasChanges);
        }
        // console.log('hasChanges state is now:', hasChanges); // DEBUG
    }, [hasChanges, onHasChangesChange]);

    // Sjekker tittel-endring KUN ETTER initialisering
    useEffect(() => {
        // Kjør kun etter initialisering og hvis vi har en lagret initial tittel
        if (!isInitializing.current) {
            // For nye regler, sett hasChanges hvis tittel ikke er tom
            if (!initialContent && title && title.trim() !== '') {
                console.log('Tittel endret for ny regel:', { title });
                setHasChanges(true);
            }
            // For eksisterende regler, sammenlign med initiell tittel
            else if (initialTitleRef.current !== null && title !== initialTitleRef.current) {
                console.log('Title change detected:', { current: title, initial: initialTitleRef.current });
                setHasChanges(true);
            }
        }
    }, [title, initialContent]);

    useEffect(() => {
        window.insertWarningAlertFn = insertWarningAlert;
        window.insertInfoAlertFn = insertInfoAlert;
        window.insertErrorAlertFn = insertErrorAlert;
        window.insertSuccessAlertFn = insertSuccessAlert;
        window.insertTipAlertFn = insertTipAlert;
    }, []);

    const handleSave = async () => {
        if (!editor || isSaving) return;
        setIsSaving(true);
        try {
            // Hent det faktiske innholdet direkte fra editoren
            const editorContent = editor.getHTML();
            console.log('Lagrer innhold fra editor:', {
                hasContent: !!editorContent && editorContent.trim() !== '',
                contentLength: editorContent?.length || 0
            });

            await onSave(title, editorContent);
            setHasChanges(false);
        } catch (error) {
            console.error('Feil ved lagring:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Data = e.target.result;
                if (editor) {
                    editor.chain().focus().setImage({
                        src: base64Data,
                        alt: file.name,
                        title: file.name,
                    }).run();
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Feil ved lasting av bilde:', error);
        }

        event.target.value = '';
    };

    const handleLinkClick = () => {
        const existingHref = editor?.getAttributes('link').href;
        setLinkUrl(existingHref || '');
        setLinkDialogOpen(true);
    };

    const handleLinkSubmit = () => {
        if (editor) {
            if (linkUrl) {
                editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
            } else {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
            }
        }
        setLinkUrl('');
        setLinkDialogOpen(false);
    };

    const handleTableClick = () => {
        setTableDialogOpen(true);
    };

    const handleTableSubmit = () => {
        if (editor) {
            editor.chain()
                .focus()
                .insertTable({
                    rows: tableRows,
                    cols: tableColumns,
                    withHeaderRow: tableWithHeader
                })
                .run();
        }
        setTableDialogOpen(false);
    };

    const openAlertDialog = (type) => {
        let defaultTitle = 'Advarsel';
        if (type === 'info') defaultTitle = 'Merknad';
        else if (type === 'error') defaultTitle = 'Viktig';
        else if (type === 'success') defaultTitle = 'Fullført';
        else if (type === 'default') defaultTitle = 'Tips';

        setAlertType(type);
        setAlertTitle(defaultTitle);
        setAlertContent('');
        setAlertDialogOpen(true);
    };

    const insertWarningAlert = () => openAlertDialog('warning');
    const insertInfoAlert = () => openAlertDialog('info');
    const insertErrorAlert = () => openAlertDialog('error');
    const insertSuccessAlert = () => openAlertDialog('success');
    const insertTipAlert = () => openAlertDialog('default');

    const handleAlertSubmit = () => {
        if (editor && alertContent) {
            let emoji = '⚠️';
            if (alertType === 'info') emoji = '📝';
            else if (alertType === 'error') emoji = '🛑';
            else if (alertType === 'success') emoji = '✅';
            else if (alertType === 'default') emoji = '💡';

            let isDefault = false;
            if (alertType === 'warning' && alertTitle === 'Advarsel') isDefault = true;
            else if (alertType === 'info' && alertTitle === 'Merknad') isDefault = true;
            else if (alertType === 'error' && alertTitle === 'Viktig') isDefault = true;
            else if (alertType === 'success' && alertTitle === 'Fullført') isDefault = true;
            else if (alertType === 'default' && alertTitle === 'Tips') isDefault = true;

            const customTitle = !isDefault && alertTitle ? `<strong>${alertTitle}</strong> ` : '';

            editor.chain()
                .focus()
                .insertContent(`<blockquote><p>${emoji} ${customTitle}${alertContent}</p></blockquote>`)
                .run();
        }
        setAlertDialogOpen(false);
    };

    const getAlertClasses = (type) => {
        switch (type) {
            case 'warning':
                return 'bg-yellow-100 border-yellow-400 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-400';
            case 'info':
                return 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400';
            case 'error':
                return 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-500';
            case 'success':
                return 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400';
            case 'default':
                return 'bg-orange-100 border-orange-400 text-orange-700 dark:bg-orange-900/30 dark:border-orange-600 dark:text-orange-400';
            default:
                return 'bg-muted border-border text-muted-foreground';
        }
    };

    const getAlertIconClasses = (type) => {
        switch (type) {
            case 'warning':
                return 'text-yellow-500 dark:text-yellow-400';
            case 'info':
                return 'text-blue-500 dark:text-blue-400';
            case 'error':
                return 'text-red-500 dark:text-red-500';
            case 'success':
                return 'text-green-500 dark:text-green-400';
            case 'default':
                return 'text-orange-500 dark:text-orange-400';
            default:
                return 'text-muted-foreground';
        }
    };

    const AlertIcon = ({ type, className }) => {
        const Icon = {
            warning: AlertTriangle,
            info: InfoIcon,
            error: AlertCircle,
            success: CheckCircle,
            default: Lightbulb,
        }[type];
        return Icon ? <Icon className={`h-4 w-4 ${className}`} /> : null;
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="space-y-1">
                <Label htmlFor="rule-title">Tittel</Label>
                <Input
                    id="rule-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    readOnly={readOnly}
                    className={`w-full bg-background ${readOnly ? 'border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default' : ''}`}
                />
            </div>

            <div className={`editor-wrapper border rounded-md bg-background min-h-[400px] p-10 flex flex-col ${!readOnly ? 'border-yellow-400 dark:border-yellow-600' : ''}`}>
                {editor && (
                    <>
                        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                            <div className="flex items-center gap-1 p-1 bg-background border rounded-md shadow-md">
                                <Button variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleBold().run()} title="Fet (Cmd+B)">
                                    <Bold className="h-4 w-4" />
                                </Button>
                                <Button variant={editor.isActive('italic') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} title="Kursiv (Cmd+I)">
                                    <Italic className="h-4 w-4" />
                                </Button>
                                <div className="w-px h-5 bg-border mx-1"></div>
                                <Button variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} title="Punktliste">
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Nummerert liste">
                                    <ListOrdered className="h-4 w-4" />
                                </Button>
                                <div className="w-px h-5 bg-border mx-1"></div>
                                <Button variant={editor.isActive('codeBlock') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Kodeblokk">
                                    <CodeIcon className="h-4 w-4" />
                                </Button>
                                <Button variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Sitat">
                                    <Quote className="h-4 w-4" />
                                </Button>
                                <div className="w-px h-5 bg-border mx-1"></div>
                                <Button variant={editor.isActive('link') ? 'secondary' : 'ghost'} size="sm" onClick={handleLinkClick} title="Sett inn/rediger lenke">
                                    <Link className="h-4 w-4" />
                                </Button>
                                <Button variant={editor.isActive('table') ? 'secondary' : 'ghost'} size="sm" onClick={handleTableClick} title="Sett inn tabell">
                                    <Table className="h-4 w-4" />
                                </Button>
                            </div>
                        </BubbleMenu>
                    </>
                )}
                <EditorContent editor={editor} />
            </div>

            <div className="flex gap-2 justify-end mt-2">
            </div>

            {editor && <BlockMenu editor={editor} />}

            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                accept="image/*"
                id="image-upload-input"
            />

            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Sett inn/rediger lenke</DialogTitle>
                        <DialogDescription>
                            Skriv inn URL-en du vil lenke til. La stå tomt for å fjerne lenken.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="link-url" className="text-right">
                                URL
                            </Label>
                            <Input
                                id="link-url"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                className="col-span-3"
                                placeholder="https://eksempel.com"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') { handleLinkSubmit(); e.preventDefault(); } }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>Avbryt</Button>
                        <Button type="button" onClick={handleLinkSubmit}>{linkUrl ? 'Oppdater' : 'Fjern'} lenke</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Sett inn tabell</DialogTitle>
                        <DialogDescription>
                            Velg antall rader og kolonner for tabellen.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="table-rows" className="text-right">
                                Rader
                            </Label>
                            <Input
                                id="table-rows"
                                value={tableRows}
                                onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                                className="col-span-3"
                                type="number"
                                min={1}
                                max={10}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="table-columns" className="text-right">
                                Kolonner
                            </Label>
                            <Input
                                id="table-columns"
                                value={tableColumns}
                                onChange={(e) => setTableColumns(Math.max(1, parseInt(e.target.value) || 1))}
                                className="col-span-3"
                                type="number"
                                min={1}
                                max={10}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="table-header" className="text-right">
                                Overskriftsrad
                            </Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="table-header"
                                    checked={tableWithHeader}
                                    onChange={(e) => setTableWithHeader(e.target.checked)}
                                    className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                />
                                <Label htmlFor="table-header" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Inkluder overskriftsrad
                                </Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setTableDialogOpen(false)}>Avbryt</Button>
                        <Button type="button" onClick={handleTableSubmit}>Sett inn</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            <div className="flex items-center gap-2">
                                <AlertIcon type={alertType} className={getAlertIconClasses(alertType)} />
                                Sett inn {
                                    alertType === 'warning' ? 'advarsel' :
                                        alertType === 'info' ? 'merknad' :
                                            alertType === 'error' ? 'viktig melding' :
                                                alertType === 'success' ? 'fullført melding' : 'tips'
                                }
                            </div>
                        </DialogTitle>
                        <DialogDescription>
                            Skriv inn tittel (valgfritt) og innhold for meldingen.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="alert-title" className="text-right">
                                Tittel
                            </Label>
                            <Input
                                id="alert-title"
                                value={alertTitle}
                                onChange={(e) => setAlertTitle(e.target.value)}
                                className="col-span-3"
                                placeholder={
                                    alertType === 'warning' ? 'Advarsel' :
                                        alertType === 'info' ? 'Merknad' :
                                            alertType === 'error' ? 'Viktig' :
                                                alertType === 'success' ? 'Fullført' : 'Tips'
                                }
                            />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="alert-content" className="text-right pt-2">
                                Innhold
                            </Label>
                            <Textarea
                                id="alert-content"
                                value={alertContent}
                                onChange={(e) => setAlertContent(e.target.value)}
                                className="col-span-3 min-h-[100px]"
                                placeholder="Skriv inn meldingsteksten her..."
                            />
                        </div>
                        <div className="col-span-4 mt-2">
                            <Label className="text-sm font-medium text-muted-foreground">Forhåndsvisning</Label>
                            <div className={`mt-1 p-4 border rounded-md ${getAlertClasses(alertType)}`}>
                                <div className={`flex items-center font-semibold ${getAlertIconClasses(alertType)}`}>
                                    <AlertIcon type={alertType} className="mr-2" />
                                    {alertTitle || (
                                        alertType === 'warning' ? 'Advarsel' :
                                            alertType === 'info' ? 'Merknad' :
                                                alertType === 'error' ? 'Viktig' :
                                                    alertType === 'success' ? 'Fullført' : 'Tips'
                                    )}
                                </div>
                                <div className="mt-2 text-sm">
                                    {alertContent || <span className="italic text-muted-foreground/80">Innholdet vises her...</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setAlertDialogOpen(false)}>Avbryt</Button>
                        <Button type="button" onClick={handleAlertSubmit} disabled={!alertContent}>Sett inn</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DrawingRuleEditor; 