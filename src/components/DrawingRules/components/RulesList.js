import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Typography,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Container
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';

const RulesList = ({
    rules,
    canEdit,
    isAdmin,
    handleNewRule,
    handleDeleteClick,
    formatDate
}) => {
    const navigate = useNavigate();

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h4">Tegningsregler</Typography>
                    {canEdit && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={handleNewRule}
                        >
                            Ny tegningsregel
                        </Button>
                    )}
                </Box>
                <List>
                    {rules.map((rule) => (
                        <ListItem
                            key={`${rule.id}-${rule.last_updated_at}`}
                            button
                            onClick={() => navigate(`/tegningsregler/${rule.slug}`)}
                            secondaryAction={
                                isAdmin && (
                                    <IconButton
                                        edge="end"
                                        aria-label="slett"
                                        onClick={(e) => handleDeleteClick(rule, e)}
                                        color="error"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                )
                            }
                        >
                            <ListItemText
                                primary={rule.title}
                                secondary={
                                    <>
                                        {`Opprettet: ${formatDate(rule.created_at)} av ${rule.created_by_email || 'Ukjent'}`}
                                        <br />
                                        {`Sist oppdatert: ${formatDate(rule.last_updated_at)} av ${rule.last_updated_by_email || 'Ukjent'}`}
                                    </>
                                }
                            />
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Container>
    );
};

export default RulesList; 