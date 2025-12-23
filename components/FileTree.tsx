
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FileNode, ScumJson } from '../types';
import { FolderIcon, FileIcon, ChevronRight, PlusIcon, SearchIcon, LinkIcon, FilterIcon, TrashIcon, ArrowPathIcon, ArrowRightOnRectangleIcon, CubeIcon, ExclamationTriangleIcon } from './Icons';
import { createJsonFile } from '../services/fileSystem';
import { useI18n } from '../i18n';
import { getIdsByFuzzyTranslationMatch, getFileNameTranslation, hasTranslation } from '../utils/itemTranslator';
import { fuzzyMatch } from '../utils/helpers';
import { HoverTooltip } from './HoverTooltip';

interface FileTreeProps {
  nodes: FileNode[];
  onSelectFile: (node: FileNode) => void;
  selectedPath: string | null;
  onRefresh: () => void;
  dependencyMap: Record<string, string[]>;
  highlightedPath: string | null;
  dirtyPaths: string[];
  referencedPaths?: string[];
  zoneColors?: Record<string, string>; // Directory Path -> Color string
  conflicts?: Map<string, string[]>; // File Path -> Array of Conflicting Paths
  onNavigate?: (path: string) => void;
  onPeekFile?: (path: string) => Promise<ScumJson | null>;
  
  // File Ops
  onMoveNode?: (sourcePath: string, targetPath: string) => void;
  onDeleteNode?: (path: string, kind: 'file' | 'directory') => void;
  onRenameNode?: (path: string, newName: string, kind: 'file' | 'directory') => Promise<void>;
  onCreateFolder?: (parentPath: string) => Promise<void>;
  onCreateFile?: (parentPath: string, fileName: string) => Promise<void>;
  onImportDrop?: (files: DataTransferItemList, targetPath: string) => Promise<void>;
}

interface EditingState {
    path: string; // The path being edited (existing node)
    value: string;
}

interface CreatingState {
    parentPath: string; // Parent folder path
    kind: 'file' | 'directory';
    value: string;
}

// Helper: Inline Input Component
const InlineInput = ({ 
    value, 
    onSubmit, 
    onCancel, 
    kind 
}: { 
    value: string, 
    onSubmit: (val: string) => void, 
    onCancel: () => void,
    kind: 'file' | 'directory'
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            // Select filename without extension if file
            const dotIndex = value.lastIndexOf('.');
            if (kind === 'file' && dotIndex > 0) {
                inputRef.current.setSelectionRange(0, dotIndex);
            } else {
                inputRef.current.select();
            }
        }
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onSubmit(inputRef.current?.value || "");
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
        }
    };

    return (
        <input 
            ref={inputRef}
            type="text"
            defaultValue={value}
            className="bg-black/50 border border-scum-accent/50 rounded px-1 text-xs text-white outline-none w-full shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-pulse-fast font-mono"
            onBlur={() => onCancel()} 
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
        />
    );
};

// Custom Context Menu
const ContextMenu = ({ x, y, node, onClose, onAction }: { x: number, y: number, node: FileNode, onClose: () => void, onAction: (action: string) => void }) => {
    const { t } = useI18n();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return createPortal(
        <div 
            ref={menuRef}
            className="fixed z-[10000] bg-[#0b1120]/95 backdrop-blur-2xl border border-scum-accent/30 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.7)] p-1.5 min-w-[180px] animate-scale-in flex flex-col gap-1 text-sm ring-1 ring-white/10"
            style={{ top: y, left: x }}
        >
            <div className="px-3 py-2 text-[10px] text-gray-400 font-bold border-b border-white/10 mb-1 truncate bg-black/20 rounded-t-lg">
                {node.name}
            </div>
            
            <button onClick={() => onAction('rename')} className="flex items-center gap-3 px-3 py-2 hover:bg-scum-accent/20 hover:text-scum-accent rounded-lg transition-colors text-left text-gray-300 group">
                <ArrowPathIcon className="w-4 h-4 text-gray-500 group-hover:text-scum-accent transition-colors" /> 
                {t('common.rename')}
            </button>
            
            {node.kind === 'directory' && (
                <>
                    <button onClick={() => onAction('newFile')} className="flex items-center gap-3 px-3 py-2 hover:bg-green-500/20 hover:text-green-400 rounded-lg transition-colors text-left text-gray-300 group">
                        <FileIcon className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors" /> 
                        {t('explorer.newFile')}
                    </button>
                    <button onClick={() => onAction('newFolder')} className="flex items-center gap-3 px-3 py-2 hover:bg-yellow-500/20 hover:text-yellow-400 rounded-lg transition-colors text-left text-gray-300 group">
                        <FolderIcon className="w-4 h-4 text-gray-500 group-hover:text-yellow-400 transition-colors" /> 
                        {t('explorer.newFolder')}
                    </button>
                </>
            )}
            
            <div className="h-px bg-white/10 my-1 mx-2"></div>
            
            <button onClick={() => onAction('delete')} className="flex items-center gap-3 px-3 py-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors text-left text-red-300 group">
                <TrashIcon className="w-4 h-4 text-red-500/70 group-hover:text-red-400 transition-colors" /> 
                {t('editor.delete')}
            </button>
        </div>,
        document.body
    );
};

const FileTreeNode: React.FC<{
  node: FileNode;
  onSelectFile: (node: FileNode) => void;
  selectedPath: string | null;
  onRefresh: () => void;
  depth: number;
  dependencyMap: Record<string, string[]>;
  highlightedPath: string | null;
  searchTerm: string;
  dirtyPaths: string[];
  referencedPaths?: string[];
  zoneColors?: Record<string, string>;
  effectiveZoneColor?: string;
  conflicts?: Map<string, string[]>;
  forceExpand?: boolean;
  onHoverReference: (e: React.MouseEvent, paths: string[]) => void;
  onLeaveReference: () => void;
  onHoverFile?: (e: React.MouseEvent, node: FileNode) => void;
  onLeaveFile?: () => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  onDropNode: (e: React.DragEvent, targetNode: FileNode) => void;
  
  // Edit Props
  editingState: EditingState | null;
  creatingState: CreatingState | null;
  onCommitEdit: (val: string) => void;
  onCancelEdit: () => void;
  onCommitCreate: (val: string) => void;
  onCancelCreate: () => void;
}> = React.memo(({ node, onSelectFile, selectedPath, onRefresh, depth, dependencyMap, highlightedPath, searchTerm, dirtyPaths, referencedPaths, zoneColors, effectiveZoneColor, conflicts, forceExpand, onHoverReference, onLeaveReference, onHoverFile, onLeaveFile, onContextMenu, onDropNode, editingState, creatingState, onCommitEdit, onCancelEdit, onCommitCreate, onCancelCreate }) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();
  const [isDragOver, setIsDragOver] = useState(false);

  const isSelected = node.path === selectedPath;
  const isHighlighted = node.path === highlightedPath;
  const isReferenced = referencedPaths?.includes(node.path);
  const isDirty = dirtyPaths.includes(node.path);
  
  const conflictPaths = conflicts?.get(node.path);
  const isConflict = !!conflictPaths;
  
  const isEditingThis = editingState?.path === node.path;
  const isCreatingInside = creatingState?.parentPath === node.path;

  // Zone Logic
  const selfZoneColor = node.kind === 'directory' && zoneColors && zoneColors[node.path];
  let displayZoneColor = effectiveZoneColor;
  if (node.name === 'Zones.json' && zoneColors) {
      const parentDir = node.path.substring(0, node.path.lastIndexOf('/'));
      if (zoneColors[parentDir]) displayZoneColor = zoneColors[parentDir];
  }
  const nextEffectiveColor = selfZoneColor || effectiveZoneColor;

  const referencedBy = dependencyMap[node.path] || [];
  const usageCount = referencedBy.length;
  const isDependency = usageCount > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.kind === 'directory') {
      setExpanded(!expanded);
    } else {
      onSelectFile(node);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.setData('scum-file-path', node.path);
      if (node.kind === 'file') {
          const id = node.name.replace('.json', '');
          e.dataTransfer.setData('text/plain', id);
      }
      e.dataTransfer.effectAllowed = 'move';
      // Add opacity to dragged element visual
      (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
      (e.target as HTMLElement).style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (node.kind === 'directory') {
          e.dataTransfer.dropEffect = 'move';
          setIsDragOver(true);
      }
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (node.kind === 'directory') {
          onDropNode(e, node);
      }
  };

  const zoneIndicatorStyle = displayZoneColor ? {
      borderLeftColor: displayZoneColor,
      background: isSelected ? undefined : `linear-gradient(90deg, ${displayZoneColor}15, transparent)`,
  } : {};

  useEffect(() => {
    if (forceExpand) setExpanded(true);
    if (node.kind === 'directory' && highlightedPath && highlightedPath.startsWith(node.path + '/')) setExpanded(true);
    if (node.kind === 'directory' && selectedPath && selectedPath.startsWith(node.path + '/')) setExpanded(true);
    if (node.kind === 'directory' && referencedPaths && referencedPaths.some(p => p.startsWith(node.path + '/'))) setExpanded(true);
    // Expand if creating inside
    if (node.kind === 'directory' && isCreatingInside) setExpanded(true);
  }, [forceExpand, node.kind, highlightedPath, node.path, referencedPaths, selectedPath, isCreatingInside]);

  const conflictTooltip = isConflict 
      ? `${t('filetree.conflictTooltip')}\n\n${t('filetree.conflictingWith')}\n${conflictPaths.map(p => `- ${p}`).join('\n')}`
      : node.name;

  // File Name Translation Logic
  const translatedName = node.kind === 'file' ? getFileNameTranslation(node.name) : node.name;
  const isTranslated = translatedName !== node.name && translatedName !== node.name.replace('.json', '');
  
  return (
    <div className="select-none relative">
      <div
        className={`flex items-center group py-1.5 px-2 cursor-pointer transition-all duration-200 text-sm relative border-l-[3px] rounded-r-md my-[1px]
          ${isSelected 
            ? 'bg-gradient-to-r from-scum-accent/20 to-transparent text-scum-accent border-scum-accent font-bold shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]' 
            : 'border-transparent'
          }
          ${isHighlighted && !isSelected ? 'bg-pink-500/20 text-pink-300 animate-pulse border-pink-500' : ''}
          ${isReferenced && !isSelected && !isHighlighted ? 'bg-indigo-500/10 border-indigo-500/50' : ''}
          ${isDragOver ? 'bg-green-500/30 border-green-400 border-dashed z-50 scale-[1.02] shadow-lg ring-1 ring-green-400/50' : ''}
          ${isConflict ? 'text-orange-400' : ''}
          ${!isSelected && !isHighlighted && !isDragOver ? 'hover:bg-white/5 hover:text-gray-200 text-gray-400' : ''}
        `}
        style={{ 
            paddingLeft: `${depth * 14 + 8}px`, 
            ...(!isSelected && !isHighlighted && !isDragOver ? zoneIndicatorStyle : {})
        }}
        onClick={handleToggle}
        onMouseEnter={(e) => node.kind === 'file' && onHoverFile && onHoverFile(e, node)}
        onMouseLeave={() => node.kind === 'file' && onLeaveFile && onLeaveFile()}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={(e) => onContextMenu(e, node)}
        title={conflictTooltip}
      >
        {depth > 0 && <div className="absolute left-0 top-0 bottom-0 w-px bg-white/5" style={{ left: `${depth * 14}px` }}></div>}

        <span className={`mr-1.5 opacity-70 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
          {node.kind === 'directory' ? <ChevronRight className="w-3 h-3" /> : <span className="w-3 inline-block" />}
        </span>
        
        <span 
            className={`mr-2 shrink-0 relative transition-all duration-300 group-hover:scale-110 group-hover:brightness-125 ${isSelected ? 'scale-110' : 'opacity-80'}`}
            style={{ color: displayZoneColor }}
        >
          {node.kind === 'directory' ? <FolderIcon /> : <FileIcon />}
        </span>
        
        <div className={`flex-1 flex flex-col justify-center min-w-0 transition-colors`}>
            {isEditingThis ? (
                <InlineInput 
                    value={node.name} 
                    onSubmit={onCommitEdit} 
                    onCancel={onCancelEdit} 
                    kind={node.kind}
                />
            ) : (
                <div className="flex items-center gap-2 w-full">
                    <div className="flex flex-col min-w-0">
                        <span className={`
                            truncate font-medium leading-tight
                            ${isReferenced && !isSelected ? 'text-indigo-400 font-bold' : ''} 
                            ${isDirty ? 'text-yellow-200 font-bold italic' : ''}
                            ${isConflict ? 'text-orange-400 font-bold' : ''}
                            ${node.kind === 'file' && isTranslated && !isSelected ? 'text-sky-300' : ''}
                            ${node.kind === 'file' && !isTranslated && !isSelected ? 'text-gray-400' : ''}
                        `}>
                            {translatedName}
                        </span>
                        
                        {/* Show Original Filename if translated, but visually distinct */}
                        {isTranslated && node.kind === 'file' && (
                            <span className="text-[9px] opacity-50 font-mono truncate tracking-tight -mt-0.5">
                                {node.name}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                        {isConflict && <ExclamationTriangleIcon className="w-3.5 h-3.5 text-orange-500 animate-pulse" />}
                        {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_5px_rgba(234,179,8,0.8)]"></span>}
                        
                        {node.name === 'Zones.json' && <span className="text-[8px] px-1 rounded bg-white/10 font-mono tracking-tighter opacity-70 border border-white/10">ZONE</span>}
                        {isDependency && !isReferenced && (
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title={t('filetree.dependencyHint')}>
                                <LinkIcon className="w-3 h-3 text-scum-700 group-hover:text-scum-accent" />
                            </span>
                        )}
                        {isReferenced && <LinkIcon className="w-3 h-3 text-indigo-400 opacity-80 shrink-0" />}
                        
                        {node.kind === 'file' && usageCount > 0 && (
                          <div 
                            className="bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 text-[9px] px-1.5 rounded-full font-mono font-bold group-hover:bg-indigo-500 group-hover:text-white hover:scale-110 transition-all cursor-help shadow-sm flex items-center justify-center min-w-[1.25rem] h-4"
                            onMouseEnter={(e) => { e.stopPropagation(); onHoverReference(e, referencedBy); }}
                            onMouseLeave={onLeaveReference}
                            title={t('filetree.refCount', [usageCount])}
                          >
                             {usageCount}
                          </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Children + Ghost Node */}
      {node.kind === 'directory' && expanded && (
        <div className="animate-slide-down border-l border-white/5 ml-[7px]">
          {/* Creating Node (Ghost) */}
          {isCreatingInside && (
              <div 
                className="flex items-center py-1.5 px-2 text-sm border-l-[3px] border-transparent my-[1px] animate-fade-in"
                style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}
              >
                  <span className="mr-1.5 w-3 inline-block"></span>
                  <span className="mr-2 text-scum-accent animate-bounce"><PlusIcon className="w-3 h-3" /></span>
                  <div className="flex-1">
                      <InlineInput 
                          value={creatingState?.value || ""} 
                          onSubmit={onCommitCreate} 
                          onCancel={onCancelCreate}
                          kind={creatingState?.kind || 'file'}
                      />
                  </div>
              </div>
          )}

          {node.children && node.children.map((child, idx) => (
            <FileTreeNode
              key={child.path}
              node={child}
              onSelectFile={onSelectFile}
              selectedPath={selectedPath}
              onRefresh={onRefresh}
              depth={depth + 1}
              dependencyMap={dependencyMap}
              highlightedPath={highlightedPath}
              searchTerm={searchTerm}
              dirtyPaths={dirtyPaths}
              referencedPaths={referencedPaths}
              zoneColors={zoneColors}
              effectiveZoneColor={nextEffectiveColor} 
              conflicts={conflicts}
              forceExpand={forceExpand}
              onHoverReference={onHoverReference}
              onLeaveReference={onLeaveReference}
              onHoverFile={onHoverFile}
              onLeaveFile={onLeaveFile}
              onContextMenu={onContextMenu}
              onDropNode={onDropNode}
              editingState={editingState}
              creatingState={creatingState}
              onCommitEdit={onCommitEdit}
              onCancelEdit={onCancelEdit}
              onCommitCreate={onCommitCreate}
              onCancelCreate={onCancelCreate}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export const FileTree: React.FC<FileTreeProps> = ({ nodes, onSelectFile, selectedPath, onRefresh, dependencyMap, highlightedPath, dirtyPaths, referencedPaths, zoneColors, conflicts, onNavigate, onPeekFile, onMoveNode, onDeleteNode, onRenameNode, onCreateFolder, onCreateFile, onImportDrop }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useI18n();
  const [searchMode, setSearchMode] = useState<'name' | 'content'>('name');
  const [contentMatches, setContentMatches] = useState<Set<string> | null>(null);
  
  // Context Menu State
  const [ctxMenu, setCtxMenu] = useState<{ x: number, y: number, node: FileNode } | null>(null);

  // Edit/Create State
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [creatingState, setCreatingState] = useState<CreatingState | null>(null);

  // Tooltip & Preview States
  const [tooltipState, setTooltipState] = useState<{ visible: boolean; x: number; y: number; paths: string[]; }>({ visible: false, x: 0, y: 0, paths: [] });
  const [previewState, setPreviewState] = useState<{ x: number, y: number, content: ScumJson, path: string } | null>(null);
  const tooltipTimeout = useRef<number | null>(null);
  const previewTimeoutRef = useRef<number | null>(null);
  const closePreviewTimeoutRef = useRef<number | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
      e.preventDefault();
      // If editing/creating, block menu
      if (editingState || creatingState) return;
      setCtxMenu({ x: e.clientX, y: e.clientY, node });
  }, [editingState, creatingState]);

  const handleContextAction = (action: string) => {
      if (!ctxMenu) return;
      const { node } = ctxMenu;
      setCtxMenu(null);

      if (action === 'rename') {
          setEditingState({ path: node.path, value: node.name });
      } else if (action === 'delete') {
          if (confirm(t('common.confirmDelete') + `\n${node.path}`)) {
              if (onDeleteNode) onDeleteNode(node.path, node.kind);
          }
      } else if (action === 'newFile') {
          setCreatingState({ parentPath: node.path, kind: 'file', value: 'NewFile.json' });
      } else if (action === 'newFolder') {
          setCreatingState({ parentPath: node.path, kind: 'directory', value: 'New Folder' });
      }
  };

  const commitEdit = async (newValue: string) => {
      if (editingState && onRenameNode && newValue && newValue !== editingState.value) {
          // Detect kind from current node via path
          const ext = editingState.value.endsWith('.json') ? '.json' : (editingState.value.endsWith('.ini') ? '.ini' : '');
          let finalName = newValue;
          if (ext && !newValue.endsWith(ext)) finalName += ext;
          
          await onRenameNode(editingState.path, finalName, ext ? 'file' : 'directory');
      }
      setEditingState(null);
  };

  const commitCreate = async (newValue: string) => {
      if (creatingState && newValue) {
          if (creatingState.kind === 'file') {
              // Support .json and .ini
              let name = newValue;
              if (!name.endsWith('.json') && !name.endsWith('.ini')) {
                  name += '.json';
              }
              if (onCreateFile) await onCreateFile(creatingState.parentPath, name);
          } else {
              if (onCreateFolder) await onCreateFolder(creatingState.parentPath + '/' + newValue);
          }
      }
      setCreatingState(null);
  };

  const handleDropNode = useCallback((e: React.DragEvent, targetNode: FileNode) => {
      // 1. Internal Move
      const srcPath = e.dataTransfer.getData('scum-file-path');
      if (srcPath) {
          // Prevent dropping parent into child
          if (targetNode.path.startsWith(srcPath + '/')) {
              console.warn("Cannot drop parent directory into its own child.");
              return;
          }
          if (srcPath !== targetNode.path && onMoveNode) {
              onMoveNode(srcPath, targetNode.path);
          }
          return;
      }

      // 2. OS Import Drop
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
          if (onImportDrop) {
              onImportDrop(e.dataTransfer.items, targetNode.path);
          }
      }
  }, [onMoveNode, onImportDrop]);

  // Root level OS drop
  const handleRootDrop = (e: React.DragEvent) => {
      e.preventDefault();
      // Only handle if it's NOT an internal move (no scum-file-path)
      const srcPath = e.dataTransfer.getData('scum-file-path');
      if (!srcPath && e.dataTransfer.items && e.dataTransfer.items.length > 0 && onImportDrop) {
          onImportDrop(e.dataTransfer.items, ""); 
      }
  };

  // Re-implementing essential handlers
  const handleHoverReference = (e: React.MouseEvent, paths: string[]) => {
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipState({ visible: true, x: rect.right + 10, y: rect.top, paths });
  };
  const handleLeaveReference = () => {
      tooltipTimeout.current = window.setTimeout(() => setTooltipState(p => ({ ...p, visible: false })), 300);
  };
  const handleHoverFile = useCallback((e: React.MouseEvent, node: FileNode) => {
    if (editingState || creatingState) return; // Don't show preview while editing
    if (!onPeekFile) return;
    if (closePreviewTimeoutRef.current) clearTimeout(closePreviewTimeoutRef.current);
    if (previewState && previewState.path === node.path) return;
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const path = node.path;
    previewTimeoutRef.current = window.setTimeout(async () => {
         const content = await onPeekFile(path);
         if (content) setPreviewState({ x: rect.right + 15, y: rect.top, content, path });
    }, 600);
  }, [onPeekFile, previewState, editingState, creatingState]);
  const handleLeaveFile = useCallback(() => {
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    closePreviewTimeoutRef.current = window.setTimeout(() => setPreviewState(null), 300);
  }, []);

  const flattenNodes = (list: FileNode[]): FileNode[] => {
      let result: FileNode[] = [];
      list.forEach(n => {
          if (n.kind === 'file') result.push(n);
          if (n.kind === 'directory' && n.children) result = result.concat(flattenNodes(n.children));
      });
      return result;
  };

  // Filter logic
  const filteredNodes = React.useMemo(() => {
      if (!searchTerm && !contentMatches) return nodes;
      let transMatches: string[] = [];
      if (searchMode === 'name' && searchTerm) transMatches = getIdsByFuzzyTranslationMatch(searchTerm);

      const filterTree = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => {
              if (node.kind === 'file') {
                  if (contentMatches) return contentMatches.has(node.path) ? node : null;
                  if (searchMode === 'name' && searchTerm) {
                      const nameMatch = fuzzyMatch(node.name, searchTerm);
                      // Check Translation
                      const transMatch = transMatches.some(tId => node.name.toLowerCase().includes(tId.toLowerCase()));
                      // Also check file name translation logic (e.g. Farming -> 农业)
                      const fileTrans = getFileNameTranslation(node.name);
                      const fileTransMatch = fileTrans.toLowerCase().includes(searchTerm.toLowerCase());
                      
                      return (nameMatch || transMatch || fileTransMatch) ? node : null;
                  }
                  return null;
              } else if (node.kind === 'directory' && node.children) {
                  const children = filterTree(node.children);
                  if (children.length > 0) return { ...node, children };
                  return null;
              }
              return null;
          }).filter(Boolean) as FileNode[];
      };
      return filterTree(nodes);
  }, [nodes, searchTerm, contentMatches, searchMode]);

  return (
    <div className="flex flex-col h-full bg-[#0b1120] text-gray-300" onDrop={handleRootDrop} onDragOver={e => e.preventDefault()}>
        <div className="p-3 border-b border-scum-700/50 bg-[#0f172a]/80 backdrop-blur-sm flex flex-col gap-2">
            <div className="relative group">
                <input 
                    type="text" 
                    className="w-full bg-scum-900 border border-scum-700 rounded-lg p-1.5 pl-8 text-xs focus:outline-none focus:border-scum-accent transition-all placeholder-gray-600 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    placeholder={t('filetree.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <SearchIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-scum-accent transition-colors" />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-1 pb-10">
             {flattenNodes(filteredNodes).length === 0 && (searchTerm) ? (
                 <div className="text-center py-4 text-xs text-gray-500 italic">{t('explorer.noMatch')}</div>
             ) : (
                filteredNodes.map((node) => (
                    <FileTreeNode
                        key={node.path}
                        node={node}
                        onSelectFile={onSelectFile}
                        selectedPath={selectedPath}
                        onRefresh={onRefresh}
                        depth={0}
                        dependencyMap={dependencyMap}
                        highlightedPath={highlightedPath}
                        searchTerm={searchTerm}
                        dirtyPaths={dirtyPaths}
                        referencedPaths={referencedPaths}
                        zoneColors={zoneColors}
                        conflicts={conflicts}
                        forceExpand={!!searchTerm}
                        onHoverReference={handleHoverReference}
                        onLeaveReference={handleLeaveReference}
                        onHoverFile={handleHoverFile}
                        onLeaveFile={handleLeaveFile}
                        onContextMenu={handleContextMenu}
                        onDropNode={handleDropNode}
                        editingState={editingState}
                        creatingState={creatingState}
                        onCommitEdit={commitEdit}
                        onCancelEdit={() => setEditingState(null)}
                        onCommitCreate={commitCreate}
                        onCancelCreate={() => setCreatingState(null)}
                    />
                ))
             )}
        </div>

        {/* Portals */}
        {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} node={ctxMenu.node} onClose={() => setCtxMenu(null)} onAction={handleContextAction} />}
        
        {tooltipState.visible && createPortal(
            <div 
                className="fixed z-[9999] bg-scum-900 border border-scum-700 rounded-lg shadow-xl p-2 text-xs max-w-xs animate-fade-in"
                style={{ top: tooltipState.y, left: tooltipState.x }}
                onMouseEnter={() => { if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current); }}
                onMouseLeave={handleLeaveReference}
            >
                <div className="font-bold text-gray-400 mb-1 border-b border-white/10 pb-1">{t('filetree.referencedBy')}:</div>
                <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-0.5">
                    {tooltipState.paths.map(p => (
                        <div key={p} className="text-indigo-300 hover:text-white hover:bg-indigo-500/20 px-1 py-0.5 rounded cursor-pointer truncate transition-colors flex items-center gap-1" onClick={(e) => { e.stopPropagation(); onNavigate?.(p); setTooltipState(p => ({...p, visible:false})); }}>
                            <LinkIcon className="w-3 h-3" />{p.split('/').pop()}
                        </div>
                    ))}
                </div>
            </div>,
            document.body
        )}
        
        {previewState && (
            <HoverTooltip x={previewState.x} y={previewState.y} content={previewState.content} id={previewState.path.split('/').pop() || ""} fullPath={previewState.path} previewType="file" onMouseEnter={() => { if (closePreviewTimeoutRef.current) clearTimeout(closePreviewTimeoutRef.current); }} onMouseLeave={() => setPreviewState(null)} />
        )}
    </div>
  );
};
