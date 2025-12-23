
import React, { useState, useMemo } from 'react';
import { ITEM_LOOT_TREE_NODES } from '../data/itemLootTreeNodes';
import { ChevronRight, CubeIcon, SearchIcon, FolderIcon, ArrowPathIcon, ArrowUpTrayIcon, XMarkIcon } from './Icons';
import { useI18n } from '../i18n';
import { stringToColor } from '../utils/helpers';
import { getLeafItems } from '../utils/lootNodeResolver';
import { getItemTranslation, hasTranslation } from '../utils/itemTranslator';

interface TreeNodeProps {
    node: any;
    depth: number;
    searchTerm: string;
    parentPath: string;
    onDragStart: (e: React.DragEvent, node: any, fullPath: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, searchTerm, parentPath, onDragStart }) => {
    const { t } = useI18n();
    const [expanded, setExpanded] = useState(false);
    
    // Current Node Path
    const currentPath = parentPath ? `${parentPath}.${node.Name}` : node.Name;

    // Memoize leaf calculation for performance
    const leafItems = useMemo(() => getLeafItems(node), [node]);
    const leafCount = leafItems.length;

    // Translation
    const displayName = hasTranslation(node.Name) ? getItemTranslation(node.Name) : node.Name;

    // Check if any children match the search term
    const matchesSearch = (n: any): boolean => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        
        // Check Name
        if (n.Name.toLowerCase().includes(term)) return true;
        
        // Check Translation
        if (hasTranslation(n.Name)) {
            const trans = getItemTranslation(n.Name).toLowerCase();
            if (trans.includes(term)) return true;
        }

        if (n.Children) {
            return n.Children.some((child: any) => matchesSearch(child));
        }
        return false;
    };

    if (!matchesSearch(node)) return null;

    const hasChildren = node.Children && node.Children.length > 0;
    const isLeaf = !hasChildren;
    
    // Auto-expand if searching
    const isExpanded = expanded || (!!searchTerm && searchTerm.length > 2);

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        onDragStart(e, node, currentPath);
    };

    const tooltipText = leafCount > 0 && hasChildren
        ? `${displayName} (${node.Name})\n${t('common.path')}: ${currentPath}\n${t('library.containsItems', [leafCount])}\n- ${leafItems.slice(0, 10).join('\n- ')}${leafItems.length > 10 ? `\n${t('library.andMore', [leafItems.length - 10])}` : ''}`
        : `${displayName} (${node.Name})\n${t('common.path')}: ${currentPath}`;

    return (
        <div className="select-none">
            <div 
                className={`
                    flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 transition-colors border-l border-transparent group
                    ${isLeaf ? 'hover:text-scum-accent' : ''}
                `}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (hasChildren) setExpanded(!expanded);
                }}
                draggable
                onDragStart={handleDragStart}
                title={tooltipText}
            >
                <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} text-gray-500`}>
                    {hasChildren ? <ChevronRight className="w-3 h-3" /> : <span className="w-3 block" />}
                </span>
                
                {hasChildren ? (
                     <FolderIcon className="w-3.5 h-3.5 text-yellow-500 opacity-80" />
                ) : (
                     <CubeIcon className="w-3.5 h-3.5 text-scum-accent opacity-80" />
                )}

                <span className={`text-xs truncate flex-1 ${isLeaf ? 'text-gray-300' : 'text-gray-400 font-bold'}`}>
                    {displayName}
                </span>

                {hasChildren && leafCount > 0 && (
                    <span className="text-[9px] text-gray-600 font-mono group-hover:text-gray-400">
                        {leafCount}
                    </span>
                )}
                
                {node.Rarity && (
                    <span 
                        className="text-[9px] px-1.5 py-0.5 rounded-full opacity-70 ml-2"
                        style={{ 
                            backgroundColor: stringToColor(node.Rarity) + '20', 
                            color: stringToColor(node.Rarity),
                            border: `1px solid ${stringToColor(node.Rarity)}40`
                        }}
                    >
                        {node.Rarity}
                    </span>
                )}
            </div>
            
            {hasChildren && isExpanded && (
                <div className="border-l border-white/5 ml-3">
                    {node.Children.map((child: any, idx: number) => (
                        <TreeNode 
                            key={idx} 
                            node={child} 
                            depth={depth + 1} 
                            searchTerm={searchTerm} 
                            parentPath={currentPath}
                            onDragStart={onDragStart}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const NodeLibrary: React.FC<{ data?: any, onReset?: () => void, onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void, onClose?: () => void }> = ({ data, onReset, onUpload, onClose }) => {
    const { t } = useI18n();
    const [searchTerm, setSearchTerm] = useState("");

    const activeData = data || ITEM_LOOT_TREE_NODES;
    const isCustom = !!data;
    const isEmpty = !activeData.Children || activeData.Children.length === 0;

    const handleDragStart = (e: React.DragEvent, node: any, fullPath: string) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            Id: fullPath, // Use Full Path as the ID
            Rarity: node.Rarity || "Common",
            fromLibrary: true
        }));
        e.dataTransfer.setData('text/plain', fullPath);
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div className="flex flex-col h-full bg-[#0b1120] border-l border-scum-700/50">
            <div className="p-4 border-b border-scum-700/50 bg-[#0f172a]/80 backdrop-blur">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <CubeIcon className="w-4 h-4 text-scum-accent" />
                        {t('library.title')}
                    </h3>
                    <div className="flex gap-1 items-center">
                        {onUpload && (
                             <label className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors cursor-pointer" title={t('library.importJson')}>
                                 <ArrowUpTrayIcon className="w-4 h-4" />
                                 <input type="file" multiple className="hidden" onChange={onUpload} accept=".json" />
                             </label>
                        )}
                        {isCustom && onReset && (
                            <button 
                                onClick={onReset}
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                title={t('library.reset')}
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                            </button>
                        )}
                        {onClose && (
                            <button 
                                onClick={onClose}
                                className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors ml-1"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
                
                {isCustom && (
                    <div className="mb-2 text-[10px] text-scum-accent bg-scum-accent/10 border border-scum-accent/30 px-2 py-1 rounded">
                        {t('library.custom')}
                    </div>
                )}

                <div className="relative group">
                    <input 
                        type="text" 
                        placeholder={t('library.search')}
                        className="w-full bg-scum-900 border border-scum-700 rounded-lg py-1.5 pl-8 pr-2 text-xs text-gray-300 focus:outline-none focus:border-scum-accent transition-all placeholder-gray-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <SearchIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-scum-accent" />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                 {!isEmpty ? (
                     <TreeNode 
                        node={activeData} 
                        depth={0} 
                        searchTerm={searchTerm} 
                        parentPath=""
                        onDragStart={handleDragStart} 
                    />
                 ) : (
                     <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 text-center">
                         <CubeIcon className="w-8 h-8 mb-2 opacity-20" />
                         <p className="text-xs">{t('library.empty')}</p>
                         <p className="text-[10px] mt-2 opacity-60">{t('library.emptyHint')}</p>
                     </div>
                 )}
            </div>
            
            <div className="p-2 border-t border-scum-700/50 text-[10px] text-gray-500 text-center bg-[#0f172a]/50">
                {t('library.dragHint')}
            </div>
        </div>
    );
};
