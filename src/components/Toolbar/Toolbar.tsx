import { useState } from 'react';
import {
  Play,
  FolderPlus,
  FileDown,
  Settings,
  PanelLeftClose,
  PanelRightClose,
  Terminal,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Sun,
  Moon,
  BookOpen,
  Search,
  SpellCheck,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useFileStore } from '@/stores/fileStore';

interface ToolbarProps {
  onCompile: () => void;
  onOpenPackageManager: () => void;
  onOpenBibTeXManager: () => void;
  onOpenSearch?: () => void;
  onOpenSpellCheck?: () => void;
}

export function Toolbar({ onCompile, onOpenPackageManager, onOpenBibTeXManager, onOpenSearch, onOpenSpellCheck }: ToolbarProps) {
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const compilerStatus = useEditorStore((s) => s.compilerStatus);
  const compilationErrors = useEditorStore((s) => s.compilationErrors);
  const compilationWarnings = useEditorStore((s) => s.compilationWarnings);
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar);
  const togglePreview = useEditorStore((s) => s.togglePreview);
  const toggleLog = useEditorStore((s) => s.toggleLog);
  const showSidebar = useEditorStore((s) => s.showSidebar);
  const showPreview = useEditorStore((s) => s.showPreview);
  const showLog = useEditorStore((s) => s.showLog);
  const pdfData = useEditorStore((s) => s.pdfData);
  const theme = useEditorStore((s) => s.theme);
  const toggleTheme = useEditorStore((s) => s.toggleTheme);

  const projects = useFileStore((s) => s.projects);
  const currentProjectId = useFileStore((s) => s.currentProjectId);
  const createProject = useFileStore((s) => s.createProject);
  const setCurrentProject = useFileStore((s) => s.setCurrentProject);
  const getCurrentProject = useFileStore((s) => s.getCurrentProject);

  const currentProject = getCurrentProject();

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName('');
      setShowNewProject(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateProject();
    } else if (e.key === 'Escape') {
      setNewProjectName('');
      setShowNewProject(false);
    }
  };

  const handleDownload = () => {
    if (!pdfData) return;

    const blob = new Blob([pdfData.slice()], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject?.name || 'document'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = () => {
    switch (compilerStatus) {
      case 'compiling':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-between h-12 px-4 bg-[#252526] border-b border-[#3c3c3c]">
      {/* Left side */}
      <div className="flex items-center gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <span className="text-xl font-bold text-green-400">Off</span>
          <span className="text-xl font-bold text-white">Leaf</span>
        </div>

        {/* Toggle sidebar */}
        <button
          onClick={toggleSidebar}
          className={`btn btn-secondary p-2 ${showSidebar ? '' : 'text-gray-500'}`}
          title="Toggle sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>

        {/* Project selector */}
        <div className="flex items-center gap-2">
          <select
            value={currentProjectId || ''}
            onChange={(e) => setCurrentProject(e.target.value || null)}
            className="input py-1 px-2 text-sm min-w-[150px]"
          >
            <option value="">Select project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowNewProject(true)}
            className="btn btn-secondary p-2"
            title="New project"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center - Compile button and status */}
      <div className="flex items-center gap-4">
        <button
          onClick={onCompile}
          disabled={!currentProject || compilerStatus === 'compiling'}
          className="btn btn-primary"
        >
          {compilerStatus === 'compiling' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>Compile</span>
        </button>

        {/* Status */}
        <div className="flex items-center gap-2 text-sm">
          {getStatusIcon()}
          {compilationErrors.length > 0 && (
            <span className="text-red-400 flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              {compilationErrors.length}
            </span>
          )}
          {compilationWarnings.length > 0 && (
            <span className="text-yellow-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {compilationWarnings.length}
            </span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={onOpenSearch}
          className="btn btn-secondary p-2"
          title="검색 (Ctrl+F)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Spell Check */}
        <button
          onClick={onOpenSpellCheck}
          className="btn btn-secondary p-2"
          title="맞춤법 검사"
        >
          <SpellCheck className="w-4 h-4" />
        </button>

        {/* Download PDF */}
        <button
          onClick={handleDownload}
          disabled={!pdfData}
          className="btn btn-secondary p-2"
          title="Download PDF"
        >
          <FileDown className="w-4 h-4" />
        </button>

        {/* Toggle log */}
        <button
          onClick={toggleLog}
          className={`btn btn-secondary p-2 ${showLog ? 'bg-[#4a4a4a]' : ''}`}
          title="Toggle compilation log"
        >
          <Terminal className="w-4 h-4" />
        </button>

        {/* Toggle preview */}
        <button
          onClick={togglePreview}
          className={`btn btn-secondary p-2 ${showPreview ? '' : 'text-gray-500'}`}
          title="Toggle PDF preview"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>

        {/* Package Manager */}
        <button
          onClick={onOpenPackageManager}
          className="btn btn-secondary p-2"
          title="패키지 관리자"
        >
          <Package className="w-4 h-4" />
        </button>

        {/* BibTeX Manager */}
        <button
          onClick={onOpenBibTeXManager}
          className="btn btn-secondary p-2"
          title="참고문헌 관리"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary p-2"
          title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Settings */}
        <button className="btn btn-secondary p-2" title="Settings">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* New project modal */}
      {showNewProject && (
        <div className="modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Create New Project</h2>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Project name"
              className="input mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewProject(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="btn btn-primary"
                disabled={!newProjectName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
