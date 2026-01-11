import type { CompilationResult, CompilationError, CompilationWarning } from '@/types';

// SwiftLaTeX Engine interface
interface PdfTeXEngine {
  loadEngine: () => Promise<void>;
  writeMemFSFile: (filename: string, content: string | Uint8Array) => void;
  setEngineMainFile: (filename: string) => void;
  compileLaTeX: () => Promise<{
    status: number;
    log: string;
    pdf: Uint8Array | undefined;
  }>;
  flushCache: () => void;
}

declare global {
  interface Window {
    PdfTeXEngine?: new () => PdfTeXEngine;
  }
}

class LaTeXCompiler {
  private engine: PdfTeXEngine | null = null;
  private isLoading = false;
  private isReady = false;

  async init(): Promise<void> {
    if (this.isReady || this.isLoading) return;
    this.isLoading = true;

    try {
      // Load SwiftLaTeX engine from CDN
      await this.loadScript('https://cdn.jsdelivr.net/npm/swiftlatex-wasm@0.0.7/dist/swiftlatex.js');

      if (window.PdfTeXEngine) {
        this.engine = new window.PdfTeXEngine();
        await this.engine.loadEngine();
        this.isReady = true;
        console.log('SwiftLaTeX engine loaded successfully');
      } else {
        throw new Error('PdfTeXEngine not found');
      }
    } catch (error) {
      console.error('Failed to load LaTeX engine:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  async compile(mainContent: string, files?: Map<string, string>): Promise<CompilationResult> {
    if (!this.isReady || !this.engine) {
      try {
        await this.init();
      } catch {
        return {
          success: false,
          log: 'Failed to initialize LaTeX engine. Please check your internet connection.',
          errors: [{ line: 0, message: 'Engine initialization failed' }],
          warnings: [],
        };
      }
    }

    try {
      // Flush cache and write files
      this.engine!.flushCache();
      this.engine!.writeMemFSFile('main.tex', mainContent);

      // Write additional files if provided
      if (files) {
        for (const [filename, content] of files) {
          this.engine!.writeMemFSFile(filename, content);
        }
      }

      // Set main file and compile
      this.engine!.setEngineMainFile('main.tex');
      const result = await this.engine!.compileLaTeX();

      // Parse log for errors and warnings
      const { errors, warnings } = this.parseLog(result.log);

      return {
        success: result.status === 0 && result.pdf !== undefined,
        pdf: result.pdf,
        log: result.log,
        errors,
        warnings,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown compilation error';
      return {
        success: false,
        log: message,
        errors: [{ line: 0, message }],
        warnings: [],
      };
    }
  }

  private parseLog(log: string): { errors: CompilationError[]; warnings: CompilationWarning[] } {
    const errors: CompilationError[] = [];
    const warnings: CompilationWarning[] = [];

    const lines = log.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match errors like "! LaTeX Error: ..." or "! Undefined control sequence."
      if (line.startsWith('!')) {
        const errorMatch = line.match(/^!\s*(.+)/);
        if (errorMatch) {
          // Try to find line number from context
          let lineNum = 0;
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const lineMatch = lines[j].match(/l\.(\d+)/);
            if (lineMatch) {
              lineNum = parseInt(lineMatch[1], 10);
              break;
            }
          }
          errors.push({
            line: lineNum,
            message: errorMatch[1].trim(),
          });
        }
      }

      // Match warnings like "LaTeX Warning: ..."
      if (line.includes('Warning:')) {
        const warnMatch = line.match(/Warning:\s*(.+)/);
        if (warnMatch) {
          let lineNum = 0;
          const lineMatch = line.match(/line\s+(\d+)/i);
          if (lineMatch) {
            lineNum = parseInt(lineMatch[1], 10);
          }
          warnings.push({
            line: lineNum,
            message: warnMatch[1].trim(),
          });
        }
      }
    }

    return { errors, warnings };
  }

  isEngineReady(): boolean {
    return this.isReady;
  }
}

export const latexCompiler = new LaTeXCompiler();
