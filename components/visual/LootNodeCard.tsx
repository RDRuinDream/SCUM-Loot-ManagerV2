
import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, FolderIcon, CubeIcon, TrashIcon, PlusIcon } from '../Icons';
import { useI18n } from '../../i18n';
import { stringToColor } from '../../utils/helpers';
import { getItemTranslation, hasTranslation } from '../../utils/itemTranslator';

interface LootNodeCardProps {
    node: any;
    path: number[]; // Array of indices to locate this node in the tree
    onSelect: (node: any, path: number[]) => void;
    selectedPathStr: string; // JSON stringified path for comparison
    onUpdate: (path: number[], field: string, value: any) => void;
    onDelete: (path: number[]) => void;
    onAddChild: (path: number[], isNode: boolean) => void;
}

const RARITY_OPTIONS = ["Abundant", "Common", "Uncommon", "Rare", "VeryRare", "ExtremelyRare"];

const RarityPicker = ({ value, onChange, compact = false }: { value: string, onChange: (val: string) => void, compact?: boolean }) => {
    return (
        <div className={`flex items-center gap-1.5 bg-black/40 rounded-lg p-1.5 border border-white/10 ${compact ? 'scale-90 origin-right' : ''}`}>
            {RARITY_OPTIONS.map(r => {
                const isActive = value === r;
                const baseColor = stringToColor(r);
                
                return (
                    <button
                        key={r}
                        onClick={(e) => { e.stopPropagation(); onChange(r); }}
                        className={`
                            relative h-5 transition-all duration-200 rounded-sm border border-transparent shadow-sm
                            ${isActive 
                                ? 'w-8 opacity-100 ring-1 ring-white/90 z-10 shadow-[0_0_8px_currentColor] scale-110 brightness-110' 
                                : 'w-4 opacity-40 hover:opacity-100 hover:w-6 hover:scale-105 hover:brightness-125'}
                        `}
                        style={{ backgroundColor: baseColor }}
                        title={r}
                    >
                        {/* Active Indicator */}
                    </button>
                );
            })}
            <span className="ml-1 text-[10px] font-mono font-bold text-gray-400 min-w-[3ch] select-none pointer-events-none">{value ? value.substring(0, 3) : "???"}</span>
        </div>
    );
};

export const LootNodeCard: React.FC<LootNodeCardProps> = ({ 
    node, 
    path, 
    onSelect, 
    selectedPathStr, 
    onUpdate, 
    onDelete, 
    onAddChild 
}) => {
    const { t } = useI18n();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    
    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(node.Name);
    const inputRef = useRef<HTMLInputElement>(null);

    const isNode = Array.isArray(node.Children);
    const currentPathStr = JSON.stringify(path);
    const isSelected = selectedPathStr === currentPathStr;
    const isRoot = path.length === 0;

    const hasTrans = hasTranslation(node.Name);
    const displayName = hasTrans ? getItemTranslation(node.Name) : node.Name;

    // Sync external changes to edit state
    useEffect(() => {
        setEditName(node.Name);
    }, [node.Name]);

    // Handle F2 Key for renaming
    useEffect(() => {
        if (!isSelected) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                setIsEditing(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSelected]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const commitEdit = () => {
        if (editName !== node.Name) {
            onUpdate(path, 'Name', editName);
        }
        setIsEditing(false);
    };

    const cancelEdit = () => {
        setEditName(node.Name);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.stopPropagation();
            commitEdit();
        } else if (e.key === 'Escape') {
            e.stopPropagation();
            cancelEdit();
        }
    };

    const handleNameRightClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(node, path);
        setIsEditing(true);
    };

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(node, path);
    };

    const rarityBorderColor = (rarity: string): React.CSSProperties => {
        if (!rarity) return { borderLeftColor: 'transparent' };
        const color = stringToColor(rarity);
        return { borderLeftColor: color };
    };

    // --- ITEM RENDER (LEAF) ---
    if (!isNode) {
        return (
            <div 
                className={`
                    relative flex items-center gap-3 p-2 rounded-lg border-l-[3px] transition-all duration-200 group mb-1 ml-6
                    ${isSelected ? 'bg-scum-800/90 border-scum-accent ring-1 ring-scum-accent/30 z-10' : 'bg-scum-900/30 border-white/5 hover:bg-scum-800/60'}
                `}
                style={!isSelected ? rarityBorderColor(node.Rarity) : undefined}
                onClick={handleSelect}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-center gap-2">
                        <CubeIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-scum-accent' : 'text-gray-600'}`} />
                        
                        {isEditing ? (
                            <input 
                                ref={inputRef}
                                className="bg-black/40 border border-scum-accent/50 text-xs font-bold text-white rounded px-1 flex-1 outline-none min-w-0 shadow-inner"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={handleKeyDown}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span 
                                className={`text-xs font-bold truncate flex-1 cursor-pointer border border-transparent hover:border-white/5 px-1 rounded select-none ${hasTrans ? 'text-gray-500 font-normal' : 'text-gray-300'}`}
                                onContextMenu={handleNameRightClick}
                                title="Right-click or press F2 to rename"
                            >
                                {node.Name}
                            </span>
                        )}
                    </div>
                    {hasTrans && <span className="text-[10px] text-sky-300 pl-6 truncate -mt-0.5 font-bold">{displayName}</span>}
                </div>

                <div className="flex items-center gap-2">
                    <RarityPicker value={node.Rarity} onChange={(val) => onUpdate(path, 'Rarity', val)} compact />
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(path); }}
                        className={`p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-opacity ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <TrashIcon className="w-3 h-3" />
                    </button>
                </div>
            </div>
        );
    }

    // --- NODE RENDER (FOLDER) ---
    return (
        <div className="mb-2 select-none">
            <div 
                className={`
                    flex items-center gap-2 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer group
                    ${isSelected ? 'bg-indigo-900/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-scum-800/40 border-white/5 hover:bg-scum-800/70 hover:border-white/10'}
                `}
                onClick={handleSelect}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div 
                    className={`p-1.5 rounded-full transition-all duration-200 ${isExpanded ? 'bg-white/10 text-white rotate-90' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                    onClick={handleToggle}
                >
                    <ChevronRight className="w-2.5 h-2.5" />
                </div>

                <div className="relative">
                    <FolderIcon className={`w-5 h-5 ${isSelected ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-400'}`} />
                    <span className="absolute -bottom-1 -right-1 text-[8px] bg-black/60 text-gray-400 px-1 rounded-full border border-white/10 font-mono">
                        {node.Children.length}
                    </span>
                </div>

                <div className="flex-1 min-w-0 flex flex-col ml-1">
                    {isEditing ? (
                        <input 
                            ref={inputRef}
                            className="bg-black/40 border border-indigo-500/50 text-sm font-bold text-white rounded px-1 outline-none min-w-0 shadow-inner"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <div className="flex flex-col">
                            <span 
                                className={`text-sm font-bold truncate cursor-pointer border border-transparent hover:border-white/5 px-1 rounded select-none ${hasTrans ? 'text-sky-300' : 'text-gray-200'}`}
                                onContextMenu={handleNameRightClick}
                                title="Right-click or press F2 to rename"
                            >
                                {hasTrans ? displayName : node.Name}
                            </span>
                            {hasTrans && <span className="text-[9px] text-gray-500 font-mono px-1">{node.Name}</span>}
                        </div>
                    )}
                </div>

                {!isRoot && (
                    <div className="hidden sm:block">
                        <RarityPicker value={node.Rarity} onChange={(val) => onUpdate(path, 'Rarity', val)} />
                    </div>
                )}

                <div className={`flex items-center gap-1 transition-opacity ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}`}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAddChild(path, true); setIsExpanded(true); }}
                        className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded"
                        title="Add Sub-Node"
                    >
                        <FolderIcon className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAddChild(path, false); setIsExpanded(true); }}
                        className="p-1.5 text-gray-500 hover:text-scum-accent hover:bg-scum-accent/10 rounded"
                        title="Add Item"
                    >
                        <PlusIcon className="w-3.5 h-3.5" />
                    </button>
                    {!isRoot && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(path); }}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {isExpanded && node.Children && (
                <div className="ml-3 pl-3 border-l border-white/5 mt-1 space-y-1 animate-slide-down">
                    {node.Children.map((child: any, idx: number) => (
                        <LootNodeCard 
                            key={idx} 
                            node={child} 
                            path={[...path, idx]} 
                            onSelect={onSelect}
                            selectedPathStr={selectedPathStr}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            onAddChild={onAddChild}
                        />
                    ))}
                    {node.Children.length === 0 && (
                        <div className="text-[10px] text-gray-600 italic py-2 ml-4">Empty Node</div>
                    )}
                </div>
            )}
        </div>
    );
};
