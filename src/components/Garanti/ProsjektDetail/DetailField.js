import React from 'react';
import { Grid, Typography } from '@mui/material';
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { useToast } from "~/hooks/use-toast";
import { Copy } from 'lucide-react';

// DetailField-komponent for konsistent visning
const DetailField = ({ label, value, copyable = false, icon: Icon }) => {
    const { toast } = useToast();

    const handleCopy = () => {
        if (value && value !== 'N/A') {
            navigator.clipboard.writeText(value);
            toast({ title: "Kopiert til utklippstavle", description: `${label}: ${value}` });
        }
    };

    return (
        <Grid item xs={12} sm={6} md={4}>
            <div className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4" />}
                <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
            </div>
            <div className="flex items-center gap-2 mt-1">
                <Typography variant="body2" className="font-mono break-all">{value || 'N/A'}</Typography>
                {copyable && value && value !== 'N/A' && (
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="p-1 h-auto">
                        <Copy className="h-3 w-3" />
                    </Button>
                )}
            </div>
        </Grid>
    );
};

export default DetailField; 