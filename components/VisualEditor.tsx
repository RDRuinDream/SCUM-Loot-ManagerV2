
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ScumJson, RARITY_WEIGHTS, POST_SPAWN_ACTIONS, ScumSubpreset } from '../types';
import { ChevronRight } from './Icons';
import { useI18n } from '../i18n';
import { HoverTooltip } from './HoverTooltip';
import { getIdsByTranslationMatch } from '../utils/itemTranslator';
import { NodeLibrary } from './NodeLibrary';
import { resolveNodeToItems } from '../utils/lootNodeResolver';
import { ITEM_LOOT_TREE_NODES } from '../data/itemLootTreeNodes';

import { BulkActionsToolbar } from './visual/BulkActionsToolbar';
import { SectionHeader } from './visual/SectionHeader';
import { GlobalSection } from './visual/GlobalSection';
import { ItemsSection } from './visual/ItemsSection';
import { NodesSection } from './visual/NodesSection';
import { SubpresetsSection } from './visual/SubpresetsSection';
import { FixedItemsSection } from './visual/FixedItemsSection';
import { ZonesSection } from './visual/ZonesSection';
import { PasteModal } from './PasteModal';

interface VisualEditorProps {
  data: ScumJson;
  onChange: (newData: ScumJson) => void;
  availableFiles: string[];
  onPreviewFile: (filename: string) => void;
  onNavigateToFile: (filename: string) => void;
  onHighlightFile: (filename: string | null) => void;
  onPeekFile: (filename: string) => Promise<ScumJson | null>;
  onSetReferencedFiles: (paths: string[]) => void;
  fileName: string;
  filePath?: string;
  nodeLibrary?: any;
  onResetNodeLibrary?: () => void;
  onUploadNodeLibrary?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clipboard?: { type: string, items: any[] } | null;
  onCopy?: (type: string, items: any[]) => void;
  onPickZone?: (index: number) => void;
  scrollToId?: string | null;
  nodeOverrides?: Record<string, ScumJson>;
  onBatchPaste?: (targetPaths: string[], section: string, dataToPaste: any[], isOverwrite: boolean) => void;
}

type SectionKey = 'Global' | 'Nodes' | 'Items' | 'Subpresets' | 'FixedItems' | 'Zones' | 'PostSpawnActions';

const TabButton = React.memo(({ section, title, count, color, errorKeyPrefix, activeSection, onClick, t, errors }: any) => {
    const hasItems = count && count > 0;
    const isActive = activeSection === section;
    const hasError = Object.keys(errors).some(k => k.startsWith(errorKeyPrefix));

    return (
    <button
        onClick={onClick}
        className={`w-full text-left px-5 py-4 flex items-center justify-between group transition-all duration-300 border-l-[3px] relative overflow-hidden
            ${isActive 
                ? `bg-gradient-to-r from-scum-800/80 to-transparent border-scum-accent/80 shadow-[inset_4px_0_0_0_rgba(6,182,212,0.1)] rounded-r-xl` 
                : 'border-transparent hover:bg-scum-800/40 text-gray-400'
            }`}
    >
        <div className="flex flex-col relative z-10">
            <span className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? color : 'group-hover:text-gray-200'}`}>
                {title}
            </span>
            {count !== undefined && (
                <span className={`text-[10px] mt-1 transition-all duration-300 ${hasItems ? `font-bold ${color} scale-105` : 'text-gray-600'}`}>
                    {count} {t('common.items')}
                </span>
            )}
        </div>
        <div className="flex items-center relative z-10">
            {hasError && (
                 <span className="w-2 h-2 rounded-full bg-scum-danger mr-2 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"></span>
            )}
             <div className={`flex items-center justify-center w-5 h-5 transition-transform duration-300 origin-center ${isActive ? 'rotate-90' : 'rotate-0 group-hover:translate-x-1'}`}>
                <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-scum-accent' : 'text-gray-600'}`} />
             </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out pointer-events-none"></div>
    </button>
  )});

export const VisualEditor: React.FC<VisualEditorProps> = ({ 
    data, 
    onChange, 
    availableFiles, 
    onNavigateToFile, 
    onHighlightFile, 
    onPeekFile, 
    onSetReferencedFiles, 
    fileName, 
    filePath,
    nodeLibrary,
    onResetNodeLibrary,
    onUploadNodeLibrary,
    clipboard,
    onCopy,
    onPickZone,
    scrollToId,
    nodeOverrides,
    onBatchPaste
}) => {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<SectionKey>("Global");
  const scrollRef = useRef<HTMLDivElement | null>(null) as React.MutableRefObject<HTMLDivElement | null>;
  const containerRef = useRef<HTMLDivElement>(null);
  const isZonesFile = fileName === 'Zones.json';
  
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  // Library State
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryWidth, setLibraryWidth] = useState(320);
  const [isResizingLibrary, setIsResizingLibrary] = useState(false);
  
  // Batch Paste State
  const [showPasteModal, setShowPasteModal] = useState(false);

  // Global Bulk Selections (using Set of group strings: 'gen', 'flags', 'damage', 'actions')
  const [selectedGlobalGroups, setSelectedGlobalGroups] = useState<Set<string>>(new Set());

  // Smart Navigation Logic
  useEffect(() => {
      if (isZonesFile) {
          setActiveSection('Zones');
      } else {
          if (data.Items && data.Items.length > 0) {
              setActiveSection('Items');
          } else if (data.Nodes && data.Nodes.length > 0) {
              setActiveSection('Nodes');
          } else if (data.FixedItems && data.FixedItems.length > 0) {
              setActiveSection('FixedItems');
          } else if (data.Subpresets && data.Subpresets.length > 0) {
              setActiveSection('Subpresets');
          } else {
              setActiveSection('Global');
          }
      }
      setSelectedIndices(new Set());
      setSelectedGlobalGroups(new Set());
      setIsBulkMode(false);
      setSearchTerm("");
      setHoveredItemId(null);
      setShowLibrary(false); 
  }, [fileName, isZonesFile]);

  const allowLibrary = activeSection === 'Nodes';
  const currentLibrary = nodeLibrary || ITEM_LOOT_TREE_NODES;

  const startResizingLibrary = useCallback(() => setIsResizingLibrary(true), []);
  const stopResizingLibrary = useCallback(() => setIsResizingLibrary(false), []);
  
  const resizeLibrary = useCallback((e: MouseEvent) => {
      if (isResizingLibrary) {
          const newWidth = window.innerWidth - e.clientX;
          setLibraryWidth(Math.max(250, Math.min(800, newWidth)));
      }
  }, [isResizingLibrary]);

  useEffect(() => {
      if (isResizingLibrary) {
          window.addEventListener('mousemove', resizeLibrary);
          window.addEventListener('mouseup', stopResizingLibrary);
      } else {
          window.removeEventListener('mousemove', resizeLibrary);
          window.removeEventListener('mouseup', stopResizingLibrary);
      }
      return () => {
          window.removeEventListener('mousemove', resizeLibrary);
          window.removeEventListener('mouseup', stopResizingLibrary);
      };
  }, [isResizingLibrary, resizeLibrary, stopResizingLibrary]);

  const [subpresetViewMode, setSubpresetViewMode] = useState<'list' | 'cards'>('list');
  const [presetPreviews, setPresetPreviews] = useState<Record<string, ScumJson>>({});

  const findMatchingFile = useCallback((presetId: string) => {
      if (!presetId) return null;
      const cleanId = presetId.replace('.json', '');
      const targetName = `${cleanId}.json`;
      
      const candidates = availableFiles.filter(f => f.endsWith(`/${targetName}`) || f === targetName);
      if (candidates.length === 0) return null;
      if (candidates.length === 1) return candidates[0];
      if (filePath) {
          const currentDir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
          return candidates.sort((a, b) => {
              const dirA = a.includes('/') ? a.substring(0, a.lastIndexOf('/')) : '';
              const dirB = b.includes('/') ? b.substring(0, b.lastIndexOf('/')) : '';
              if (dirA === currentDir && dirB !== currentDir) return -1;
              if (dirB === currentDir && dirA !== currentDir) return 1;
              const aIsSub = dirA.startsWith(currentDir + '/');
              const bIsSub = dirB.startsWith(currentDir + '/');
              if (aIsSub && !bIsSub) return -1;
              if (bIsSub && !aIsSub) return 1;
              return 0;
          })[0];
      }
      return candidates[0];
  }, [availableFiles, filePath]);

  useEffect(() => {
      if (activeSection === 'Subpresets' && data.Subpresets) {
          data.Subpresets.forEach(async (sub) => {
              if (sub.Id && !presetPreviews[sub.Id]) {
                  const match = findMatchingFile(sub.Id);
                  if (match) {
                      const content = await onPeekFile(match);
                      if (content) {
                          setPresetPreviews(prev => ({ ...prev, [sub.Id!]: content }));
                      }
                  }
              }
          });
      }
  }, [activeSection, data.Subpresets, findMatchingFile, onPeekFile, presetPreviews]);

  const [dragState, setDragState] = useState<{
      index: number;
      section: SectionKey;
      overIndex: number | null;
      direction: 'up' | 'down';
  } | null>(null);

  const prevRefs = useRef<string>("");
  useEffect(() => {
      let paths: string[] = [];
      if (data.Subpresets) {
           paths = data.Subpresets
               .map((sub: ScumSubpreset) => findMatchingFile(sub.Id || ""))
               .filter((p): p is string => p !== undefined && p !== null);
           paths = [...new Set(paths)].sort();
      }
      
      const pathStr = JSON.stringify(paths);
      if (prevRefs.current !== pathStr) {
          prevRefs.current = pathStr;
          onSetReferencedFiles(paths);
      }
  }, [data.Subpresets, availableFiles, onSetReferencedFiles, findMatchingFile]);

  const [hoverPreview, setHoverPreview] = useState<{ 
      x: number, 
      y: number, 
      content: ScumJson, 
      id: string, 
      fullPath?: string,
      previewType?: 'file' | 'node'
  } | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const aggregatedFixedItems = useMemo(() => {
    const list = data.FixedItems || [];
    const map = new Map<string, number>();
    const result: { Id: string, Quantity: number }[] = [];
    list.forEach((item: string | { Id: string, Quantity: number }) => {
        const id = typeof item === 'string' ? item : item.Id;
        const qty = (typeof item === 'object' && item.Quantity) ? item.Quantity : 1;
        
        // Allow empty string ID to exist in list so user can edit it
        if (id !== undefined && id !== null) {
            const existingIdx = map.get(id);
            if (existingIdx !== undefined) {
                result[existingIdx].Quantity += qty;
            } else {
                map.set(id, result.length);
                result.push({ Id: id, Quantity: qty });
            }
        }
    });
    return result;
  }, [data.FixedItems]);

  const containerTotalWeight = useMemo(() => {
      let total = 0;
      data.Items?.forEach(i => total += RARITY_WEIGHTS[i.Rarity || 'Common'] || 0);
      data.Nodes?.forEach(n => total += RARITY_WEIGHTS[n.Rarity || 'Common'] || 0);
      return total;
  }, [data.Items, data.Nodes]);

  const combinedLootStats = useMemo(() => {
      if (!data) return undefined;
      let totalWeight = containerTotalWeight;
      if (totalWeight === 0) return undefined;
      const counts: Record<string, number> = {};
      
      let nodeTotalWeight = 0;
      data.Nodes?.forEach(n => nodeTotalWeight += (RARITY_WEIGHTS[n.Rarity || 'Common'] || 0));

      let itemsTotalWeight = 0;
      data.Items?.forEach(i => itemsTotalWeight += (RARITY_WEIGHTS[i.Rarity || 'Common'] || 0));

      if (activeSection === 'Nodes') {
          data.Nodes?.forEach((node) => {
               const nodeWeight = (RARITY_WEIGHTS[node.Rarity || 'Common'] || 0);
               if (nodeWeight <= 0) return;

               const possibleItems: { Id: string, Rarity: string }[] = [];
               node.Ids?.forEach(nodeId => {
                   // Pass nodeOverrides here
                   const resolved = resolveNodeToItems(nodeId, currentLibrary, nodeOverrides);
                   possibleItems.push(...resolved);
               });

               if (possibleItems.length === 0) {
                   const firstId = node.Ids && node.Ids.length > 0 ? node.Ids[0] : t('nodes.emptyNode');
                   const id = t('nodes.emptyNodeName', [firstId]);
                   counts[id] = (counts[id] || 0) + (nodeWeight / totalWeight);
                   return;
               }

               let internalTotalWeight = 0;
               possibleItems.forEach(pi => internalTotalWeight += (RARITY_WEIGHTS[pi.Rarity || 'Common'] || 0));
               if (internalTotalWeight === 0) internalTotalWeight = 1;

               possibleItems.forEach(pi => {
                   const itemInternalWeight = RARITY_WEIGHTS[pi.Rarity || 'Common'] || 0;
                   const itemRelativeShare = itemInternalWeight / internalTotalWeight;
                   const globalShare = (nodeWeight / totalWeight) * itemRelativeShare;
                   counts[pi.Id] = (counts[pi.Id] || 0) + globalShare;
               });
          });

          if (itemsTotalWeight > 0) {
              counts[t('stats.itemsPool')] = itemsTotalWeight / totalWeight;
          }

      } else {
          data.Items?.forEach(item => {
               const p = (RARITY_WEIGHTS[item.Rarity || 'Common'] || 0) / totalWeight;
               const id = item.Id || item.Name || "Unknown";
               counts[id] = (counts[id] || 0) + p;
          });

          if (nodeTotalWeight > 0) {
              const nodeP = nodeTotalWeight / totalWeight;
              counts[t('stats.nodesPool')] = nodeP;
          }
      }

      return Object.entries(counts)
          .map(([id, p]) => ({ id, percent: p * 100, rarity: 'Mix' }))
          .sort((a, b) => b.percent - a.percent);
  }, [data.Items, data.Nodes, containerTotalWeight, activeSection, currentLibrary, t, nodeOverrides]);

  const subpresetStats = useMemo(() => {
      if (!data.Subpresets || data.Subpresets.length === 0) return undefined;
      let totalWeight = 0;
      data.Subpresets.forEach(s => totalWeight += RARITY_WEIGHTS[s.Rarity || 'Common'] || 0);
      if (totalWeight === 0) return undefined;
      const counts: Record<string, number> = {};
       data.Subpresets.forEach(sub => {
           const p = (RARITY_WEIGHTS[sub.Rarity || 'Common'] || 0) / totalWeight;
           const id = sub.Id || "Unknown";
           counts[id] = (counts[id] || 0) + p;
      });
      return Object.entries(counts)
          .map(([id, p]) => ({ id, percent: p * 100, rarity: 'Mix' }))
          .sort((a, b) => b.percent - a.percent);
  }, [data.Subpresets]);

  const statsMap = useMemo(() => {
      const map = new Map<string, number>();
      if (combinedLootStats) combinedLootStats.forEach(s => map.set(s.id, s.percent));
      return map;
  }, [combinedLootStats]);
  
  const subpresetStatsMap = useMemo(() => {
      const map = new Map<string, number>();
      if (subpresetStats) subpresetStats.forEach(s => map.set(s.id, s.percent));
      return map;
  }, [subpresetStats]);

  const saveFixedItems = (grouped: { Id: string, Quantity: number }[]) => {
      const flatList: string[] = [];
      grouped.forEach(item => {
          for (let i = 0; i < item.Quantity; i++) {
              flatList.push(item.Id);
          }
      });
      onChange({ ...data, FixedItems: flatList });
  };

  const validationErrors = useMemo(() => {
      const errors: Record<string, string> = {};
      return errors;
  }, [data, aggregatedFixedItems, t]);

  const getGlobalPercentage = (id: string | undefined, rarity: string | undefined, section: SectionKey) => {
    if (section === 'Nodes') {
        if (containerTotalWeight === 0) return "0.0%";
        const weight = RARITY_WEIGHTS[rarity || 'Common'] || 0;
        return ((weight / containerTotalWeight) * 100).toFixed(1) + "%";
    }
    if (section === 'Subpresets') {
        if (id && subpresetStatsMap.has(id)) {
             return subpresetStatsMap.get(id)!.toFixed(1) + "%";
        }
        return "0.0%";
    }
    if (id && statsMap.has(id)) {
        return statsMap.get(id)!.toFixed(1) + "%";
    }
    return "0.0%";
  };

  const updateItem = (section: 'Items' | 'Subpresets' | 'Nodes' | 'Zones', index: number, field: string, value: any) => {
    if (field === 'Id' && !value) setHoverPreview(null); 
    // @ts-ignore
    const list = [...(data[section] || [])];
    list[index] = { ...list[index], [field]: value };
    onChange({ ...data, [section]: list });
  };
  const updateStringItem = (section: 'PostSpawnActions', index: number, value: string) => {
      // @ts-ignore
      const list = [...(data[section] || [])];
      list[index] = value;
      onChange({ ...data, [section]: list });
  };
  const deleteItem = (section: 'Items' | 'Subpresets' | 'Nodes' | 'PostSpawnActions' | 'Zones', index: number) => {
    // @ts-ignore
    const list = [...(data[section] || [])];
    list.splice(index, 1);
    onChange({ ...data, [section]: list });
    if (selectedIndices.has(index)) { 
        const newSet = new Set<number>(selectedIndices); 
        newSet.delete(index);
        const shiftedSet = new Set<number>();
        newSet.forEach((i: number) => {
            if (i < index) shiftedSet.add(i);
            else if (i > index) shiftedSet.add(i - 1);
        });
        setSelectedIndices(shiftedSet); 
    }
  };
  const addItem = (section: 'Items' | 'Subpresets' | 'FixedItems' | 'Nodes' | 'PostSpawnActions' | 'Zones', newItemData?: any) => {
      setSearchTerm("");
      if (section === 'FixedItems') {
          const current = [...aggregatedFixedItems]; current.push({ Id: "New_Item", Quantity: 1 }); saveFixedItems(current); 
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          return;
      }
      let newItem: any = null;
      if (newItemData) {
          newItem = newItemData;
      } else {
          if(section === 'Items') newItem = { Id: "New_Item", Rarity: "Common" };
          else if(section === 'Subpresets') newItem = { Id: "", Rarity: "Uncommon" };
          else if (section === 'Nodes') newItem = { Rarity: "Uncommon", Ids: [] };
          else if (section === 'Zones') newItem = { TopLeft: "X=0 Y=0", BottomRight: "X=0 Y=0" };
          else if (section === 'PostSpawnActions') newItem = Object.keys(POST_SPAWN_ACTIONS)[0];
      }
      if (newItem) {
        // @ts-ignore
        const list = [...(data[section] || [])]; list.push(newItem); onChange({ ...data, [section]: list });
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
  };
  const moveItem = (section: 'Items' | 'Subpresets' | 'Nodes' | 'Zones' | 'PostSpawnActions', fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      // @ts-ignore
      const list = [...(data[section] || [])];
      const [removed] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, removed);
      onChange({ ...data, [section]: list });
      setSelectedIndices(new Set());
  };
  const updateGlobal = (field: keyof ScumJson, value: any) => { 
      if (typeof value === 'number') value = Math.max(0, value);
      onChange({ ...data, [field]: value }); 
  };
  const updateFixedItem = (index: number, field: 'Id' | 'Quantity', value: string | number) => {
      const list = [...aggregatedFixedItems]; const item = { ...list[index] };
      if (field === 'Id') item.Id = value as string; if (field === 'Quantity') item.Quantity = value as number;
      list[index] = item; saveFixedItems(list);
  };
  const deleteFixedItem = (index: number) => { const list = [...aggregatedFixedItems]; list.splice(index, 1); saveFixedItems(list); };
  
  const showPreview = useCallback((rect: DOMRect, content: ScumJson, id: string, fullPath?: string, previewType: 'file' | 'node' = 'file', delay = 300) => {
       if (hoverTimeoutRef.current) { window.clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
       if (closeTimeoutRef.current) { window.clearTimeout(closeTimeoutRef.current); closeTimeoutRef.current = null; }
       hoverTimeoutRef.current = window.setTimeout(() => {
          setHoverPreview({ x: rect.right + 10, y: rect.top, content, id, fullPath, previewType });
       }, delay);
  }, []);
  const hidePreview = useCallback(() => {
      if (hoverTimeoutRef.current) { window.clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
      closeTimeoutRef.current = window.setTimeout(() => { setHoverPreview(null); onHighlightFile(null); }, 300);
  }, [onHighlightFile]);
  const handlePresetEnter = useCallback((e: React.MouseEvent, presetId: string) => {
      if (!presetId) return;
      if (presetPreviews[presetId]) {
          const match = findMatchingFile(presetId);
          if(match) onHighlightFile(match);
          const rect = e.currentTarget.getBoundingClientRect();
          showPreview(rect, presetPreviews[presetId], presetId, match || undefined, 'file', 200);
          return;
      }

      const match = findMatchingFile(presetId);
      if (match) {
          const rect = e.currentTarget.getBoundingClientRect();
          onHighlightFile(match);
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = window.setTimeout(async () => {
              const content = await onPeekFile(match);
              if (content) {
                  setPresetPreviews(prev => ({ ...prev, [presetId]: content }));
                  setHoverPreview({ x: rect.right + 10, y: rect.top, content: content, id: presetId, fullPath: match, previewType: 'file' });
              }
          }, 400); 
      }
  }, [findMatchingFile, onHighlightFile, onPeekFile, presetPreviews, showPreview]);
  
  const handleTooltipEnter = () => { 
      if (closeTimeoutRef.current) { window.clearTimeout(closeTimeoutRef.current); closeTimeoutRef.current = null; }
      if (hoverTimeoutRef.current) { window.clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
  };
  const handleTooltipLeave = () => { setHoverPreview(null); onHighlightFile(null); };
  
  const handleContainerDrop = (e: React.DragEvent, section: SectionKey) => {
      e.preventDefault();
      const libraryData = e.dataTransfer.getData('application/json');
      if (libraryData) {
          try {
              const item = JSON.parse(libraryData);
              if (item.fromLibrary) {
                  if (section === 'Items' || section === 'Subpresets') { addItem(section, { Id: item.Id, Rarity: item.Rarity }); return; } 
                  else if (section === 'Nodes') { addItem('Nodes', { Rarity: "Uncommon", Ids: [item.Id] }); return; } 
                  else if (section === 'FixedItems') { const current = [...aggregatedFixedItems]; current.push({ Id: item.Id, Quantity: 1 }); saveFixedItems(current); setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); return; }
              }
          } catch (err) {}
      }
      if (!dragState || dragState.section !== section || dragState.overIndex === null) return;
      const safeState = dragState as { index: number; overIndex: number; direction: string };
      let toIndex = safeState.overIndex; 
      const fromIndex = safeState.index;
      if (safeState.direction === 'down') toIndex++; 
      if (fromIndex < toIndex) toIndex--;
      moveItem(section as any, fromIndex, toIndex); setDragState(null);
  };
  const handleItemClick = (id: string) => { 
      setHoveredItemId(id);
      setTimeout(() => {
          const el = document.querySelector(`[data-scum-item-id="${id}"]`);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('ring-2', 'ring-scum-accent');
              setTimeout(() => el.classList.remove('ring-2', 'ring-scum-accent'), 2000);
          }
      }, 50);
  };
  
  const handleLibraryDropOnNode = (e: React.DragEvent, nodeIdx: number) => {
      e.preventDefault(); e.stopPropagation();
      const libraryData = e.dataTransfer.getData('application/json');
      if (libraryData) {
          try {
              const item = JSON.parse(libraryData);
              if (item.fromLibrary && activeSection === 'Nodes') {
                  const list = [...(data.Nodes || [])]; const node = { ...list[nodeIdx] }; const ids = [...(node.Ids || [])];
                  if (!ids.includes(item.Id)) { ids.push(item.Id); node.Ids = ids; list[nodeIdx] = node; onChange({ ...data, Nodes: list }); }
              }
          } catch (e) {}
      }
  };

  const baseInputClass = "w-full bg-scum-900/50 border rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none transition-all duration-300 backdrop-blur-sm";
  const getInputClass = (errorKey?: string) => {
      return `${baseInputClass} ${errorKey && validationErrors[errorKey] 
        ? 'border-scum-danger focus:border-scum-danger shadow-red-500/10 shadow-lg' 
        : 'border-scum-700/50 focus:border-scum-accent focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-scum-900'}`;
  };

  const filterList = (list: any[]) => {
      if (!searchTerm) return list.map((item, idx) => ({ item, originalIndex: idx }));
      const lowerSearch = searchTerm.toLowerCase();
      const matchingIdsFromTrans = getIdsByTranslationMatch(lowerSearch);
      return list.map((item, idx) => ({ item, originalIndex: idx })).filter(({ item }) => {
          let id = ""; if (item.Id) id = item.Id; else if (item.Ids && Array.isArray(item.Ids)) id = item.Ids.join(' ');
          if (id.toLowerCase().includes(lowerSearch)) return true;
          if (matchingIdsFromTrans.some(matchId => id.includes(matchId))) return true;
          return false;
      });
  };

  const handleSelect = (idx: number) => {
      const newSet = new Set(selectedIndices);
      if (newSet.has(idx)) newSet.delete(idx);
      else newSet.add(idx);
      setSelectedIndices(newSet);
  };

  const handleSelectAll = (filteredItems: { originalIndex: number }[]) => {
      if (selectedIndices.size === filteredItems.length) {
          setSelectedIndices(new Set());
      } else {
          setSelectedIndices(new Set(filteredItems.map(i => i.originalIndex)));
      }
  };

  const handleGlobalGroupSelect = (group: string) => {
      const newSet = new Set(selectedGlobalGroups);
      if (newSet.has(group)) newSet.delete(group);
      else newSet.add(group);
      setSelectedGlobalGroups(newSet);
  };

  const handleBulkDelete = (section: 'Items' | 'Subpresets' | 'Nodes' | 'FixedItems' | 'Zones') => {
      if (confirm(t('common.confirmDelete'))) {
          const indices = (Array.from(selectedIndices) as number[]).sort((a, b) => b - a);
          if (section === 'FixedItems') {
              const list = [...aggregatedFixedItems];
              indices.forEach(i => list.splice(i, 1));
              saveFixedItems(list);
          } else {
              // @ts-ignore
              const list = [...(data[section] || [])];
              indices.forEach(i => list.splice(i, 1));
              onChange({ ...data, [section]: list });
          }
          setSelectedIndices(new Set());
      }
  };

  const handleBulkRarity = (section: 'Items' | 'Subpresets' | 'Nodes', rarity: string) => {
      // @ts-ignore
      const list = [...(data[section] || [])];
      selectedIndices.forEach(i => {
          if(list[i]) list[i] = { ...list[i], Rarity: rarity };
      });
      onChange({ ...data, [section]: list });
      setSelectedIndices(new Set());
  };

  const handleCopy = (section: 'Items' | 'Subpresets' | 'Nodes' | 'FixedItems' | 'Global' | 'Zones') => {
      let itemsToCopy: any[] = [];
      
      if (section === 'Global') {
          // Construct partial Global object based on selected groups
          const globalCopy: Partial<ScumJson> = {};
          if (selectedGlobalGroups.has('gen')) {
              if (data.Probability !== undefined) globalCopy.Probability = data.Probability;
              if (data.QuantityMin !== undefined) globalCopy.QuantityMin = data.QuantityMin;
              if (data.QuantityMax !== undefined) globalCopy.QuantityMax = data.QuantityMax;
          }
          if (selectedGlobalGroups.has('flags')) {
              if (data.AllowDuplicates !== undefined) globalCopy.AllowDuplicates = data.AllowDuplicates;
              if (data.ShouldFilterItemsByZone !== undefined) globalCopy.ShouldFilterItemsByZone = data.ShouldFilterItemsByZone;
              if (data.ShouldApplyLocationSpecificProbabilityModifier !== undefined) globalCopy.ShouldApplyLocationSpecificProbabilityModifier = data.ShouldApplyLocationSpecificProbabilityModifier;
              if (data.ShouldApplyLocationSpecificDamageModifier !== undefined) globalCopy.ShouldApplyLocationSpecificDamageModifier = data.ShouldApplyLocationSpecificDamageModifier;
          }
          if (selectedGlobalGroups.has('damage')) {
              if (data.InitialDamage !== undefined) globalCopy.InitialDamage = data.InitialDamage;
              if (data.RandomDamage !== undefined) globalCopy.RandomDamage = data.RandomDamage;
              if (data.InitialUsage !== undefined) globalCopy.InitialUsage = data.InitialUsage;
              if (data.RandomUsage !== undefined) globalCopy.RandomUsage = data.RandomUsage;
          }
          if (selectedGlobalGroups.has('actions')) {
              if (data.PostSpawnActions) globalCopy.PostSpawnActions = [...data.PostSpawnActions];
          }
          
          if (Object.keys(globalCopy).length > 0) {
              itemsToCopy = [globalCopy];
          }
      } else if (section === 'FixedItems') {
          itemsToCopy = aggregatedFixedItems.filter((_, i) => selectedIndices.has(i));
      } else {
          // @ts-ignore
          const list = (data[section] || []) as any[];
          itemsToCopy = list.filter((_, i) => selectedIndices.has(i));
      }
      
      if (onCopy) onCopy(section, itemsToCopy);
      navigator.clipboard.writeText(JSON.stringify(itemsToCopy, null, 2));
      
      // Keep selection in Bulk Mode to allow multiple actions
      // if (section !== 'Global') { setSelectedIndices(new Set()); }
  };

  const handlePaste = async (section: 'Items' | 'Subpresets' | 'Nodes' | 'FixedItems' | 'Zones' | 'Global') => {
      // Logic for Bulk Mode Paste (Open Modal) - handled by toolbar button now
      // This function handles pasting to CURRENT file

      let itemsToPaste: any[] = [];
      if (clipboard && clipboard.type === section) {
          itemsToPaste = [...clipboard.items];
      } else {
          try {
              const text = await navigator.clipboard.readText();
              const items = JSON.parse(text);
              if (Array.isArray(items) && items.length > 0) {
                  itemsToPaste = items;
              }
          } catch(e) {}
      }

      if (itemsToPaste.length > 0) {
          if (section === 'Global') {
              const globalData = itemsToPaste[0];
              if (globalData) {
                  const newData = { ...data };
                  
                  if (globalData.PostSpawnActions && Array.isArray(globalData.PostSpawnActions)) {
                      if (!newData.PostSpawnActions) newData.PostSpawnActions = [];
                      newData.PostSpawnActions.push(...globalData.PostSpawnActions);
                      const { PostSpawnActions, ...rest } = globalData;
                      Object.assign(newData, rest);
                  } else {
                      Object.assign(newData, globalData);
                  }
                  onChange(newData);
              }
          } else if (section === 'FixedItems') {
              const currentList = [...aggregatedFixedItems];
              let insertIndex = currentList.length;
              if (selectedIndices.size > 0) {
                  const sortedIndices = (Array.from(selectedIndices) as number[]).sort((a, b) => a - b);
                  insertIndex = sortedIndices[sortedIndices.length - 1] + 1;
              }
              currentList.splice(insertIndex, 0, ...itemsToPaste);
              saveFixedItems(currentList);
          } else {
              // @ts-ignore
              const currentList = [...(data[section] || [])];
              let insertIndex = currentList.length;
              if (selectedIndices.size > 0) {
                  const sortedIndices = (Array.from(selectedIndices) as number[]).sort((a, b) => a - b);
                  insertIndex = sortedIndices[sortedIndices.length - 1] + 1;
              }
              currentList.splice(insertIndex, 0, ...itemsToPaste);
              onChange({ ...data, [section]: currentList });
          }
          setSelectedIndices(new Set());
      }
  };

  const handleBatchPasteConfirm = (targetPaths: string[], isOverwrite: boolean) => {
      let itemsToPaste: any[] = [];
      if (clipboard && clipboard.type === activeSection) {
          itemsToPaste = [...clipboard.items];
      }
      
      // Allow empty paste if Overwrite is true (to clear files)
      if ((itemsToPaste.length > 0 || isOverwrite) && onBatchPaste) {
          onBatchPaste(targetPaths, activeSection, itemsToPaste, isOverwrite);
          setShowPasteModal(false);
          setSelectedIndices(new Set());
          setSelectedGlobalGroups(new Set());
      }
  };

  const canPaste = (clipboard && clipboard.type === activeSection) || false;
  // Global copy is valid if at least one group is selected
  const hasGlobalSelection = activeSection === 'Global' && selectedGlobalGroups.size > 0;
  // Selection count logic differs for Global
  const selectionCount = activeSection === 'Global' ? selectedGlobalGroups.size : selectedIndices.size;

  useEffect(() => {
      if (scrollToId) {
          handleItemClick(scrollToId);
      }
  }, [scrollToId]);

  return (
    <div className="flex h-full font-mono text-sm relative w-full overflow-hidden animate-fade-in">
      {hoverPreview && (
          <HoverTooltip x={hoverPreview.x} y={hoverPreview.y} content={hoverPreview.content} id={hoverPreview.id} fullPath={hoverPreview.fullPath} previewType={hoverPreview.previewType} onMouseEnter={handleTooltipEnter} onMouseLeave={hidePreview} />
      )}

      {showPasteModal && (
          <PasteModal 
              onClose={() => setShowPasteModal(false)}
              onConfirm={handleBatchPasteConfirm}
              availableFiles={availableFiles}
              contentType={activeSection}
              count={clipboard ? clipboard.items.length : 0}
          />
      )}

      {isBulkMode && (
          <BulkActionsToolbar 
              selectedCount={selectionCount} 
              onClearSelection={() => activeSection === 'Global' ? setSelectedGlobalGroups(new Set()) : setSelectedIndices(new Set())}
              onDelete={() => activeSection !== 'Global' && handleBulkDelete(activeSection as any)}
              onCopy={() => handleCopy(activeSection as any)}
              onPaste={() => activeSection === 'Global' ? setShowPasteModal(true) : setShowPasteModal(true)} // Bulk Toolbar paste opens Modal
              onSetRarity={(r) => activeSection !== 'Global' && activeSection !== 'FixedItems' && activeSection !== 'Zones' && handleBulkRarity(activeSection as any, r)}
              canPaste={canPaste}
              showRarityControls={activeSection !== 'FixedItems' && activeSection !== 'Global' && activeSection !== 'Zones'}
          />
      )}

      <datalist id="available-files">
          {availableFiles.map(f => {
              const name = f.split('/').pop()?.replace('.json', '');
              return <option key={f} value={name} label={f} />;
          })}
      </datalist>

      <div className="w-64 glass border-r border-scum-700/50 flex flex-col shrink-0 overflow-y-auto custom-scrollbar z-10 backdrop-blur-md">
          <div className="p-4 border-b border-scum-700/50 bg-scum-900/30">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{isZonesFile ? t('editor.zonesDef') : t('editor.sections')}</h3>
          </div>
          <nav className="flex-1 py-2 space-y-1">
              {!isZonesFile && (
                  <>
                    <TabButton section="Global" title={t('section.global')} color="text-gray-200" errorKeyPrefix="global_" activeSection={activeSection} onClick={() => setActiveSection("Global")} t={t} errors={validationErrors} />
                    <TabButton section="Items" title={t('section.items')} count={data.Items?.length || 0} color="text-scum-accent" errorKeyPrefix="items_" activeSection={activeSection} onClick={() => setActiveSection("Items")} t={t} errors={validationErrors} />
                    <TabButton section="Nodes" title={t('section.nodes')} count={data.Nodes?.length || 0} color="text-pink-400" errorKeyPrefix="nodes_" activeSection={activeSection} onClick={() => setActiveSection("Nodes")} t={t} errors={validationErrors} />
                    <TabButton section="FixedItems" title={t('section.fixed')} count={aggregatedFixedItems.length} color="text-emerald-400" errorKeyPrefix="fixed_" activeSection={activeSection} onClick={() => setActiveSection("FixedItems")} t={t} errors={validationErrors} />
                    <TabButton section="Subpresets" title={t('section.subpresets')} count={data.Subpresets?.length || 0} color="text-indigo-400" errorKeyPrefix="subpresets_" activeSection={activeSection} onClick={() => setActiveSection("Subpresets")} t={t} errors={validationErrors} />
                  </>
              )}
              {isZonesFile && (
                  <TabButton section="Zones" title={t('editor.zonesDef')} count={data.Zones?.length || 0} color="text-yellow-400" errorKeyPrefix="zones_" activeSection={activeSection} onClick={() => setActiveSection("Zones")} t={t} errors={validationErrors} />
              )}
          </nav>
      </div>

      <div className="flex-1 flex overflow-hidden bg-gradient-to-br from-scum-900 via-[#0b1120] to-black relative min-w-0">
          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-0 z-10 relative">
            
            {!isZonesFile && activeSection === "Global" && (
                <div className="p-6 md:p-8 w-full max-w-5xl mx-auto animate-slide-up relative pb-20" ref={containerRef}>
                    <SectionHeader 
                        title={t('section.global')} 
                        count={0} // Not really countable
                        onAdd={() => {}} // No generic add for global root
                        typeColor="text-gray-200" 
                        sectionList={[1]} // Hack to show Bulk button
                        isBulkMode={isBulkMode} 
                        onToggleBulk={() => setIsBulkMode(!isBulkMode)} 
                        searchTerm={""} 
                        onSearchChange={() => {}} 
                        onPaste={() => handlePaste('Global')} // Header button is Local Paste
                        canPaste={canPaste}
                    />
                    <GlobalSection 
                        data={data} 
                        updateGlobal={updateGlobal} 
                        deleteItem={deleteItem} 
                        addItem={addItem} 
                        updateStringItem={updateStringItem} 
                        getInputClass={getInputClass}
                        isBulkMode={isBulkMode}
                        selectedGroups={selectedGlobalGroups}
                        onToggleGroup={handleGlobalGroupSelect}
                    />
                </div>
            )}
            
            {activeSection === "Items" && (
                 <div className="p-6 md:p-8 w-full max-w-5xl mx-auto animate-slide-up relative pb-20" ref={containerRef}>
                    <SectionHeader 
                        title={t('section.items')} 
                        count={data.Items?.length || 0} 
                        onAdd={() => addItem('Items')} 
                        typeColor="text-scum-accent" 
                        sectionList={data.Items || []} 
                        isBulkMode={isBulkMode} 
                        onToggleBulk={() => setIsBulkMode(!isBulkMode)} 
                        searchTerm={searchTerm} 
                        onSearchChange={setSearchTerm} 
                        onToggleLibrary={() => setShowLibrary(!showLibrary)} 
                        showLibrary={showLibrary} 
                        allowLibrary={allowLibrary}
                        onPaste={() => handlePaste('Items')}
                        canPaste={canPaste}
                        onSelectAll={() => handleSelectAll(filterList(data.Items || []))}
                    />
                    
                    <ItemsSection 
                        items={data.Items || []} 
                        isBulkMode={isBulkMode} 
                        selectedIndices={selectedIndices} 
                        onSelect={handleSelect} 
                        handleContainerDrop={handleContainerDrop} 
                        deleteItem={deleteItem} 
                        updateItem={updateItem} 
                        filterList={filterList} 
                        getGlobalPercentage={getGlobalPercentage} 
                        combinedLootStats={combinedLootStats} 
                        onItemClick={handleItemClick} 
                        onHoverItem={setHoveredItemId} 
                        hoveredItemId={hoveredItemId} 
                        getInputClass={getInputClass} 
                    />
                 </div>
            )}

            {activeSection === "Nodes" && (
                 <div className="p-6 md:p-8 w-full max-w-5xl mx-auto animate-slide-up relative pb-20" ref={containerRef}>
                    <SectionHeader 
                        title={t('section.nodes')} 
                        count={data.Nodes?.length || 0} 
                        onAdd={() => addItem('Nodes')} 
                        typeColor="text-pink-400" 
                        sectionList={data.Nodes || []} 
                        isBulkMode={isBulkMode} 
                        onToggleBulk={() => setIsBulkMode(!isBulkMode)} 
                        searchTerm={searchTerm} 
                        onSearchChange={setSearchTerm} 
                        onToggleLibrary={() => setShowLibrary(!showLibrary)} 
                        showLibrary={showLibrary} 
                        allowLibrary={allowLibrary}
                        onPaste={() => handlePaste('Nodes')}
                        canPaste={canPaste}
                        onSelectAll={() => handleSelectAll(filterList(data.Nodes || []))}
                    />
                    
                    <NodesSection 
                        nodes={data.Nodes || []}
                        isBulkMode={isBulkMode}
                        selectedIndices={selectedIndices}
                        onSelect={handleSelect}
                        handleContainerDrop={handleContainerDrop}
                        deleteItem={deleteItem}
                        updateItem={updateItem}
                        filterList={filterList}
                        getGlobalPercentage={getGlobalPercentage}
                        combinedLootStats={combinedLootStats}
                        onItemClick={handleItemClick}
                        onHoverItem={setHoveredItemId}
                        hoveredItemId={hoveredItemId}
                        getInputClass={getInputClass}
                        currentLibrary={currentLibrary}
                        handleLibraryDropOnNode={handleLibraryDropOnNode}
                        nodeOverrides={nodeOverrides}
                    />
                 </div>
            )}
            
            {activeSection === "FixedItems" && (
                <div className="p-6 md:p-8 w-full max-w-5xl mx-auto animate-slide-up relative pb-20" ref={containerRef}>
                     <SectionHeader 
                        title={t('section.fixed')} 
                        count={aggregatedFixedItems.length} 
                        onAdd={() => addItem('FixedItems')} 
                        typeColor="text-emerald-400" 
                        sectionList={aggregatedFixedItems} 
                        isBulkMode={isBulkMode} 
                        onToggleBulk={() => setIsBulkMode(!isBulkMode)} 
                        searchTerm={searchTerm} 
                        onSearchChange={setSearchTerm} 
                        onToggleLibrary={() => setShowLibrary(!showLibrary)} 
                        showLibrary={showLibrary} 
                        allowLibrary={allowLibrary}
                        onPaste={() => handlePaste('FixedItems')}
                        canPaste={canPaste}
                        onSelectAll={() => handleSelectAll(filterList(aggregatedFixedItems))}
                     />
                     
                     <FixedItemsSection 
                        fixedItems={aggregatedFixedItems}
                        isBulkMode={isBulkMode}
                        selectedIndices={selectedIndices}
                        onSelect={handleSelect}
                        handleContainerDrop={handleContainerDrop}
                        deleteFixedItem={deleteFixedItem}
                        updateFixedItem={updateFixedItem}
                        filterList={filterList}
                        getInputClass={getInputClass}
                     />
                 </div>
            )}

             {activeSection === "Subpresets" && (
                 <div className="p-6 md:p-8 w-full max-w-5xl mx-auto animate-slide-up relative pb-20" ref={containerRef}>
                    <SectionHeader 
                        title={t('section.subpresets')} 
                        count={data.Subpresets?.length || 0} 
                        onAdd={() => addItem('Subpresets')} 
                        typeColor="text-indigo-400" 
                        sectionList={data.Subpresets || []} 
                        isBulkMode={isBulkMode} 
                        onToggleBulk={() => setIsBulkMode(!isBulkMode)} 
                        searchTerm={searchTerm} 
                        onSearchChange={setSearchTerm} 
                        onToggleLibrary={() => setShowLibrary(!showLibrary)} 
                        showLibrary={showLibrary} 
                        allowLibrary={allowLibrary} 
                        onPaste={() => handlePaste('Subpresets')}
                        canPaste={canPaste}
                        onSelectAll={() => handleSelectAll(filterList(data.Subpresets || []))}
                        extraControls={
                            <div className="flex bg-scum-900 rounded-lg p-0.5 border border-scum-700 ml-4"><button onClick={() => setSubpresetViewMode('list')} className={`px-3 py-1 text-xs rounded ${subpresetViewMode === 'list' ? 'bg-indigo-500 text-white' : 'text-gray-500'}`}>{t('view.list')}</button><button onClick={() => setSubpresetViewMode('cards')} className={`px-3 py-1 text-xs rounded ${subpresetViewMode === 'cards' ? 'bg-indigo-500 text-white' : 'text-gray-500'}`}>{t('view.cards')}</button></div>
                        } 
                    />
                    
                    <SubpresetsSection 
                        subpresets={data.Subpresets || []}
                        isBulkMode={isBulkMode}
                        selectedIndices={selectedIndices}
                        onSelect={handleSelect}
                        handleContainerDrop={handleContainerDrop}
                        deleteItem={deleteItem}
                        updateItem={updateItem}
                        filterList={filterList}
                        getGlobalPercentage={getGlobalPercentage}
                        subpresetStats={subpresetStats}
                        onItemClick={handleItemClick}
                        onHoverItem={setHoveredItemId}
                        hoveredItemId={hoveredItemId}
                        getInputClass={getInputClass}
                        subpresetViewMode={subpresetViewMode}
                        handlePresetEnter={handlePresetEnter}
                        hidePreview={hidePreview}
                        presetPreviews={presetPreviews}
                    />
                 </div>
            )}
            
            {isZonesFile && activeSection === "Zones" && (
                <div className="p-6 md:p-8 w-full max-w-5xl mx-auto animate-slide-up relative pb-20" ref={containerRef}>
                     <SectionHeader 
                        title={t('editor.zonesDef')} 
                        count={data.Zones?.length || 0} 
                        onAdd={() => addItem('Zones')} 
                        typeColor="text-yellow-400" 
                        sectionList={data.Zones || []} 
                        isBulkMode={isBulkMode} 
                        onToggleBulk={() => setIsBulkMode(!isBulkMode)} 
                        searchTerm={searchTerm} 
                        onSearchChange={setSearchTerm} 
                        onToggleLibrary={() => setShowLibrary(!showLibrary)} 
                        showLibrary={showLibrary} 
                        allowLibrary={allowLibrary}
                        onPaste={() => handlePaste('Zones')}
                        canPaste={canPaste}
                        onSelectAll={() => handleSelectAll(filterList(data.Zones || []))}
                     />
                     <ZonesSection 
                        zones={data.Zones || []}
                        handleContainerDrop={handleContainerDrop}
                        deleteItem={deleteItem}
                        updateItem={updateItem}
                        getInputClass={getInputClass}
                        onPickZone={onPickZone}
                        isBulkMode={isBulkMode}
                        selectedIndices={selectedIndices}
                        onSelect={handleSelect}
                     />
                </div>
            )}
          </div>
      </div>

      {showLibrary && allowLibrary && (
          <div style={{ width: libraryWidth }} className="border-l border-scum-700/50 bg-[#0f172a] relative shrink-0 flex flex-col transition-all duration-200">
             <div className="absolute left-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-scum-accent/50 z-50 transition-colors bg-transparent -translate-x-[2px]" onMouseDown={startResizingLibrary} />
             <NodeLibrary data={nodeLibrary} onReset={onResetNodeLibrary} onUpload={onUploadNodeLibrary} onClose={() => setShowLibrary(false)} />
          </div>
      )}
    </div>
  );
};
