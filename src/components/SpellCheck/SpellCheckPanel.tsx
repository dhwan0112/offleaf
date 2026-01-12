import { useState, useEffect, useCallback } from 'react';
import {
  SpellCheck,
  X,
  AlertCircle,
  Check,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { useFileStore } from '@/stores/fileStore';
import { useEditorStore } from '@/stores/editorStore';
import {
  checkSpelling,
  addToIgnoreList,
  type SpellCheckResult,
} from '@/lib/spellcheck/spellchecker';

interface SpellCheckPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpellCheckPanel({ isOpen, onClose }: SpellCheckPanelProps) {
  const [results, setResults] = useState<SpellCheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const getCurrentFile = useFileStore((s) => s.getCurrentFile);
  const currentProjectId = useFileStore((s) => s.currentProjectId);
  const updateFileContent = useFileStore((s) => s.updateFileContent);
  const goToLine = useEditorStore((s) => s.goToLine);

  const currentFile = getCurrentFile();

  const runSpellCheck = useCallback(() => {
    if (!currentFile?.content) {
      setResults([]);
      return;
    }

    setIsChecking(true);

    // Run spell check asynchronously
    setTimeout(() => {
      const spellResults = checkSpelling(currentFile.content || '');
      setResults(spellResults);
      setIsChecking(false);
    }, 100);
  }, [currentFile?.content]);

  // Run spell check when file changes
  useEffect(() => {
    if (isOpen) {
      runSpellCheck();
    }
  }, [isOpen, currentFile?.id, runSpellCheck]);

  const handleNavigate = (result: SpellCheckResult) => {
    goToLine(result.line);
  };

  const handleReplace = (result: SpellCheckResult, suggestion: string) => {
    if (!currentFile?.content || !currentProjectId) return;

    const lines = currentFile.content.split('\n');
    const lineIndex = result.line - 1;
    const line = lines[lineIndex];

    // Find the word in the line
    const wordRegex = new RegExp(`\\b${result.word}\\b`);
    const match = wordRegex.exec(line);

    if (match) {
      const newLine =
        line.substring(0, match.index) +
        suggestion +
        line.substring(match.index + result.word.length);
      lines[lineIndex] = newLine;
      updateFileContent(currentProjectId, currentFile.id, lines.join('\n'));

      // Re-run spell check
      setTimeout(runSpellCheck, 100);
    }
  };

  const handleIgnore = (result: SpellCheckResult) => {
    addToIgnoreList(result.word);
    setResults((prev) => prev.filter((r) => r.word.toLowerCase() !== result.word.toLowerCase()));
  };

  const handleReplaceAll = (word: string, suggestion: string) => {
    if (!currentFile?.content || !currentProjectId) return;

    const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
    const newContent = currentFile.content.replace(wordRegex, suggestion);
    updateFileContent(currentProjectId, currentFile.id, newContent);

    // Re-run spell check
    setTimeout(runSpellCheck, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-4 z-50 w-80 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <SpellCheck className="w-4 h-4 text-blue-400" />
          <span className="font-medium">맞춤법 검사</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={runSpellCheck}
            disabled={isChecking}
            className="p-1 hover:bg-[#3c3c3c] rounded"
            title="다시 검사"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#3c3c3c] rounded"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {isChecking ? (
          <div className="flex items-center justify-center p-8 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            <span>검사 중...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-400">
            <Check className="w-8 h-8 text-green-400 mb-2" />
            <span>맞춤법 오류가 없습니다</span>
          </div>
        ) : (
          <div className="divide-y divide-[#3c3c3c]">
            {results.map((result, index) => (
              <div key={`${result.line}-${result.startColumn}-${index}`} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <button
                        onClick={() => handleNavigate(result)}
                        className="font-mono text-red-400 hover:underline"
                      >
                        {result.word}
                      </button>
                      <span className="text-xs text-gray-500 ml-2">
                        줄 {result.line}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleIgnore(result)}
                    className="text-xs text-gray-400 hover:text-gray-200"
                    title="무시"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>

                {/* Suggestions */}
                {result.suggestions.length > 0 && (
                  <div className="mt-2 ml-6">
                    <span className="text-xs text-gray-500">제안:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.suggestions.map((suggestion) => (
                        <div key={suggestion} className="flex items-center gap-1">
                          <button
                            onClick={() => handleReplace(result, suggestion)}
                            className="px-2 py-0.5 text-xs bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded text-green-400"
                          >
                            {suggestion}
                          </button>
                          <button
                            onClick={() => handleReplaceAll(result.word, suggestion)}
                            className="px-1 py-0.5 text-[10px] bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded text-gray-400"
                            title="모두 바꾸기"
                          >
                            모두
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-[#3c3c3c] text-xs text-gray-500">
        {results.length > 0 && (
          <span>{results.length}개 오류 발견</span>
        )}
      </div>
    </div>
  );
}
