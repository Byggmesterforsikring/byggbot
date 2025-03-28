import React from 'react';
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { AVAILABLE_LANGUAGES } from './extensions'; // Antar denne er på samme nivå

export const CodeBlockComponent = ({ node: { attrs: { language: defaultLanguage } }, updateAttributes, extension }) => {
    return (
        <NodeViewWrapper className="code-block-wrapper relative my-4 overflow-hidden rounded-md border border-gray-700 bg-gray-950">
            <div className="flex justify-end items-center px-3 py-1 bg-gray-900 border-b border-gray-700">
                <Select
                    value={defaultLanguage || 'plaintext'}
                    onValueChange={(value) => updateAttributes({ language: value })}
                >
                    <SelectTrigger className="w-[130px] h-7 text-xs bg-transparent border-none focus:ring-0 focus:ring-offset-0 text-gray-400">
                        <SelectValue placeholder="Språk" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="plaintext">Plain text</SelectItem>
                        {AVAILABLE_LANGUAGES.map(lang => (
                            <SelectItem key={lang.value} value={lang.value} className="text-xs">
                                {lang.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <NodeViewContent as="pre" className="p-4 m-0 bg-gray-950 text-gray-300 text-sm overflow-x-auto" />
        </NodeViewWrapper>
    );
};

// Hjelpefunksjon for å registrere komponenten (valgfritt, men kan være nyttig)
export const CodeBlockNodeView = (component) => {
    return ReactNodeViewRenderer(component);
};