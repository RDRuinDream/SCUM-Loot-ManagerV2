
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { List, RowComponentProps, ListImperativeAPI } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { FileNode, ScumJson } from '../types';
import { FolderIcon, FileIcon, ChevronRight, PlusIcon, SearchIcon, LinkIcon, TrashIcon, ArrowPathIcon, ExclamationTriangleIcon } from './Icons';
import { useI18n } from '../i18n';
import { getIdsByFuzzyTranslationMatch, getFileNameTranslation } from '../utils/itemTranslator';
import { fuzzyMatch } from '../utils/helpers';
import { HoverTooltip } from './HoverTooltip';

interface FileTreeProps {
  nodes: FileNode[];
  onSelectFile: (node: FileNode) => void;
  selectedPath: string | null;
  selectedPaths?: string[];
  onSelectPaths?: (paths: string[]) => void;
  onRefresh: () => void;
  dependencyMap: Record<string, string[]>;
  highlightedPath: string | null;
  dirtyPaths: string[];
  referencedPaths?: string[];
  zoneColors?: Record<string, string>;
  conflicts?: Map<string, string[]>;
  onNavigate?: (path: string) => void;
  onPeekFile?: (path: string) => Promise<ScumJson | null>;
  
  // File Ops
  onMoveNodes?: (sourcePaths: string[], targetPath: string) => void;
  onDeleteNodes?: (paths: string[]) => void;
  onRenameNode?: (path: string, newName: string, kind: 'file' | 'directory') => Promise<void>;
  onCreateFolder?: (parentPath: string) => Promise<void>;
  onCreateFile?: (parentPath: string, fileName: string) => Promise<void>;
  onImportDrop?: (files: DataTransferItemList, targetPath: string) => Promise<void>;
}

interface FlattenedNode {
    id: string;
    node: FileNode;
    depth: number;
    isExpanded: boolean;
    parentPath: string | null;
}

interface EditingState {
    path: string;
    value: string;
}

interface CreatingState {
    parentPath: string;
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
            const dotIndex = value.lastIndexOf('.');
            if (kind === 'file' && dotIndex > 0) {
                inputRef.current.setSelectionRange(0, dotIndex);
            } else {
                inputRef.current.select();
            }
        }
    }, [value, kind]);

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
  depth: number;
  isExpanded: boolean;
  onToggle: (node: FileNode) => void;
  onSelect: (node: FileNode, multi: boolean, range: boolean) => void;
  isSelected: boolean;
  isHighlighted: boolean;
  isReferenced: boolean;
  isDirty: boolean;
  isConflict: boolean;
  conflictTooltip: string;
  displayZoneColor?: string;
  usageCount: number;
  referencedBy: string[];
  isDependency: boolean;
  isDragOver: boolean;
  onHoverReference: (e: React.MouseEvent, paths: string[]) => void;
  onLeaveReference: () => void;
  onHoverFile?: (e: React.MouseEvent, node: FileNode) => void;
  onLeaveFile?: () => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  onDragStart: (e: React.DragEvent, node: FileNode) => void;
  onDragOver: (e: React.DragEvent, node: FileNode) => void;
  onDragLeave: (e: React.DragEvent, node: FileNode) => void;
  onDrop: (e: React.DragEvent, node: FileNode) => void;
  ariaAttributes?: {
    "aria-posinset": number;
    "aria-setsize": number;
    role: "listitem";
  };
  
  // Edit Props
  editingState: EditingState | null;
  creatingState: CreatingState | null;
  onCommitEdit: (val: string) => void;
  onCancelEdit: () => void;
  onCommitCreate: (val: string) => void;
  onCancelCreate: () => void;
  style?: React.CSSProperties;
}> = React.memo(({ 
    node, depth, isExpanded, onToggle, onSelect, isSelected, isHighlighted, isReferenced, isDirty, isConflict, conflictTooltip, 
    displayZoneColor, usageCount, referencedBy, isDependency, isDragOver, onHoverReference, onLeaveReference, onHoverFile, onLeaveFile, 
    onContextMenu, onDragStart, onDragOver, onDragLeave, onDrop, editingState, creatingState, onCommitEdit, onCancelEdit, onCommitCreate, onCancelCreate, style, ariaAttributes 
}) => {
  const { t } = useI18n();
  
  const isEditingThis = editingState?.path === node.path;
  const isCreatingInside = creatingState?.parentPath === node.path;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.kind === 'directory') {
      onToggle(node);
    } else {
      onSelect(node, e.ctrlKey || e.metaKey, e.shiftKey);
    }
  };

  const zoneIndicatorStyle = displayZoneColor ? {
      borderLeftColor: displayZoneColor,
      background: isSelected ? undefined : `linear-gradient(90deg, ${displayZoneColor}15, transparent)`,
  } : {};

  const translatedName = node.kind === 'file' ? getFileNameTranslation(node.name) : node.name;
  const isTranslated = translatedName !== node.name && translatedName !== node.name.replace('.json', '');
  
  return (
    <div className="select-none relative" style={style} {...ariaAttributes}>
      <div
        className={`flex items-center group py-1.5 px-2 cursor-pointer transition-all duration-200 text-sm relative border-l-[3px] rounded-r-md my-[1px] h-full
          ${isSelected 
            ? 'bg-gradient-to-r from-scum-accent/20 to-transparent text-scum-accent border-scum-accent font-bold shadow-[inset_0_0_20px_rgba(6,182,212,0.15)]' 
            : 'border-transparent'
          }
          ${isHighlighted && !isSelected ? 'bg-pink-500/20 text-pink-300 animate-pulse border-pink-500' : ''}
          ${isReferenced && !isSelected && !isHighlighted ? 'bg-indigo-500/10 border-indigo-500/50' : ''}
          ${isDragOver ? 'bg-green-500/30 border-green-400 border-dashed z-50 scale-[1.01] shadow-lg ring-1 ring-green-400/50' : ''}
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
        onDragStart={(e) => onDragStart(e, node)}
        onDragOver={(e) => onDragOver(e, node)}
        onDragLeave={(e) => onDragLeave(e, node)}
        onDrop={(e) => onDrop(e, node)}
        onContextMenu={(e) => onContextMenu(e, node)}
        title={conflictTooltip}
      >
        {depth > 0 && <div className="absolute left-0 top-0 bottom-0 w-px bg-white/5" style={{ left: `${depth * 14}px` }}></div>}

        <span className={`mr-1.5 opacity-70 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
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
    </div>
  );
});

export const FileTree: React.FC<FileTreeProps> = ({ 
    nodes, onSelectFile, selectedPath, selectedPaths = [], onSelectPaths, onRefresh, dependencyMap, highlightedPath, dirtyPaths, referencedPaths, zoneColors, conflicts, onNavigate, onPeekFile, onMoveNodes, onDeleteNodes, onRenameNode, onCreateFolder, onCreateFile, onImportDrop 
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useI18n();
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  
  const [ctxMenu, setCtxMenu] = useState<{ x: number, y: number, node: FileNode } | null>(null);
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [creatingState, setCreatingState] = useState<CreatingState | null>(null);

  const [tooltipState, setTooltipState] = useState<{ visible: boolean; x: number; y: number; paths: string[]; }>({ visible: false, x: 0, y: 0, paths: [] });
  const [previewState, setPreviewState] = useState<{ x: number, y: number, content: ScumJson, path: string } | null>(null);
  const tooltipTimeout = useRef<number | null>(null);
  const previewTimeoutRef = useRef<number | null>(null);
  const closePreviewTimeoutRef = useRef<number | null>(null);
  
  const listRef = useRef<ListImperativeAPI>(null);

  useEffect(() => {
      const newExpanded = new Set(expandedPaths);
      let changed = false;

      const checkExpand = (path: string) => {
          const parts = path.split('/');
          let current = "";
          for (let i = 0; i < parts.length - 1; i++) {
              current = current ? `${current}/${parts[i]}` : parts[i];
              if (!newExpanded.has(current)) {
                  newExpanded.add(current);
                  changed = true;
              }
          }
      };

      if (highlightedPath) checkExpand(highlightedPath);
      if (selectedPath) checkExpand(selectedPath);
      if (referencedPaths) referencedPaths.forEach(checkExpand);
      if (creatingState) checkExpand(creatingState.parentPath);

      if (changed) setExpandedPaths(newExpanded);
  }, [highlightedPath, selectedPath, referencedPaths, creatingState]);

  const togglePath = useCallback((path: string) => {
      setExpandedPaths(prev => {
          const next = new Set(prev);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
      });
  }, []);

  const flattenedNodes = useMemo(() => {
      const result: FlattenedNode[] = [];
      
      const traverse = (list: FileNode[], depth: number, parentPath: string | null) => {
          list.forEach(node => {
              const isExpanded = expandedPaths.has(node.path);
              result.push({ id: node.path, node, depth, isExpanded: !!isExpanded, parentPath });
              
              if (node.kind === 'directory' && isExpanded && node.children) {
                  traverse(node.children, depth + 1, node.path);
              }
          });
      };

      const filterTree = (nodes: FileNode[]): FileNode[] => {
          if (!searchTerm) return nodes;
          const transMatches = getIdsByFuzzyTranslationMatch(searchTerm);

          return nodes.map(node => {
              if (node.kind === 'file') {
                  const nameMatch = fuzzyMatch(node.name, searchTerm);
                  const transMatch = transMatches.some(tId => node.name.toLowerCase().includes(tId.toLowerCase()));
                  const fileTrans = getFileNameTranslation(node.name);
                  const fileTransMatch = fileTrans.toLowerCase().includes(searchTerm.toLowerCase());
                  return (nameMatch || transMatch || fileTransMatch) ? node : null;
              } else if (node.kind === 'directory' && node.children) {
                  const children = filterTree(node.children);
                  if (children.length > 0) return { ...node, children };
                  if (fuzzyMatch(node.name, searchTerm)) return { ...node, children: node.children };
                  return null;
              }
              return null;
          }).filter(Boolean) as FileNode[];
      };

      const filtered = filterTree(nodes);
      traverse(filtered, 0, null);
      return result;
  }, [nodes, expandedPaths, searchTerm]);

  const handleSelect = useCallback((node: FileNode, multi: boolean, range: boolean) => {
      if (!onSelectPaths) {
          onSelectFile(node);
          return;
      }

      let newSelection = [...selectedPaths];
      if (range && selectedPaths.length > 0) {
          const lastSelected = selectedPaths[selectedPaths.length - 1];
          const lastIdx = flattenedNodes.findIndex(n => n.node.path === lastSelected);
          const currIdx = flattenedNodes.findIndex(n => n.node.path === node.path);
          if (lastIdx !== -1 && currIdx !== -1) {
              const start = Math.min(lastIdx, currIdx);
              const end = Math.max(lastIdx, currIdx);
              const rangePaths = flattenedNodes.slice(start, end + 1).map(n => n.node.path);
              newSelection = Array.from(new Set([...newSelection, ...rangePaths]));
          }
      } else if (multi) {
          if (newSelection.includes(node.path)) {
              newSelection = newSelection.filter(p => p !== node.path);
          } else {
              newSelection.push(node.path);
          }
      } else {
          newSelection = [node.path];
      }
      onSelectPaths(newSelection);
      onSelectFile(node);
  }, [flattenedNodes, selectedPaths, onSelectPaths, onSelectFile]);

  const handleDragStart = (e: React.DragEvent, node: FileNode) => {
      e.stopPropagation();
      const pathsToMove = selectedPaths.includes(node.path) ? selectedPaths : [node.path];
      e.dataTransfer.setData('scum-file-paths', JSON.stringify(pathsToMove));
      e.dataTransfer.effectAllowed = 'move';
      
      const ghost = document.createElement('div');
      ghost.className = "bg-scum-accent/20 border border-scum-accent text-scum-accent px-3 py-1 rounded-lg text-xs font-bold shadow-neon pointer-events-none";
      ghost.innerText = pathsToMove.length > 1 ? t('filetree.movingItems', [pathsToMove.length]) : node.name;
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDropNode = useCallback((e: React.DragEvent, targetNode: FileNode) => {
      setDragOverPath(null);
      const pathsJson = e.dataTransfer.getData('scum-file-paths');
      if (pathsJson) {
          const srcPaths = JSON.parse(pathsJson) as string[];
          const validPaths = srcPaths.filter(p => !targetNode.path.startsWith(p));
          if (validPaths.length > 0 && onMoveNodes) {
              onMoveNodes(validPaths, targetNode.path);
          }
          return;
      }

      if (e.dataTransfer.items && e.dataTransfer.items.length > 0 && onImportDrop) {
          onImportDrop(e.dataTransfer.items, targetNode.path);
      }
  }, [onMoveNodes, onImportDrop]);

  const Row = ({ index, style, ariaAttributes }: RowComponentProps) => {
      const { node, depth, isExpanded } = flattenedNodes[index];
      const isSelected = selectedPaths.includes(node.path) || node.path === selectedPath;
      const isHighlighted = node.path === highlightedPath;
      const isReferenced = !!referencedPaths?.includes(node.path);
      const isDirty = dirtyPaths.includes(node.path);
      const conflictPaths = conflicts?.get(node.path);
      const isConflict = !!conflictPaths;
      
      let displayZoneColor = zoneColors?.[node.path];
      if (!displayZoneColor && node.name === 'Zones.json') {
          const parentDir = node.path.substring(0, node.path.lastIndexOf('/'));
          displayZoneColor = zoneColors?.[parentDir];
      }

      const referencedBy = dependencyMap[node.path] || [];
      const usageCount = referencedBy.length;
      const isDependency = usageCount > 0;

      return (
          <FileTreeNode
            style={style}
            ariaAttributes={ariaAttributes}
            node={node}
            depth={depth}
            isExpanded={!!isExpanded}
            onToggle={() => togglePath(node.path)}
            onSelect={handleSelect}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            isReferenced={isReferenced}
            isDirty={isDirty}
            isConflict={isConflict}
            conflictTooltip={isConflict ? `${t('filetree.conflictTooltip')}\n\n${t('filetree.conflictingWith')}\n${conflictPaths.map(p => `- ${p}`).join('\n')}` : node.name}
            displayZoneColor={displayZoneColor}
            usageCount={usageCount}
            referencedBy={referencedBy}
            isDependency={isDependency}
            isDragOver={dragOverPath === node.path}
            onHoverReference={handleHoverReference}
            onLeaveReference={handleLeaveReference}
            onHoverFile={handleHoverFile}
            onLeaveFile={handleLeaveFile}
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
            onDragOver={(e) => { e.preventDefault(); if (node.kind === 'directory') setDragOverPath(node.path); }}
            onDragLeave={() => setDragOverPath(null)}
            onDrop={handleDropNode}
            editingState={editingState}
            creatingState={creatingState}
            onCommitEdit={commitEdit}
            onCancelEdit={() => setEditingState(null)}
            onCommitCreate={commitCreate}
            onCancelCreate={() => setCreatingState(null)}
          />
      );
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
      e.preventDefault();
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
          const pathsToDelete = selectedPaths.includes(node.path) ? selectedPaths : [node.path];
          if (confirm(t('common.confirmDelete') + `\n${pathsToDelete.length} ${t('common.items')}`)) {
              if (onDeleteNodes) onDeleteNodes(pathsToDelete);
          }
      } else if (action === 'newFile') {
          setCreatingState({ parentPath: node.path, kind: 'file', value: 'NewFile.json' });
      } else if (action === 'newFolder') {
          setCreatingState({ parentPath: node.path, kind: 'directory', value: 'New Folder' });
      }
  };

  const commitEdit = async (newValue: string) => {
      if (editingState && onRenameNode && newValue && newValue !== editingState.value) {
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
              let name = newValue;
              if (!name.endsWith('.json') && !name.endsWith('.ini')) name += '.json';
              if (onCreateFile) await onCreateFile(creatingState.parentPath, name);
          } else {
              if (onCreateFolder) await onCreateFolder(creatingState.parentPath + '/' + newValue);
          }
      }
      setCreatingState(null);
  };

  const handleHoverReference = (e: React.MouseEvent, paths: string[]) => {
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipState({ visible: true, x: rect.right + 10, y: rect.top, paths });
  };

  const handleLeaveReference = () => {
      tooltipTimeout.current = window.setTimeout(() => setTooltipState(p => ({ ...p, visible: false })), 300);
  };

  const handleHoverFile = useCallback((e: React.MouseEvent, node: FileNode) => {
    if (editingState || creatingState) return;
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

  return (
    <div className="flex flex-col h-full bg-[#0b1120] text-gray-300" onDrop={(e) => { e.preventDefault(); if (!e.dataTransfer.getData('scum-file-paths') && onImportDrop) onImportDrop(e.dataTransfer.items, ""); }} onDragOver={e => e.preventDefault()}>
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

        <div className="flex-1 p-1 pb-10 overflow-hidden">
             {flattenedNodes.length === 0 ? (
                 <div className="text-center py-4 text-xs text-gray-500 italic">{t('explorer.noMatch')}</div>
             ) : (
                <AutoSizer renderProp={({ height, width }) => (
                    <List
                        listRef={listRef}
                        rowCount={flattenedNodes.length}
                        rowHeight={36}
                        style={{ height: height || 0, width: width || 0 }}
                        className="custom-scrollbar"
                        rowComponent={Row}
                        rowProps={{}}
                    />
                )} />
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
