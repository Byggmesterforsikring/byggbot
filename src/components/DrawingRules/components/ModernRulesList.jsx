import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Search, Plus, X, Trash2, Clock, User, FileText, ListChecks } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

const ModernRulesList = ({
  rules,
  canEdit,
  isAdmin,
  handleNewRule,
  handleDeleteClick,
  formatDate,
  searchQuery,
  setSearchQuery,
  filteredRules,
  deleteDialogOpen,
  setDeleteDialogOpen,
  ruleToDelete,
  handleDeleteConfirm,
}) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* --- Start Header Card --- */}
      <Card className="p-6">
        {/* Tittel og Ikon */}
        <div className="flex items-center gap-3 mb-4">
          <ListChecks className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Tegningsregler
            </h1>
            <p className="text-sm text-muted-foreground">
              Administrer tegningsregler for forsikringer
            </p>
          </div>
        </div>

        {/* Søkefelt og Ny-knapp */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Søk i tegningsregler..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
                onClick={() => setSearchQuery('')}
                aria-label="Nullstill søk"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>

          {canEdit && (
            <Button onClick={handleNewRule}>
              <Plus className="mr-2 h-4 w-4" />
              Ny tegningsregel
            </Button>
          )}
        </div>

        {/* Resultatinfo - Flyttet inn i Card */}
        {searchQuery && (
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <p>
              Fant {filteredRules.length} {filteredRules.length === 1 ? 'resultat' : 'resultater'}
              {rules.length > 0 ? ` av ${rules.length}` : ''}
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="p-0 h-auto text-muted-foreground hover:text-foreground"
            >
              Nullstill søk
            </Button>
          </div>
        )}
      </Card>
      {/* --- End Header Card --- */}

      {/* Rules Grid - Bruker Tailwind Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Mapper over filtrerte eller alle regler */}
        {(searchQuery ? filteredRules : rules).map((rule) => {
          // Ny logg for feilsøking
          // HUSK Å ENDRE "TITTEL_PÅ_NY_REGEL_HER" til den faktiske tittelen du tester med!
          if (rule.title === "TITTEL_PÅ_NY_REGEL_HER") {
            console.log('Regeldata mottatt i ModernRulesList for ny regel:', JSON.parse(JSON.stringify(rule)));
          }

          return (
            // Bruker Shadcn Card
            <Card
              key={`${rule.id}-${rule.last_updated_at}`}
              className="flex flex-col group cursor-pointer transition-all duration-150 ease-in-out hover:border-primary hover:shadow-md overflow-hidden"
              onClick={() => navigate(`/tegningsregler/${rule.slug}`)}
            >
              {/* Hover-effekt linje (simulert) */}
              <div className="h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

              {/* Ny CardHeader med ikon og tittel */}
              <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                {/* Flyttet CardTitle hit, fjernet mb-2 */}
                <CardTitle className="text-base font-semibold leading-snug truncate">
                  {rule.title}
                </CardTitle>
              </CardHeader>

              {/* Justert CardContent padding (pt-0) */}
              <CardContent className="p-4 pt-0 flex-1 flex flex-col">
                {/* Innholdsutdrag (uendret logikk, men nå under header) */}
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-grow">
                  {rule.content ?
                    (() => {
                      let cleanedContent = rule.content
                        .replace(/<[^>]*>/g, ''); // 1. Fjern alle HTML-tags

                      // 2. Fjern vanlige Markdown block starters (headings, lists, blockquotes) og inline markers
                      cleanedContent = cleanedContent
                        .replace(/^\s*([#*\-+>]+|\d+\.)\s*/gm, '') // Fjern ledende #,*,+,-,>, 1., etc. med mellomrom
                        .replace(/[`*_~]/g, ''); // Fjern inline format markers

                      // 3. Splitt på nye linjer, trim, fjern tomme, join med MELLOMROM
                      cleanedContent = cleanedContent
                        .split(/\n+/)
                        .map(line => line.trim())
                        .filter(line => line.length > 0)
                        .join(' ') // Tilbake til enkel mellomrom-join
                        .replace(/\s{2,}/g, ' ') // Bytt ut doble mellomrom med enkle
                        .trim();

                      // 4. Begrens lengde og legg til ellipsis
                      const maxLength = 140;
                      return cleanedContent.length > maxLength
                        ? cleanedContent.substring(0, maxLength) + '...'
                        : cleanedContent;
                    })()
                    : 'Ingen beskrivelse'}
                </p>
              </CardContent>

              {/* Footer med metadata og sletteknapp */}
              {/* Justert CardFooter padding (fjernet pt-0) */}
              <CardFooter className="p-4 border-t flex items-center justify-between">
                {/* Flyttet denne div-en inn for å gi plass til delete-knappen */}
                <div className="text-xs text-muted-foreground space-y-1 overflow-hidden mr-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <Clock className="h-3 w-3 opacity-80 flex-shrink-0" />
                    <span className="truncate">{formatDate(rule.last_updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="h-3 w-3 opacity-80 flex-shrink-0" />
                    <span className="truncate">{rule.last_updated_by_email || 'Ukjent'}</span>
                  </div>
                </div>

                {/* Sletteknapp (uendret) */}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 h-8 w-8 flex-shrink-0" // Lagt til flex-shrink-0
                    onClick={(e) => {
                      e.stopPropagation(); // Forhindre at Card onClick utløses
                      handleDeleteClick(rule, e);
                    }}
                    title="Slett regel" // Lagt til title for bedre tilgjengelighet
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Melding når ingen søkeresultater - TODO: Konverter denne */}
      {searchQuery && filteredRules.length === 0 && (
        <div className="text-center py-16 px-4 text-muted-foreground flex flex-col items-center justify-center gap-3 border border-dashed rounded-lg bg-muted/50">
          <Search className="h-10 w-10 text-muted-foreground/50 mb-1" />
          <h3 className="text-lg font-medium text-foreground">Ingen resultater funnet</h3>
          <p className="text-sm">Ingen tegningsregler matcher søket "{searchQuery}"</p>
          <Button
            variant="outline"
            onClick={() => setSearchQuery('')}
            className="mt-2"
          >
            Vis alle tegningsregler
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog - Konvertert til Shadcn AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bekreft sletting</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette regelen "{ruleToDelete?.title}"? Handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ModernRulesList;