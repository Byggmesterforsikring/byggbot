import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import {
    Box,
    Button,
    TextField,
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography
} from '@mui/material';
import { getExtensions } from './extensions';
import BlockMenu from './BlockMenu';
import './styles/editor.css';
import {
    FormatBold,
    FormatItalic,
    FormatListBulleted,
    FormatListNumbered,
    Code,
    FormatQuote,
    Link as LinkIcon,
    TableChart,
    Warning,
    Info,
    Error as ErrorIcon,
    CheckCircle,
    Lightbulb
} from '@mui/icons-material';

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

    const editor = useEditor({
        extensions: getExtensions(),
        content: initialContent || '',
        editable: !readOnly,
        onUpdate: ({ editor }) => {
            const newContent = editor.getHTML();
            setContent(newContent);
            
            // Sett hasChanges til true hvis innholdet er endret
            if (newContent !== initialContent) {
                setHasChanges(true);
                
                // Hvis parentkomponenten har en callback for content endringer
                if (window.handleEditorContentChange) {
                    window.handleEditorContentChange(newContent);
                }
            }
        },
        onCreate: ({ editor }) => {
            editorRef.current = editor;
        },
    });

    // Håndter oppdateringer av initialContent
    useEffect(() => {
        if (editor && initialContent !== undefined && initialContent !== editor.getHTML()) {
            editor.commands.setContent(initialContent || '');
            setContent(initialContent || '');
            setHasChanges(false); // Reset hasChanges når initialContent oppdateres
        }
    }, [editor, initialContent]);
    
    // Notify parent component about changes
    useEffect(() => {
        if (onHasChangesChange) {
            onHasChangesChange(hasChanges);
        }
    }, [hasChanges, onHasChangesChange]);
    
    // Lytt også på tittelen for endringer
    useEffect(() => {
        const handleTitleChange = () => {
            if (title !== initialContent?.title) {
                setHasChanges(true);
            }
        };
        
        handleTitleChange();
    }, [title, initialContent]);
    
    // Register alert handlers for other components to use
    useEffect(() => {
        // Løsning 1: I stedet for å bruke en interval, kan vi bruke globale variabler 
        // siden alert-funksjonene er stabile og ikke endres
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
            const editorContent = editor.getHTML();
            await onSave(title, editorContent);
            setHasChanges(false); // Reset hasChanges etter lagring
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
        setLinkDialogOpen(true);
    };

    const handleLinkSubmit = () => {
        if (editor && linkUrl) {
            editor.chain().focus().setLink({ href: linkUrl }).run();
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
    
    // Alert handlers
    const openAlertDialog = (type) => {
        // Set default title based on alert type
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
            
            // Inkluder brukerdefinert tittel hvis den finnes og er forskjellig fra standard
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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
                label="Tittel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                variant="outlined"
                sx={{ 
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                            borderWidth: '1px'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                            borderWidth: '1px'
                        }
                    }
                }}
            />

            <Paper sx={{ p: 2, position: 'relative', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.05)' }}>
                <Box sx={{ mb: 1, p: 1, backgroundColor: 'rgba(99, 102, 241, 0.04)', borderRadius: 1, fontSize: '0.85rem', color: 'text.secondary', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            Tips: Marker tekst for formateringsalternativer, eller bruk "/" for å åpne menyen med flere alternativer.
                        </Typography>
                    </Box>
                </Box>
                
                {/* Toppmeny toolbaren er fjernet */}
                
                {editor && (
                    <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                        <Box sx={{
                            display: 'flex',
                            backgroundColor: 'white',
                            borderRadius: 1,
                            boxShadow: '0 2px 6px 0 rgba(0,0,0,0.1)',
                            p: 0.5,
                            gap: 0.5,
                            flexWrap: 'wrap'
                        }}>
                            {/* Formatering */}
                            <Box sx={{ display: 'flex', borderRight: '1px solid', borderColor: 'divider', pr: 0.5, gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    onClick={() => editor.chain().focus().toggleBold().run()}
                                    color={editor.isActive('bold') ? 'primary' : 'default'}
                                    title="Fet tekst"
                                >
                                    <FormatBold />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => editor.chain().focus().toggleItalic().run()}
                                    color={editor.isActive('italic') ? 'primary' : 'default'}
                                    title="Kursiv tekst"
                                >
                                    <FormatItalic />
                                </IconButton>
                            </Box>
                            
                            {/* Lister */}
                            <Box sx={{ display: 'flex', borderRight: '1px solid', borderColor: 'divider', pr: 0.5, gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                                    color={editor.isActive('bulletList') ? 'primary' : 'default'}
                                    title="Punktliste"
                                >
                                    <FormatListBulleted />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                    color={editor.isActive('orderedList') ? 'primary' : 'default'}
                                    title="Nummerert liste"
                                >
                                    <FormatListNumbered />
                                </IconButton>
                            </Box>
                            
                            {/* Innhold */}
                            <Box sx={{ display: 'flex', borderRight: '1px solid', borderColor: 'divider', pr: 0.5, gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                                    color={editor.isActive('codeBlock') ? 'primary' : 'default'}
                                    title="Kodeblokk"
                                >
                                    <Code />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                                    color={editor.isActive('blockquote') ? 'primary' : 'default'}
                                    title="Sitat"
                                >
                                    <FormatQuote />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={handleLinkClick}
                                    color={editor.isActive('link') ? 'primary' : 'default'}
                                    title="Lenke"
                                >
                                    <LinkIcon />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={handleTableClick}
                                    color={editor.isActive('table') ? 'primary' : 'default'}
                                    title="Tabell"
                                >
                                    <TableChart />
                                </IconButton>
                            </Box>
                            
                            {/* Alerts */}
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    onClick={insertWarningAlert}
                                    title="Advarsel"
                                    sx={{
                                        color: 'hsl(38 92% 40%)',
                                        backgroundColor: 'hsl(48 96% 89%)',
                                        '&:hover': {
                                            backgroundColor: 'hsl(48 96% 85%)'
                                        }
                                    }}
                                >
                                    <Warning fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={insertInfoAlert}
                                    title="Merknad"
                                    sx={{
                                        color: 'hsl(221 83% 45%)',
                                        backgroundColor: 'hsl(214 100% 97%)',
                                        '&:hover': {
                                            backgroundColor: 'hsl(214 100% 94%)'
                                        }
                                    }}
                                >
                                    <Info fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={insertErrorAlert}
                                    title="Viktig"
                                    sx={{
                                        color: 'hsl(0 84% 45%)',
                                        backgroundColor: 'hsl(0 86% 97%)',
                                        '&:hover': {
                                            backgroundColor: 'hsl(0 86% 94%)'
                                        }
                                    }}
                                >
                                    <ErrorIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={insertSuccessAlert}
                                    title="Fullført"
                                    sx={{
                                        color: 'hsl(142 71% 35%)',
                                        backgroundColor: 'hsl(138 100% 97%)',
                                        '&:hover': {
                                            backgroundColor: 'hsl(138 100% 94%)'
                                        }
                                    }}
                                >
                                    <CheckCircle fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={insertTipAlert}
                                    title="Tips"
                                    sx={{
                                        color: 'hsl(220 9% 46%)',
                                        backgroundColor: 'hsl(220 14% 96%)',
                                        '&:hover': {
                                            backgroundColor: 'hsl(220 14% 93%)'
                                        }
                                    }}
                                >
                                    <Lightbulb fontSize="small" />
                                </IconButton>
                            </Box>
                        </Box>
                    </BubbleMenu>
                )}
                <EditorContent editor={editor} />
            </Paper>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button 
                    onClick={onCancel} 
                    disabled={isSaving}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        px: 3,
                        '&:hover': {
                            backgroundColor: 'rgba(99, 102, 241, 0.04)'
                        }
                    }}
                >
                    Avbryt
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={isSaving || !title.trim()}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        px: 3,
                        py: 1,
                        '&:hover': {
                            boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)'
                        }
                    }}
                >
                    {isSaving ? 'Lagrer...' : 'Lagre'}
                </Button>
            </Box>

            {editor && <BlockMenu editor={editor} />}

            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                accept="image/*"
                id="image-upload-input"
            />

            <Dialog 
                open={linkDialogOpen} 
                onClose={() => setLinkDialogOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle>Legg til lenke</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="URL"
                        type="url"
                        fullWidth
                        variant="outlined"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleLinkSubmit();
                            }
                        }}
                        sx={{ 
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                    borderWidth: '1px'
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                    borderWidth: '1px'
                                }
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setLinkDialogOpen(false)}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            '&:hover': {
                                backgroundColor: 'rgba(99, 102, 241, 0.04)'
                            }
                        }}
                    >
                        Avbryt
                    </Button>
                    <Button 
                        onClick={handleLinkSubmit} 
                        variant="contained"
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            px: 2,
                            '&:hover': {
                                boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)'
                            }
                        }}
                    >
                        Legg til
                    </Button>
                </DialogActions>
            </Dialog>
            
            <Dialog 
                open={tableDialogOpen} 
                onClose={() => setTableDialogOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle>Sett inn tabell</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Antall rader"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={tableRows}
                            onChange={(e) => setTableRows(parseInt(e.target.value) || 2)}
                            inputProps={{ min: 1, max: 10 }}
                            sx={{ 
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '1px'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '1px'
                                    }
                                }
                            }}
                        />
                        <TextField
                            margin="dense"
                            label="Antall kolonner"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={tableColumns}
                            onChange={(e) => setTableColumns(parseInt(e.target.value) || 2)}
                            inputProps={{ min: 1, max: 10 }}
                            sx={{ 
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '1px'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '1px'
                                    }
                                }
                            }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                            <input
                                type="checkbox"
                                id="table-header"
                                checked={tableWithHeader}
                                onChange={(e) => setTableWithHeader(e.target.checked)}
                                style={{ marginRight: '8px' }}
                            />
                            <Typography component="label" htmlFor="table-header">
                                Med overskriftsrad
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setTableDialogOpen(false)}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            '&:hover': {
                                backgroundColor: 'rgba(99, 102, 241, 0.04)'
                            }
                        }}
                    >
                        Avbryt
                    </Button>
                    <Button 
                        onClick={handleTableSubmit} 
                        variant="contained"
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            px: 2,
                            '&:hover': {
                                boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)'
                            }
                        }}
                    >
                        Sett inn tabell
                    </Button>
                </DialogActions>
            </Dialog>
            
            <Dialog 
                open={alertDialogOpen} 
                onClose={() => setAlertDialogOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {alertType === 'warning' && <Warning sx={{ color: 'hsl(38 92% 40%)' }} />}
                        {alertType === 'info' && <Info sx={{ color: 'hsl(221 83% 45%)' }} />}
                        {alertType === 'error' && <ErrorIcon sx={{ color: 'hsl(0 84% 45%)' }} />}
                        {alertType === 'success' && <CheckCircle sx={{ color: 'hsl(142 71% 35%)' }} />}
                        {alertType === 'default' && <Lightbulb sx={{ color: 'hsl(220 9% 46%)' }} />}
                        Sett inn {
                            alertType === 'warning' ? 'advarsel' :
                            alertType === 'info' ? 'merknad' :
                            alertType === 'error' ? 'viktig melding' :
                            alertType === 'success' ? 'fullført melding' : 'tips'
                        }
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 2, 
                            pt: 1,
                            width: '400px', 
                            maxWidth: '100%'
                        }}
                    >
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Tittel"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={alertTitle}
                            onChange={(e) => setAlertTitle(e.target.value)}
                            placeholder={
                                alertType === 'warning' ? 'Advarsel' :
                                alertType === 'info' ? 'Merknad' :
                                alertType === 'error' ? 'Viktig' :
                                alertType === 'success' ? 'Fullført' : 'Tips'
                            }
                            sx={{ 
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '1px'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '1px'
                                    }
                                }
                            }}
                        />
                        <TextField
                            margin="dense"
                            label="Innhold"
                            multiline
                            rows={4}
                            fullWidth
                            variant="outlined"
                            value={alertContent}
                            onChange={(e) => setAlertContent(e.target.value)}
                            sx={{ 
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '1px'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                        borderWidth: '1px'
                                    }
                                }
                            }}
                        />
                        
                        <Box sx={{ 
                            mt: 2, 
                            p: 1.5, 
                            border: '1px solid',
                            borderColor: alertType === 'warning' ? 'hsl(38 92% 50%)' :
                                         alertType === 'info' ? 'hsl(221 83% 53%)' :
                                         alertType === 'error' ? 'hsl(0 84% 60%)' :
                                         alertType === 'success' ? 'hsl(142 71% 45%)' : 
                                         'hsl(220 13% 91%)',
                            borderRadius: 1,
                            backgroundColor: alertType === 'warning' ? 'hsl(48 96% 89%)' :
                                             alertType === 'info' ? 'hsl(214 100% 97%)' :
                                             alertType === 'error' ? 'hsl(0 86% 97%)' :
                                             alertType === 'success' ? 'hsl(138 100% 97%)' : 
                                             'hsl(220 14% 96%)'
                        }}>
                            <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: 0.5 }}>
                                Forhåndsvisning:
                            </Typography>
                            <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                mb: 0.5, 
                                fontWeight: 'bold',
                                color: alertType === 'warning' ? 'hsl(38 92% 30%)' :
                                        alertType === 'info' ? 'hsl(221 83% 40%)' :
                                        alertType === 'error' ? 'hsl(0 84% 40%)' :
                                        alertType === 'success' ? 'hsl(142 71% 30%)' : 
                                        'hsl(220 9% 46%)'
                            }}>
                                {alertType === 'warning' && <Warning fontSize="small" sx={{ mr: 0.5 }} />}
                                {alertType === 'info' && <Info fontSize="small" sx={{ mr: 0.5 }} />}
                                {alertType === 'error' && 
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                }
                                {alertType === 'success' && <CheckCircle fontSize="small" sx={{ mr: 0.5 }} />}
                                {alertType === 'default' && <Lightbulb fontSize="small" sx={{ mr: 0.5 }} />}
                                {alertTitle || (
                                    alertType === 'warning' ? 'Advarsel' :
                                    alertType === 'info' ? 'Merknad' :
                                    alertType === 'error' ? 'Viktig' :
                                    alertType === 'success' ? 'Fullført' : 'Tips'
                                )}
                            </Box>
                            <Typography variant="body2">
                                {alertContent || 'Innholdet vil vises her'}
                            </Typography>
                        </Box>
                        
                        <Typography variant="caption" sx={{ color: 'text.secondary', mt: -1 }}>
                            Tips: Du kan endre standardtittelen eller la feltet stå tomt for å bruke standardtittelen.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setAlertDialogOpen(false)}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            '&:hover': {
                                backgroundColor: 'rgba(99, 102, 241, 0.04)'
                            }
                        }}
                    >
                        Avbryt
                    </Button>
                    <Button 
                        onClick={handleAlertSubmit} 
                        variant="contained"
                        disabled={!alertContent}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            px: 2,
                            '&:hover': {
                                boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)'
                            }
                        }}
                    >
                        Sett inn
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DrawingRuleEditor; 