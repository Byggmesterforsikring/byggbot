import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Building2 } from 'lucide-react';

const ProsjektRelasjonerSection = () => {
    return (
        <div className="bg-white rounded-lg border p-6 space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Relasjoner
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="megler" className="text-sm font-medium">Megler</Label>
                    <Select disabled={true}>
                        <SelectTrigger id="megler">
                            <SelectValue placeholder="Velg megler..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="megler1">Megler AS</SelectItem>
                            <SelectItem value="megler2">Norsk Megling</SelectItem>
                            <SelectItem value="megler3">ProMegler</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="agent" className="text-sm font-medium">Agent</Label>
                    <Select disabled={true}>
                        <SelectTrigger id="agent">
                            <SelectValue placeholder="Velg agent..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="agent1">Agent Forsikring</SelectItem>
                            <SelectItem value="agent2">Nord Agent</SelectItem>
                            <SelectItem value="agent3">Sør Agent AS</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="kjedetilknytning" className="text-sm font-medium">Kjedetilknytning</Label>
                    <Select disabled={true}>
                        <SelectTrigger id="kjedetilknytning">
                            <SelectValue placeholder="Velg kjede..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="kjede1">ByggKjeden</SelectItem>
                            <SelectItem value="kjede2">Entreprenør AS</SelectItem>
                            <SelectItem value="kjede3">Samarbeidspartnere</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    Funksjonalitet for å redigere relasjoner kommer snart. Kontakt systemadministrator for endringer.
                </p>
            </div>
        </div>
    );
};

export default ProsjektRelasjonerSection; 