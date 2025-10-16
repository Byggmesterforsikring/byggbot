import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '~/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Checkbox } from '~/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
    Loader2,
    ChevronRight,
    User,
    Shield,
    Menu,
    Settings,
    Search,
    ChevronDown,
    ChevronUp,
    Eye,
    Check,
    X,
    AlertCircle
} from 'lucide-react';
import { useToast } from '~/hooks/use-toast';
import { Box, Typography } from '@mui/material';

// Importer SelskapSearchModal
import SelskapSearchModal from './SelskapSearchModal';
import { MENU_ITEMS } from '../../constants/menuStructure';

// Legg til isDev og devlog
const isDev = process.env.NODE_ENV === 'development';

const devlog = (message, data = null) => {
    if (isDev) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] UserEditModalV3: ${message}`;
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }
};

const USER_TYPES = ["INTERN", "EKSTERN"];

// Hjelpefunksjon for å flate ut menyelementer inkludert subelementer
const flattenMenuItems = (items, parentLabel = '') => {
    let flattened = [];

    items.forEach(item => {
        if (item.subItems && item.subItems.length > 0) {
            // Legg til hovedelement
            flattened.push({
                ...item,
                displayLabel: item.label,
                level: 0,
                hasChildren: true
            });

            // Legg til subelementer
            item.subItems.forEach(subItem => {
                flattened.push({
                    ...subItem,
                    displayLabel: `${item.label} → ${subItem.label}`,
                    level: 1,
                    parentId: item.id,
                    hasChildren: false
                });
            });
        } else {
            flattened.push({
                ...item,
                displayLabel: parentLabel ? `${parentLabel} → ${item.label}` : item.label,
                level: parentLabel ? 1 : 0,
                hasChildren: false
            });
        }
    });

    return flattened;
};

// Komponenter for hver fane
const BasicInfoTab = ({ formData, handleChange, selectedTilknyttetSelskap, setIsSelskapSearchModalOpen }) => (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Brukerinformasjon
                </CardTitle>
                <CardDescription>
                    Grunnleggende informasjon om brukeren
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">E-post *</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="bruker@domene.no"
                        required
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="navn">Fullt Navn</Label>
                    <Input
                        id="navn"
                        name="navn"
                        value={formData.navn}
                        onChange={handleChange}
                        placeholder="Ola Nordmann"
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="user_type">Brukertype</Label>
                    <Select
                        name="user_type"
                        value={formData.user_type}
                        onValueChange={(value) => handleChange({ target: { name: 'user_type', value } })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Velg brukertype" />
                        </SelectTrigger>
                        <SelectContent>
                            {USER_TYPES.map(type => (
                                <SelectItem key={type} value={type}>
                                    <div className="flex items-center gap-2">
                                        {type === 'INTERN' ?
                                            <Badge variant="default">Intern</Badge> :
                                            <Badge variant="secondary">Ekstern</Badge>
                                        }
                                        {type}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="is_active"
                        name="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => handleChange({ target: { name: 'is_active', type: 'checkbox', checked } })}
                    />
                    <Label htmlFor="is_active" className="text-sm font-medium">
                        Aktiv bruker
                    </Label>
                </div>
            </CardContent>
        </Card>

        {formData.user_type === 'EKSTERN' && (
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Tilknyttet Selskap</CardTitle>
                    <CardDescription>
                        Eksterne brukere må knyttes til et selskap
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                            {selectedTilknyttetSelskap ? (
                                <div>
                                    <p className="font-medium">{selectedTilknyttetSelskap.navn}</p>
                                    <p className="text-sm text-muted-foreground">ID: {selectedTilknyttetSelskap.id}</p>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">Ingen selskap valgt</p>
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsSelskapSearchModalOpen(true)}
                        >
                            {selectedTilknyttetSelskap ? 'Endre' : 'Velg'}
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )}
    </div>
);

const RolesModulesTab = ({
    allRoles,
    selectedRoleIds,
    handleRoleChange,
    allModules,
    selectedModulIds,
    handleModulChange,
    isLoadingRoles,
    isLoadingModules
}) => (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Roller
                </CardTitle>
                <CardDescription>
                    Velg hvilke roller brukeren skal ha. Roller bestemmer grunnleggende tilganger.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingRoles ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Laster roller...</span>
                    </div>
                ) : allRoles.length === 0 ? (
                    <p className="text-muted-foreground">Ingen roller funnet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {allRoles.map(role => (
                            <div key={role.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                                <Checkbox
                                    id={`role-${role.id}`}
                                    checked={selectedRoleIds.has(role.id)}
                                    onCheckedChange={() => handleRoleChange(role.id)}
                                />
                                <div className="flex-1">
                                    <Label
                                        htmlFor={`role-${role.id}`}
                                        className="font-medium cursor-pointer"
                                    >
                                        {role.role_name}
                                    </Label>
                                    {role.beskrivelse && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {role.beskrivelse}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Menu className="h-5 w-5" />
                    Modultilganger
                </CardTitle>
                <CardDescription>
                    Velg hvilke moduler brukeren skal ha tilgang til.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingModules ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Laster moduler...</span>
                    </div>
                ) : allModules.length === 0 ? (
                    <p className="text-muted-foreground">Ingen moduler funnet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {allModules.map(modul => (
                            <div key={modul.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                                <Checkbox
                                    id={`modul-${modul.id}`}
                                    checked={selectedModulIds.has(modul.id)}
                                    onCheckedChange={() => handleModulChange(modul.id)}
                                />
                                <div className="flex-1">
                                    <Label
                                        htmlFor={`modul-${modul.id}`}
                                        className="font-medium cursor-pointer"
                                    >
                                        {modul.navn}
                                    </Label>
                                    {modul.beskrivelse && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {modul.beskrivelse}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
);

const MenuAccessTab = ({
    allMenuItems,
    userMenuTilganger,
    handleMenuTilgangChange,
    isLoadingMenuTilganger
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState(new Set());

    const filteredMenuItems = allMenuItems.filter(item =>
        item.displayLabel.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleCategory = (categoryId) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };

    const getAccessIcon = (menuId) => {
        const currentTilgang = userMenuTilganger.get(menuId);
        if (!currentTilgang) return null;

        return currentTilgang.harTilgang ? (
            <Check className="h-4 w-4 text-green-600" />
        ) : (
            <X className="h-4 w-4 text-red-600" />
        );
    };

    const getAccessBadge = (menuId) => {
        const currentTilgang = userMenuTilganger.get(menuId);
        if (!currentTilgang) return <Badge variant="outline">Standard</Badge>;

        return currentTilgang.harTilgang ? (
            <Badge variant="default" className="bg-green-100 text-green-800">Tillatt</Badge>
        ) : (
            <Badge variant="destructive">Nektet</Badge>
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Menu className="h-5 w-5" />
                        Individuell Menytilgang
                    </CardTitle>
                    <CardDescription>
                        Overstyr standard rolle-basert tilgang for spesifikke menyelementer.
                        Kun endringer fra standard vises her.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingMenuTilganger ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Laster menytilganger...</span>
                        </div>
                    ) : (
                        <>
                            {/* Søk */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Søk i menyer..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Meny-elementer */}
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {filteredMenuItems.map(menuItem => {
                                    const currentTilgang = userMenuTilganger.get(menuItem.id);
                                    const currentValue = currentTilgang ?
                                        (currentTilgang.harTilgang ? 'allow' : 'deny') : 'default';

                                    return (
                                        <div
                                            key={menuItem.id}
                                            className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 ${menuItem.level > 0 ? 'ml-6 border-l-4 border-l-muted' : ''
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {getAccessIcon(menuItem.id)}
                                                <div>
                                                    <Label className="font-medium cursor-pointer">
                                                        {menuItem.level > 0 ? menuItem.label : menuItem.displayLabel}
                                                    </Label>
                                                    {menuItem.level > 0 && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Under: {menuItem.displayLabel.split(' → ')[0]}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {getAccessBadge(menuItem.id)}
                                                <Select
                                                    value={currentValue}
                                                    onValueChange={(value) => {
                                                        if (value === 'default') {
                                                            handleMenuTilgangChange(menuItem.id, null);
                                                        } else {
                                                            handleMenuTilgangChange(menuItem.id, value === 'allow');
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="w-32">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="default">Standard</SelectItem>
                                                        <SelectItem value="allow">Tillat</SelectItem>
                                                        <SelectItem value="deny">Nekt</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {filteredMenuItems.length === 0 && searchTerm && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                                    <p>Ingen menyer funnet for "{searchTerm}"</p>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const AdvancedTab = ({ formData, handleChange }) => (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Avanserte Innstillinger
                </CardTitle>
                <CardDescription>
                    Tekniske innstillinger og integrasjoner
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="entra_id_object_id">Entra ID Object ID</Label>
                    <Input
                        id="entra_id_object_id"
                        name="entra_id_object_id"
                        value={formData.entra_id_object_id}
                        onChange={handleChange}
                        placeholder="Automatisk generert ved Azure AD-synkronisering"
                    />
                    <p className="text-xs text-muted-foreground">
                        Dette feltet fylles automatisk ved Azure AD-integrasjon
                    </p>
                </div>
            </CardContent>
        </Card>
    </div>
);

function UserEditModalV3({ isOpen, setIsOpen, userIdToEdit, onUserSaved }) {
    const [activeTab, setActiveTab] = useState("basic");
    const [formData, setFormData] = useState({
        email: '',
        navn: '',
        user_type: USER_TYPES[0],
        is_active: true,
        entra_id_object_id: ''
    });
    const [selectedRoleIds, setSelectedRoleIds] = useState(new Set());
    const [allRoles, setAllRoles] = useState([]);

    const [allModules, setAllModules] = useState([]);
    const [selectedModulIds, setSelectedModulIds] = useState(new Set());

    // State for individuell menytilgang
    const [allMenuItems, setAllMenuItems] = useState([]);
    const [userMenuTilganger, setUserMenuTilganger] = useState(new Map());
    const [isLoadingMenuTilganger, setIsLoadingMenuTilganger] = useState(false);

    const [selectedTilknyttetSelskap, setSelectedTilknyttetSelskap] = useState(null);
    const [isSelskapSearchModalOpen, setIsSelskapSearchModalOpen] = useState(false);

    const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);
    const [isLoadingRoles, setIsLoadingRoles] = useState(false);
    const [isLoadingModules, setIsLoadingModules] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    const resetForm = useCallback(() => {
        setFormData({
            email: '',
            navn: '',
            user_type: USER_TYPES[0],
            is_active: true,
            entra_id_object_id: ''
        });
        setSelectedRoleIds(new Set());
        setSelectedModulIds(new Set());
        setUserMenuTilganger(new Map());
        setSelectedTilknyttetSelskap(null);
        setError(null);
        setActiveTab("basic");
    }, []);

    // Hent alle tilgjengelige roller OG moduler når modalen åpnes
    useEffect(() => {
        if (isOpen) {
            const fetchInitialLookups = async () => {
                setIsLoadingRoles(true);
                setIsLoadingModules(true);
                try {
                    const rolesResult = await window.electron.userV2.getAllRoles();
                    if (rolesResult.success) {
                        setAllRoles(rolesResult.data || []);
                    } else {
                        throw new Error(rolesResult.error || 'Kunne ikke hente roller.');
                    }

                    const modulerResult = await window.electron.userV2.getAllModules();
                    if (modulerResult.success) {
                        setAllModules(modulerResult.data || []);
                    } else {
                        throw new Error(modulerResult.error || 'Kunne ikke hente moduler.');
                    }

                    // Initialiser menyelementer
                    const flatMenuItems = flattenMenuItems(MENU_ITEMS);
                    setAllMenuItems(flatMenuItems);
                } catch (err) {
                    console.error("Feil ved henting av roller/moduler i modal:", err);
                    toast({ title: "Feil", description: `Kunne ikke laste nødvendige data: ${err.message}`, variant: "destructive" });
                } finally {
                    setIsLoadingRoles(false);
                    setIsLoadingModules(false);
                }
            };
            fetchInitialLookups();
        }
    }, [isOpen, toast]);

    // Hent brukerdata hvis vi er i redigeringsmodus
    useEffect(() => {
        if (isOpen && userIdToEdit) {
            const fetchUserData = async () => {
                setIsLoadingUserDetails(true);
                setError(null);
                try {
                    const result = await window.electron.userV2.getUserById(userIdToEdit);
                    if (result.success && result.data) {
                        const user = result.data;
                        setFormData({
                            email: user.email || '',
                            navn: user.navn || '',
                            user_type: user.user_type || USER_TYPES[0],
                            is_active: user.is_active !== undefined ? user.is_active : true,
                            entra_id_object_id: user.entra_id_object_id || ''
                        });
                        setSelectedRoleIds(new Set(user.roller?.map(r => r.id) || []));
                        setSelectedModulIds(new Set(user.modulTilganger?.map(mt => mt.id) || []));
                        if (user.user_type === 'EKSTERN' && user.tilknyttetSelskap) {
                            setSelectedTilknyttetSelskap({
                                id: user.tilknyttetSelskap.id,
                                navn: user.tilknyttetSelskap.selskapsnavn
                            });
                        } else {
                            setSelectedTilknyttetSelskap(null);
                        }

                        // Hent brukerens menytilganger
                        setIsLoadingMenuTilganger(true);
                        try {
                            const menuTilgangerResult = await window.electron.userV2.getUserMenuTilganger(userIdToEdit);
                            if (menuTilgangerResult.success && menuTilgangerResult.data) {
                                const menuTilgangerMap = new Map();
                                menuTilgangerResult.data.forEach(tilgang => {
                                    menuTilgangerMap.set(tilgang.menuId, {
                                        harTilgang: tilgang.harTilgang,
                                        overrideDefault: tilgang.overrideDefault
                                    });
                                });
                                setUserMenuTilganger(menuTilgangerMap);
                                devlog('Hentet menytilganger for bruker:', menuTilgangerResult.data);
                            }
                        } catch (menuErr) {
                            console.warn('Kunne ikke hente menytilganger:', menuErr);
                        } finally {
                            setIsLoadingMenuTilganger(false);
                        }
                    } else {
                        throw new Error(result.error || `Kunne ikke hente bruker med ID ${userIdToEdit}.`);
                    }
                } catch (err) {
                    console.error(`Feil ved henting av bruker ${userIdToEdit}:`, err);
                    setError(`Kunne ikke laste brukerdata: ${err.message}`);
                    toast({ title: "Feil", description: `Kunne ikke laste brukerdata: ${err.message}`, variant: "destructive" });
                }
                setIsLoadingUserDetails(false);
            };
            fetchUserData();
        } else if (isOpen && !userIdToEdit) {
            // Ny bruker, reset skjema
            resetForm();
        }
    }, [isOpen, userIdToEdit, toast, resetForm]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: type === 'checkbox' ? checked : value };
            if (name === 'user_type' && value === 'INTERN') {
                setSelectedTilknyttetSelskap(null);
            }
            return newData;
        });
    };

    const handleRoleChange = (roleId) => {
        setSelectedRoleIds(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(roleId)) {
                newSelected.delete(roleId);
            } else {
                newSelected.add(roleId);
            }
            return newSelected;
        });
    };

    const handleModulChange = (modulId) => {
        setSelectedModulIds(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(modulId)) {
                newSelected.delete(modulId);
            } else {
                newSelected.add(modulId);
            }
            return newSelected;
        });
    };

    const handleMenuTilgangChange = (menuId, harTilgang) => {
        setUserMenuTilganger(prev => {
            const newMap = new Map(prev);
            if (harTilgang === null) {
                // Fjern override (bruk standard)
                newMap.delete(menuId);
            } else {
                // Sett custom tilgang
                newMap.set(menuId, {
                    harTilgang: harTilgang,
                    overrideDefault: true
                });
            }
            return newMap;
        });
    };

    const handleSelskapValgt = (selskap) => {
        if (selskap) {
            setSelectedTilknyttetSelskap({ id: selskap.id, navn: selskap.selskapsnavn });
        } else {
            setSelectedTilknyttetSelskap(null);
        }
        setIsSelskapSearchModalOpen(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        const userDataPayload = { ...formData };
        const finalRoleIds = Array.from(selectedRoleIds);
        const finalModulIds = Array.from(selectedModulIds);
        let tilknyttetSelskapIdPayload = null;

        if (userDataPayload.user_type === 'EKSTERN') {
            if (selectedTilknyttetSelskap && selectedTilknyttetSelskap.id) {
                tilknyttetSelskapIdPayload = selectedTilknyttetSelskap.id;
            }
        }

        try {
            let result;
            const apiParamsCreate = {
                userData: userDataPayload,
                roleIds: finalRoleIds,
                modulIds: finalModulIds,
                tilknyttetSelskapId: tilknyttetSelskapIdPayload
            };
            const apiParamsUpdate = {
                userId: userIdToEdit,
                userData: userDataPayload,
                roleIds: finalRoleIds,
                modulIds: finalModulIds,
                tilknyttetSelskapId: tilknyttetSelskapIdPayload
            };

            if (userIdToEdit) {
                devlog('[UserEditModalV3] Kaller updateUser med payload:', apiParamsUpdate);
                result = await window.electron.userV2.updateUser(apiParamsUpdate);
            } else {
                if (!userDataPayload.email) throw new Error("E-post er påkrevd.");
                devlog('[UserEditModalV3] Kaller createUser med payload:', apiParamsCreate);
                result = await window.electron.userV2.createUser(apiParamsCreate);
            }

            if (result.success) {
                // Lagre menytilganger - dette må alltid gjøres for å synkronisere med database
                const userId = userIdToEdit || result.data?.id;
                if (userId) {
                    try {
                        const menuTilgangerArray = Array.from(userMenuTilganger.entries()).map(([menuId, tilgang]) => ({
                            menuId,
                            harTilgang: tilgang.harTilgang,
                            overrideDefault: tilgang.overrideDefault
                        }));

                        const menuResult = await window.electron.userV2.updateUserMenuTilganger(userId, menuTilgangerArray);
                        if (!menuResult.success) {
                            console.warn('Kunne ikke lagre menytilganger:', menuResult.error);
                        } else {
                            devlog('Lagret menytilganger for bruker:', { userId, count: menuTilgangerArray.length });
                        }
                    } catch (menuErr) {
                        console.warn('Feil ved lagring av menytilganger:', menuErr);
                        console.error('Detaljert feil:', menuErr);
                    }
                }

                toast({ title: "Suksess!", description: `Bruker ${userIdToEdit ? 'oppdatert' : 'opprettet'}.` });
                onUserSaved();
                setIsOpen(false);
            } else {
                throw new Error(result.error || `Lagringsfeil.`);
            }
        } catch (err) {
            console.error("Feil ved lagring av bruker:", err);
            setError(err.message);
            toast({ title: "Feil ved lagring", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const dialogTitle = userIdToEdit ? "Rediger Bruker" : "Opprett Ny Bruker";
    const isLoadingData = isLoadingUserDetails || isLoadingRoles || isLoadingModules || isLoadingMenuTilganger;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsOpen(open); }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>{dialogTitle}</DialogTitle>
                        {userIdToEdit && (
                            <DialogDescription>
                                Endre detaljer for bruker ID: {userIdToEdit}
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    {isLoadingData && (
                        <div className="flex justify-center items-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <span className="ml-3 text-muted-foreground">Laster data...</span>
                        </div>
                    )}

                    {!isLoadingData && (
                        <Tabs
                            value={activeTab}
                            onValueChange={(newValue) => {
                                // VIKTIG: Kun aksepter strings som gyldige tab-verdier
                                // Dette forhindrer at input-events trigger tab-endringer
                                const validTabs = ['basic', 'roles', 'menu', 'advanced'];
                                if (typeof newValue === 'string' && validTabs.includes(newValue)) {
                                    console.log('Tab endret til:', newValue);
                                    setActiveTab(newValue);
                                } else {
                                    console.log('Ignorerer ugyldig tab-endring:', newValue);
                                }
                            }}
                            className="flex-1"
                            onSelect={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                            onSelectCapture={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                        >
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="basic" className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Grunnleggende
                                </TabsTrigger>
                                <TabsTrigger value="roles" className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Roller & Moduler
                                </TabsTrigger>
                                <TabsTrigger value="menu" className="flex items-center gap-2">
                                    <Menu className="h-4 w-4" />
                                    Menytilgang
                                </TabsTrigger>
                                <TabsTrigger value="advanced" className="flex items-center gap-2">
                                    <Settings className="h-4 w-4" />
                                    Avansert
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent
                                value="basic"
                                className="mt-6 max-h-[60vh] overflow-y-auto space-y-4 p-6"
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                onSelect={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                onSelectCapture={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                            >
                                <BasicInfoTab
                                    formData={formData}
                                    handleChange={handleChange}
                                    selectedTilknyttetSelskap={selectedTilknyttetSelskap}
                                    setIsSelskapSearchModalOpen={setIsSelskapSearchModalOpen}
                                />
                            </TabsContent>

                            <TabsContent
                                value="roles"
                                className="mt-6 max-h-[60vh] overflow-y-auto space-y-4"
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                onSelect={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                onSelectCapture={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                            >
                                <RolesModulesTab
                                    allRoles={allRoles}
                                    selectedRoleIds={selectedRoleIds}
                                    handleRoleChange={handleRoleChange}
                                    allModules={allModules}
                                    selectedModulIds={selectedModulIds}
                                    handleModulChange={handleModulChange}
                                    isLoadingRoles={isLoadingRoles}
                                    isLoadingModules={isLoadingModules}
                                />
                            </TabsContent>

                            <TabsContent
                                value="menu"
                                className="mt-6 max-h-[60vh] overflow-y-auto space-y-4"
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                onSelect={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                onSelectCapture={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                            >
                                <MenuAccessTab
                                    allMenuItems={allMenuItems}
                                    userMenuTilganger={userMenuTilganger}
                                    handleMenuTilgangChange={handleMenuTilgangChange}
                                    isLoadingMenuTilganger={isLoadingMenuTilganger}
                                />
                            </TabsContent>

                            <TabsContent
                                value="advanced"
                                className="mt-6 max-h-[60vh] overflow-y-auto space-y-4"
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                onSelect={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                onSelectCapture={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                            >
                                <AdvancedTab
                                    formData={formData}
                                    handleChange={handleChange}
                                />
                            </TabsContent>

                            {error && (
                                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                    <p className="text-sm text-destructive text-center">{error}</p>
                                </div>
                            )}
                        </Tabs>
                    )}

                    <DialogFooter className="mt-6">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isSaving || isLoadingData}>
                                Avbryt
                            </Button>
                        </DialogClose>
                        <Button type="button" onClick={handleSave} disabled={isSaving || isLoadingData}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {userIdToEdit ? 'Lagre Endringer' : 'Opprett Bruker'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <SelskapSearchModal
                isOpen={isSelskapSearchModalOpen}
                setIsOpen={setIsSelskapSearchModalOpen}
                onSelskapSelected={handleSelskapValgt}
            />
        </>
    );
}

export default UserEditModalV3;
