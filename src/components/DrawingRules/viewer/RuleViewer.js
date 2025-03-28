import React from 'react';
import { createLowlight } from 'lowlight';

// Registrer språk for syntax highlighting
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import csharp from 'highlight.js/lib/languages/csharp';
import cpp from 'highlight.js/lib/languages/cpp';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import powershell from 'highlight.js/lib/languages/powershell';

// Opprett en lowlight-instans
const lowlight = createLowlight();

// Registrer språk for lowlight
lowlight.register('javascript', javascript);
lowlight.register('python', python);
lowlight.register('java', java);
lowlight.register('csharp', csharp);
lowlight.register('cpp', cpp);
lowlight.register('sql', sql);
lowlight.register('xml', xml);
lowlight.register('json', json);
lowlight.register('bash', bash);
lowlight.register('powershell', powershell);

const processNode = (node) => {
    if (typeof node === 'string') return node;
    if (node.value) return node.value;
    if (!node.properties || !node.children) return '';

    const className = node.properties.className ?
        `class="${node.properties.className.join(' ')}"` : '';

    const content = node.children.map(child => processNode(child)).join('');

    return className ? `<span ${className}>${content}</span>` : content;
};

const RuleViewer = ({ rule }) => {
    if (!rule) return null;

    const enhanceCodeBlocks = (content) => {
        if (!content) return content;

        // Første steg: Behandle blockquotes med emojier for bedre visning
        let enhancedContent = content;

        // Konverter til shadcn-inspirert alert med warning variant (inkludert lister)
        enhancedContent = enhancedContent.replace(
            /<blockquote><p>⚠️(.+?)<\/p>([\s\S]*?)<\/blockquote>/g,
            (match, content, restContent) => {
                // Legg til eventuelt restinnhold (lister osv.)
                const fullContent = content + (restContent || '');
                return `
                <div class="alert alert-warning">
                    <div class="alert-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon"><path d="M12 9v4"></path><path d="M12 17h.01"></path><circle cx="12" cy="12" r="10"></circle></svg>
                        Advarsel
                    </div>
                    <div class="alert-description">${fullContent}</div>
                </div>`;
            }
        );

        // Special case for warning med kun tittel (inkludert lister)
        enhancedContent = enhancedContent.replace(
            /<blockquote><p>⚠️ <strong>(.+?)<\/strong><\/p>([\s\S]*?)<\/blockquote>/g,
            (match, title, restContent) => {
                // Sjekk om dette ikke er en standardtittel
                const isCustomTitle = title !== 'Advarsel';
                const displayTitle = isCustomTitle ? title : 'Advarsel';

                return `
                <div class="alert alert-warning">
                    <div class="alert-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon"><path d="M12 9v4"></path><path d="M12 17h.01"></path><circle cx="12" cy="12" r="10"></circle></svg>
                        ${displayTitle}
                    </div>
                    ${restContent ? `<div class="alert-description">${restContent}</div>` : ''}
                </div>`;
            }
        );

        // Warning med tittel og innhold (inkludert lister)
        enhancedContent = enhancedContent.replace(
            /<blockquote><p>⚠️ <strong>(.+?)<\/strong>(.+?)<\/p>([\s\S]*?)<\/blockquote>/g,
            (match, title, content, restContent) => {
                // Legg til eventuelt restinnhold (lister osv.)
                const fullContent = content + (restContent || '');
                // Sjekk om dette ikke er en standardtittel
                const isCustomTitle = title !== 'Advarsel';
                const displayTitle = isCustomTitle ? title : 'Advarsel';

                return `
                <div class="alert alert-warning">
                    <div class="alert-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon"><path d="M12 9v4"></path><path d="M12 17h.01"></path><circle cx="12" cy="12" r="10"></circle></svg>
                        ${displayTitle}
                    </div>
                    <div class="alert-description">${fullContent}</div>
                </div>`;
            }
        );

        // Note alerts (info) med brukerdefinert tittel (inkludert lister)
        enhancedContent = enhancedContent.replace(
            /<blockquote><p>(📝|✏️|📋|📌) <strong>(.+?)<\/strong>(.+?)<\/p>([\s\S]*?)<\/blockquote>/g,
            (match, emoji, title, content, restContent) => {
                // Legg til eventuelt restinnhold (lister osv.)
                const fullContent = content + (restContent || '');
                // Sjekk om dette ikke er en standardtittel
                const isCustomTitle = title !== 'Merknad';
                const displayTitle = isCustomTitle ? title : 'Merknad';

                return `
                <div class="alert alert-info">
                    <div class="alert-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                        ${displayTitle}
                    </div>
                    <div class="alert-description">${fullContent}</div>
                </div>`;
            }
        );

        // Note alerts (info) med standardtittel (inkludert lister)
        enhancedContent = enhancedContent.replace(
            /<blockquote><p>(📝|✏️|📋|📌)(.+?)<\/p>([\s\S]*?)<\/blockquote>/g,
            (match, emoji, content, restContent) => {
                // Legg til eventuelt restinnhold (lister osv.)
                const fullContent = content + (restContent || '');
                return `
                <div class="alert alert-info">
                    <div class="alert-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                        Merknad
                    </div>
                    <div class="alert-description">${fullContent}</div>
                </div>`;
            }
        );

        // Important alerts (error) med brukerdefinert tittel (inkludert lister)
        enhancedContent = enhancedContent.replace(
            /<blockquote><p>(⛔️|🚨|🛑) <strong>(.+?)<\/strong>(.+?)<\/p>([\s\S]*?)<\/blockquote>/g,
            (match, emoji, title, content, restContent) => {
                // Legg til eventuelt restinnhold (lister osv.)
                const fullContent = content + (restContent || '');
                // Sjekk om dette ikke er en standardtittel
                const isCustomTitle = title !== 'Viktig';
                const displayTitle = isCustomTitle ? title : 'Viktig';

                return `
                <div class="alert alert-error">
                    <div class="alert-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        ${displayTitle}
                    </div>
                    <div class="alert-description">${fullContent}</div>
                </div>`;
            }
        );

        // Important alerts (error) med standardtittel (inkludert lister)
        enhancedContent = enhancedContent.replace(
            /<blockquote><p>(⛔️|🚨|🛑)(.+?)<\/p>([\s\S]*?)<\/blockquote>/g,
            (match, emoji, content, restContent) => {
                // Legg til eventuelt restinnhold (lister osv.)
                const fullContent = content + (restContent || '');
                return `
                <div class="alert alert-error">
                    <div class="alert-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        Viktig
                    </div>
                    <div class="alert-description">${fullContent}</div>
                </div>`;
            }
        );

        // Success message alert med brukerdefinert tittel (inkludert lister)
        enhancedContent = enhancedContent.replace(
            /<blockquote><p>(✅|✓|☑️|✔️) <strong>(.+?)<\/strong>(.+?)<\/p>([\s\S]*?)<\/blockquote>/g,
            (match, emoji, title, content, restContent) => {
                // Legg til eventuelt restinnhold (lister osv.)
                const fullContent = content + (restContent || '');
                // Sjekk om dette ikke er en standardtittel
                const isCustomTitle = title !== 'Fullført';
                const displayTitle = isCustomTitle ? title : 'Fullført';

                return `
                <div class="alert alert-success">
                    <div class="alert-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon"><path d="M20 6L9 17l-5-5"></path></svg>
                        ${displayTitle}
                    </div>
                    <div class="alert-description">${fullContent}</div>
                </div>`;
            }
        );

        // Success message alert med standardtittel (inkludert lister)
        enhancedContent = enhancedContent.replace(
            /<blockquote><p>(✅|✓|☑️|✔️)(.+?)<\/p>([\s\S]*?)<\/blockquote>/g,
            (match, emoji, content, restContent) => {
                // Legg til eventuelt restinnhold (lister osv.)
                const fullContent = content + (restContent || '');
                return `
                <div class="alert alert-success">
                    <div class="alert-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon"><path d="M20 6L9 17l-5-5"></path></svg>
                        Fullført
                    </div>
                    <div class="alert-description">${fullContent}</div>
                </div>`;
            }
        );

        // Default alert med brukerdefinert tittel (inkludert lister)
        enhancedContent = enhancedContent.replace(
            /<blockquote><p>💡 <strong>(.+?)<\/strong>(.+?)<\/p>([\s\S]*?)<\/blockquote>/g,
            (match, title, content, restContent) => {
                // Legg til eventuelt restinnhold (lister osv.)
                const fullContent = content + (restContent || '');
                // Sjekk om dette ikke er en standardtittel
                const isCustomTitle = title !== 'Tips';
                const displayTitle = isCustomTitle ? title : 'Tips';

                return `
                <div class="alert alert-default">
                    <div class="alert-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                        ${displayTitle}
                    </div>
                    <div class="alert-description">${fullContent}</div>
                </div>`;
            }
        );

        // Default alert med standardtittel (inkludert lister)
        enhancedContent = enhancedContent.replace(
            /<blockquote><p>💡(.+?)<\/p>([\s\S]*?)<\/blockquote>/g,
            (match, content, restContent) => {
                // Legg til eventuelt restinnhold (lister osv.)
                const fullContent = content + (restContent || '');
                return `
                <div class="alert alert-default">
                    <div class="alert-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                        Tips
                    </div>
                    <div class="alert-description">${fullContent}</div>
                </div>`;
            }
        );

        // Kompatibilitet med gamle blockquotes - behold som de er

        // Forbedre tabeller med shadcn-inspirert stil
        enhancedContent = enhancedContent.replace(
            /<table>/g,
            '<div class="shadcn-table-container"><table>'
        );

        enhancedContent = enhancedContent.replace(
            /<\/table>/g,
            '</table></div>'
        );

        // Andre steg: Behandle kodeblokker med syntax highlighting
        enhancedContent = enhancedContent.replace(
            /<pre class="code-block"><code class="language-(\w+)">([^<]+)<\/code><\/pre>/g,
            (match, language = 'javascript', code) => {
                try {
                    // Decode HTML entities
                    const decodedCode = code.replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'");

                    console.log('Highlighting code:', {
                        language,
                        code: decodedCode
                    });

                    const result = lowlight.highlight(language, decodedCode.trim());
                    const highlightedCode = result.children.map(node => processNode(node)).join('');

                    return `
                        <div class="code-block">
                            <div class="code-block-header">
                                <span class="language-label">${language}</span>
                                <button class="copy-button" onclick="navigator.clipboard.writeText(\`${decodedCode.trim()}\`)">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                    <span>Kopier</span>
                                </button>
                            </div>
                            <pre><code class="hljs language-${language}">${highlightedCode}</code></pre>
                        </div>
                    `;
                } catch (error) {
                    console.error('Feil ved syntax highlighting:', error);
                    console.error('Error details:', error.message);
                    return match; // Return original if highlighting fails
                }
            }
        );

        return enhancedContent;
    };

    return (
        <div
            dangerouslySetInnerHTML={{
                __html: enhanceCodeBlocks(rule.content)
            }}
            className="drawing-rule-content"
        />
    );
};

export default RuleViewer; 