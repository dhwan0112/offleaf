import { useState } from 'react';
import { X, FileText, GraduationCap, Briefcase, Presentation, Plus } from 'lucide-react';
import { documentTemplates, type DocumentTemplate } from '@/lib/latex/templates';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: DocumentTemplate) => void;
}

type CategoryType = 'all' | 'academic' | 'professional' | 'presentation' | 'other';

const categoryInfo: Record<CategoryType, { label: string; icon: React.ReactNode }> = {
  all: { label: '전체', icon: <FileText className="w-4 h-4" /> },
  academic: { label: '학술', icon: <GraduationCap className="w-4 h-4" /> },
  professional: { label: '비즈니스', icon: <Briefcase className="w-4 h-4" /> },
  presentation: { label: '프레젠테이션', icon: <Presentation className="w-4 h-4" /> },
  other: { label: '기타', icon: <Plus className="w-4 h-4" /> },
};

export function TemplateSelector({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

  if (!isOpen) return null;

  const filteredTemplates =
    selectedCategory === 'all'
      ? documentTemplates
      : documentTemplates.filter((t) => t.category === selectedCategory);

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3c3c3c]">
          <h2 className="text-lg font-semibold">템플릿 선택</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#3c3c3c]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Category sidebar */}
          <div className="w-48 border-r border-[#3c3c3c] p-3">
            <nav className="space-y-1">
              {(Object.keys(categoryInfo) as CategoryType[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-[#3c3c3c] text-gray-300'
                  }`}
                >
                  {categoryInfo[cat].icon}
                  {categoryInfo[cat].label}
                </button>
              ))}
            </nav>
          </div>

          {/* Template grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[#3c3c3c] hover:border-[#5c5c5c] bg-[#2d2d2d]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-10 h-10 rounded flex items-center justify-center ${
                        selectedTemplate?.id === template.id
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-[#3c3c3c] text-gray-400'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{template.nameKo}</h3>
                      <p className="text-xs text-gray-500">{template.name}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">
                    {template.descriptionKo}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Preview panel */}
          {selectedTemplate && (
            <div className="w-80 border-l border-[#3c3c3c] flex flex-col">
              <div className="p-4 border-b border-[#3c3c3c]">
                <h3 className="font-semibold">{selectedTemplate.nameKo}</h3>
                <p className="text-sm text-gray-400 mt-1">{selectedTemplate.descriptionKo}</p>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap bg-[#1e1e1e] p-3 rounded overflow-x-auto">
                  {selectedTemplate.content.slice(0, 800)}
                  {selectedTemplate.content.length > 800 && '\n...'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-[#3c3c3c]">
          <button onClick={onClose} className="btn btn-secondary">
            취소
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedTemplate}
            className="btn btn-primary"
          >
            선택
          </button>
        </div>
      </div>
    </div>
  );
}
