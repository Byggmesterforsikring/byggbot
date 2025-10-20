import React from 'react';
import { Grid } from '@mui/material';
import { Building2, Hash, Type, MapPin, Mail, Navigation, User, Phone } from 'lucide-react';
import DetailField from './DetailField';

const ProsjektSelskapSection = ({ prosjekt }) => {
    if (!prosjekt?.selskap) {
        return null;
    }

    return (
        <div className="bg-white rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold">Selskapsinformasjon</h3>
            </div>
            <Grid container spacing={3}>
                <DetailField label="Organisasjonsnummer" value={prosjekt.selskap.organisasjonsnummer} icon={Hash} copyable />
                <DetailField label="Selskapsnavn" value={prosjekt.selskap.selskapsnavn} icon={Type} />
                <DetailField label="Gateadresse" value={prosjekt.selskap.gateadresse} icon={MapPin} />
                <DetailField label="Postnummer" value={prosjekt.selskap.postnummer} icon={Mail} />
                <DetailField label="Poststed" value={prosjekt.selskap.poststed} icon={Navigation} />
                <DetailField label="Kontaktperson" value={prosjekt.kontaktpersonNavn} icon={User} />
                <DetailField label="Telefon" value={prosjekt.kontaktpersonTelefon} icon={Phone} copyable />
            </Grid>
        </div>
    );
};

export default ProsjektSelskapSection; 