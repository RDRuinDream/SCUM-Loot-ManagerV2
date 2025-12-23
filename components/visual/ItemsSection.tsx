
import React from 'react';
import { ItemProbabilityBar } from '../ItemProbabilityBar';
import { ItemInput } from '../ItemInput';
import { TrashIcon, CheckCircleIcon } from '../Icons';
import { useI18n } from '../../i18n';
import { getItemTranslation, hasTranslation } from '../../utils/itemTranslator';
import { stringToColor } from '../../utils/helpers';

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
            
            <div className="grid grid-cols-1 gap-3 min-h-[100px]" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleContainerDrop(e, 'Items')}>
                {filterList(items).map(({ item, originalIndex: idx }) => {
                    const itemId = item.Id || item.Name || `Item #${idx+1}`;
                    const isHovered = itemId === hoveredItemId;
                    const isSelected = selectedIndices.has(idx);
                    const hasTrans = hasTranslation(itemId);
                    const translation = hasTrans ? getItemTranslation(itemId) : null;
                    
                    return (
                        <div 
                            key={idx} 
                            data-scum-item-id={itemId} 
                            className={`
                                relative flex flex-col gap-2 p-3 rounded-xl border-l-4 transition-all duration-200 ease-out group focus-within:z-50
                                ${RarityColorBorder(item.Rarity || "")}
                                ${isSelected ? 'bg-scum-800/80 border-scum-accent/50 ring-1 ring-scum-accent/30' : 'bg-scum-800/30 border-white/5 hover:bg-scum-800/60'}
                                ${isHovered ? 'ring-2 ring-scum-accent scale-[1.01] z-10' : ''}
                            `}
                        >
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
                    );
                })}
            </div>
        </div>
    );
};
