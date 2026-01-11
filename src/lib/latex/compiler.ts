import type { CompilationResult, CompilationError, CompilationWarning } from '@/types';

// Check if running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Tauri invoke helper
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    return tauriInvoke(cmd, args);
  }
  throw new Error('Tauri not available');
}

interface TauriCompilationResult {
  success: boolean;
  pdf_path: string | null;
  pdf_data: number[] | null;
  log: string;
  errors: CompilationError[];
  warnings: CompilationWarning[];
}

interface LatexInstallation {
  xelatex: boolean;
  pdflatex: boolean;
  lualatex: boolean;
}

export type LatexEngine = 'xelatex' | 'pdflatex' | 'lualatex';

class LaTeXCompiler {
  private installation: LatexInstallation | null = null;
  private currentEngine: LatexEngine = 'xelatex';

  async checkInstallation(): Promise<LatexInstallation> {
    if (!isTauri()) {
      return { xelatex: false, pdflatex: false, lualatex: false };
    }

    if (this.installation) {
      return this.installation;
    }

    try {
      this.installation = await invoke<LatexInstallation>('check_latex_installation');
      return this.installation;
    } catch (error) {
      console.error('Failed to check LaTeX installation:', error);
      return { xelatex: false, pdflatex: false, lualatex: false };
    }
  }

  setEngine(engine: LatexEngine): void {
    this.currentEngine = engine;
  }

  getEngine(): LatexEngine {
    return this.currentEngine;
  }

  async compile(mainContent: string, files?: Map<string, string>): Promise<CompilationResult> {
    if (!isTauri()) {
      return this.compileWithSwiftLatex(mainContent, files);
    }

    return this.compileWithTauri(mainContent, files);
  }

  private async compileWithTauri(
    mainContent: string,
    files?: Map<string, string>
  ): Promise<CompilationResult> {
    try {
      // Convert Map to plain object
      const filesObj: Record<string, string> = {};
      if (files) {
        for (const [filename, content] of files) {
          filesObj[filename] = content;
        }
      }

      const result = await invoke<TauriCompilationResult>('compile_latex', {
        request: {
          content: mainContent,
          files: filesObj,
          engine: this.currentEngine,
        },
      });

      // Convert number[] to Uint8Array
      const pdfData = result.pdf_data ? new Uint8Array(result.pdf_data) : undefined;

      return {
        success: result.success,
        pdf: pdfData,
        log: result.log,
        errors: result.errors,
        warnings: result.warnings,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        log: message,
        errors: [{ line: 0, message }],
        warnings: [],
      };
    }
  }

  private async compileWithSwiftLatex(
    mainContent: string,
    files?: Map<string, string>
  ): Promise<CompilationResult> {
    // Fallback to SwiftLaTeX for browser mode
    try {
      // Dynamic import for browser-only code
      const { swiftLatexCompiler } = await import('./swiftlatex');
      return swiftLatexCompiler.compile(mainContent, files);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SwiftLaTeX not available';
      return {
        success: false,
        log: message,
        errors: [{ line: 0, message: 'Browser compilation requires SwiftLaTeX. Use the desktop app for full XeLaTeX support.' }],
        warnings: [],
      };
    }
  }

  async savePdf(pdfData: Uint8Array, path: string): Promise<void> {
    if (!isTauri()) {
      // Browser download fallback
      const blob = new Blob([pdfData.slice()], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    await invoke('save_pdf', {
      pdfData: Array.from(pdfData),
      path,
    });
  }

  async getProjectsDir(): Promise<string> {
    if (!isTauri()) {
      return '/projects';
    }
    return invoke<string>('get_projects_dir');
  }

  isTauriApp(): boolean {
    return isTauri();
  }
}

export const latexCompiler = new LaTeXCompiler();
