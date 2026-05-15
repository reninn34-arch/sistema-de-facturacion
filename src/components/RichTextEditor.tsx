import React, { useRef, useEffect, useCallback } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className = '' }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      const sel = saveSelection();
      editorRef.current.innerHTML = value;
      restoreSelection(sel);
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const btnClass = 'px-2 py-1 text-xs font-bold rounded hover:bg-slate-200 text-slate-600 transition-colors';
  const activeClass = 'bg-slate-200 text-slate-900';

  return (
    <div className={`border border-slate-300 rounded-xl overflow-hidden bg-white ${className}`}>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
        <button onClick={() => exec('bold')} className={btnClass} title="Negrita"><b>B</b></button>
        <button onClick={() => exec('italic')} className={btnClass} title="Cursiva"><i>I</i></button>
        <button onClick={() => exec('underline')} className={btnClass} title="Subrayado"><u>U</u></button>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <button onClick={() => exec('formatBlock', '<h2>')} className={btnClass}>H2</button>
        <button onClick={() => exec('formatBlock', '<h3>')} className={btnClass}>H3</button>
        <button onClick={() => exec('formatBlock', '<p>')} className={btnClass}>P</button>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <button onClick={() => exec('insertUnorderedList')} className={btnClass} title="Lista">• Lista</button>
        <button onClick={() => exec('insertOrderedList')} className={btnClass} title="Lista numerada">1. Lista</button>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <button onClick={() => exec('removeFormat')} className={btnClass} title="Limpiar formato">Limpiar</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder || ''}
        className="p-3 min-h-[200px] text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#0057FF] focus:ring-inset rounded-b-xl empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 prose prose-sm max-w-none"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      />
    </div>
  );
};

function saveSelection(): { startContainer: Node | null; startOffset: number; endContainer: Node | null; endOffset: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  return {
    startContainer: range.startContainer,
    startOffset: range.startOffset,
    endContainer: range.endContainer,
    endOffset: range.endOffset,
  };
}

function restoreSelection(saved: ReturnType<typeof saveSelection>) {
  if (!saved || !saved.startContainer) return;
  try {
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(saved.startContainer, saved.startOffset);
    range.setEnd(saved.endContainer!, saved.endOffset);
    sel?.removeAllRanges();
    sel?.addRange(range);
  } catch {}
}

export default RichTextEditor;
