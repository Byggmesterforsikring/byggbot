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
    DialogActions
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
    Link as LinkIcon
} from '@mui/icons-material';

const DrawingRuleEditor = ({ initialContent, onSave, title, setTitle, readOnly, onCancel }) => {
    const [content, setContent] = useState(initialContent || '');
    const [isSaving, setIsSaving] = useState(false);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const fileInputRef = useRef();
    const editorRef = useRef(null);

    const editor = useEditor({
        extensions: getExtensions(),
        content: initialContent || '',
        editable: !readOnly,
        onUpdate: ({ editor }) => {
            const newContent = editor.getHTML();
            setContent(newContent);
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
        }
    }, [editor, initialContent]);

    const handleSave = async () => {
        if (!editor || isSaving) return;
        setIsSaving(true);
        try {
            const editorContent = editor.getHTML();
            await onSave(title, editorContent);
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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
                label="Tittel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                variant="outlined"
                sx={{ mb: 2 }}
            />

            <Paper sx={{ p: 2, position: 'relative' }}>
                {editor && (
                    <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                        <Box sx={{
                            display: 'flex',
                            backgroundColor: 'white',
                            borderRadius: 1,
                            boxShadow: 1,
                            p: 0.5
                        }}>
                            <IconButton
                                size="small"
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                color={editor.isActive('bold') ? 'primary' : 'default'}
                            >
                                <FormatBold />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                color={editor.isActive('italic') ? 'primary' : 'default'}
                            >
                                <FormatItalic />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                                color={editor.isActive('bulletList') ? 'primary' : 'default'}
                            >
                                <FormatListBulleted />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                color={editor.isActive('orderedList') ? 'primary' : 'default'}
                            >
                                <FormatListNumbered />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                                color={editor.isActive('codeBlock') ? 'primary' : 'default'}
                            >
                                <Code />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                                color={editor.isActive('blockquote') ? 'primary' : 'default'}
                            >
                                <FormatQuote />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={handleLinkClick}
                                color={editor.isActive('link') ? 'primary' : 'default'}
                            >
                                <LinkIcon />
                            </IconButton>
                        </Box>
                    </BubbleMenu>
                )}
                <EditorContent editor={editor} />
            </Paper>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button onClick={onCancel} disabled={isSaving}>
                    Avbryt
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={isSaving || !title.trim()}
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

            <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)}>
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
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLinkDialogOpen(false)}>Avbryt</Button>
                    <Button onClick={handleLinkSubmit} variant="contained">
                        Legg til
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DrawingRuleEditor; 