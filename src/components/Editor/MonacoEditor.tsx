import { useRef, useEffect, useCallback, useState } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { useFileStore } from '@/stores/fileStore';
import { useEditorStore } from '@/stores/editorStore';
import { registerLatexCompletionProvider } from '@/lib/latex/completions';
import { MathPreview } from './MathPreview';

// LaTeX language configuration
const LATEX_LANGUAGE_ID = 'latex';

const registerLatexLanguage = (monaco: Monaco) => {
  // Check if already registered
  if (monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === LATEX_LANGUAGE_ID)) {
    return;
  }

  // Register LaTeX language
  monaco.languages.register({ id: LATEX_LANGUAGE_ID, extensions: ['.tex', '.sty', '.cls', '.bib'] });

  // LaTeX syntax highlighting
  monaco.languages.setMonarchTokensProvider(LATEX_LANGUAGE_ID, {
    defaultToken: '',
    tokenPostfix: '.tex',

    brackets: [
      { open: '{', close: '}', token: 'delimiter.curly' },
      { open: '[', close: ']', token: 'delimiter.square' },
      { open: '(', close: ')', token: 'delimiter.parenthesis' },
    ],

    keywords: [
      'begin', 'end', 'documentclass', 'usepackage', 'newcommand', 'renewcommand',
      'title', 'author', 'date', 'maketitle', 'section', 'subsection', 'subsubsection',
      'paragraph', 'chapter', 'part', 'tableofcontents', 'listoffigures', 'listoftables',
      'include', 'input', 'bibliography', 'bibliographystyle',
      'label', 'ref', 'pageref', 'cite', 'footnote',
      'textbf', 'textit', 'texttt', 'emph', 'underline',
      'centering', 'raggedright', 'raggedleft',
      'newpage', 'clearpage', 'newline', 'linebreak',
      'hspace', 'vspace', 'hfill', 'vfill',
      'caption', 'includegraphics',
      'item', 'setlength', 'renewenvironment', 'newenvironment',
    ],

    environments: [
      'document', 'abstract', 'figure', 'table', 'equation', 'align',
      'itemize', 'enumerate', 'description', 'quote', 'quotation', 'verse',
      'center', 'flushleft', 'flushright',
      'tabular', 'array', 'matrix', 'pmatrix', 'bmatrix', 'vmatrix',
      'theorem', 'lemma', 'proof', 'definition', 'example', 'remark',
      'verbatim', 'lstlisting', 'minipage', 'frame',
    ],

    tokenizer: {
      root: [
        // Comments
        [/%.*$/, 'comment'],

        // Math mode
        [/\$\$/, { token: 'keyword.math', bracket: '@open', next: '@mathDisplay' }],
        [/\$/, { token: 'keyword.math', bracket: '@open', next: '@mathInline' }],
        [/\\\[/, { token: 'keyword.math', bracket: '@open', next: '@mathDisplay' }],
        [/\\\(/, { token: 'keyword.math', bracket: '@open', next: '@mathInline' }],

        // Commands
        [/\\begin\{([^}]+)\}/, 'keyword.environment'],
        [/\\end\{([^}]+)\}/, 'keyword.environment'],
        [/\\[a-zA-Z@]+\*?/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'tag',
          },
        }],

        // Arguments
        [/\{/, { token: 'delimiter.curly', bracket: '@open' }],
        [/\}/, { token: 'delimiter.curly', bracket: '@close' }],
        [/\[/, { token: 'delimiter.square', bracket: '@open' }],
        [/\]/, { token: 'delimiter.square', bracket: '@close' }],

        // Special characters
        [/[&~]/, 'keyword.operator'],
        [/\\\\/, 'keyword.operator'],
      ],

      mathInline: [
        [/\$/, { token: 'keyword.math', bracket: '@close', next: '@pop' }],
        [/\\[a-zA-Z]+/, 'keyword.math'],
        [/[^$\\]+/, 'string.math'],
      ],

      mathDisplay: [
        [/\$\$/, { token: 'keyword.math', bracket: '@close', next: '@pop' }],
        [/\\\]/, { token: 'keyword.math', bracket: '@close', next: '@pop' }],
        [/\\[a-zA-Z]+/, 'keyword.math'],
        [/[^$\\\]]+/, 'string.math'],
      ],
    },
  });

  // LaTeX language configuration for auto-closing
  monaco.languages.setLanguageConfiguration(LATEX_LANGUAGE_ID, {
    comments: {
      lineComment: '%',
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '$', close: '$' },
      { open: '`', close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '$', close: '$' },
    ],
  });

  // Register comprehensive LaTeX completions
  registerLatexCompletionProvider(monaco);
};

interface MonacoEditorProps {
  onCompile?: () => void;
}

export function MonacoEditor({ onCompile }: MonacoEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const currentFile = useFileStore((s) => s.getCurrentFile());
  const currentProjectId = useFileStore((s) => s.currentProjectId);
  const updateFileContent = useFileStore((s) => s.updateFileContent);
  const targetLine = useEditorStore((s) => s.targetLine);
  const clearTargetLine = useEditorStore((s) => s.clearTargetLine);
  const theme = useEditorStore((s) => s.theme);

  const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    registerLatexLanguage(monaco);

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Save is automatic, but trigger compile
      onCompile?.();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onCompile?.();
    });

    // Track cursor position for math preview
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    // Focus editor
    editor.focus();
  }, [onCompile]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (currentProjectId && currentFile && value !== undefined) {
      updateFileContent(currentProjectId, currentFile.id, value);
    }
  }, [currentProjectId, currentFile, updateFileContent]);

  // Update editor content when file changes
  useEffect(() => {
    if (editorRef.current && currentFile?.content !== undefined) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== currentFile.content) {
        editorRef.current.setValue(currentFile.content);
      }
    }
  }, [currentFile?.id]);

  // Navigate to target line when set
  useEffect(() => {
    if (editorRef.current && targetLine !== null && targetLine > 0) {
      editorRef.current.revealLineInCenter(targetLine);
      editorRef.current.setPosition({ lineNumber: targetLine, column: 1 });
      editorRef.current.focus();
      clearTargetLine();
    }
  }, [targetLine, clearTargetLine]);

  if (!currentFile) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg">No file selected</p>
          <p className="text-sm mt-2">Select a file from the sidebar or create a new project</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <Editor
        height="100%"
        defaultLanguage={LATEX_LANGUAGE_ID}
        value={currentFile.content || ''}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          lineNumbers: 'on',
          minimap: { enabled: true, scale: 1 },
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          tabSize: 2,
          insertSpaces: true,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          folding: true,
          foldingStrategy: 'indentation',
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
        }}
      />
      <MathPreview
        content={currentFile.content || ''}
        cursorLine={cursorPosition.line}
        cursorColumn={cursorPosition.column}
      />
    </div>
  );
}
