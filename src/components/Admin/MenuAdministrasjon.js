import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "~/hooks/use-toast";
import { MENU_ITEMS } from "~/constants/menuStructure";

const ROLE_OPTIONS = [
    { value: null, label: 'Ingen krav (tilgjengelig for alle)' },
    { value: 'USER', label: 'USER - Bruker' },
    { value: 'EDITOR', label: 'EDITOR - Redigering' },
    { value: 'ADMIN', label: 'ADMIN - Administrator' }
];

function MenuAdministrasjon() {
    const [menuItems, setMenuItems] = useState([]);
    const [menuSettings, setMenuSettings] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [changes, setChanges] = useState(false);

    // Flatten menyelementer for enklere visning
    const flattenMenuItems = (items, parentLabel = '') => {
        const flattened = [];
        items.forEach(item => {
            const fullLabel = parentLabel ? `${parentLabel} > ${item.label}` : item.label;
            flattened.push({
                id: item.id,
                label: fullLabel,
                defaultRequiredRole: item.defaultRequiredRole,
                requiredModule: item.requiredModule,
                path: item.path,
                isSubItem: !!parentLabel
            });

            if (item.subItems) {
                flattened.push(...flattenMenuItems(item.subItems, fullLabel));
            }
        });
        return flattened;
    };

    useEffect(() => {
        loadMenuSettings();
    }, []);

    const loadMenuSettings = async () => {
        try {
            setIsLoading(true);
            const flattened = flattenMenuItems(MENU_ITEMS);
            setMenuItems(flattened);

            // Hent eksisterende innstillinger fra database
            const result = await window.electron.menuAccess.getSettings();
            if (result.success) {
                const settingsMap = {};
                result.data.forEach(setting => {
                    settingsMap[setting.id] = setting.requiredRole;
                });
                setMenuSettings(settingsMap);
            } else {
                toast({
                    title: "Feil",
                    description: "Kunne ikke laste menytilgangsinnstillinger",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Feil ved lasting av menyinnstillinger:', error);
            toast({
                title: "Feil",
                description: "Uventet feil ved lasting av innstillinger",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleChange = (itemId, newRole) => {
        const role = newRole === 'null' ? null : newRole;
        setMenuSettings(prev => ({
            ...prev,
            [itemId]: role
        }));
        setChanges(true);
    };

    const getCurrentRole = (itemId, defaultRequiredRole) => {
        if (menuSettings.hasOwnProperty(itemId)) {
            return menuSettings[itemId];
        }
        return defaultRequiredRole;
    };

    const saveSettings = async () => {
        try {
            setIsSaving(true);

            // Konverter til format som backend forventer
            const settingsToSave = menuItems.map(item => ({
                id: item.id,
                requiredRole: getCurrentRole(item.id, item.defaultRequiredRole)
            }));

            const result = await window.electron.menuAccess.saveSettings(settingsToSave);

            if (result.success) {
                setChanges(false);
                toast({
                    title: "Suksess",
                    description: "Menytilgangsinnstillinger er lagret",
                });
            } else {
                toast({
                    title: "Feil",
                    description: result.error || "Kunne ikke lagre innstillinger",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Feil ved lagring:', error);
            toast({
                title: "Feil",
                description: "Uventet feil ved lagring",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const resetSettings = async () => {
        try {
            setIsLoading(true);

            const result = await window.electron.menuAccess.resetSettings();

            if (result.success) {
                setMenuSettings({});
                setChanges(false);
                toast({
                    title: "Suksess",
                    description: "Menytilgangsinnstillinger er tilbakestilt til standardverdier",
                });
            } else {
                toast({
                    title: "Feil",
                    description: result.error || "Kunne ikke tilbakestille innstillinger",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Feil ved tilbakestilling:', error);
            toast({
                title: "Feil",
                description: "Uventet feil ved tilbakestilling",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getRoleLabel = (role) => {
        if (role === null || role === undefined) return 'Alle';
        return role;
    };

    const getRoleVariant = (role) => {
        switch (role) {
            case 'ADMIN': return 'destructive';
            case 'EDITOR': return 'warning';
            case 'USER': return 'default';
            default: return 'secondary';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Laster menyinnstillinger...</span>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Menyadministrasjon</CardTitle>
                <CardDescription>
                    Konfigurer hvilke roller som kreves for å se forskjellige menyelementer.
                    Endringer vil tre i kraft når brukere logger seg inn på nytt.
                </CardDescription>
                <div className="flex gap-2">
                    <Button
                        onClick={saveSettings}
                        disabled={!changes || isSaving}
                        className="flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Lagre endringer
                    </Button>
                    <Button
                        variant="outline"
                        onClick={resetSettings}
                        className="flex items-center gap-2"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Tilbakestill
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {menuItems.map((item) => {
                        const currentRole = getCurrentRole(item.id, item.defaultRequiredRole);
                        const isModified = menuSettings.hasOwnProperty(item.id) &&
                            menuSettings[item.id] !== item.defaultRequiredRole;

                        return (
                            <div
                                key={item.id}
                                className={`p-4 border rounded-lg ${item.isSubItem ? 'ml-6 border-l-4 border-l-blue-300' : ''}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium">{item.label}</h4>
                                            {isModified && (
                                                <Badge variant="outline" className="text-xs">
                                                    Endret
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            <div>ID: <code className="text-xs bg-gray-100 px-1 rounded">{item.id}</code></div>
                                            {item.path && (
                                                <div>Sti: <code className="text-xs bg-gray-100 px-1 rounded">{item.path}</code></div>
                                            )}
                                            {item.requiredModule && (
                                                <div>Modul: <Badge variant="outline" className="text-xs">{item.requiredModule}</Badge></div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-sm">
                                            <div className="text-muted-foreground">Standard:</div>
                                            <Badge variant={getRoleVariant(item.defaultRequiredRole)}>
                                                {getRoleLabel(item.defaultRequiredRole)}
                                            </Badge>
                                        </div>

                                        <div className="text-sm">
                                            <div className="text-muted-foreground">Gjeldende:</div>
                                            <Select
                                                value={currentRole === null ? 'null' : (currentRole || 'null')}
                                                onValueChange={(value) => handleRoleChange(item.id, value)}
                                            >
                                                <SelectTrigger className="w-48">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ROLE_OPTIONS.map((option) => (
                                                        <SelectItem
                                                            key={option.value || 'null'}
                                                            value={option.value === null ? 'null' : option.value}
                                                        >
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {changes && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-800">
                            <span className="font-medium">Du har ulagrede endringer</span>
                        </div>
                        <p className="text-sm text-yellow-700 mt-1">
                            Husk å lagre endringene dine før du forlater siden.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default MenuAdministrasjon;
