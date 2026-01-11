import { create } from 'zustand';
import type { CompilerStatus, Toast, CompilationError, CompilationWarning } from '@/types';

interface EditorStore {
  // Compilation state
  compilerStatus: CompilerStatus;
  compilationLog: string;
  compilationErrors: CompilationError[];
  compilationWarnings: CompilationWarning[];
  pdfData: Uint8Array | null;

  // UI state
  sidebarWidth: number;
  previewWidth: number;
  showSidebar: boolean;
  showPreview: boolean;
  showLog: boolean;

  // Toast notifications
  toasts: Toast[];

  // Actions
  setCompilerStatus: (status: CompilerStatus) => void;
  setCompilationResult: (log: string, errors: CompilationError[], warnings: CompilationWarning[]) => void;
  setPdfData: (data: Uint8Array | null) => void;

  setSidebarWidth: (width: number) => void;
  setPreviewWidth: (width: number) => void;
  toggleSidebar: () => void;
  togglePreview: () => void;
  toggleLog: () => void;

  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  compilerStatus: 'idle',
  compilationLog: '',
  compilationErrors: [],
  compilationWarnings: [],
  pdfData: null,

  sidebarWidth: 250,
  previewWidth: 500,
  showSidebar: true,
  showPreview: true,
  showLog: false,

  toasts: [],

  setCompilerStatus: (status) => set({ compilerStatus: status }),

  setCompilationResult: (log, errors, warnings) =>
    set({ compilationLog: log, compilationErrors: errors, compilationWarnings: warnings }),

  setPdfData: (data) => set({ pdfData: data }),

  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(150, Math.min(400, width)) }),
  setPreviewWidth: (width) => set({ previewWidth: Math.max(300, Math.min(800, width)) }),

  toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
  togglePreview: () => set((state) => ({ showPreview: !state.showPreview })),
  toggleLog: () => set((state) => ({ showLog: !state.showLog })),

  addToast: (type, message) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
