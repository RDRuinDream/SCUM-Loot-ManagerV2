
import React from 'react';
import { ItemInput } from '../ItemInput';
import { TrashIcon, CheckCircleIcon } from '../Icons';
import { useI18n } from '../../i18n';
import { getItemTranslation, hasTranslation } from '../../utils/itemTranslator';

interface FixedItemsSectionProps {
    fixedItems: any[];
    isBulkMode: boolean;
    selectedIndices: Set<number>;
    onSelect: (index: number) => void;
    handleContainerDrop: (e: React.DragEvent, section: any) => void;
    deleteFixedItem: (index: number) => void;
    updateFixedItem: (index: number, field: 'Id' | 'Quantity', value: string | number) => void;
    filterList: (list: any[]) => { item: any; originalIndex: number }[];
    getInputClass: (key?: string) => string;
}

export const FixedItemsSection: React.FC<FixedItemsSectionProps> = ({
    fixedItems,
    isBulkMode,
    selectedIndices,
    onSelect,
    handleContainerDrop,
    deleteFixedItem,
    updateFixedItem,
    filterList,
    getInputClass
}) => {
    const { t } = useI18n();

    return (
        <div className="space-y-3 pb-20" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleContainerDrop(e, 'FixedItems')}>
            {filterList(fixedItems).map(({ item, originalIndex: idx }) => {
                const isSelected = selectedIndices.has(idx);
                const hasTrans = hasTranslation(item.Id || "");
                const translation = hasTrans ? getItemTranslation(item.Id || "") : null;

                return (
                <div 
                    key={idx} 
                    className={`
                        relative p-2 pl-4 rounded-lg flex items-center gap-4 border transition-all duration-200 focus-within:z-50
                        ${isSelected ? 'bg-scum-800/80 border-emerald-500/50 ring-1 ring-emerald-500/30' : 'bg-scum-800/30 border-transparent hover:bg-scum-800/60'}
                    `}
                >
                    {isBulkMode ? (
                        <div 
                            className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600 hover:border-gray-400'}`}
                            onClick={() => onSelect(idx)}
                        >
                            {isSelected && <CheckCircleIcon className="w-3.5 h-3.5 text-black" />}
                        </div>
                    ) : (
                        <div className="text-[10px] font-mono text-gray-600 w-6 opacity-50 shrink-0">#{idx + 1}</div>
                    )}
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-8 relative flex flex-col gap-1">
                            {hasTrans && (
                                <div className="text-xs font-bold text-sky-300 ml-1 drop-shadow-sm">{translation}</div>
                            )}
                            <ItemInput 
                                className={`${getInputClass(`fixed_${idx}_id`)} bg-transparent border-none h-8 font-mono text-xs ${hasTrans ? 'text-gray-500' : 'text-gray-200 font-bold'}`} 
                                value={item.Id || ""} 
                                onChange={(val) => updateFixedItem(idx, 'Id', val)} 
                                placeholder={t('editor.itemIdPlaceholder')} 
                            />
                        </div>
                        <div className="md:col-span-4 flex items-center gap-2">
                            <label className="text-[10px] text-gray-500 font-bold uppercase">{t('editor.qtyAbbr')}</label>
                            <input type="number" min="1" className={`${getInputClass()} text-xs py-1 h-8 shadow-sm font-bold text-emerald-300`} value={item.Quantity} onChange={(e) => updateFixedItem(idx, 'Quantity', parseInt(e.target.value) || 1)} />
                        </div>
                    </div>
                    <button onClick={() => deleteFixedItem(idx)} className="p-2 text-gray-600 hover:text-scum-danger"><TrashIcon /></button>
                </div>
            )})}
        </div>
    );
};
