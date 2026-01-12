import type * as Monaco from 'monaco-editor';

// LaTeX command completions
export const latexCommands = [
  // Document structure
  { label: '\\documentclass', insertText: '\\documentclass{${1:article}}', detail: 'Document class' },
  { label: '\\usepackage', insertText: '\\usepackage{${1:package}}', detail: 'Import package' },
  { label: '\\begin', insertText: '\\begin{${1:environment}}\n\t$0\n\\end{${1:environment}}', detail: 'Begin environment' },
  { label: '\\end', insertText: '\\end{${1:environment}}', detail: 'End environment' },
  { label: '\\title', insertText: '\\title{${1:title}}', detail: 'Document title' },
  { label: '\\author', insertText: '\\author{${1:author}}', detail: 'Document author' },
  { label: '\\date', insertText: '\\date{${1:\\today}}', detail: 'Document date' },
  { label: '\\maketitle', insertText: '\\maketitle', detail: 'Print title' },

  // Sections
  { label: '\\section', insertText: '\\section{${1:title}}', detail: 'Section' },
  { label: '\\subsection', insertText: '\\subsection{${1:title}}', detail: 'Subsection' },
  { label: '\\subsubsection', insertText: '\\subsubsection{${1:title}}', detail: 'Subsubsection' },
  { label: '\\chapter', insertText: '\\chapter{${1:title}}', detail: 'Chapter' },
  { label: '\\paragraph', insertText: '\\paragraph{${1:title}}', detail: 'Paragraph' },

  // Text formatting
  { label: '\\textbf', insertText: '\\textbf{${1:text}}', detail: 'Bold text' },
  { label: '\\textit', insertText: '\\textit{${1:text}}', detail: 'Italic text' },
  { label: '\\underline', insertText: '\\underline{${1:text}}', detail: 'Underlined text' },
  { label: '\\emph', insertText: '\\emph{${1:text}}', detail: 'Emphasized text' },
  { label: '\\texttt', insertText: '\\texttt{${1:text}}', detail: 'Monospace text' },
  { label: '\\textsc', insertText: '\\textsc{${1:text}}', detail: 'Small caps' },

  // Math
  { label: '\\frac', insertText: '\\frac{${1:num}}{${2:den}}', detail: 'Fraction' },
  { label: '\\sqrt', insertText: '\\sqrt{${1:x}}', detail: 'Square root' },
  { label: '\\sum', insertText: '\\sum_{${1:i=1}}^{${2:n}}', detail: 'Summation' },
  { label: '\\int', insertText: '\\int_{${1:a}}^{${2:b}}', detail: 'Integral' },
  { label: '\\lim', insertText: '\\lim_{${1:x \\to \\infty}}', detail: 'Limit' },
  { label: '\\infty', insertText: '\\infty', detail: 'Infinity' },
  { label: '\\alpha', insertText: '\\alpha', detail: 'Greek alpha' },
  { label: '\\beta', insertText: '\\beta', detail: 'Greek beta' },
  { label: '\\gamma', insertText: '\\gamma', detail: 'Greek gamma' },
  { label: '\\delta', insertText: '\\delta', detail: 'Greek delta' },
  { label: '\\epsilon', insertText: '\\epsilon', detail: 'Greek epsilon' },
  { label: '\\theta', insertText: '\\theta', detail: 'Greek theta' },
  { label: '\\lambda', insertText: '\\lambda', detail: 'Greek lambda' },
  { label: '\\mu', insertText: '\\mu', detail: 'Greek mu' },
  { label: '\\pi', insertText: '\\pi', detail: 'Greek pi' },
  { label: '\\sigma', insertText: '\\sigma', detail: 'Greek sigma' },
  { label: '\\omega', insertText: '\\omega', detail: 'Greek omega' },
  { label: '\\partial', insertText: '\\partial', detail: 'Partial derivative' },
  { label: '\\nabla', insertText: '\\nabla', detail: 'Nabla/Del' },
  { label: '\\times', insertText: '\\times', detail: 'Multiplication' },
  { label: '\\cdot', insertText: '\\cdot', detail: 'Dot product' },
  { label: '\\leq', insertText: '\\leq', detail: 'Less or equal' },
  { label: '\\geq', insertText: '\\geq', detail: 'Greater or equal' },
  { label: '\\neq', insertText: '\\neq', detail: 'Not equal' },
  { label: '\\approx', insertText: '\\approx', detail: 'Approximately' },
  { label: '\\equiv', insertText: '\\equiv', detail: 'Equivalent' },
  { label: '\\rightarrow', insertText: '\\rightarrow', detail: 'Right arrow' },
  { label: '\\leftarrow', insertText: '\\leftarrow', detail: 'Left arrow' },
  { label: '\\Rightarrow', insertText: '\\Rightarrow', detail: 'Double right arrow' },
  { label: '\\Leftarrow', insertText: '\\Leftarrow', detail: 'Double left arrow' },
  { label: '\\forall', insertText: '\\forall', detail: 'For all' },
  { label: '\\exists', insertText: '\\exists', detail: 'Exists' },
  { label: '\\in', insertText: '\\in', detail: 'In set' },
  { label: '\\notin', insertText: '\\notin', detail: 'Not in set' },
  { label: '\\subset', insertText: '\\subset', detail: 'Subset' },
  { label: '\\subseteq', insertText: '\\subseteq', detail: 'Subset or equal' },
  { label: '\\cup', insertText: '\\cup', detail: 'Union' },
  { label: '\\cap', insertText: '\\cap', detail: 'Intersection' },
  { label: '\\mathbb', insertText: '\\mathbb{${1:R}}', detail: 'Blackboard bold' },
  { label: '\\mathcal', insertText: '\\mathcal{${1:L}}', detail: 'Calligraphic' },
  { label: '\\mathbf', insertText: '\\mathbf{${1:x}}', detail: 'Bold math' },
  { label: '\\mathrm', insertText: '\\mathrm{${1:text}}', detail: 'Roman math' },
  { label: '\\left', insertText: '\\left${1:(}', detail: 'Left delimiter' },
  { label: '\\right', insertText: '\\right${1:)}', detail: 'Right delimiter' },
  { label: '\\binom', insertText: '\\binom{${1:n}}{${2:k}}', detail: 'Binomial coefficient' },
  { label: '\\prod', insertText: '\\prod_{${1:i=1}}^{${2:n}}', detail: 'Product' },

  // References
  { label: '\\label', insertText: '\\label{${1:label}}', detail: 'Create label' },
  { label: '\\ref', insertText: '\\ref{${1:label}}', detail: 'Reference' },
  { label: '\\eqref', insertText: '\\eqref{${1:label}}', detail: 'Equation reference' },
  { label: '\\cite', insertText: '\\cite{${1:key}}', detail: 'Citation' },
  { label: '\\bibliography', insertText: '\\bibliography{${1:bibfile}}', detail: 'Bibliography file' },
  { label: '\\bibliographystyle', insertText: '\\bibliographystyle{${1:plain}}', detail: 'Bibliography style' },

  // Figures and tables
  { label: '\\includegraphics', insertText: '\\includegraphics[width=${1:0.8}\\textwidth]{${2:image}}', detail: 'Include image' },
  { label: '\\caption', insertText: '\\caption{${1:caption}}', detail: 'Caption' },
  { label: '\\centering', insertText: '\\centering', detail: 'Center content' },
  { label: '\\hline', insertText: '\\hline', detail: 'Horizontal line' },
  { label: '\\multicolumn', insertText: '\\multicolumn{${1:cols}}{${2:align}}{${3:text}}', detail: 'Multi-column cell' },
  { label: '\\multirow', insertText: '\\multirow{${1:rows}}{${2:width}}{${3:text}}', detail: 'Multi-row cell' },

  // Lists
  { label: '\\item', insertText: '\\item ${1:text}', detail: 'List item' },

  // Spacing
  { label: '\\vspace', insertText: '\\vspace{${1:1em}}', detail: 'Vertical space' },
  { label: '\\hspace', insertText: '\\hspace{${1:1em}}', detail: 'Horizontal space' },
  { label: '\\newline', insertText: '\\newline', detail: 'New line' },
  { label: '\\newpage', insertText: '\\newpage', detail: 'New page' },
  { label: '\\clearpage', insertText: '\\clearpage', detail: 'Clear page' },
  { label: '\\noindent', insertText: '\\noindent', detail: 'No indent' },

  // Footnotes
  { label: '\\footnote', insertText: '\\footnote{${1:text}}', detail: 'Footnote' },

  // Colors (xcolor)
  { label: '\\textcolor', insertText: '\\textcolor{${1:color}}{${2:text}}', detail: 'Colored text' },
  { label: '\\colorbox', insertText: '\\colorbox{${1:color}}{${2:text}}', detail: 'Colored box' },

  // Hyperlinks (hyperref)
  { label: '\\href', insertText: '\\href{${1:url}}{${2:text}}', detail: 'Hyperlink' },
  { label: '\\url', insertText: '\\url{${1:url}}', detail: 'URL' },

  // Code listings
  { label: '\\lstinline', insertText: '\\lstinline|${1:code}|', detail: 'Inline code' },
  { label: '\\verb', insertText: '\\verb|${1:code}|', detail: 'Verbatim inline' },
];

// LaTeX environment completions
export const latexEnvironments = [
  { label: 'document', insertText: 'document', detail: 'Main document' },
  { label: 'equation', insertText: 'equation', detail: 'Numbered equation' },
  { label: 'equation*', insertText: 'equation*', detail: 'Unnumbered equation' },
  { label: 'align', insertText: 'align', detail: 'Aligned equations' },
  { label: 'align*', insertText: 'align*', detail: 'Aligned equations (unnumbered)' },
  { label: 'gather', insertText: 'gather', detail: 'Gathered equations' },
  { label: 'multline', insertText: 'multline', detail: 'Multi-line equation' },
  { label: 'figure', insertText: 'figure', detail: 'Figure environment' },
  { label: 'table', insertText: 'table', detail: 'Table environment' },
  { label: 'tabular', insertText: 'tabular', detail: 'Tabular data' },
  { label: 'itemize', insertText: 'itemize', detail: 'Bulleted list' },
  { label: 'enumerate', insertText: 'enumerate', detail: 'Numbered list' },
  { label: 'description', insertText: 'description', detail: 'Description list' },
  { label: 'abstract', insertText: 'abstract', detail: 'Abstract' },
  { label: 'quote', insertText: 'quote', detail: 'Quote block' },
  { label: 'quotation', insertText: 'quotation', detail: 'Quotation block' },
  { label: 'verbatim', insertText: 'verbatim', detail: 'Verbatim text' },
  { label: 'lstlisting', insertText: 'lstlisting', detail: 'Code listing' },
  { label: 'center', insertText: 'center', detail: 'Centered content' },
  { label: 'flushleft', insertText: 'flushleft', detail: 'Left-aligned content' },
  { label: 'flushright', insertText: 'flushright', detail: 'Right-aligned content' },
  { label: 'minipage', insertText: 'minipage', detail: 'Mini page' },
  { label: 'tikzpicture', insertText: 'tikzpicture', detail: 'TikZ picture' },
  { label: 'matrix', insertText: 'matrix', detail: 'Matrix' },
  { label: 'pmatrix', insertText: 'pmatrix', detail: 'Matrix with parentheses' },
  { label: 'bmatrix', insertText: 'bmatrix', detail: 'Matrix with brackets' },
  { label: 'vmatrix', insertText: 'vmatrix', detail: 'Matrix with vertical bars' },
  { label: 'cases', insertText: 'cases', detail: 'Cases' },
  { label: 'proof', insertText: 'proof', detail: 'Proof' },
  { label: 'theorem', insertText: 'theorem', detail: 'Theorem' },
  { label: 'lemma', insertText: 'lemma', detail: 'Lemma' },
  { label: 'corollary', insertText: 'corollary', detail: 'Corollary' },
  { label: 'definition', insertText: 'definition', detail: 'Definition' },
  { label: 'example', insertText: 'example', detail: 'Example' },
  { label: 'remark', insertText: 'remark', detail: 'Remark' },
];

// Common packages
export const latexPackages = [
  { label: 'amsmath', detail: 'AMS math extensions' },
  { label: 'amssymb', detail: 'AMS symbols' },
  { label: 'amsfonts', detail: 'AMS fonts' },
  { label: 'mathtools', detail: 'Math tools extension' },
  { label: 'graphicx', detail: 'Graphics support' },
  { label: 'xcolor', detail: 'Color support' },
  { label: 'hyperref', detail: 'Hyperlinks' },
  { label: 'geometry', detail: 'Page geometry' },
  { label: 'fancyhdr', detail: 'Fancy headers/footers' },
  { label: 'booktabs', detail: 'Professional tables' },
  { label: 'array', detail: 'Extended arrays' },
  { label: 'tabularx', detail: 'Extended tabular' },
  { label: 'longtable', detail: 'Multi-page tables' },
  { label: 'listings', detail: 'Code listings' },
  { label: 'tikz', detail: 'TikZ graphics' },
  { label: 'pgfplots', detail: 'Plots with PGF' },
  { label: 'biblatex', detail: 'Bibliography' },
  { label: 'natbib', detail: 'Natural bibliography' },
  { label: 'enumitem', detail: 'List customization' },
  { label: 'caption', detail: 'Caption customization' },
  { label: 'float', detail: 'Float control' },
  { label: 'subcaption', detail: 'Sub-figures' },
  { label: 'fontspec', detail: 'Font selection (XeLaTeX)' },
  { label: 'kotex', detail: 'Korean support' },
  { label: 'xecjk', detail: 'CJK support (XeLaTeX)' },
  { label: 'inputenc', detail: 'Input encoding' },
  { label: 'fontenc', detail: 'Font encoding' },
  { label: 'babel', detail: 'Multilingual support' },
  { label: 'csquotes', detail: 'Context-sensitive quotes' },
  { label: 'microtype', detail: 'Microtypography' },
  { label: 'setspace', detail: 'Line spacing' },
  { label: 'parskip', detail: 'Paragraph spacing' },
  { label: 'titlesec', detail: 'Section formatting' },
  { label: 'tocloft', detail: 'TOC formatting' },
  { label: 'algorithm2e', detail: 'Algorithms' },
  { label: 'algorithmic', detail: 'Algorithmic typesetting' },
  { label: 'cleveref', detail: 'Clever references' },
  { label: 'siunitx', detail: 'SI units' },
  { label: 'physics', detail: 'Physics notation' },
  { label: 'cancel', detail: 'Cancel terms in math' },
];

// Document classes
export const documentClasses = [
  { label: 'article', detail: 'Standard article' },
  { label: 'report', detail: 'Longer reports' },
  { label: 'book', detail: 'Books' },
  { label: 'letter', detail: 'Letters' },
  { label: 'beamer', detail: 'Presentations' },
  { label: 'memoir', detail: 'Flexible book/article' },
  { label: 'standalone', detail: 'Standalone figures' },
  { label: 'minimal', detail: 'Minimal document' },
  { label: 'oblivoir', detail: 'Korean article (ko.TeX)' },
  { label: 'kotex-article', detail: 'Korean article' },
];

export function registerLatexCompletionProvider(monaco: typeof Monaco): Monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider('latex', {
    triggerCharacters: ['\\', '{', '['],

    provideCompletionItems(model, position) {
      const lineContent = model.getLineContent(position.lineNumber);
      const textUntilPosition = lineContent.substring(0, position.column - 1);

      const word = model.getWordUntilPosition(position);
      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: Monaco.languages.CompletionItem[] = [];

      // Check for \begin{ context - suggest environments
      if (/\\begin\{[^}]*$/.test(textUntilPosition)) {
        for (const env of latexEnvironments) {
          suggestions.push({
            label: env.label,
            kind: monaco.languages.CompletionItemKind.Module,
            insertText: env.insertText,
            detail: env.detail,
            range,
          });
        }
        return { suggestions };
      }

      // Check for \end{ context - suggest environments
      if (/\\end\{[^}]*$/.test(textUntilPosition)) {
        for (const env of latexEnvironments) {
          suggestions.push({
            label: env.label,
            kind: monaco.languages.CompletionItemKind.Module,
            insertText: env.insertText,
            detail: env.detail,
            range,
          });
        }
        return { suggestions };
      }

      // Check for \usepackage{ context - suggest packages
      if (/\\usepackage(\[[^\]]*\])?\{[^}]*$/.test(textUntilPosition)) {
        for (const pkg of latexPackages) {
          suggestions.push({
            label: pkg.label,
            kind: monaco.languages.CompletionItemKind.Module,
            insertText: pkg.label,
            detail: pkg.detail,
            range,
          });
        }
        return { suggestions };
      }

      // Check for \documentclass{ context - suggest classes
      if (/\\documentclass(\[[^\]]*\])?\{[^}]*$/.test(textUntilPosition)) {
        for (const cls of documentClasses) {
          suggestions.push({
            label: cls.label,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: cls.label,
            detail: cls.detail,
            range,
          });
        }
        return { suggestions };
      }

      // Check for backslash - suggest commands
      if (textUntilPosition.endsWith('\\') || /\\[a-zA-Z]*$/.test(textUntilPosition)) {
        // Adjust range to include the backslash
        const backslashMatch = textUntilPosition.match(/\\[a-zA-Z]*$/);
        if (backslashMatch) {
          const startCol = position.column - backslashMatch[0].length;
          const cmdRange: Monaco.IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: startCol,
            endColumn: position.column,
          };

          for (const cmd of latexCommands) {
            suggestions.push({
              label: cmd.label,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: cmd.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: cmd.detail,
              range: cmdRange,
            });
          }
        }
      }

      return { suggestions };
    },
  });
}
