
import React from 'react';
import { ItemProbabilityBar } from '../ItemProbabilityBar';
import { ItemInput } from '../ItemInput';
import { TrashIcon, CheckCircleIcon } from '../Icons';
import { useI18n } from '../../i18n';
import { getItemTranslation, hasTranslation } from '../../utils/itemTranslator';

interface SubpresetsSectionProps {
    subpresets: any[];
    isBulkMode: boolean;
    selectedIndices: Set<number>;
    onSelect: (index: number) => void;
    handleContainerDrop: (e: React.DragEvent, section: any) => void;
    deleteItem: (section: any, index: number) => void;
    updateItem: (section: any, index: number, field: string, value: any) => void;
    filterList: (list: any[]) => { item: any; originalIndex: number }[];
    getGlobalPercentage: (id: string, rarity: string, section: any) => string;
    subpresetStats: any;
    onItemClick: (id: string) => void;
    onHoverItem: (id: string | null) => void;
    hoveredItemId: string | null;
    getInputClass: (key?: string) => string;
    subpresetViewMode: 'list' | 'cards';
    handlePresetEnter: (e: React.MouseEvent, id: string) => void;
    hidePreview: () => void;
    presetPreviews: Record<string, any>;
}

const RARITY_OPTIONS = ["Abundant", "Common", "Uncommon", "Rare", "VeryRare", "ExtremelyRare"];

export const SubpresetsSection: React.FC<SubpresetsSectionProps> = ({
    subpresets,
    isBulkMode,
    selectedIndices,
    onSelect,
    handleContainerDrop,
    deleteItem,
    updateItem,
    filterList,
    getGlobalPercentage,
    subpresetStats,
    onItemClick,
    onHoverItem,
    hoveredItemId,
    getInputClass,
    subpresetViewMode,
    handlePresetEnter,
    hidePreview,
    presetPreviews
}) => {
    const { t } = useI18n();

    return (
        <div>
            <div className="flex flex-col gap-2 relative">
                <ItemProbabilityBar 
                    items={subpresets} 
                    type="Subpreset" 
                    onItemClick={onItemClick} 
                    onHoverItem={onHoverItem} 
                    hoveredId={hoveredItemId} 
                    customStats={subpresetStats} 
                />
            </div>
            
            {subpresetViewMode === 'list' && (
                <div className="space-y-2 min-h-[100px]" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleContainerDrop(e, 'Subpresets')}>
                    {filterList(subpresets).map(({ item, originalIndex: idx }) => {
                        const itemId = item.Id || `Subpreset #${idx+1}`;
                        const isSelected = selectedIndices.has(idx);
                        const hasTrans = hasTranslation(item.Id || "");
                        const translation = hasTrans ? getItemTranslation(item.Id || "") : null;

                        return (
                        <div 
                            key={idx} 
                            data-scum-item-id={item.Id} 
                            className={`
                                relative flex flex-col gap-2 p-3 rounded-xl border-l-4 transition-all duration-200 ease-out group focus-within:z-50
                                ${isSelected ? 'bg-scum-800/80 border-indigo-500 ring-1 ring-indigo-500/30' : 'bg-scum-800/30 border-transparent hover:bg-scum-800/60'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                {isBulkMode ? (
                                    <div 
                                        className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-600 hover:border-gray-400'}`}
                                        onClick={() => onSelect(idx)}
                                    >
                                        {isSelected && <CheckCircleIcon className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-mono text-gray-600 w-6 opacity-50">#{idx + 1}</div>
                                )}
                                
                                <div className="flex-1">
                                    {hasTrans && (
                                        <div className="text-sm font-bold text-sky-300 truncate">{translation}</div>
                                    )}
                                </div>
                                <button onClick={() => deleteItem('Subpresets', idx)} className="p-2 text-gray-600 hover:text-scum-danger opacity-0 group-hover:opacity-100"><TrashIcon /></button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                <div className="md:col-span-7">
                                    <ItemInput 
                                        className={`${getInputClass(`subpresets_${idx}_id`)} bg-black/20 border-none focus:bg-scum-900/50 h-9 font-mono text-xs ${hasTrans ? 'text-gray-500' : 'text-gray-200 font-bold'}`} 
                                        value={item.Id || ""} 
                                        onChange={(val) => updateItem('Subpresets', idx, 'Id', val)}
                                        onMouseEnter={(e) => handlePresetEnter(e, item.Id || "")}
                                        onMouseLeave={hidePreview}
                                        isSubpreset={true}
                                        onDropFile={(filename) => updateItem('Subpresets', idx, 'Id', filename)}
                                    />
                                </div>
                                <div className="md:col-span-5">
                                    <select className={`${getInputClass(`subpresets_${idx}_rarity`)} text-xs py-1 h-9 shadow-sm w-full`} value={item.Rarity} onChange={(e) => updateItem('Subpresets', idx, 'Rarity', e.target.value)}>{RARITY_OPTIONS.map(r => <option key={r} value={r}>{t(`rarity.${r}`)}</option>)}</select>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            )}

            {subpresetViewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[100px]" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleContainerDrop(e, 'Subpresets')}>
                    {filterList(subpresets).map(({ item, originalIndex: idx }) => {
                        const isSelected = selectedIndices.has(idx);
                        const preview = item.Id ? presetPreviews[item.Id] : null;
                        const hasTrans = hasTranslation(item.Id || "");
                        const translation = hasTrans ? getItemTranslation(item.Id || "") : null;

                        return (
                        <div 
                            key={idx} 
                            data-scum-item-id={item.Id} 
                            className={`
                                relative p-4 rounded-xl border transition-all duration-200 group flex flex-col gap-3 focus-within:z-50
                                ${isSelected ? 'bg-scum-800/80 border-indigo-500 ring-1 ring-indigo-500/30' : 'bg-scum-800/30 border-scum-700/50 hover:bg-scum-800/60'}
                            `}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 w-full">
                                    {isBulkMode ? (
                                        <div 
                                            className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-600 hover:border-gray-400'}`}
                                            onClick={() => onSelect(idx)}
                                        >
                                            {isSelected && <CheckCircleIcon className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                    ) : (
                                        <div className="text-[10px] font-mono text-gray-600 w-6 opacity-50 shrink-0">#{idx + 1}</div>
                                    )}
                                    
                                    <div className="flex-1 min-w-0">
                                        <ItemInput 
                                            className={`${getInputClass(`subpresets_${idx}_id`)} bg-black/20 border-none focus:bg-scum-900/50 h-8 font-mono text-xs font-bold ${hasTrans ? 'text-gray-500 font-normal' : 'text-gray-200'}`} 
                                            value={item.Id || ""} 
                                            onChange={(val) => updateItem('Subpresets', idx, 'Id', val)}
                                            onMouseEnter={(e) => handlePresetEnter(e, item.Id || "")}
                                            onMouseLeave={hidePreview}
                                            isSubpreset={true}
                                            onDropFile={(filename) => updateItem('Subpresets', idx, 'Id', filename)}
                                        />
                                        {translation && <div className="text-[10px] text-sky-300 mt-1 truncate px-1 font-bold">{translation}</div>}
                                    </div>
                                </div>
                                <button onClick={() => deleteItem('Subpresets', idx)} className="p-2 text-gray-600 hover:text-scum-danger opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon /></button>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <select className={`${getInputClass(`subpresets_${idx}_rarity`)} text-xs py-1 h-8 shadow-sm flex-1`} value={item.Rarity} onChange={(e) => updateItem('Subpresets', idx, 'Rarity', e.target.value)}>{RARITY_OPTIONS.map(r => <option key={r} value={r}>{t(`rarity.${r}`)}</option>)}</select>
                                <span className="text-[10px] text-gray-500 font-mono w-12 text-right">{getGlobalPercentage(item.Id, item.Rarity, 'Subpresets')}</span>
                            </div>

                            {/* Preview Content */}
                            <div className="bg-black/20 rounded-lg p-2 border border-white/5 flex-1 min-h-[80px] max-h-48 overflow-y-auto custom-scrollbar">
                                {preview ? (
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center text-[9px] text-gray-500 border-b border-white/5 pb-1 mb-1 sticky top-0 bg-[#161f32]">
                                            <span>{t('common.items')} ({preview.Items?.length || 0})</span>
                                            <span>{t('section.subpresets')} ({preview.Subpresets?.length || 0})</span>
                                        </div>
                                        {preview.Items && preview.Items.slice(0, 20).map((pi: any, piIdx: number) => (
                                            <div key={piIdx} className="flex items-center gap-2 text-[10px] text-gray-400">
                                                <div className="w-1 h-1 rounded-full bg-scum-accent/50"></div>
                                                <span className="truncate">{hasTranslation(pi.Id) ? getItemTranslation(pi.Id) : pi.Id}</span>
                                            </div>
                                        ))}
                                        {preview.Items && preview.Items.length > 20 && <div className="text-[9px] text-gray-600 italic pl-3">...</div>}
                                        
                                        {preview.Subpresets && preview.Subpresets.map((ps: any, psIdx: number) => (
                                            <div key={psIdx} className="flex items-center gap-2 text-[10px] text-indigo-300">
                                                <div className="w-1 h-1 rounded-full bg-indigo-500/50"></div>
                                                <span className="truncate">{ps.Id}</span>
                                            </div>
                                        ))}

                                        {(!preview.Items || preview.Items.length === 0) && (!preview.Subpresets || preview.Subpresets.length === 0) && (
                                            <div className="text-[10px] text-gray-600 italic text-center py-2">{t('zones.noItems')}</div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-1 opacity-50">
                                        {item.Id ? 
                                            <span className="text-[10px] italic">{t('preview.notFound')}</span> 
                                            : <span className="text-[10px] italic">{t('nodes.enterId')}</span>
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
};
