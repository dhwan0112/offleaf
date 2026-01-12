import { useState, useCallback } from 'react';
import {
  File,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Edit3,
  ChevronRight,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { useFileStore } from '@/stores/fileStore';
import type { FileNode } from '@/types';

interface FileTreeItemProps {
  file: FileNode;
  level: number;
  allFiles: FileNode[];
}

function FileTreeItem({ file, level, allFiles }: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);

  const currentFileId = useFileStore((s) => s.currentFileId);
  const currentProjectId = useFileStore((s) => s.currentProjectId);
  const setCurrentFile = useFileStore((s) => s.setCurrentFile);
  const renameFile = useFileStore((s) => s.renameFile);
  const deleteFile = useFileStore((s) => s.deleteFile);

  const children = allFiles.filter((f) => f.parentId === file.id);
  const isActive = currentFileId === file.id;
  const isFolder = file.type === 'folder';
  const isTexFile = file.name.endsWith('.tex');

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      setCurrentFile(file.id);
    }
  };

  const handleRename = () => {
    if (newName.trim() && newName !== file.name && currentProjectId) {
      renameFile(currentProjectId, file.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentProjectId && confirm(`Delete "${file.name}"?`)) {
      deleteFile(currentProjectId, file.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setNewName(file.name);
      setIsRenaming(false);
    }
  };

  const getFileIcon = () => {
    if (isFolder) {
      return isOpen ? (
        <FolderOpen className="w-4 h-4 text-yellow-500" />
      ) : (
        <Folder className="w-4 h-4 text-yellow-500" />
      );
    }
    if (isTexFile) {
      return <FileText className="w-4 h-4 text-green-400" />;
    }
    return <File className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div>
      <div
        className={`file-tree-item group ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${8 + level * 12}px` }}
        onClick={handleClick}
      >
        {isFolder && (
          <span className="mr-1">
            {isOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        )}

        {getFileIcon()}

        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="input ml-2 py-0 px-1 text-sm flex-1"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="ml-2 text-sm truncate flex-1">{file.name}</span>
        )}

        <div className="hidden group-hover:flex items-center gap-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsRenaming(true);
            }}
            className="p-1 rounded hover:bg-[#4a4a4a]"
            title="Rename"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-[#4a4a4a] text-red-400"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {isFolder && isOpen && (
        <div>
          {children.map((child) => (
            <FileTreeItem
              key={child.id}
              file={child}
              level={level + 1}
              allFiles={allFiles}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileTreeProps {
  onNewProject?: () => void;
}

export function FileTree({ onNewProject }: FileTreeProps) {
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const currentProject = useFileStore((s) => s.getCurrentProject());
  const projects = useFileStore((s) => s.projects);
  const setCurrentProject = useFileStore((s) => s.setCurrentProject);
  const createFile = useFileStore((s) => s.createFile);
  const currentProjectId = useFileStore((s) => s.currentProjectId);
  const setCurrentFile = useFileStore((s) => s.setCurrentFile);

  const handleCreateFile = useCallback(() => {
    if (newFileName.trim() && currentProjectId) {
      const name = newFileName.trim().endsWith('.tex')
        ? newFileName.trim()
        : `${newFileName.trim()}.tex`;
      const fileId = createFile(currentProjectId, name, null, 'file');
      setCurrentFile(fileId);
      setNewFileName('');
      setShowNewFile(false);
    }
  }, [newFileName, currentProjectId, createFile, setCurrentFile]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateFile();
    } else if (e.key === 'Escape') {
      setNewFileName('');
      setShowNewFile(false);
    }
  };

  if (!currentProject) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No project selected
      </div>
    );
  }

  const rootFiles = currentProject.files.filter((f) => f.parentId === null);

  return (
    <div className="flex flex-col h-full">
      {/* Project selector */}
      <div className="px-3 py-2 border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <select
            value={currentProjectId || ''}
            onChange={(e) => setCurrentProject(e.target.value)}
            className="input text-sm flex-1 py-1"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={onNewProject}
            className="p-1.5 rounded hover:bg-[#3c3c3c] text-blue-400"
            title="새 프로젝트"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Files header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#3c3c3c]">
        <span className="text-xs font-semibold uppercase text-gray-400">
          Files
        </span>
        <button
          onClick={() => setShowNewFile(true)}
          className="p-1 rounded hover:bg-[#3c3c3c]"
          title="New file"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {showNewFile && (
          <div className="px-4 py-2">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => {
                if (!newFileName.trim()) {
                  setShowNewFile(false);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="filename.tex"
              className="input text-sm"
              autoFocus
            />
          </div>
        )}

        {rootFiles.map((file) => (
          <FileTreeItem
            key={file.id}
            file={file}
            level={0}
            allFiles={currentProject.files}
          />
        ))}
      </div>
    </div>
  );
}
