import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Copy, Book, FileText, Users, Calendar } from 'lucide-react';
import { useFileStore } from '@/stores/fileStore';
import { useEditorStore } from '@/stores/editorStore';

interface BibEntry {
  id: string;
  type: 'article' | 'book' | 'inproceedings' | 'misc' | 'phdthesis' | 'mastersthesis';
  key: string;
  title: string;
  author: string;
  year: string;
  journal?: string;
  booktitle?: string;
  publisher?: string;
  pages?: string;
  volume?: string;
  number?: string;
  url?: string;
  doi?: string;
}

interface BibTeXManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const entryTypes = [
  { value: 'article', label: '학술 논문 (Article)', icon: FileText },
  { value: 'book', label: '책 (Book)', icon: Book },
  { value: 'inproceedings', label: '학회 발표 (Conference)', icon: Users },
  { value: 'misc', label: '기타 (Misc)', icon: Calendar },
  { value: 'phdthesis', label: '박사논문 (PhD Thesis)', icon: FileText },
  { value: 'mastersthesis', label: '석사논문 (Master\'s Thesis)', icon: FileText },
];

function parseBibTeX(content: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const regex = /@(\w+)\s*\{\s*([^,]+)\s*,([^@]*)\}/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const type = match[1].toLowerCase() as BibEntry['type'];
    const key = match[2].trim();
    const fieldsStr = match[3];

    const fields: Record<string, string> = {};
    const fieldRegex = /(\w+)\s*=\s*[{"]([^}"]*)[}"]/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
      fields[fieldMatch[1].toLowerCase()] = fieldMatch[2];
    }

    entries.push({
      id: Math.random().toString(36).substring(2, 9),
      type,
      key,
      title: fields.title || '',
      author: fields.author || '',
      year: fields.year || '',
      journal: fields.journal,
      booktitle: fields.booktitle,
      publisher: fields.publisher,
      pages: fields.pages,
      volume: fields.volume,
      number: fields.number,
      url: fields.url,
      doi: fields.doi,
    });
  }

  return entries;
}

function generateBibTeX(entries: BibEntry[]): string {
  return entries
    .map((entry) => {
      const fields: string[] = [];
      fields.push(`  title = {${entry.title}}`);
      fields.push(`  author = {${entry.author}}`);
      fields.push(`  year = {${entry.year}}`);

      if (entry.journal) fields.push(`  journal = {${entry.journal}}`);
      if (entry.booktitle) fields.push(`  booktitle = {${entry.booktitle}}`);
      if (entry.publisher) fields.push(`  publisher = {${entry.publisher}}`);
      if (entry.pages) fields.push(`  pages = {${entry.pages}}`);
      if (entry.volume) fields.push(`  volume = {${entry.volume}}`);
      if (entry.number) fields.push(`  number = {${entry.number}}`);
      if (entry.url) fields.push(`  url = {${entry.url}}`);
      if (entry.doi) fields.push(`  doi = {${entry.doi}}`);

      return `@${entry.type}{${entry.key},\n${fields.join(',\n')}\n}`;
    })
    .join('\n\n');
}

export function BibTeXManager({ isOpen, onClose }: BibTeXManagerProps) {
  const [localEntries, setLocalEntries] = useState<BibEntry[] | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<BibEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const currentProject = useFileStore((s) => s.getCurrentProject());
  const currentProjectId = useFileStore((s) => s.currentProjectId);
  const createFile = useFileStore((s) => s.createFile);
  const updateFileContent = useFileStore((s) => s.updateFileContent);
  const addToast = useEditorStore((s) => s.addToast);

  // Find or create .bib file
  const bibFile = currentProject?.files.find((f) => f.name.endsWith('.bib'));
  const bibFileContent = bibFile?.content;

  // Parse entries from bib file content
  const parsedEntries = useMemo(() => {
    if (bibFileContent) {
      return parseBibTeX(bibFileContent);
    }
    return [];
  }, [bibFileContent]);

  // Use local entries if modified, otherwise use parsed entries
  const entries = localEntries ?? parsedEntries;

  const setEntries = (newEntries: BibEntry[]) => {
    setLocalEntries(newEntries);
  };

  const saveBibFile = (newEntries: BibEntry[]) => {
    if (!currentProjectId) return;

    const content = generateBibTeX(newEntries);

    if (bibFile) {
      updateFileContent(currentProjectId, bibFile.id, content);
    } else {
      const fileId = createFile(currentProjectId, 'references.bib', null, 'file');
      setTimeout(() => {
        updateFileContent(currentProjectId, fileId, content);
      }, 100);
    }
  };

  const handleAddEntry = () => {
    const newEntry: BibEntry = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'article',
      key: `ref${Date.now()}`,
      title: '',
      author: '',
      year: new Date().getFullYear().toString(),
    };
    setSelectedEntry(newEntry);
    setIsEditing(true);
  };

  const handleSaveEntry = () => {
    if (!selectedEntry) return;

    const existingIndex = entries.findIndex((e) => e.id === selectedEntry.id);
    let newEntries: BibEntry[];

    if (existingIndex >= 0) {
      newEntries = entries.map((e) => (e.id === selectedEntry.id ? selectedEntry : e));
    } else {
      newEntries = [...entries, selectedEntry];
    }

    setEntries(newEntries);
    saveBibFile(newEntries);
    setIsEditing(false);
    setSelectedEntry(null);
    addToast('success', '참고문헌이 저장되었습니다');
  };

  const handleDeleteEntry = (id: string) => {
    const newEntries = entries.filter((e) => e.id !== id);
    setEntries(newEntries);
    saveBibFile(newEntries);
    addToast('info', '참고문헌이 삭제되었습니다');
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(`\\cite{${key}}`);
    addToast('success', '인용 키가 복사되었습니다');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">참고문헌 관리</h2>
            <span className="text-sm text-gray-400">({entries.length}개)</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#3c3c3c]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Entry list */}
          <div className="w-1/2 border-r border-[#3c3c3c] flex flex-col">
            <div className="p-3 border-b border-[#3c3c3c]">
              <button onClick={handleAddEntry} className="btn btn-primary w-full">
                <Plus className="w-4 h-4" />
                새 참고문헌 추가
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {entries.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Book className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>참고문헌이 없습니다</p>
                  <p className="text-sm">위 버튼을 클릭하여 추가하세요</p>
                </div>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedEntry?.id === entry.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-[#3c3c3c] hover:border-[#5c5c5c]'
                    }`}
                    onClick={() => {
                      setSelectedEntry(entry);
                      setIsEditing(false);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                            {entry.type}
                          </span>
                          <span className="text-xs font-mono text-gray-400">{entry.key}</span>
                        </div>
                        <p className="text-sm font-medium mt-1 truncate">{entry.title || '(제목 없음)'}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {entry.author} ({entry.year})
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyKey(entry.key);
                          }}
                          className="p-1 rounded hover:bg-[#3c3c3c]"
                          title="인용 키 복사"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEntry(entry.id);
                          }}
                          className="p-1 rounded hover:bg-[#3c3c3c] text-red-400"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Entry editor */}
          <div className="w-1/2 flex flex-col">
            {selectedEntry ? (
              <>
                <div className="p-3 border-b border-[#3c3c3c] flex justify-between items-center">
                  <h3 className="font-medium">
                    {isEditing ? '참고문헌 편집' : '상세 정보'}
                  </h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn btn-secondary text-sm"
                    >
                      편집
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isEditing ? (
                    <>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">유형</label>
                        <select
                          value={selectedEntry.type}
                          onChange={(e) =>
                            setSelectedEntry({ ...selectedEntry, type: e.target.value as BibEntry['type'] })
                          }
                          className="input"
                        >
                          {entryTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">인용 키</label>
                        <input
                          type="text"
                          value={selectedEntry.key}
                          onChange={(e) => setSelectedEntry({ ...selectedEntry, key: e.target.value })}
                          className="input font-mono"
                          placeholder="예: smith2023"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">제목 *</label>
                        <input
                          type="text"
                          value={selectedEntry.title}
                          onChange={(e) => setSelectedEntry({ ...selectedEntry, title: e.target.value })}
                          className="input"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">저자 *</label>
                        <input
                          type="text"
                          value={selectedEntry.author}
                          onChange={(e) => setSelectedEntry({ ...selectedEntry, author: e.target.value })}
                          className="input"
                          placeholder="예: 홍길동 and 김철수"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">연도 *</label>
                        <input
                          type="text"
                          value={selectedEntry.year}
                          onChange={(e) => setSelectedEntry({ ...selectedEntry, year: e.target.value })}
                          className="input"
                        />
                      </div>

                      {(selectedEntry.type === 'article') && (
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">저널</label>
                          <input
                            type="text"
                            value={selectedEntry.journal || ''}
                            onChange={(e) => setSelectedEntry({ ...selectedEntry, journal: e.target.value })}
                            className="input"
                          />
                        </div>
                      )}

                      {(selectedEntry.type === 'inproceedings') && (
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">학회명</label>
                          <input
                            type="text"
                            value={selectedEntry.booktitle || ''}
                            onChange={(e) => setSelectedEntry({ ...selectedEntry, booktitle: e.target.value })}
                            className="input"
                          />
                        </div>
                      )}

                      {(selectedEntry.type === 'book') && (
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">출판사</label>
                          <input
                            type="text"
                            value={selectedEntry.publisher || ''}
                            onChange={(e) => setSelectedEntry({ ...selectedEntry, publisher: e.target.value })}
                            className="input"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">DOI</label>
                        <input
                          type="text"
                          value={selectedEntry.doi || ''}
                          onChange={(e) => setSelectedEntry({ ...selectedEntry, doi: e.target.value })}
                          className="input"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">URL</label>
                        <input
                          type="text"
                          value={selectedEntry.url || ''}
                          onChange={(e) => setSelectedEntry({ ...selectedEntry, url: e.target.value })}
                          className="input"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-sm text-gray-400">유형:</span>
                        <span className="ml-2">{entryTypes.find((t) => t.value === selectedEntry.type)?.label}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-400">인용 키:</span>
                        <code className="ml-2 bg-[#3c3c3c] px-2 py-0.5 rounded">{selectedEntry.key}</code>
                      </div>
                      <div>
                        <span className="text-sm text-gray-400">제목:</span>
                        <p className="mt-1">{selectedEntry.title}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-400">저자:</span>
                        <p className="mt-1">{selectedEntry.author}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-400">연도:</span>
                        <span className="ml-2">{selectedEntry.year}</span>
                      </div>
                      {selectedEntry.journal && (
                        <div>
                          <span className="text-sm text-gray-400">저널:</span>
                          <span className="ml-2">{selectedEntry.journal}</span>
                        </div>
                      )}
                      {selectedEntry.doi && (
                        <div>
                          <span className="text-sm text-gray-400">DOI:</span>
                          <span className="ml-2">{selectedEntry.doi}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {isEditing && (
                  <div className="p-3 border-t border-[#3c3c3c] flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setSelectedEntry(null);
                      }}
                      className="btn btn-secondary"
                    >
                      취소
                    </button>
                    <button onClick={handleSaveEntry} className="btn btn-primary">
                      저장
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>참고문헌을 선택하세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
