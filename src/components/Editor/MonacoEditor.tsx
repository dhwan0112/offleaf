import { useRef, useEffect, useCallback } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { useFileStore } from '@/stores/fileStore';

// LaTeX language configuration
const LATEX_LANGUAGE_ID = 'latex';

const registerLatexLanguage = (monaco: Monaco) => {
  // Check if already registered
  if (monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === LATEX_LANGUAGE_ID)) {
    return;
  }

  // Register LaTeX language
  monaco.languages.register({ id: LATEX_LANGUAGE_ID, extensions: ['.tex', '.sty', '.cls'] });

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

  // LaTeX completions
  monaco.languages.registerCompletionItemProvider(LATEX_LANGUAGE_ID, {
    triggerCharacters: ['\\'],
    provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn - 1,
        endColumn: word.endColumn,
      };

      const suggestions = [
        // Document structure
        { label: '\\documentclass', insertText: 'documentclass[${1:12pt}]{${2:article}}', detail: 'Document class' },
        { label: '\\usepackage', insertText: 'usepackage{${1:package}}', detail: 'Use package' },
        { label: '\\begin', insertText: 'begin{${1:environment}}\n\t$0\n\\end{${1:environment}}', detail: 'Begin environment' },
        { label: '\\section', insertText: 'section{${1:title}}', detail: 'Section' },
        { label: '\\subsection', insertText: 'subsection{${1:title}}', detail: 'Subsection' },

        // Text formatting
        { label: '\\textbf', insertText: 'textbf{${1:text}}', detail: 'Bold text' },
        { label: '\\textit', insertText: 'textit{${1:text}}', detail: 'Italic text' },
        { label: '\\emph', insertText: 'emph{${1:text}}', detail: 'Emphasized text' },
        { label: '\\underline', insertText: 'underline{${1:text}}', detail: 'Underlined text' },

        // Math
        { label: '\\frac', insertText: 'frac{${1:num}}{${2:denom}}', detail: 'Fraction' },
        { label: '\\sqrt', insertText: 'sqrt{${1:x}}', detail: 'Square root' },
        { label: '\\sum', insertText: 'sum_{${1:i=1}}^{${2:n}}', detail: 'Sum' },
        { label: '\\int', insertText: 'int_{${1:a}}^{${2:b}}', detail: 'Integral' },
        { label: '\\lim', insertText: 'lim_{${1:x \\to \\infty}}', detail: 'Limit' },

        // References
        { label: '\\label', insertText: 'label{${1:label}}', detail: 'Label' },
        { label: '\\ref', insertText: 'ref{${1:label}}', detail: 'Reference' },
        { label: '\\cite', insertText: 'cite{${1:key}}', detail: 'Citation' },

        // Figures
        { label: '\\includegraphics', insertText: 'includegraphics[width=${1:\\textwidth}]{${2:filename}}', detail: 'Include graphics' },
        { label: '\\caption', insertText: 'caption{${1:caption}}', detail: 'Caption' },

        // Greek letters
        { label: '\\alpha', insertText: 'alpha', detail: 'Greek alpha' },
        { label: '\\beta', insertText: 'beta', detail: 'Greek beta' },
        { label: '\\gamma', insertText: 'gamma', detail: 'Greek gamma' },
        { label: '\\delta', insertText: 'delta', detail: 'Greek delta' },
        { label: '\\epsilon', insertText: 'epsilon', detail: 'Greek epsilon' },
        { label: '\\pi', insertText: 'pi', detail: 'Greek pi' },
        { label: '\\sigma', insertText: 'sigma', detail: 'Greek sigma' },
        { label: '\\omega', insertText: 'omega', detail: 'Greek omega' },
      ].map((item) => ({
        ...item,
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      }));

      return { suggestions };
    },
  });
};

interface MonacoEditorProps {
  onCompile?: () => void;
}

export function MonacoEditor({ onCompile }: MonacoEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const currentFile = useFileStore((s) => s.getCurrentFile());
  const currentProjectId = useFileStore((s) => s.currentProjectId);
  const updateFileContent = useFileStore((s) => s.updateFileContent);

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
    <Editor
      height="100%"
      defaultLanguage={LATEX_LANGUAGE_ID}
      value={currentFile.content || ''}
      theme="vs-dark"
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
  );
}
