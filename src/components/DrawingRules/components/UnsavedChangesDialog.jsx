import React from 'react';
// Fjernet MUI imports

// Shadcn/Tailwind imports
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  // AlertDialogTrigger, // Trigger styres av 'open' prop
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button"; // Trengs hvis vi ikke bruker Cancel/Action
import { AlertTriangle } from 'lucide-react'; // Bruker AlertTriangle ikon

const UnsavedChangesDialog = ({ open, onClose, onDiscard, onSave }) => {
  return (
    <AlertDialog open={open} onOpenChange={onClose}> {/* Bruker onClose for onOpenChange */}
      {/* <AlertDialogTrigger /> ikke nødvendig */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start space-x-3">
            {/* Ikon */}
            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-yellow-100">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            {/* Tittel og Beskrivelse */}
            <div className="flex-1">
              <AlertDialogTitle className="mb-1">Ulagrede endringer</AlertDialogTitle>
              <AlertDialogDescription>
                Du har ulagrede endringer som vil gå tapt hvis du navigerer bort fra denne siden uten å lagre.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2 gap-2 sm:justify-end">
          {/* Bruker standard Button for "Forkast" for å kalle onDiscard */}
          <Button variant="outline" onClick={onDiscard}>
            Forkast endringer
          </Button>
          {/* Bruker standard Button for "Lagre" for å kalle onSave */}
          <Button onClick={onSave}>
            Lagre endringer
          </Button>
          {/* Alternativt:
           <AlertDialogCancel onClick={onDiscard}>Forkast endringer</AlertDialogCancel>
           <AlertDialogAction onClick={onSave}>Lagre endringer</AlertDialogAction> 
           Merk: AlertDialogCancel/Action kaller ikke onClose automatisk hvis onOpenChange er satt
           og kan ha standard styling vi kanskje ikke vil ha.
           Standard Button gir mer kontroll her.
           */}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnsavedChangesDialog;