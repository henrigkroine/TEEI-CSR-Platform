/**
 * Narrative Editor Component
 *
 * Rich text editor for executive report narratives.
 * Supports formatting (bold, italic, lists, headings) for board-ready summaries.
 *
 * NOTE: In production, this would use TipTap or Lexical.
 * For now, implements a simplified rich text textarea with markdown preview.
 *
 * @module components/reports/NarrativeEditor
 */

import React, { useState } from 'react';

interface NarrativeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  showWordCount?: boolean;
  showPreview?: boolean;
}

export default function NarrativeEditor({
  value,
  onChange,
  placeholder = 'Write your executive narrative...',
  maxLength = 5000,
  showWordCount = true,
  showPreview = true,
}: NarrativeEditorProps) {
  const [previewMode, setPreviewMode] = useState(false);

  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const charCount = value.length;

  function applyFormat(format: 'bold' | 'italic' | 'heading' | 'bullet' | 'number') {
    // Get cursor position (simplified - in production would use selection API)
    const formats: Record<string, { prefix: string; suffix: string }> = {
      bold: { prefix: '**', suffix: '**' },
      italic: { prefix: '*', suffix: '*' },
      heading: { prefix: '## ', suffix: '' },
      bullet: { prefix: '- ', suffix: '' },
      number: { prefix: '1. ', suffix: '' },
    };

    const { prefix, suffix } = formats[format];
    const newValue = value + prefix + 'text' + suffix;
    onChange(newValue);
  }

  function insertTemplate(template: 'executive' | 'impact' | 'forward') {
    const templates: Record<string, string> = {
      executive: `## Executive Summary

During [period], our organization achieved significant social impact through [key initiatives]. This report highlights our measurable outcomes and demonstrates the return on our social investments.

## Key Highlights

- Achievement 1
- Achievement 2
- Achievement 3`,

      impact: `## Social Impact Achievements

Our programs directly benefited [X] individuals and created [Y] in measurable social value. Key outcomes include:

**Community Engagement**
[Description of community programs and their impact]

**Skills Development**
[Description of training initiatives and outcomes]

**Economic Empowerment**
[Description of economic impact]`,

      forward: `## Looking Forward

Building on our success, we have identified three strategic priorities for the coming period:

1. **Priority 1**: [Description]
2. **Priority 2**: [Description]
3. **Priority 3**: [Description]

We remain committed to creating sustainable, measurable impact in our communities.`,
    };

    onChange(templates[template] || '');
  }

  return (
    <div className="narrative-editor">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-section">
          <button
            onClick={() => applyFormat('bold')}
            className="toolbar-btn"
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => applyFormat('italic')}
            className="toolbar-btn"
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            onClick={() => applyFormat('heading')}
            className="toolbar-btn"
            title="Heading"
          >
            H
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <button
            onClick={() => applyFormat('bullet')}
            className="toolbar-btn"
            title="Bullet List"
          >
            •
          </button>
          <button
            onClick={() => applyFormat('number')}
            className="toolbar-btn"
            title="Numbered List"
          >
            1.
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <select
            onChange={(e) => insertTemplate(e.target.value as any)}
            className="template-select"
            defaultValue=""
          >
            <option value="" disabled>
              Insert Template
            </option>
            <option value="executive">Executive Summary</option>
            <option value="impact">Impact Achievements</option>
            <option value="forward">Looking Forward</option>
          </select>
        </div>

        {showPreview && (
          <>
            <div className="toolbar-divider" />
            <div className="toolbar-section">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`toolbar-btn ${previewMode ? 'active' : ''}`}
                title="Toggle Preview"
              >
                👁 {previewMode ? 'Edit' : 'Preview'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Editor / Preview */}
      {previewMode ? (
        <div className="editor-preview">
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }} />
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="editor-textarea"
        />
      )}

      {/* Footer */}
      <div className="editor-footer">
        {showWordCount && (
          <div className="counts">
            <span>{wordCount} words</span>
            <span className="divider">•</span>
            <span>
              {charCount}/{maxLength} characters
            </span>
          </div>
        )}

        <div className="help-text">
          Supports <strong>markdown</strong>: **bold**, *italic*, ## headings, - bullets
        </div>
      </div>

      <style jsx>{`
        .narrative-editor {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          overflow: hidden;
        }

        .editor-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #f9fafb;
          border-bottom: 1px solid #d1d5db;
          flex-wrap: wrap;
        }

        .toolbar-section {
          display: flex;
          gap: 4px;
        }

        .toolbar-btn {
          width: 32px;
          height: 32px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toolbar-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .toolbar-btn.active {
          background: #3b82f6;
          color: white;
          border-color: #2563eb;
        }

        .toolbar-divider {
          width: 1px;
          height: 24px;
          background: #d1d5db;
        }

        .template-select {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: white;
          font-size: 14px;
          cursor: pointer;
        }

        .template-select:hover {
          border-color: #9ca3af;
        }

        .editor-textarea {
          width: 100%;
          min-height: 400px;
          padding: 20px;
          border: none;
          font-family: inherit;
          font-size: 16px;
          line-height: 1.6;
          resize: vertical;
        }

        .editor-textarea:focus {
          outline: none;
        }

        .editor-preview {
          min-height: 400px;
          padding: 20px;
          font-size: 16px;
          line-height: 1.6;
          color: #374151;
        }

        .editor-preview :global(h1) {
          font-size: 2rem;
          font-weight: 700;
          margin: 24px 0 16px;
        }

        .editor-preview :global(h2) {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 20px 0 12px;
        }

        .editor-preview :global(h3) {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 16px 0 8px;
        }

        .editor-preview :global(p) {
          margin: 12px 0;
        }

        .editor-preview :global(ul),
        .editor-preview :global(ol) {
          margin: 12px 0;
          padding-left: 24px;
        }

        .editor-preview :global(li) {
          margin: 6px 0;
        }

        .editor-preview :global(strong) {
          font-weight: 700;
          color: #111827;
        }

        .editor-preview :global(em) {
          font-style: italic;
        }

        .editor-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f9fafb;
          border-top: 1px solid #d1d5db;
        }

        .counts {
          display: flex;
          gap: 8px;
          font-size: 14px;
          color: #6b7280;
        }

        .counts .divider {
          color: #d1d5db;
        }

        .help-text {
          font-size: 13px;
          color: #9ca3af;
        }

        .help-text strong {
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .editor-toolbar {
            padding: 8px;
          }

          .toolbar-btn {
            width: 28px;
            height: 28px;
            font-size: 12px;
          }

          .editor-footer {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Simple markdown renderer
 * (In production, use a proper markdown library like marked or remark)
 */
function renderMarkdown(text: string): string {
  let html = text;

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Bullet lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs
  html = html.replace(/^(?!<[hul]|<li)(.+)$/gm, '<p>$1</p>');

  return html;
}

/**
 * Export narrative to plain text
 */
export function exportNarrativeText(narrative: string): string {
  // Strip markdown formatting
  return narrative
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/^#{1,6} /gm, '') // Remove headings
    .replace(/^[-*] /gm, '') // Remove bullets
    .replace(/^\d+\. /gm, '') // Remove numbers
    .trim();
}

/**
 * Count words in narrative
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Validate narrative length
 */
export function validateNarrative(
  text: string,
  minWords: number = 50,
  maxWords: number = 1000
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const wordCount = countWords(text);

  if (wordCount < minWords) {
    errors.push(`Narrative too short (${wordCount} words, minimum ${minWords})`);
  }

  if (wordCount > maxWords) {
    errors.push(`Narrative too long (${wordCount} words, maximum ${maxWords})`);
  }

  if (!text.trim()) {
    errors.push('Narrative cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
