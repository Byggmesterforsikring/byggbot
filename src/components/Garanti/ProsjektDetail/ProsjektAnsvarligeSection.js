import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Users, Loader2 } from 'lucide-react';
import { getAnsvarligDisplay } from './ProsjektDetailUtils';

const ProsjektAnsvarligeSection = ({
    prosjekt,
    allUsersV2,
    isLoadingUsers,
    isUpdatingAnsvarlige,
    onUpdateAnsvarlig
}) => {
    return (
        <div className="bg-white rounded-lg border p-6 space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Ansvarlige
            </h3>

            {isLoadingUsers ? (
                <div className="flex justify-center py-8">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Laster brukere...</span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Ansvarlig Rådgiver */}
                    <div className="space-y-2">
                        <Label htmlFor="ansvarligRaadgiver" className="text-sm font-medium">Ansvarlig Rådgiver</Label>
                        <Select
                            value={prosjekt.ansvarligRaadgiver?.id?.toString() || 'unassigned'}
                            onValueChange={(value) => onUpdateAnsvarlig('ansvarligRaadgiverId', value === 'unassigned' ? null : value)}
                            disabled={isUpdatingAnsvarlige['ansvarligRaadgiverId']}
                        >
                            <SelectTrigger id="ansvarligRaadgiver">
                                <SelectValue>
                                    {prosjekt.ansvarligRaadgiver ? getAnsvarligDisplay(prosjekt.ansvarligRaadgiver) : 'Ikke tildelt'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Ikke tildelt</SelectItem>
                                {allUsersV2
                                    .filter(u => u.roller?.includes('Garantisaksbehandler') || u.roller?.includes('Systemadministrator'))
                                    .map((user) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.navn || user.email}
                                        </SelectItem>
                                    ))
                                }
                            </SelectContent>
                        </Select>
                        {isUpdatingAnsvarlige['ansvarligRaadgiverId'] && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Oppdaterer...</span>
                            </div>
                        )}
                    </div>

                    {/* UW Ansvarlig */}
                    <div className="space-y-2">
                        <Label htmlFor="uwAnsvarlig" className="text-sm font-medium">UW Ansvarlig</Label>
                        <Select
                            value={prosjekt.uwAnsvarlig?.id?.toString() || 'unassigned'}
                            onValueChange={(value) => onUpdateAnsvarlig('uwAnsvarligId', value === 'unassigned' ? null : value)}
                            disabled={isUpdatingAnsvarlige['uwAnsvarligId']}
                        >
                            <SelectTrigger id="uwAnsvarlig">
                                <SelectValue>
                                    {prosjekt.uwAnsvarlig ? getAnsvarligDisplay(prosjekt.uwAnsvarlig) : 'Ikke tildelt'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Ikke tildelt</SelectItem>
                                {allUsersV2
                                    .filter(u => u.roller?.includes('Garantileder_UW') || u.roller?.includes('Systemadministrator'))
                                    .map((user) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.navn || user.email}
                                        </SelectItem>
                                    ))
                                }
                            </SelectContent>
                        </Select>
                        {isUpdatingAnsvarlige['uwAnsvarligId'] && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Oppdaterer...</span>
                            </div>
                        )}
                    </div>

                    {/* Produksjonsansvarlig */}
                    <div className="space-y-2">
                        <Label htmlFor="produksjonsansvarlig" className="text-sm font-medium">Produksjonsansvarlig</Label>
                        <Select
                            value={prosjekt.produksjonsansvarlig?.id?.toString() || 'unassigned'}
                            onValueChange={(value) => onUpdateAnsvarlig('produksjonsansvarligId', value === 'unassigned' ? null : value)}
                            disabled={isUpdatingAnsvarlige['produksjonsansvarligId']}
                        >
                            <SelectTrigger id="produksjonsansvarlig">
                                <SelectValue>
                                    {prosjekt.produksjonsansvarlig ? getAnsvarligDisplay(prosjekt.produksjonsansvarlig) : 'Ikke tildelt'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Ikke tildelt</SelectItem>
                                {allUsersV2.map((user) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.navn || user.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isUpdatingAnsvarlige['produksjonsansvarligId'] && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Oppdaterer...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    Endringer lagres automatisk når du velger en ny ansvarlig person.
                </p>
            </div>
        </div>
    );
};

export default ProsjektAnsvarligeSection; 