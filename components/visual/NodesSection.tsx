
import React from 'react';
import { ItemProbabilityBar } from '../ItemProbabilityBar';
import { TrashIcon, CheckCircleIcon } from '../Icons';
import { useI18n } from '../../i18n';
import { NodeEffectivePool } from './NodeEffectivePool';
import { ScumJson } from '../../types';
import { hasTranslation, getItemTranslation } from '../../utils/itemTranslator';

interface NodesSectionProps {
    nodes: any[];
    isBulkMode: boolean;
    selectedIndices: Set<number>;
    onSelect: (index: number) => void;
    handleContainerDrop: (e: React.DragEvent, section: any) => void;
    deleteItem: (section: any, index: number) => void;
    updateItem: (section: any, index: number, field: string, value: any) => void;
    filterList: (list: any[]) => { item: any; originalIndex: number }[];
    getGlobalPercentage: (id: string | undefined, rarity: string, section: any) => string;
    combinedLootStats: any;
    onItemClick: (id: string) => void;
    onHoverItem: (id: string | null) => void;
    hoveredItemId: string | null;
    getInputClass: (key?: string) => string;
    currentLibrary: any;
    handleLibraryDropOnNode: (e: React.DragEvent, index: number) => void;
    nodeOverrides?: Record<string, ScumJson>;
}

const RARITY_OPTIONS = ["Abundant", "Common", "Uncommon", "Rare", "VeryRare", "ExtremelyRare"];

export const NodesSection: React.FC<NodesSectionProps> = ({
    nodes,
    isBulkMode,
    selectedIndices,
    onSelect,
    handleContainerDrop,
    deleteItem,
    updateItem,
    filterList,
    getGlobalPercentage,
    combinedLootStats,
    onItemClick,
    onHoverItem,
    hoveredItemId,
    getInputClass,
    currentLibrary,
    handleLibraryDropOnNode,
    nodeOverrides
}) => {
    const { t } = useI18n();

    return (
        <div>
            <div className="flex flex-col gap-2 relative">
                <ItemProbabilityBar 
                    items={nodes} 
                    type="Node" 
                    onItemClick={onItemClick} 
                    onHoverItem={onHoverItem} 
                    hoveredId={hoveredItemId} 
                    customStats={combinedLootStats} 
                />
            </div>
            
            <div className="grid gap-6 min-h-[100px]" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleContainerDrop(e, 'Nodes')}>
                {filterList(nodes).map(({ item: node, originalIndex: idx }) => {
                    const firstId = node.Ids && node.Ids.length > 0 ? node.Ids[0] : null; 
                    const nodeId = firstId ? `Node [${firstId}]` : `Node #${idx+1}`; 
                    const isHovered = nodeId === hoveredItemId;
                    const isSelected = selectedIndices.has(idx);

                    return (
                    <div 
                        key={idx} 
                        data-scum-item-id={nodeId} 
                        className={`
                            relative p-6 rounded-2xl border transition-all duration-300 group glass-card focus-within:z-50
                            ${isSelected ? 'bg-scum-800/80 border-pink-500/50 ring-1 ring-pink-500/30' : 'bg-scum-800/30 border-scum-700/50'}
                            ${isHovered ? 'ring-2 ring-pink-400' : ''}
                        `} 
                        onDrop={(e) => handleLibraryDropOnNode(e, idx)}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                {isBulkMode ? (
                                    <div 
                                        className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center transition-colors ${isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-600 hover:border-gray-400'}`}
                                        onClick={() => onSelect(idx)}
                                    >
                                        {isSelected && <CheckCircleIcon className="w-3.5 h-3.5 text-black" />}
                                    </div>
                                ) : (
                                    <div className="text-sm font-bold text-gray-500">#{idx + 1}</div>
                                )}
                                
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <select className={`${getInputClass(`nodes_${idx}_rarity`)} w-40 font-bold text-pink-300`} value={node.Rarity} onChange={(e) => updateItem('Nodes', idx, 'Rarity', e.target.value)}>{RARITY_OPTIONS.map(r => <option key={r} value={r}>{t(`rarity.${r}`)}</option>)}</select>
                                        <span className="text-[10px] text-gray-500 font-mono w-12 text-right mt-4">{getGlobalPercentage(undefined, node.Rarity, 'Nodes')}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => deleteItem('Nodes', idx)} className="p-2 text-gray-500 hover:text-scum-danger"><TrashIcon /></button>
                        </div>
                        <div className="bg-black/20 rounded-lg p-3 border border-white/5 min-h-[50px] mb-3">
                            <div className="flex flex-col gap-1.5 items-start max-h-48 overflow-y-auto custom-scrollbar pr-1 w-full">
                                {node.Ids?.map((id: string, idIdx: number) => {
                                    const hasTrans = hasTranslation(id);
                                    const translation = hasTrans ? getItemTranslation(id) : null;
                                    
                                    return (
                                        <div key={idIdx} className="group/tag flex items-center bg-scum-900 border rounded px-2 py-1 text-xs border-scum-700">
                                            {hasTrans ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sky-300 font-bold leading-tight">{translation}</span>
                                                    <span className="text-[9px] text-gray-600 font-mono leading-tight">{id}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 font-mono font-bold">{id}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <NodeEffectivePool nodeIds={node.Ids} library={currentLibrary} nodeOverrides={nodeOverrides} />
                    </div>
                    );
                })}
            </div>
        </div>
    );
};
