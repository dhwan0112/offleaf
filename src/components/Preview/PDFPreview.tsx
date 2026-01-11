import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download, RotateCw } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFPreviewProps {
  className?: string;
}

export function PDFPreview({ className = '' }: PDFPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);

  const pdfData = useEditorStore((s) => s.pdfData);
  const compilerStatus = useEditorStore((s) => s.compilerStatus);

  // Load PDF document
  useEffect(() => {
    if (!pdfData) {
      setPdfDoc(null);
      setTotalPages(0);
      return;
    }

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (error) {
        console.error('Error loading PDF:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [pdfData]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Calculate scale to fit container width
      const containerWidth = containerRef.current.clientWidth - 40; // padding
      const viewport = page.getViewport({ scale: 1 });
      const fitScale = containerWidth / viewport.width;
      const finalScale = scale * fitScale;

      const scaledViewport = page.getViewport({ scale: finalScale });

      // Set canvas dimensions
      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;

      // Render page
      await page.render({
        canvasContext: ctx,
        viewport: scaledViewport,
        canvas: canvas,
      } as Parameters<typeof page.render>[0]).promise;
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      renderPage();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderPage]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

  const handleDownload = () => {
    if (!pdfData) return;

    const blob = new Blob([pdfData.slice()], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Empty state
  if (!pdfData && compilerStatus !== 'compiling') {
    return (
      <div className={`flex h-full items-center justify-center bg-[#525659] ${className}`}>
        <div className="text-center text-gray-400">
          <RotateCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No PDF generated yet</p>
          <p className="text-sm mt-2">Press Ctrl+Enter to compile</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading || compilerStatus === 'compiling') {
    return (
      <div className={`flex h-full items-center justify-center bg-[#525659] ${className}`}>
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-gray-400">
            {compilerStatus === 'compiling' ? 'Compiling...' : 'Loading PDF...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-[#525659] ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#3c3c3c] border-b border-[#4a4a4a]">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-[#525659] transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-[#525659] transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-[#525659] transition-colors disabled:opacity-50"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-[#525659] transition-colors disabled:opacity-50"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleDownload}
          className="p-1.5 rounded hover:bg-[#525659] transition-colors"
          title="Download PDF"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex justify-center"
      >
        <canvas
          ref={canvasRef}
          className="shadow-lg"
          style={{ background: 'white' }}
        />
      </div>
    </div>
  );
}
