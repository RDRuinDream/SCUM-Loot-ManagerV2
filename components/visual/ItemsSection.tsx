
import React, { useRef } from 'react';
import { ItemProbabilityBar } from '../ItemProbabilityBar';
import { ItemInput } from '../ItemInput';
import { TrashIcon, CheckCircleIcon } from '../Icons';
import { useI18n } from '../../i18n';
import { getItemTranslation, hasTranslation } from '../../utils/itemTranslator';
import { stringToColor } from '../../utils/helpers';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ItemsSectionProps {
    items: any[];
    isBulkMode: boolean;
    selectedIndices: Set<number>;
    onSelect: (index: number) => void;
    handleContainerDrop: (e: React.DragEvent, section: any) => void;
    deleteItem: (section: any, index: number) => void;
    updateItem: (section: any, index: number, field: string, value: any) => void;
    filterList: (list: any[]) => { item: any; originalIndex: number }[];
    getGlobalPercentage: (id: string, rarity: string, section: any) => string;
    combinedLootStats: any;
    onItemClick: (id: string) => void;
    onHoverItem: (id: string | null) => void;
    hoveredItemId: string | null;
    getInputClass: (key?: string) => string;
}

const RARITY_OPTIONS = ["Abundant", "Common", "Uncommon", "Rare", "VeryRare", "ExtremelyRare"];

const RarityColorBorder = (rarity: string) => {
    switch(rarity) {
        case 'Abundant': return 'border-l-gray-400';
        case 'Common': return 'border-l-green-400';
        case 'Uncommon': return 'border-l-blue-400';
        case 'Rare': return 'border-l-pink-400';
        case 'VeryRare': return 'border-l-yellow-400';
        case 'ExtremelyRare': return 'border-l-orange-500';
        default: return 'border-l-transparent';
    }
};

export const ItemsSection: React.FC<ItemsSectionProps> = ({
    items,
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
    getInputClass
}) => {
    const { t } = useI18n();
    const filteredItems = filterList(items);
    
    // The scroll container might be far above, but we assume we scroll the whole body or have a container.
    // If it's a window scroller, we should use getScrollElement: () => window
    // First, let's wrap the items list in a scrolling container with a fixed height or max-height based on requirements,
    // OR just use window virtualizer. Given it's an editor form, it's inside `VisualEditor`'s big scroll container.
    // It is tricky because `VisualEditor` has multiple sections. A simple container for Items might be better, e.g. max-h-[600px] overflow-auto.
    
    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: filteredItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 100, // Reduced from 120 as it's quite compact
        overscan: 5,
    });

    return (
        <div>
            <div className="flex flex-col gap-2 relative">
                <ItemProbabilityBar 
                    items={items} 
                    type="Item" 
                    onItemClick={onItemClick} 
                    onHoverItem={onHoverItem} 
                    hoveredId={hoveredItemId} 
                    customStats={combinedLootStats} 
                />
            </div>
            
            <div 
                ref={parentRef} 
                className="max-h-[600px] overflow-y-auto custom-scrollbar pr-2 mt-4"
                onDragOver={(e) => e.preventDefault()} 
                onDrop={(e) => handleContainerDrop(e, 'Items')}
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {virtualizer.getVirtualItems().map((virtualItem) => {
                        const { item, originalIndex: idx } = filteredItems[virtualItem.index];
                        const itemId = item.Id || item.Name || `Item #${idx+1}`;
                        const isHovered = itemId === hoveredItemId;
                        const isSelected = selectedIndices.has(idx);
                        const hasTrans = hasTranslation(itemId);
                        const translation = hasTrans ? getItemTranslation(itemId) : null;
                        
                        return (
                            <div 
                                key={virtualItem.key} 
                                data-scum-item-id={itemId} 
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    // Make sure it takes up the exact height Virtualizer expects
                                    height: `${virtualItem.size}px`,
                                    transform: `translateY(${virtualItem.start}px)`,
                                }}
                                className="pb-3" // Using padding inside absolute div to create row gap
                            >
                                <div className={`
                                    relative flex flex-col gap-2 p-3 rounded-xl border-l-4 transition-all duration-200 ease-out group focus-within:z-50 h-[calc(100%-0.75rem)]
                                    ${RarityColorBorder(item.Rarity || "")}
                                    ${isSelected ? 'bg-scum-800/80 border-scum-accent/50 ring-1 ring-scum-accent/30' : 'bg-scum-800/30 border-white/5 hover:bg-scum-800/60'}
                                    ${isHovered ? 'ring-2 ring-scum-accent scale-[1.01] z-10' : ''}
                                `}>
                                    <div className="flex items-center gap-3">
                                        {isBulkMode ? (
                                            <div 
                                                className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center transition-colors ${isSelected ? 'bg-scum-accent border-scum-accent' : 'border-gray-600 hover:border-gray-400'}`}
                                                onClick={() => onSelect(idx)}
                                            >
                                                {isSelected && <CheckCircleIcon className="w-3.5 h-3.5 text-black" />}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-mono text-gray-600 w-6 opacity-50">#{idx + 1}</div>
                                        )}
                                        
                                        <div className="flex-1 min-w-0">
                                            {hasTrans && (
                                                <div className="text-sm font-bold text-sky-300 truncate drop-shadow-sm mb-0.5">{translation}</div>
                                            )}
                                        </div>

                                        <button onClick={() => deleteItem('Items', idx)} className="p-2 text-gray-600 hover:text-scum-danger opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon /></button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                        <div className="md:col-span-7">
                                            <ItemInput 
                                                className={`${getInputClass(`items_${idx}_id`)} bg-black/20 border-none focus:bg-scum-900/50 h-9 font-mono text-xs ${hasTrans ? 'text-gray-500' : 'text-gray-200 font-bold'}`} 
                                                value={item.Id || item.Name || ""} 
                                                onChange={(val) => updateItem('Items', idx, 'Id', val)} 
                                                placeholder={t('editor.itemIdPlaceholder')} 
                                            />
                                        </div>
                                        <div className="md:col-span-5 flex items-center gap-2">
                                            <select className={`${getInputClass(`items_${idx}_rarity`)} text-xs py-1 h-9 shadow-sm flex-1`} value={item.Rarity} onChange={(e) => updateItem('Items', idx, 'Rarity', e.target.value)}>{RARITY_OPTIONS.map(r => <option key={r} value={r}>{t(`rarity.${r}`)}</option>)}</select>
                                            <span className="text-[10px] text-gray-500 font-mono w-12 text-right">{getGlobalPercentage(item.Id, item.Rarity, 'Items')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
