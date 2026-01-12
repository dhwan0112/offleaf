import { useCallback, useEffect, useRef, useState } from 'react';
import { MonacoEditor } from '@/components/Editor/MonacoEditor';
import { PDFPreview } from '@/components/Preview/PDFPreview';
import { FileTree } from '@/components/Sidebar/FileTree';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { CompilationLog } from '@/components/Log/CompilationLog';
import { ToastContainer } from '@/components/Toast/ToastContainer';
import { PackageManager } from '@/components/PackageManager/PackageManager';
import { FirstRunSetup } from '@/components/Setup/FirstRunSetup';
import { TemplateSelector } from '@/components/Templates/TemplateSelector';
import { BibTeXManager } from '@/components/BibTeX/BibTeXManager';
import { SearchReplace } from '@/components/Search/SearchReplace';
import { SpellCheckPanel } from '@/components/SpellCheck/SpellCheckPanel';
import { useEditorStore } from '@/stores/editorStore';
import { useFileStore } from '@/stores/fileStore';
import { latexCompiler, type AutoInstallResult } from '@/lib/latex/compiler';
import { storage } from '@/lib/storage/indexeddb';
import type { DocumentTemplate } from '@/lib/latex/templates';

const SETUP_COMPLETE_KEY = 'offleaf_setup_complete';

function App() {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const [showPackageManager, setShowPackageManager] = useState(false);
  const [showFirstRunSetup, setShowFirstRunSetup] = useState(
    () => !localStorage.getItem(SETUP_COMPLETE_KEY)
  );
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showBibTeXManager, setShowBibTeXManager] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSpellCheck, setShowSpellCheck] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      // Ctrl+H or Cmd+H to open search with replace
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSetupComplete = () => {
    localStorage.setItem(SETUP_COMPLETE_KEY, 'true');
    setShowFirstRunSetup(false);
  };

  const showSidebar = useEditorStore((s) => s.showSidebar);
  const showPreview = useEditorStore((s) => s.showPreview);
  const showLog = useEditorStore((s) => s.showLog);
  const sidebarWidth = useEditorStore((s) => s.sidebarWidth);
  const previewWidth = useEditorStore((s) => s.previewWidth);
  const setSidebarWidth = useEditorStore((s) => s.setSidebarWidth);
  const setPreviewWidth = useEditorStore((s) => s.setPreviewWidth);
  const setCompilerStatus = useEditorStore((s) => s.setCompilerStatus);
  const setCompilationResult = useEditorStore((s) => s.setCompilationResult);
  const setPdfData = useEditorStore((s) => s.setPdfData);
  const addToast = useEditorStore((s) => s.addToast);
  const theme = useEditorStore((s) => s.theme);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const currentProject = useFileStore((s) => s.getCurrentProject());
  const currentFile = useFileStore((s) => s.getCurrentFile());
  const projects = useFileStore((s) => s.projects);
  const createProject = useFileStore((s) => s.createProject);

  // Show template selector when no projects exist
  const shouldShowTemplateSelector = showTemplateSelector || projects.length === 0;

  // Handle template selection
  const handleTemplateSelect = useCallback((template: DocumentTemplate) => {
    const projectName = template.nameKo || template.name;
    createProject(projectName, template.content);
    setShowTemplateSelector(false);
  }, [createProject]);

  // Initialize storage
  useEffect(() => {
    storage.init().catch(console.error);
  }, []);

  // Handle compilation
  const handleCompile = useCallback(async () => {
    if (!currentProject || !currentFile) {
      addToast('error', 'No file to compile');
      return;
    }

    setCompilerStatus('compiling');

    try {
      // Gather all files for compilation
      const files = new Map<string, string>();
      for (const file of currentProject.files) {
        if (file.type === 'file' && file.content) {
          files.set(file.name, file.content);
        }
      }

      // Get main file content
      const mainFile = currentProject.files.find(
        (f) => f.id === currentProject.rootFileId
      );
      const mainContent = mainFile?.content || currentFile.content || '';

      // Auto-install callback
      const onAutoInstall = (installResult: AutoInstallResult) => {
        if (installResult.installed.length > 0) {
          addToast('info', `패키지 자동 설치됨: ${installResult.installed.join(', ')}`);
        }
        if (installResult.failed.length > 0) {
          addToast('warning', `패키지 설치 실패: ${installResult.failed.join(', ')}`);
        }
      };

      // Compile
      const result = await latexCompiler.compile(mainContent, files, onAutoInstall);

      setCompilationResult(result.log, result.errors, result.warnings);

      if (result.success && result.pdf) {
        setPdfData(result.pdf);
        setCompilerStatus('success');
        addToast('success', 'Compilation successful');

        // Cache PDF
        await storage.savePdf(currentProject.id, result.pdf);
      } else {
        setCompilerStatus('error');
        addToast('error', `Compilation failed: ${result.errors[0]?.message || 'Unknown error'}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setCompilerStatus('error');
      setCompilationResult(message, [{ line: 0, message }], []);
      addToast('error', `Compilation error: ${message}`);
    }
  }, [
    currentProject,
    currentFile,
    setCompilerStatus,
    setCompilationResult,
    setPdfData,
    addToast,
  ]);

  // Handle resizing
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDraggingSidebar) {
        setSidebarWidth(e.clientX);
      }
      if (isDraggingPreview) {
        const newWidth = window.innerWidth - e.clientX;
        setPreviewWidth(newWidth);
      }
    },
    [isDraggingSidebar, isDraggingPreview, setSidebarWidth, setPreviewWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingSidebar(false);
    setIsDraggingPreview(false);
  }, []);

  useEffect(() => {
    if (isDraggingSidebar || isDraggingPreview) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDraggingSidebar, isDraggingPreview, handleMouseMove, handleMouseUp]);

  // Load cached PDF on project change
  useEffect(() => {
    const loadCachedPdf = async () => {
      if (currentProject) {
        const cachedPdf = await storage.getPdf(currentProject.id);
        if (cachedPdf) {
          setPdfData(cachedPdf);
        }
      }
    };

    loadCachedPdf();
  }, [currentProject, setPdfData]);

  return (
    <div className="flex flex-col h-screen">
      <Toolbar
        onCompile={handleCompile}
        onOpenPackageManager={() => setShowPackageManager(true)}
        onOpenBibTeXManager={() => setShowBibTeXManager(true)}
        onOpenSearch={() => setShowSearch(true)}
        onOpenSpellCheck={() => setShowSpellCheck(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <>
            <div
              ref={sidebarRef}
              className="bg-[#252526] border-r border-[#3c3c3c] overflow-hidden"
              style={{ width: sidebarWidth }}
            >
              <FileTree onNewProject={() => setShowTemplateSelector(true)} />
            </div>
            <div
              className="resizer"
              onMouseDown={() => setIsDraggingSidebar(true)}
            />
          </>
        )}

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Editor and Preview */}
          <div className="flex flex-1 overflow-hidden">
            {/* Editor */}
            <div className="flex-1 min-w-0 overflow-hidden relative">
              <MonacoEditor onCompile={handleCompile} />
              <SearchReplace
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
              />
              <SpellCheckPanel
                isOpen={showSpellCheck}
                onClose={() => setShowSpellCheck(false)}
              />
            </div>

            {/* Preview */}
            {showPreview && (
              <>
                <div
                  className="resizer"
                  onMouseDown={() => setIsDraggingPreview(true)}
                />
                <div
                  className="overflow-hidden"
                  style={{ width: previewWidth }}
                >
                  <PDFPreview />
                </div>
              </>
            )}
          </div>

          {/* Compilation Log */}
          {showLog && (
            <div className="h-48 overflow-hidden">
              <CompilationLog />
            </div>
          )}
        </div>
      </div>

      <ToastContainer />
      <PackageManager
        isOpen={showPackageManager}
        onClose={() => setShowPackageManager(false)}
      />
      {showFirstRunSetup && (
        <FirstRunSetup onComplete={handleSetupComplete} />
      )}
      <TemplateSelector
        isOpen={shouldShowTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleTemplateSelect}
      />
      <BibTeXManager
        isOpen={showBibTeXManager}
        onClose={() => setShowBibTeXManager(false)}
      />
    </div>
  );
}

export default App;
