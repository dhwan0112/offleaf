export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  rootFileId: string;
  files: FileNode[];
  createdAt: number;
  updatedAt: number;
}

export interface CompilationResult {
  success: boolean;
  pdf?: Uint8Array;
  log: string;
  errors: CompilationError[];
  warnings: CompilationWarning[];
}

export interface CompilationError {
  line: number;
  message: string;
  file?: string;
}

export interface CompilationWarning {
  line: number;
  message: string;
  file?: string;
}

export interface EditorTab {
  fileId: string;
  fileName: string;
  isDirty: boolean;
}

export type CompilerStatus = 'idle' | 'compiling' | 'success' | 'error';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
