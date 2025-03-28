import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import { Card, CardContent, CardFooter } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { getExtensions } from '../editor/extensions';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon
} from 'lucide-react';

const ModernRuleEditor = ({ initialContent, onSave, title, setTitle, readOnly, onCancel }) => {
  const [content, setContent] = useState(initialContent || '');
  const [isSaving, setIsSaving] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef();
  const editorRef = useRef(null);

  const editor = useEditor({
    extensions: getExtensions(),
    content: initialContent || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setContent(newContent);
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
  });

  // Håndter oppdateringer av initialContent
  useEffect(() => {
    if (editor && initialContent !== undefined && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent || '');
      setContent(initialContent || '');
    }
  }, [editor, initialContent]);

  const handleSave = async () => {
    if (!editor || isSaving) return;
    setIsSaving(true);
    try {
      const editorContent = editor.getHTML();
      await onSave(title, editorContent);
    } catch (error) {
      console.error('Feil ved lagring:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result;
        if (editor) {
          editor.chain().focus().setImage({
            src: base64Data,
            alt: file.name,
            title: file.name,
          }).run();
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Feil ved lasting av bilde:', error);
    }

    event.target.value = '';
  };

  const handleLinkClick = () => {
    setLinkDialogOpen(true);
  };

  const handleLinkSubmit = () => {
    if (editor && linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }
    setLinkUrl('');
    setLinkDialogOpen(false);
  };

  return (
    <div id="shadcn-ui" className="w-full max-w-4xl mx-auto space-y-4">
      <Input
        placeholder="Tittel på tegningsregel"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-lg font-medium"
      />

      <Card className="overflow-hidden">
        {editor && (
          <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
            <div className="flex bg-white rounded-lg shadow-md p-1 gap-1">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'bg-gray-100 text-primary' : ''}`}
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'bg-gray-100 text-primary' : ''}`}
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('bulletList') ? 'bg-gray-100 text-primary' : ''}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('orderedList') ? 'bg-gray-100 text-primary' : ''}`}
              >
                <ListOrdered className="h-4 w-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('codeBlock') ? 'bg-gray-100 text-primary' : ''}`}
              >
                <Code className="h-4 w-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('blockquote') ? 'bg-gray-100 text-primary' : ''}`}
              >
                <Quote className="h-4 w-4" />
              </button>
              <button
                onClick={handleLinkClick}
                className={`p-1 rounded hover:bg-gray-100 ${editor.isActive('link') ? 'bg-gray-100 text-primary' : ''}`}
              >
                <LinkIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1 rounded hover:bg-gray-100"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
            </div>
          </BubbleMenu>
        )}
        <CardContent className="p-0 prose max-w-none">
          <div className="min-h-[400px] p-6 focus:outline-none">
            <EditorContent editor={editor} className="min-h-[400px]" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={isSaving} onClick={onCancel}>
          Avbryt
        </Button>
        <Button
          disabled={isSaving || !title.trim()}
          onClick={handleSave}
        >
          {isSaving ? 'Lagrer...' : 'Lagre'}
        </Button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*"
        id="image-upload-input"
      />

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Legg til lenke</DialogTitle>
            <DialogDescription>
              Skriv inn URL-en du vil linke til.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus
              placeholder="https://eksempel.no"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLinkSubmit();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleLinkSubmit}>
              Legg til
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModernRuleEditor;