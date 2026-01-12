import { useMemo, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathPreviewProps {
  content: string;
  cursorLine: number;
  cursorColumn: number;
}

interface MathExpression {
  start: { line: number; col: number };
  end: { line: number; col: number };
  content: string;
  isDisplay: boolean;
}

function findMathExpressions(content: string): MathExpression[] {
  const lines = content.split('\n');
  const expressions: MathExpression[] = [];

  // Track math mode
  let inDisplayMath = false;
  let inInlineMath = false;
  let mathStart = { line: 0, col: 0 };
  let mathContent = '';

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    let col = 0;

    while (col < line.length) {
      // Check for display math delimiters
      if (line.substring(col, col + 2) === '$$') {
        if (!inDisplayMath && !inInlineMath) {
          inDisplayMath = true;
          mathStart = { line: lineNum, col };
          mathContent = '';
          col += 2;
          continue;
        } else if (inDisplayMath) {
          expressions.push({
            start: mathStart,
            end: { line: lineNum, col: col + 2 },
            content: mathContent.trim(),
            isDisplay: true,
          });
          inDisplayMath = false;
          col += 2;
          continue;
        }
      }

      // Check for \[ and \]
      if (line.substring(col, col + 2) === '\\[') {
        if (!inDisplayMath && !inInlineMath) {
          inDisplayMath = true;
          mathStart = { line: lineNum, col };
          mathContent = '';
          col += 2;
          continue;
        }
      }
      if (line.substring(col, col + 2) === '\\]') {
        if (inDisplayMath) {
          expressions.push({
            start: mathStart,
            end: { line: lineNum, col: col + 2 },
            content: mathContent.trim(),
            isDisplay: true,
          });
          inDisplayMath = false;
          col += 2;
          continue;
        }
      }

      // Check for inline math $
      if (line[col] === '$' && line[col - 1] !== '\\') {
        if (!inDisplayMath) {
          if (!inInlineMath) {
            inInlineMath = true;
            mathStart = { line: lineNum, col };
            mathContent = '';
            col++;
            continue;
          } else {
            expressions.push({
              start: mathStart,
              end: { line: lineNum, col: col + 1 },
              content: mathContent.trim(),
              isDisplay: false,
            });
            inInlineMath = false;
            col++;
            continue;
          }
        }
      }

      // Check for \( and \)
      if (line.substring(col, col + 2) === '\\(') {
        if (!inDisplayMath && !inInlineMath) {
          inInlineMath = true;
          mathStart = { line: lineNum, col };
          mathContent = '';
          col += 2;
          continue;
        }
      }
      if (line.substring(col, col + 2) === '\\)') {
        if (inInlineMath) {
          expressions.push({
            start: mathStart,
            end: { line: lineNum, col: col + 2 },
            content: mathContent.trim(),
            isDisplay: false,
          });
          inInlineMath = false;
          col += 2;
          continue;
        }
      }

      // Accumulate math content
      if (inDisplayMath || inInlineMath) {
        mathContent += line[col];
      }

      col++;
    }

    // Add newline to math content if in math mode
    if (inDisplayMath || inInlineMath) {
      mathContent += '\n';
    }
  }

  return expressions;
}

function findExpressionAtCursor(
  expressions: MathExpression[],
  cursorLine: number,
  cursorColumn: number
): MathExpression | null {
  for (const expr of expressions) {
    const afterStart =
      cursorLine > expr.start.line ||
      (cursorLine === expr.start.line && cursorColumn >= expr.start.col);
    const beforeEnd =
      cursorLine < expr.end.line ||
      (cursorLine === expr.end.line && cursorColumn <= expr.end.col);

    if (afterStart && beforeEnd) {
      return expr;
    }
  }
  return null;
}

export function MathPreview({ content, cursorLine, cursorColumn }: MathPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const renderResult = useMemo(() => {
    const expressions = findMathExpressions(content);
    const currentExpr = findExpressionAtCursor(expressions, cursorLine - 1, cursorColumn - 1);

    if (!currentExpr || !currentExpr.content) {
      return { visible: false, html: '', error: null };
    }

    try {
      const html = katex.renderToString(currentExpr.content, {
        displayMode: currentExpr.isDisplay,
        throwOnError: false,
        trust: true,
      });
      return { visible: true, html, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { visible: true, html: '', error: msg };
    }
  }, [content, cursorLine, cursorColumn]);

  if (!renderResult.visible) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-4 right-4 z-50 p-4 bg-white rounded-lg shadow-lg border border-gray-300 max-w-md max-h-40 overflow-auto"
    >
      <div className="text-xs text-gray-500 mb-2">수식 미리보기</div>
      {renderResult.error ? (
        <div className="text-red-500 text-sm">{renderResult.error}</div>
      ) : (
        <div
          className="text-black math-preview"
          dangerouslySetInnerHTML={{ __html: renderResult.html }}
        />
      )}
    </div>
  );
}
