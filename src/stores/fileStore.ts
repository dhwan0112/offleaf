import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileNode, Project } from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 15);

const DEFAULT_LATEX_CONTENT = `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{My Document}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}

Welcome to OffLeaf! This is an offline LaTeX editor that runs entirely in your browser.

\\section{Mathematics}

Here's an example equation:

\\begin{equation}
    E = mc^2
\\end{equation}

And inline math: $\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$

\\section{Lists}

\\begin{itemize}
    \\item First item
    \\item Second item
    \\item Third item
\\end{itemize}

\\end{document}
`;

interface FileStore {
  projects: Project[];
  currentProjectId: string | null;
  currentFileId: string | null;

  // Project actions
  createProject: (name: string) => string;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;

  // File actions
  createFile: (projectId: string, name: string, parentId: string | null, type: 'file' | 'folder') => string;
  updateFileContent: (projectId: string, fileId: string, content: string) => void;
  deleteFile: (projectId: string, fileId: string) => void;
  renameFile: (projectId: string, fileId: string, newName: string) => void;
  setCurrentFile: (fileId: string | null) => void;

  // Getters
  getCurrentProject: () => Project | undefined;
  getCurrentFile: () => FileNode | undefined;
  getFileById: (projectId: string, fileId: string) => FileNode | undefined;
  getAllFiles: (projectId: string) => FileNode[];
}

export const useFileStore = create<FileStore>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      currentFileId: null,

      createProject: (name: string) => {
        const projectId = generateId();
        const mainFileId = generateId();

        const mainFile: FileNode = {
          id: mainFileId,
          name: 'main.tex',
          type: 'file',
          content: DEFAULT_LATEX_CONTENT,
          parentId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const project: Project = {
          id: projectId,
          name,
          rootFileId: mainFileId,
          files: [mainFile],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          projects: [...state.projects, project],
          currentProjectId: projectId,
          currentFileId: mainFileId,
        }));

        return projectId;
      },

      deleteProject: (id: string) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
          currentFileId: state.currentProjectId === id ? null : state.currentFileId,
        }));
      },

      setCurrentProject: (id: string | null) => {
        const project = get().projects.find((p) => p.id === id);
        set({
          currentProjectId: id,
          currentFileId: project?.rootFileId || null,
        });
      },

      createFile: (projectId: string, name: string, parentId: string | null, type: 'file' | 'folder') => {
        const fileId = generateId();
        const newFile: FileNode = {
          id: fileId,
          name,
          type,
          content: type === 'file' ? '' : undefined,
          children: type === 'folder' ? [] : undefined,
          parentId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, files: [...p.files, newFile], updatedAt: Date.now() }
              : p
          ),
        }));

        return fileId;
      },

      updateFileContent: (projectId: string, fileId: string, content: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  files: p.files.map((f) =>
                    f.id === fileId
                      ? { ...f, content, updatedAt: Date.now() }
                      : f
                  ),
                  updatedAt: Date.now(),
                }
              : p
          ),
        }));
      },

      deleteFile: (projectId: string, fileId: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  files: p.files.filter((f) => f.id !== fileId && f.parentId !== fileId),
                  updatedAt: Date.now(),
                }
              : p
          ),
        }));
      },

      renameFile: (projectId: string, fileId: string, newName: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  files: p.files.map((f) =>
                    f.id === fileId ? { ...f, name: newName, updatedAt: Date.now() } : f
                  ),
                  updatedAt: Date.now(),
                }
              : p
          ),
        }));
      },

      setCurrentFile: (fileId: string | null) => {
        set({ currentFileId: fileId });
      },

      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        return projects.find((p) => p.id === currentProjectId);
      },

      getCurrentFile: () => {
        const { currentFileId } = get();
        const project = get().getCurrentProject();
        if (!project || !currentFileId) return undefined;
        return project.files.find((f) => f.id === currentFileId);
      },

      getFileById: (projectId: string, fileId: string) => {
        const project = get().projects.find((p) => p.id === projectId);
        return project?.files.find((f) => f.id === fileId);
      },

      getAllFiles: (projectId: string) => {
        const project = get().projects.find((p) => p.id === projectId);
        return project?.files || [];
      },
    }),
    {
      name: 'offleaf-files',
    }
  )
);
