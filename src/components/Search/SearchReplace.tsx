import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search,
  Replace,
  X,
  ChevronDown,
  ChevronUp,
  CaseSensitive,
  Regex,
  FileText,
  FolderOpen,
} from 'lucide-react';
import { useFileStore } from '@/stores/fileStore';
import { useEditorStore } from '@/stores/editorStore';

interface SearchResult {
  fileId: string;
  fileName: string;
  line: number;
  column: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

interface SearchReplaceProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchReplace({ isOpen, onClose }: SearchReplaceProps) {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [searchInAllFiles, setSearchInAllFiles] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [showReplace, setShowReplace] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const getCurrentProject = useFileStore((s) => s.getCurrentProject);
  const currentProjectId = useFileStore((s) => s.currentProjectId);
  const getCurrentFile = useFileStore((s) => s.getCurrentFile);
  const setCurrentFile = useFileStore((s) => s.setCurrentFile);
  const updateFileContent = useFileStore((s) => s.updateFileContent);
  const goToLine = useEditorStore((s) => s.goToLine);

  // Navigate to a search result
  const navigateToResult = useCallback((index: number) => {
    const result = results[index];
    if (!result || !currentProjectId) return;

    // Switch to the file if needed
    setCurrentFile(result.fileId);

    // Navigate to line after a short delay to allow file switch
    setTimeout(() => {
      goToLine(result.line);
    }, 50);
  }, [results, currentProjectId, setCurrentFile, goToLine]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (results.length > 0) {
          navigateToResult(selectedResultIndex);
          // Move to next result
          if (selectedResultIndex < results.length - 1) {
            setSelectedResultIndex(selectedResultIndex + 1);
          }
        }
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        // Move to previous result
        if (selectedResultIndex > 0) {
          setSelectedResultIndex(selectedResultIndex - 1);
          navigateToResult(selectedResultIndex - 1);
        }
      } else if (e.key === 'F3' || (e.ctrlKey && e.key === 'g')) {
        e.preventDefault();
        if (e.shiftKey) {
          // Previous result
          if (selectedResultIndex > 0) {
            setSelectedResultIndex(selectedResultIndex - 1);
            navigateToResult(selectedResultIndex - 1);
          }
        } else {
          // Next result
          if (selectedResultIndex < results.length - 1) {
            setSelectedResultIndex(selectedResultIndex + 1);
            navigateToResult(selectedResultIndex + 1);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedResultIndex, onClose, navigateToResult]);

  // Search function
  const performSearch = useCallback(() => {
    if (!searchText.trim()) {
      setResults([]);
      return;
    }

    const project = getCurrentProject();
    if (!project) return;

    const currentFile = getCurrentFile();
    const filesToSearch = searchInAllFiles
      ? project.files.filter((f) => f.type === 'file')
      : currentFile
        ? [currentFile]
        : [];

    const newResults: SearchResult[] = [];

    filesToSearch.forEach((file) => {
      if (!file.content) return;

      const lines = file.content.split('\n');
      let searchPattern: RegExp;

      try {
        if (useRegex) {
          searchPattern = new RegExp(searchText, caseSensitive ? 'g' : 'gi');
        } else {
          const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          searchPattern = new RegExp(escapedSearch, caseSensitive ? 'g' : 'gi');
        }
      } catch {
        // Invalid regex
        return;
      }

      lines.forEach((lineContent, lineIndex) => {
        let match;
        searchPattern.lastIndex = 0;

        while ((match = searchPattern.exec(lineContent)) !== null) {
          newResults.push({
            fileId: file.id,
            fileName: file.name,
            line: lineIndex + 1,
            column: match.index + 1,
            lineContent,
            matchStart: match.index,
            matchEnd: match.index + match[0].length,
          });

          // Prevent infinite loop for zero-length matches
          if (match[0].length === 0) {
            searchPattern.lastIndex++;
          }
        }
      });
    });

    setResults(newResults);
    setSelectedResultIndex(0);
  }, [searchText, caseSensitive, useRegex, searchInAllFiles, getCurrentProject, getCurrentFile]);

  // Auto-search on text change
  useEffect(() => {
    const timeout = setTimeout(performSearch, 200);
    return () => clearTimeout(timeout);
  }, [performSearch]);

  const handleReplaceOne = () => {
    if (results.length === 0 || !currentProjectId) return;

    const result = results[selectedResultIndex];
    const project = getCurrentProject();
    const file = project?.files.find((f) => f.id === result.fileId);

    if (!file?.content) return;

    const lines = file.content.split('\n');
    const line = lines[result.line - 1];

    // Replace the match
    const newLine =
      line.substring(0, result.matchStart) +
      replaceText +
      line.substring(result.matchEnd);

    lines[result.line - 1] = newLine;
    updateFileContent(currentProjectId, result.fileId, lines.join('\n'));

    // Re-search
    setTimeout(performSearch, 100);
  };

  const handleReplaceAll = () => {
    if (results.length === 0 || !currentProjectId) return;

    const project = getCurrentProject();
    if (!project) return;

    // Group results by file
    const resultsByFile = new Map<string, SearchResult[]>();
    results.forEach((result) => {
      const existing = resultsByFile.get(result.fileId) || [];
      existing.push(result);
      resultsByFile.set(result.fileId, existing);
    });

    // Replace in each file
    resultsByFile.forEach((fileResults, fileId) => {
      const file = project.files.find((f) => f.id === fileId);
      if (!file?.content) return;

      // Sort results by position (reverse order to maintain indices)
      const sortedResults = [...fileResults].sort(
        (a, b) => {
          if (a.line !== b.line) return b.line - a.line;
          return b.matchStart - a.matchStart;
        }
      );

      const lines = file.content.split('\n');

      sortedResults.forEach((result) => {
        const line = lines[result.line - 1];
        const newLine =
          line.substring(0, result.matchStart) +
          replaceText +
          line.substring(result.matchEnd);
        lines[result.line - 1] = newLine;
      });

      updateFileContent(currentProjectId, fileId, lines.join('\n'));
    });

    // Re-search
    setTimeout(performSearch, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-4 z-50 w-96 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Search className="w-4 h-4" />
          <span>검색{showReplace ? ' 및 바꾸기' : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowReplace(!showReplace)}
            className="p-1 hover:bg-[#3c3c3c] rounded"
            title="바꾸기 토글"
          >
            <Replace className="w-4 h-4" />
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

      {/* Search Input */}
      <div className="p-2 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="검색어 입력..."
              className="input w-full pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={() => setCaseSensitive(!caseSensitive)}
                className={`p-1 rounded ${caseSensitive ? 'bg-[#4CAF50] text-white' : 'hover:bg-[#3c3c3c]'}`}
                title="대소문자 구분"
              >
                <CaseSensitive className="w-4 h-4" />
              </button>
              <button
                onClick={() => setUseRegex(!useRegex)}
                className={`p-1 rounded ${useRegex ? 'bg-[#4CAF50] text-white' : 'hover:bg-[#3c3c3c]'}`}
                title="정규식 사용"
              >
                <Regex className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Replace Input */}
        {showReplace && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="바꿀 내용..."
              className="input flex-1"
            />
            <button
              onClick={handleReplaceOne}
              disabled={results.length === 0}
              className="btn btn-secondary text-xs px-2 py-1"
              title="하나 바꾸기"
            >
              바꾸기
            </button>
            <button
              onClick={handleReplaceAll}
              disabled={results.length === 0}
              className="btn btn-secondary text-xs px-2 py-1"
              title="모두 바꾸기"
            >
              모두
            </button>
          </div>
        )}

        {/* Options */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={searchInAllFiles}
              onChange={(e) => setSearchInAllFiles(e.target.checked)}
              className="rounded"
            />
            <FolderOpen className="w-3 h-3" />
            <span>모든 파일에서 검색</span>
          </label>
        </div>
      </div>

      {/* Results */}
      {searchText && (
        <div className="border-t border-[#3c3c3c]">
          <div className="flex items-center justify-between p-2 text-xs text-gray-400">
            <span>{results.length}개 결과</span>
            {results.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (selectedResultIndex > 0) {
                      setSelectedResultIndex(selectedResultIndex - 1);
                      navigateToResult(selectedResultIndex - 1);
                    }
                  }}
                  disabled={selectedResultIndex === 0}
                  className="p-1 hover:bg-[#3c3c3c] rounded disabled:opacity-30"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <span>{selectedResultIndex + 1}/{results.length}</span>
                <button
                  onClick={() => {
                    if (selectedResultIndex < results.length - 1) {
                      setSelectedResultIndex(selectedResultIndex + 1);
                      navigateToResult(selectedResultIndex + 1);
                    }
                  }}
                  disabled={selectedResultIndex === results.length - 1}
                  className="p-1 hover:bg-[#3c3c3c] rounded disabled:opacity-30"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Results List */}
          {results.length > 0 && (
            <div className="max-h-60 overflow-y-auto">
              {results.slice(0, 100).map((result, index) => (
                <div
                  key={`${result.fileId}-${result.line}-${result.column}`}
                  onClick={() => {
                    setSelectedResultIndex(index);
                    navigateToResult(index);
                  }}
                  className={`px-2 py-1 cursor-pointer text-xs hover:bg-[#3c3c3c] ${
                    index === selectedResultIndex ? 'bg-[#37373d]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3 h-3 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-400 truncate">
                      {searchInAllFiles && (
                        <span className="text-blue-400 mr-2">{result.fileName}</span>
                      )}
                      <span className="text-yellow-400">:{result.line}</span>
                    </span>
                  </div>
                  <div className="ml-5 mt-1 font-mono text-gray-300 truncate">
                    {result.lineContent.substring(0, result.matchStart)}
                    <span className="bg-yellow-500/30 text-yellow-300">
                      {result.lineContent.substring(result.matchStart, result.matchEnd)}
                    </span>
                    {result.lineContent.substring(result.matchEnd)}
                  </div>
                </div>
              ))}
              {results.length > 100 && (
                <div className="p-2 text-xs text-gray-500 text-center">
                  ...{results.length - 100}개 더 있음
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
