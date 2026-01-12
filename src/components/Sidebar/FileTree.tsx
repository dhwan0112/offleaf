import { useState, useCallback, useRef } from 'react';
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
  Upload,
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
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentProject = useFileStore((s) => s.getCurrentProject());
  const projects = useFileStore((s) => s.projects);
  const setCurrentProject = useFileStore((s) => s.setCurrentProject);
  const createFile = useFileStore((s) => s.createFile);
  const updateFileContent = useFileStore((s) => s.updateFileContent);
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

  // Handle file drop
  const handleFilesAdd = useCallback(async (files: FileList | File[]) => {
    if (!currentProjectId || !currentProject) return;

    const fileArray = Array.from(files);

    for (const file of fileArray) {
      try {
        const content = await file.text();
        const fileName = file.name;

        // Check if file already exists
        const existingFile = currentProject.files.find(
          (f) => f.name === fileName && f.type === 'file' && f.parentId === null
        );

        if (existingFile) {
          // Overwrite existing file
          const confirmOverwrite = confirm(`"${fileName}" 파일이 이미 존재합니다. 덮어쓰시겠습니까?`);
          if (confirmOverwrite) {
            updateFileContent(currentProjectId, existingFile.id, content);
            setCurrentFile(existingFile.id);
          }
        } else {
          // Create new file
          const fileId = createFile(currentProjectId, fileName, null, 'file');
          updateFileContent(currentProjectId, fileId, content);
          setCurrentFile(fileId);
        }
      } catch (error) {
        console.error(`Failed to read file ${file.name}:`, error);
      }
    }
  }, [currentProjectId, currentProject, createFile, updateFileContent, setCurrentFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFilesAdd(files);
    }
  }, [handleFilesAdd]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesAdd(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFilesAdd]);

  if (!currentProject) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No project selected
      </div>
    );
  }

  const rootFiles = currentProject.files.filter((f) => f.parentId === null);

  return (
    <div
      className={`flex flex-col h-full relative ${isDragOver ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".tex,.bib,.sty,.cls,.txt"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-500/20 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-[#252526] border-2 border-dashed border-blue-400 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <span className="text-blue-400 font-medium">파일을 여기에 놓으세요</span>
          </div>
        </div>
      )}

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
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded hover:bg-[#3c3c3c]"
            title="파일 추가"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowNewFile(true)}
            className="p-1 rounded hover:bg-[#3c3c3c]"
            title="새 파일"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
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

        {/* Empty state with drop hint */}
        {rootFiles.length === 0 && !showNewFile && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            <Upload className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p>파일을 드래그하여 추가하거나</p>
            <p>위 버튼을 클릭하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
