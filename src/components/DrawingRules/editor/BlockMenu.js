import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Paper,
    MenuItem,
    Typography,
    ListItemIcon
} from '@mui/material';
import {
    Title,
    FormatListBulleted,
    FormatListNumbered,
    FormatQuote,
    Code,
    Image as ImageIcon,
    TableChart,
    Warning,
    Info,
    Error as ErrorIcon,
    CheckCircle,
    Lightbulb
} from '@mui/icons-material';
import { AVAILABLE_LANGUAGES } from './extensions';

const BlockMenu = ({ editor }) => {
    // Reference to DrawingRuleEditor functions - bruker globale funksjoner direkte
    const getAlertFunction = (type) => {
        switch(type) {
            case 'warning': return window.insertWarningAlertFn;
            case 'info': return window.insertInfoAlertFn;
            case 'error': return window.insertErrorAlertFn;
            case 'success': return window.insertSuccessAlertFn;
            case 'default': return window.insertTipAlertFn;
            default: return null;
        }
    };
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [menuVisible, setMenuVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef(null);
    const selectedItemRef = useRef(null);

    const blocks = [
        {
            title: 'Tekst',
            description: 'Vanlig tekst',
            icon: <Title />,
            command: () => editor.chain().focus().setParagraph().run()
        },
        {
            title: 'Overskrift 1',
            description: 'Stor overskrift',
            icon: <Title />,
            command: () => editor.chain().focus().toggleHeading({ level: 1 }).run()
        },
        {
            title: 'Overskrift 2',
            description: 'Medium overskrift',
            icon: <Title />,
            command: () => editor.chain().focus().toggleHeading({ level: 2 }).run()
        },
        {
            title: 'Overskrift 3',
            description: 'Liten overskrift',
            icon: <Title />,
            command: () => editor.chain().focus().toggleHeading({ level: 3 }).run()
        },
        {
            title: 'Punktliste',
            description: 'Enkel punktliste',
            icon: <FormatListBulleted />,
            command: () => editor.chain().focus().toggleBulletList().run()
        },
        {
            title: 'Nummerert liste',
            description: 'Nummerert liste',
            icon: <FormatListNumbered />,
            command: () => editor.chain().focus().toggleOrderedList().run()
        },
        {
            title: 'Sitat',
            description: 'Uthevet sitat',
            icon: <FormatQuote />,
            command: () => editor.chain().focus().toggleBlockquote().run()
        },
        {
            title: 'Kodeblokk',
            description: 'For kode eller formatert tekst',
            icon: <Code />,
            command: () => {
                const language = AVAILABLE_LANGUAGES[0].value; // Default til JavaScript
                editor.chain()
                    .focus()
                    .setCodeBlock({ language })
                    .run();

                // Åpne språkvelger-dialog
                const node = editor.state.selection.$head.parent;
                if (node.type.name === 'codeBlock') {
                    const dialog = document.createElement('div');
                    dialog.className = 'language-selector';
                    dialog.style.position = 'absolute';
                    dialog.style.zIndex = 1000;
                    dialog.style.backgroundColor = 'white';
                    dialog.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                    dialog.style.borderRadius = '4px';
                    dialog.style.padding = '8px';

                    const select = document.createElement('select');
                    select.style.padding = '4px';
                    select.style.borderRadius = '4px';
                    select.style.border = '1px solid #ddd';

                    AVAILABLE_LANGUAGES.forEach(lang => {
                        const option = document.createElement('option');
                        option.value = lang.value;
                        option.textContent = lang.label;
                        select.appendChild(option);
                    });

                    select.addEventListener('change', (e) => {
                        editor.chain()
                            .focus()
                            .setCodeBlock({ language: e.target.value })
                            .run();
                        dialog.remove();
                    });

                    dialog.appendChild(select);

                    // Posisjonering av dialog
                    const { view } = editor;
                    const { top, left } = view.coordsAtPos(editor.state.selection.from);
                    dialog.style.top = `${top + 24}px`;
                    dialog.style.left = `${left}px`;

                    document.body.appendChild(dialog);
                    select.focus();

                    // Fjern dialog når man klikker utenfor
                    const handleClickOutside = (e) => {
                        if (!dialog.contains(e.target)) {
                            dialog.remove();
                            document.removeEventListener('click', handleClickOutside);
                        }
                    };

                    setTimeout(() => {
                        document.addEventListener('click', handleClickOutside);
                    }, 0);
                }
            }
        },
        {
            title: 'Bilde',
            description: 'Last opp et bilde',
            icon: <ImageIcon />,
            command: () => {
                // Finn input-elementet
                const fileInput = document.querySelector('input[type="file"]');
                if (fileInput) {
                    fileInput.click();
                }
                setMenuVisible(false);
            }
        },
        {
            title: 'Tabell',
            description: 'Sett inn tabell',
            icon: <TableChart />,
            command: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        },
        {
            title: 'Advarsel',
            description: 'Advarsel (gul)',
            icon: <Warning sx={{ color: 'hsl(38 92% 40%)' }} />,
            command: () => {
                const alertFunction = getAlertFunction('warning');
                if (alertFunction) {
                    alertFunction();
                } else {
                    console.warn("Warning alert handler not available");
                }
                setMenuVisible(false);
            }
        },
        {
            title: 'Merknad',
            description: 'Merknad (blå)',
            icon: <Info sx={{ color: 'hsl(221 83% 45%)' }} />,
            command: () => {
                const alertFunction = getAlertFunction('info');
                if (alertFunction) {
                    alertFunction();
                } else {
                    console.warn("Info alert handler not available");
                }
                setMenuVisible(false);
            }
        },
        {
            title: 'Viktig',
            description: 'Viktig melding (rød)',
            icon: <ErrorIcon sx={{ color: 'hsl(0 84% 45%)' }} />,
            command: () => {
                const alertFunction = getAlertFunction('error');
                if (alertFunction) {
                    alertFunction();
                } else {
                    console.warn("Error alert handler not available");
                }
                setMenuVisible(false);
            }
        },
        {
            title: 'Fullført',
            description: 'Fullført melding (grønn)',
            icon: <CheckCircle sx={{ color: 'hsl(142 71% 35%)' }} />,
            command: () => {
                const alertFunction = getAlertFunction('success');
                if (alertFunction) {
                    alertFunction();
                } else {
                    console.warn("Success alert handler not available");
                }
                setMenuVisible(false);
            }
        },
        {
            title: 'Tips',
            description: 'Tips (grå)',
            icon: <Lightbulb sx={{ color: 'hsl(220 9% 46%)' }} />,
            command: () => {
                const alertFunction = getAlertFunction('default');
                if (alertFunction) {
                    alertFunction();
                } else {
                    console.warn("Tip alert handler not available");
                }
                setMenuVisible(false);
            }
        },
    ];

    const filteredBlocks = blocks.filter(block =>
        block.title.toLowerCase().includes(searchText.toLowerCase()) ||
        block.description.toLowerCase().includes(searchText.toLowerCase())
    );

    const handleKeyDown = useCallback((event) => {
        if (event.key === '/') {
            const { view } = editor;
            const { top, left } = view.coordsAtPos(view.state.selection.from);

            setMenuPosition({
                x: left,
                y: top + 24
            });
            setMenuVisible(true);
            setSelectedIndex(0);
            event.preventDefault();
        } else if (menuVisible) {
            switch (event.key) {
                case 'Escape':
                    setMenuVisible(false);
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    setSelectedIndex((prev) =>
                        prev < filteredBlocks.length - 1 ? prev + 1 : prev
                    );
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setSelectedIndex((prev) => prev > 0 ? prev - 1 : prev);
                    break;
                case 'Enter':
                    event.preventDefault();
                    event.stopPropagation();
                    if (filteredBlocks[selectedIndex]) {
                        const selectedBlock = filteredBlocks[selectedIndex];
                        selectedBlock.command();
                        setMenuVisible(false);
                        setSearchText('');
                        setSelectedIndex(0);
                        editor.commands.focus();
                    }
                    break;
            }
        }
    }, [editor, menuVisible, filteredBlocks, selectedIndex]);

    useEffect(() => {
        if (editor) {
            const element = editor.view.dom;
            element.addEventListener('keydown', handleKeyDown, { capture: true });
            return () => element.removeEventListener('keydown', handleKeyDown, { capture: true });
        }
    }, [editor, handleKeyDown]);

    // Funksjon for å scrolle til valgt element
    const scrollToSelected = useCallback(() => {
        if (selectedItemRef.current && menuRef.current) {
            const menuElement = menuRef.current;
            const selectedElement = selectedItemRef.current;

            const menuRect = menuElement.getBoundingClientRect();
            const selectedRect = selectedElement.getBoundingClientRect();

            // Sjekk om elementet er utenfor synlig område
            if (selectedRect.bottom > menuRect.bottom) {
                // Scroll ned hvis elementet er under
                menuElement.scrollTop += selectedRect.bottom - menuRect.bottom;
            } else if (selectedRect.top < menuRect.top) {
                // Scroll opp hvis elementet er over
                menuElement.scrollTop -= menuRect.top - selectedRect.top;
            }
        }
    }, []);

    // Oppdater scrolling når selectedIndex endres
    useEffect(() => {
        scrollToSelected();
    }, [selectedIndex, scrollToSelected]);

    if (!menuVisible) return null;

    return (
        <Paper
            ref={menuRef}
            className="slash-menu"
            sx={{
                position: 'fixed',
                left: `${menuPosition.x}px`,
                top: `${menuPosition.y}px`,
                width: '320px',
                zIndex: 1000
            }}
        >
            <Box className="slash-menu-items">
                {filteredBlocks.map((block, index) => (
                    <MenuItem
                        key={index}
                        ref={index === selectedIndex ? selectedItemRef : null}
                        onClick={() => {
                            block.command();
                            setMenuVisible(false);
                            setSearchText('');
                            setSelectedIndex(0);
                        }}
                        selected={index === selectedIndex}
                        sx={{
                            py: 1.5,
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.04)'
                            },
                            '&.Mui-selected': {
                                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                '&:hover': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.12)'
                                }
                            }
                        }}
                    >
                        <ListItemIcon sx={{
                            minWidth: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2
                        }}>
                            {block.icon}
                        </ListItemIcon>
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                {block.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {block.description}
                            </Typography>
                        </Box>
                    </MenuItem>
                ))}
            </Box>
        </Paper>
    );
};

export default BlockMenu; 