import { useRef, useEffect } from 'react';
import { XCircle, AlertTriangle, X } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';

export function CompilationLog() {
  const logRef = useRef<HTMLPreElement>(null);

  const compilationLog = useEditorStore((s) => s.compilationLog);
  const compilationErrors = useEditorStore((s) => s.compilationErrors);
  const compilationWarnings = useEditorStore((s) => s.compilationWarnings);
  const toggleLog = useEditorStore((s) => s.toggleLog);

  // Auto-scroll to bottom when log updates
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [compilationLog]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-t border-[#3c3c3c]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Compilation Log</span>

          {compilationErrors.length > 0 && (
            <span className="flex items-center gap-1 text-red-400 text-sm">
              <XCircle className="w-4 h-4" />
              {compilationErrors.length} error{compilationErrors.length > 1 ? 's' : ''}
            </span>
          )}

          {compilationWarnings.length > 0 && (
            <span className="flex items-center gap-1 text-yellow-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {compilationWarnings.length} warning{compilationWarnings.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <button
          onClick={toggleLog}
          className="p-1 rounded hover:bg-[#3c3c3c]"
          title="Close log"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Error and warning list */}
      {(compilationErrors.length > 0 || compilationWarnings.length > 0) && (
        <div className="px-4 py-2 border-b border-[#3c3c3c] max-h-32 overflow-y-auto">
          {compilationErrors.map((error, index) => (
            <div
              key={`error-${index}`}
              className="flex items-start gap-2 py-1 text-sm text-red-400"
            >
              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {error.line > 0 && <span className="text-gray-500">Line {error.line}: </span>}
                {error.message}
              </span>
            </div>
          ))}

          {compilationWarnings.map((warning, index) => (
            <div
              key={`warning-${index}`}
              className="flex items-start gap-2 py-1 text-sm text-yellow-400"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {warning.line > 0 && <span className="text-gray-500">Line {warning.line}: </span>}
                {warning.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Raw log output */}
      <pre
        ref={logRef}
        className="flex-1 p-4 overflow-auto text-xs font-mono text-gray-400 whitespace-pre-wrap"
      >
        {compilationLog || 'No compilation output yet. Press Ctrl+Enter to compile.'}
      </pre>
    </div>
  );
}
