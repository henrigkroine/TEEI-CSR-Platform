import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReportSection } from '../../types/reports';

interface ReportEditorProps {
  section: ReportSection;
  onChange: (section: ReportSection) => void;
  onSave?: () => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export default function ReportEditor({
  section,
  onChange,
  onSave,
  autoSave = true,
  autoSaveDelay = 2000,
}: ReportEditorProps) {
  const [content, setContent] = useState(section.content);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [history, setHistory] = useState<string[]>([section.content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  // Word and character count
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  // Auto-save logic
  useEffect(() => {
    if (!autoSave || !isDirty) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave();
    }, autoSaveDelay);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content, isDirty, autoSave, autoSaveDelay]);

  const handleSave = useCallback(() => {
    const updatedSection = {
      ...section,
      content: content,
    };
    onChange(updatedSection);
    setIsDirty(false);
    setLastSaved(new Date());
    if (onSave) {
      onSave();
    }
  }, [content, section, onChange, onSave]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setIsDirty(true);

    // Add to history (limit to 50 entries)
    const newHistory = [...history.slice(0, historyIndex + 1), newContent];
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
      setIsDirty(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
      setIsDirty(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    }
    // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
    if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
      e.preventDefault();
      handleRedo();
    }
    // Ctrl/Cmd + S for manual save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const applyFormat = (format: 'bold' | 'italic' | 'underline') => {
    document.execCommand(format, false);
    const newContent = editorRef.current?.innerText || content;
    handleContentChange(newContent);
  };

  const insertList = (ordered: boolean) => {
    document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList', false);
    const newContent = editorRef.current?.innerText || content;
    handleContentChange(newContent);
  };

  const formatLastSaved = (date: Date | null) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="report-editor border border-border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="editor-toolbar flex items-center gap-2 px-4 py-3 bg-border/10 border-b border-border
                    flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => applyFormat('bold')}
            className="toolbar-btn"
            title="Bold (Ctrl+B)"
            type="button"
          >
            <strong className="text-sm">B</strong>
          </button>
          <button
            onClick={() => applyFormat('italic')}
            className="toolbar-btn"
            title="Italic (Ctrl+I)"
            type="button"
          >
            <em className="text-sm">I</em>
          </button>
          <button
            onClick={() => applyFormat('underline')}
            className="toolbar-btn"
            title="Underline (Ctrl+U)"
            type="button"
          >
            <span className="text-sm underline">U</span>
          </button>
        </div>

        <div className="w-px h-6 bg-border" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => insertList(false)}
            className="toolbar-btn"
            title="Bullet List"
            type="button"
          >
            <span className="text-sm">•</span>
          </button>
          <button
            onClick={() => insertList(true)}
            className="toolbar-btn"
            title="Numbered List"
            type="button"
          >
            <span className="text-sm">1.</span>
          </button>
        </div>

        <div className="w-px h-6 bg-border" />

        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className="toolbar-btn"
            title="Undo (Ctrl+Z)"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1}
            className="toolbar-btn"
            title="Redo (Ctrl+Shift+Z)"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>

        <div className="flex-1" />

        {/* Status */}
        <div className="flex items-center gap-3 text-xs text-foreground/60">
          <span className="flex items-center gap-1">
            {isDirty ? (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                Unsaved changes
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Saved {formatLastSaved(lastSaved)}
              </>
            )}
          </span>
          {!autoSave && (
            <button
              onClick={handleSave}
              className="text-primary hover:text-primary/80 font-medium"
              type="button"
            >
              Save Now
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => handleContentChange(e.currentTarget.innerText)}
        onKeyDown={handleKeyDown}
        className="editor-content min-h-[300px] p-6 focus:outline-none focus:ring-2 focus:ring-primary/20
                 prose prose-sm max-w-none"
        role="textbox"
        aria-label={`Edit ${section.title} section`}
        aria-multiline="true"
      >
        {content}
      </div>

      {/* Footer */}
      <div className="editor-footer flex items-center justify-between px-4 py-3 bg-border/10 
                    border-t border-border text-xs text-foreground/60">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span className="text-foreground/40">•</span>
          <span>{charCount} characters</span>
        </div>
        <div className="text-foreground/40">
          Supports basic formatting: bold, italic, lists
        </div>
      </div>

      <style jsx>{`
        .toolbar-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid var(--color-border);
          background: var(--color-background);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toolbar-btn:hover:not(:disabled) {
          background: var(--color-border);
          border-color: var(--color-primary);
        }

        .toolbar-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .editor-content:focus {
          outline: none;
        }

        /* Preserve citation markers */
        .editor-content :global([data-citation]) {
          color: var(--color-primary);
          text-decoration: underline;
          cursor: help;
        }
      `}</style>
    </div>
  );
}

/**
 * Preserve citations in contenteditable
 */
export function preserveCitations(content: string): string {
  return content.replace(/\[citation:([^\]]+)\]/g, 
    '<span data-citation="$1" class="citation-marker">[citation:$1]</span>'
  );
}

/**
 * Extract citations from edited content
 */
export function extractCitations(html: string): string[] {
  const citationRegex = /data-citation="([^"]+)"/g;
  const citations: string[] = [];
  let match;
  while ((match = citationRegex.exec(html)) !== null) {
    citations.push(match[1]);
  }
  return citations;
}
