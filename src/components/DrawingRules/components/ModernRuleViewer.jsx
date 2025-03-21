import React from 'react';
import { Card, CardContent } from '../../ui/card';
import { createLowlight } from 'lowlight';
import 'highlight.js/styles/atom-one-dark.css';
import '../viewer/styles/viewer.css';

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

const ModernRuleViewer = ({ rule }) => {
  if (!rule) return null;

  const enhanceCodeBlocks = (content) => {
    if (!content) return content;

    // Match TipTap's code block format with code-block class
    return content.replace(
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
  };

  return (
    <div id="shadcn-ui">
      <Card className="prose max-w-none p-6 shadow-sm">
        <CardContent className="p-0">
          <div
            dangerouslySetInnerHTML={{
              __html: enhanceCodeBlocks(rule.content)
            }}
            className="drawing-rule-content"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ModernRuleViewer;