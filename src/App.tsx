import { useCallback, useEffect, useRef, useState } from 'react';
import { MonacoEditor } from '@/components/Editor/MonacoEditor';
import { PDFPreview } from '@/components/Preview/PDFPreview';
import { FileTree } from '@/components/Sidebar/FileTree';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { CompilationLog } from '@/components/Log/CompilationLog';
import { ToastContainer } from '@/components/Toast/ToastContainer';
import { useEditorStore } from '@/stores/editorStore';
import { useFileStore } from '@/stores/fileStore';
import { latexCompiler } from '@/lib/latex/compiler';
import { storage } from '@/lib/storage/indexeddb';

function App() {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);

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

  const currentProject = useFileStore((s) => s.getCurrentProject());
  const currentFile = useFileStore((s) => s.getCurrentFile());
  const projects = useFileStore((s) => s.projects);
  const createProject = useFileStore((s) => s.createProject);

  // Create default project if none exists
  useEffect(() => {
    if (projects.length === 0) {
      createProject('My First Project');
    }
  }, [projects.length, createProject]);

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

      // Compile
      const result = await latexCompiler.compile(mainContent, files);

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
  }, [currentProject?.id, setPdfData]);

  return (
    <div className="flex flex-col h-screen">
      <Toolbar onCompile={handleCompile} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <>
            <div
              ref={sidebarRef}
              className="bg-[#252526] border-r border-[#3c3c3c] overflow-hidden"
              style={{ width: sidebarWidth }}
            >
              <FileTree />
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
            <div className="flex-1 min-w-0 overflow-hidden">
              <MonacoEditor onCompile={handleCompile} />
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
    </div>
  );
}

export default App;
