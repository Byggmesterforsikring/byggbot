import React, { useState, useEffect, useRef } from 'react';
import {
  Button
} from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { AlertCircle, ArrowLeft, FilePenLine, History } from 'lucide-react';
import DrawingRuleEditor from '../editor/DrawingRuleEditor';
import RuleViewer from '../viewer/RuleViewer';
import UnsavedChangesDialog from './UnsavedChangesDialog';

const ModernRuleDetail = ({
  currentRule,
  isEditing,
  title,
  setTitle,
  handleEditClick,
  loadVersionHistory,
  canEdit,
  handleSave,
  handleCancel,
  handleBackClick,
  showVersionHistory,
  setShowVersionHistory,
  versions,
  handleVersionSelect,
  formatDate
}) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const editorComponentRef = useRef(null);
  // Nytt state for feilmeldingsdialog
  const [errorDialog, setErrorDialog] = useState({
    open: false,
    message: ''
  });

  const handleHasChangesChange = (hasChanges) => {
    setHasUnsavedChanges(hasChanges);
  };

  // Registrer callback for editor content endringer
  React.useEffect(() => {
    window.handleEditorContentChange = (content) => {
      setEditorContent(content);

      // For nye regler, sett hasUnsavedChanges hvis innhold er fylt ut
      if (!currentRule && content && content.trim() !== '') {
        setHasUnsavedChanges(true);
      }
    };

    // Initialiser editorContent med innholdet fra currentRule når komponenten mountes
    if (currentRule?.content) {
      setEditorContent(currentRule.content);
    }

    return () => {
      delete window.handleEditorContentChange;
    };
  }, [currentRule]);

  // Sett hasUnsavedChanges for nye regler når title endres
  React.useEffect(() => {
    // For nye regler, sett hasUnsavedChanges hvis tittel er fylt ut
    if (isEditing && !currentRule && title && title.trim() !== '') {
      setHasUnsavedChanges(true);
    }
  }, [title, isEditing, currentRule]);

  // Tilbakestill hasUnsavedChanges når vi går ut av redigeringsmodus
  React.useEffect(() => {
    if (!isEditing) {
      setHasUnsavedChanges(false);
    }
  }, [isEditing]);

  const handleBackWithCheck = () => {
    // For nye regler, sjekk også title og editorContent
    const hasContent = !currentRule && (
      (title && title.trim() !== '') ||
      (editorContent && editorContent.trim() !== '')
    );

    // Vis advarselen hvis vi er i redigeringsmodus og har endringer eller innhold
    if (isEditing && (hasUnsavedChanges || hasContent)) {
      console.log('Viser advarsel om ulagrede endringer', {
        hasUnsavedChanges,
        isEditing,
        isNew: !currentRule,
        hasContent,
        titleLength: title?.length || 0,
        contentLength: editorContent?.length || 0
      });
      setShowUnsavedDialog(true);
    } else {
      console.log('Går tilbake uten advarsel', { hasUnsavedChanges, isEditing, isNew: !currentRule });
      handleBackClick();
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false);
    handleCancel();
  };

  const handleSaveChanges = async () => {
    setShowUnsavedDialog(false);

    if (!title || title.trim() === '') {
      setErrorDialog({
        open: true,
        message: 'Du må fylle inn en tittel for tegningsregelen'
      });
      return;
    }

    let actualContent = '';
    if (editorComponentRef.current && typeof editorComponentRef.current.getEditorContent === 'function') {
      actualContent = editorComponentRef.current.getEditorContent();
      console.log('Innhold hentet fra editor via ref for dialog-lagring:', actualContent.length);
    } else {
      console.warn('Kunne ikke hente innhold fra editor via ref, bruker editorContent-state som fallback.');
      actualContent = editorContent; // Fallback til det eldre state-et hvis ref ikke funker
    }

    console.log('Innhold før lagring (fra dialog):', {
      editorContentFromRefLength: actualContent?.length || 0,
      hasTitle: !!title && title.trim() !== ''
    });

    try {
      // Bruk hoved-handleSave som er sendt inn som prop
      await handleSave(title, actualContent);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Feil ved lagring via dialog:', error);
      setErrorDialog({
        open: true,
        message: `Kunne ikke lagre tegningsregelen: ${error.message || 'Ukjent feil'}`
      });
    }
  };

  // Funksjon for å lukke feildialogen
  const closeErrorDialog = () => {
    setErrorDialog({ ...errorDialog, open: false });
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center mb-6 gap-3 pb-4 border-b">
        <Button
          variant="outline"
          size="icon"
          onClick={handleBackWithCheck}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Tilbake</span>
        </Button>

        <h1 className="text-xl font-semibold text-foreground flex-1 truncate">
          {isEditing ? (currentRule ? 'Rediger' : 'Ny') + ' tegningsregel' : currentRule?.title}
        </h1>

        {currentRule && !isEditing && (
          <div className="flex gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditClick}
              >
                <FilePenLine className="mr-2 h-4 w-4" />
                Rediger
              </Button>
            )}

            <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadVersionHistory}
                >
                  <History className="mr-2 h-4 w-4" />
                  Versjonshistorikk
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>Versjonshistorikk</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto p-1 -mx-1 my-4">
                  {versions.length > 0 ? (
                    versions.map((version) => (
                      <button
                        key={version.id}
                        onClick={() => handleVersionSelect(version)}
                        className={`w-full text-left p-3 rounded-md mb-2 transition-colors duration-150 ease-in-out ${version.is_current ? 'bg-muted/60' : 'hover:bg-muted/50'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">Versjon {version.version_number}</span>
                            {version.is_current && (
                              <Badge variant="secondary" className="text-xs">Gjeldende</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(version.created_at)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Endret av: {version.createdBy?.navn || version.createdBy?.email || 'Ukjent'}</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Ingen versjonshistorikk funnet.</p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowVersionHistory(false)}>Lukk</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {isEditing ? (
        <DrawingRuleEditor
          ref={editorComponentRef}
          initialContent={currentRule?.content}
          onSave={handleSave}
          title={title}
          setTitle={setTitle}
          key={currentRule?.id}
          onCancel={handleCancel}
          onHasChangesChange={handleHasChangesChange}
        />
      ) : (
        currentRule && (
          <div className="p-12 border rounded-lg shadow-sm bg-card prose dark:prose-invert max-w-none">
            <RuleViewer rule={currentRule} />
          </div>
        )
      )}

      {/* Dialog for ulagrede endringer */}
      {showUnsavedDialog && (
        <UnsavedChangesDialog
          open={showUnsavedDialog}
          onClose={() => setShowUnsavedDialog(false)}
          onDiscard={handleDiscardChanges}
          onSave={handleSaveChanges}
        />
      )}

      {/* Feilmeldingsdialog */}
      <Dialog open={errorDialog.open} onOpenChange={closeErrorDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-start gap-3 mb-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-1" />
              <DialogTitle>Feil</DialogTitle>
            </div>
            <DialogDescription>
              {errorDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={closeErrorDialog}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModernRuleDetail;