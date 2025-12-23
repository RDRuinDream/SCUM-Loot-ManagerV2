

import React, { useState, useMemo, useEffect } from 'react';
import { ItemSpawningParametersJson, ItemSpawningParameter } from '../types';
import { TrashIcon, PlusIcon, SearchIcon, ChevronRight } from './Icons';
import { useI18n } from '../i18n';
import { getItemTranslation, hasTranslation, getIdsByTranslationMatch } from '../utils/itemTranslator';
import { BooleanToggle, TimeDurationInput } from './FormControls';

interface ItemSpawningParametersEditorProps {
    data: ItemSpawningParametersJson;
    onChange: (newData: ItemSpawningParametersJson) => void;
}

const LOCATIONS = ["Coastal", "Continental", "Mountain"];

export const ItemSpawningParametersEditor: React.FC<ItemSpawningParametersEditorProps> = ({ data, onChange }) => {
    const { t } = useI18n();
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());

    const parameters = data.Parameters || [];

    const handleUpdate = (index: number, field: keyof ItemSpawningParameter, value: any) => {
        const list = [...parameters];
        list[index] = { ...list[index], [field]: value };
        onChange({ ...data, Parameters: list });
    };

    const handleAdd = () => {
        const list = [...parameters];
        list.push({
            Id: `New_Item_${list.length + 1}`,
            IsDisabledForSpawning: false,
            AllowedLocations: [...LOCATIONS],
            CooldownPerSquadMemberMin: 0,
            CooldownPerSquadMemberMax: 0,
            CooldownGroup: "",
            Variations: [],
            ShouldOverrideInitialAndRandomUsage: false,
            InitialUsageOverride: 0,
            RandomUsageOverrideUsage: 0
        });
        onChange({ ...data, Parameters: list });
    };

    const handleRemove = (index: number) => {
        if (confirm(t('common.confirmDelete'))) {
            const list = [...parameters];
            list.splice(index, 1);
            onChange({ ...data, Parameters: list });
        }
    };

    const toggleLocation = (index: number, loc: string) => {
        const currentLocs = parameters[index].AllowedLocations || [];
        let newLocs;
        if (currentLocs.includes(loc)) {
            newLocs = currentLocs.filter(l => l !== loc);
        } else {
            newLocs = [...currentLocs, loc];
        }
        handleUpdate(index, 'AllowedLocations', newLocs);
    };

    const toggleExpand = (index: number) => {
        const newSet = new Set(expandedIndices);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setExpandedIndices(newSet);
    };

    const handleAddVariation = (index: number) => {
        const list = [...parameters];
        const variations = [...(list[index].Variations || [])];
        variations.push("");
        list[index] = { ...list[index], Variations: variations };
        onChange({ ...data, Parameters: list });
    };

    const handleUpdateVariation = (paramIndex: number, varIndex: number, value: string) => {
        const list = [...parameters];
        const variations = [...(list[paramIndex].Variations || [])];
        variations[varIndex] = value;
        list[paramIndex] = { ...list[paramIndex], Variations: variations };
        onChange({ ...data, Parameters: list });
    };

    const handleRemoveVariation = (paramIndex: number, varIndex: number) => {
        const list = [...parameters];
        const variations = [...(list[paramIndex].Variations || [])];
        variations.splice(varIndex, 1);
        list[paramIndex] = { ...list[paramIndex], Variations: variations };
        onChange({ ...data, Parameters: list });
    };

    const filteredIndices = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        const matchingIdsFromTrans = getIdsByTranslationMatch(lowerSearch);

        return parameters.map((p, i) => ({ p, i }))
            .filter(({ p }) => {
                if (p.Id.toLowerCase().includes(lowerSearch)) return true;
                if (matchingIdsFromTrans.some(matchId => p.Id.includes(matchId))) return true;
                return false;
            })
            .map(({ i }) => i);
    }, [parameters, searchTerm]);

    const baseInputClass = "w-full bg-scum-900/50 border border-scum-700/50 rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-fuchsia-500 focus:shadow-[0_0_10px_rgba(217,70,239,0.15)] transition-all text-xs font-mono";

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 w-full max-w-6xl mx-auto animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-6 sticky top-0 bg-[#0f172a]/95 backdrop-blur-xl z-20 pb-4 border-b border-scum-700/50 pt-2 px-2 rounded-b-xl">
                 <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-fuchsia-400 tracking-tight flex items-center gap-2 drop-shadow-[0_0_10px_currentColor]">
                        {t('params.title')} 
                        <span className="bg-fuchsia-500/10 text-fuchsia-400 px-2 py-0.5 rounded text-sm font-mono border border-fuchsia-500/20 shadow-inner">{parameters.length}</span>
                    </h2>
                    <button onClick={handleAdd} className="text-xs bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 px-4 py-2 rounded-lg hover:bg-fuchsia-500 hover:text-white hover:shadow-[0_0_15px_rgba(217,70,239,0.5)] transition-all font-bold active:scale-95 flex items-center gap-2">
                        <PlusIcon /> {t('btn.add')}
                    </button>
                 </div>
                 <div className="relative group">
                    <input 
                        type="text" 
                        placeholder={t('explorer.search')}
                        className="w-full bg-scum-800/50 border border-scum-700 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-300 focus:outline-none focus:border-fuchsia-500 focus:bg-scum-900 transition-all placeholder-gray-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-500 group-focus-within:text-fuchsia-400 transition-colors" />
                 </div>
            </div>

            <div className="space-y-4">
                {filteredIndices.map(idx => {
                    const item = parameters[idx];
                    const isExpanded = expandedIndices.has(idx) || searchTerm !== "";
                    const translation = getItemTranslation(item.Id);
                    const hasTrans = hasTranslation(item.Id);
                    
                    return (
                        <div key={idx} className="glass-card rounded-xl border border-fuchsia-500/20 overflow-hidden transition-all duration-300 hover:bg-scum-800/40">
                            {/* Card Header */}
                            <div 
                                className="p-4 flex items-center justify-between cursor-pointer bg-gradient-to-r from-white/5 to-transparent hover:from-white/10"
                                onClick={() => toggleExpand(idx)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className={`transition-transform duration-300 ${isExpanded ? 'rotate-90 text-fuchsia-400' : 'text-gray-500'}`}>
                                        <ChevronRight />
                                    </span>
                                    <div className="flex flex-col overflow-hidden">
                                        <div className="flex flex-col">
                                            {hasTrans ? (
                                                <>
                                                    <span className="font-bold text-gray-200 text-sm truncate max-w-[400px]" title={translation}>{translation}</span>
                                                    <span className="text-[10px] text-gray-500 font-mono truncate">{item.Id}</span>
                                                </>
                                            ) : (
                                                 <span className="font-bold text-gray-200 text-sm truncate max-w-[300px] font-mono" title={item.Id}>{item.Id}</span>
                                            )}
                                        </div>
                                        <div className="flex gap-2 text-[10px] text-gray-500 mt-1">
                                            {item.IsDisabledForSpawning ? <span className="text-red-400 font-bold">{t('status.disabled')}</span> : <span className="text-green-500">{t('status.active')}</span>}
                                            <span>•</span>
                                            <span>{item.AllowedLocations?.length || 0} {t('params.locs')}</span>
                                            {item.Variations && item.Variations.length > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>{item.Variations.length} Vars</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                     <button onClick={() => handleRemove(idx)} className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-50 hover:opacity-100">
                                        <TrashIcon />
                                     </button>
                                </div>
                            </div>

                            {/* Card Body */}
                            {isExpanded && (
                                <div className="p-4 pt-0 border-t border-white/5 bg-black/10 animate-slide-down">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                                        {/* Column 1: Core Info & Flags */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">{t('params.id')}</label>
                                                <input 
                                                    className={`${baseInputClass} text-fuchsia-300 font-bold text-sm`} 
                                                    value={item.Id} 
                                                    onChange={(e) => handleUpdate(idx, 'Id', e.target.value)}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <BooleanToggle 
                                                    label={t('params.isDisabled')} 
                                                    value={item.IsDisabledForSpawning} 
                                                    onChange={(v) => handleUpdate(idx, 'IsDisabledForSpawning', v)} 
                                                    color="fuchsia"
                                                    size="sm"
                                                />
                                                <BooleanToggle 
                                                    label={t('params.overrideUsage')} 
                                                    value={item.ShouldOverrideInitialAndRandomUsage} 
                                                    onChange={(v) => handleUpdate(idx, 'ShouldOverrideInitialAndRandomUsage', v)} 
                                                    color="fuchsia"
                                                    size="sm"
                                                />
                                            </div>

                                            <div className="bg-scum-900/30 p-3 rounded-lg border border-white/5">
                                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-2 block">{t('params.locations')}</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {LOCATIONS.map(loc => (
                                                        <button
                                                            key={loc}
                                                            onClick={() => toggleLocation(idx, loc)}
                                                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all border ${
                                                                item.AllowedLocations?.includes(loc)
                                                                    ? 'bg-fuchsia-500 text-white border-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.4)]'
                                                                    : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'
                                                            }`}
                                                        >
                                                            {t(`location.${loc}`)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 2: Stats & Cooldowns */}
                                        <div className="space-y-4">
                                             {/* Cooldowns */}
                                             <div className="bg-scum-900/30 p-3 rounded-lg border border-white/5">
                                                  <div className="flex items-center gap-2 mb-2">
                                                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                                      <label className="text-[10px] uppercase text-gray-500 font-bold">{t('params.cooldownConfig')}</label>
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-3">
                                                      <div>
                                                          <label className="text-[9px] text-gray-500 mb-0.5 block">{t('params.cooldownMin')}</label>
                                                          <TimeDurationInput 
                                                              className={baseInputClass} 
                                                              value={item.CooldownPerSquadMemberMin} 
                                                              onChange={val => {
                                                                 const list = [...parameters];
                                                                 const currentItem = list[idx];
                                                                 // Sync Max if it equals Min (before update)
                                                                 const shouldSync = currentItem.CooldownPerSquadMemberMin === currentItem.CooldownPerSquadMemberMax;
                                                                 
                                                                 const newItem = { ...currentItem, CooldownPerSquadMemberMin: val };
                                                                 if (shouldSync) {
                                                                     newItem.CooldownPerSquadMemberMax = val;
                                                                 }
                                                                 // Enforce Max >= Min
                                                                 if (newItem.CooldownPerSquadMemberMax < val) {
                                                                     newItem.CooldownPerSquadMemberMax = val;
                                                                 }
                                                                 
                                                                 list[idx] = newItem;
                                                                 onChange({ ...data, Parameters: list });
                                                              }} 
                                                              placeholder={t('params.timePlaceholder1')}
                                                          />
                                                      </div>
                                                      <div>
                                                          <label className="text-[9px] text-gray-500 mb-0.5 block">{t('params.cooldownMax')}</label>
                                                          <TimeDurationInput 
                                                              className={baseInputClass} 
                                                              value={item.CooldownPerSquadMemberMax} 
                                                              onChange={val => {
                                                                  const min = parameters[idx].CooldownPerSquadMemberMin;
                                                                  if (val < min) val = min;
                                                                  handleUpdate(idx, 'CooldownPerSquadMemberMax', val);
                                                              }} 
                                                              placeholder={t('params.timePlaceholder4')}
                                                          />
                                                      </div>
                                                      <div className="col-span-2">
                                                          <label className="text-[9px] text-gray-500 mb-0.5 block">{t('params.cooldownGroup')}</label>
                                                          <input type="text" className={baseInputClass} value={item.CooldownGroup || ""} onChange={e => handleUpdate(idx, 'CooldownGroup', e.target.value)} placeholder={t('common.none')} />
                                                      </div>
                                                  </div>
                                             </div>

                                             {/* Usage Override */}
                                             {item.ShouldOverrideInitialAndRandomUsage && (
                                                 <div className="bg-scum-900/30 p-3 rounded-lg border border-white/5 animate-fade-in relative">
                                                      <div className="flex items-center gap-2 mb-2">
                                                          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                                                          <label className="text-[10px] uppercase text-gray-500 font-bold">{t('params.usageOverrideTitle')}</label>
                                                      </div>
                                                      <p className="text-[9px] text-gray-500 mb-3 italic leading-tight">
                                                          {t('params.usageOverrideDesc')}
                                                      </p>
                                                      <div className="grid grid-cols-2 gap-3">
                                                          <div>
                                                              <label className="text-[9px] text-gray-500 mb-0.5 block">{t('params.initUsage')}</label>
                                                              <input type="number" step="any" className={baseInputClass} value={item.InitialUsageOverride} onChange={e => handleUpdate(idx, 'InitialUsageOverride', parseFloat(e.target.value))} />
                                                          </div>
                                                          <div>
                                                              <label className="text-[9px] text-gray-500 mb-0.5 block">{t('params.rndUsage')}</label>
                                                              <input type="number" step="any" className={baseInputClass} value={item.RandomUsageOverrideUsage} onChange={e => handleUpdate(idx, 'RandomUsageOverrideUsage', parseFloat(e.target.value))} />
                                                          </div>
                                                      </div>
                                                 </div>
                                             )}
                                        </div>
                                    </div>

                                    {/* Variations Section */}
                                    <div className="mt-4 bg-scum-900/30 p-3 rounded-lg border border-white/5">
                                         <div className="flex justify-between items-center mb-2">
                                             <label className="text-[10px] uppercase text-gray-500 font-bold">{t('params.variations')}</label>
                                             <button onClick={() => handleAddVariation(idx)} className="text-[10px] text-fuchsia-400 hover:text-white flex items-center gap-1 hover:bg-fuchsia-500/20 px-2 py-1 rounded transition-colors"><PlusIcon /> {t('btn.add')}</button>
                                         </div>
                                         <div className="space-y-2">
                                             {item.Variations?.map((v, vIdx) => (
                                                 <div key={vIdx} className="flex gap-2 items-center group/var">
                                                     <span className="text-[9px] text-gray-600 font-mono w-4">#{vIdx+1}</span>
                                                     <div className="flex-1 relative">
                                                         {hasTranslation(v) ? (
                                                              <div className="flex flex-col">
                                                                  <span className="text-xs font-bold text-gray-300">{getItemTranslation(v)}</span>
                                                                  <input 
                                                                    className={`${baseInputClass} py-0.5 h-6 text-[10px] text-gray-500`} 
                                                                    value={v} 
                                                                    onChange={(e) => handleUpdateVariation(idx, vIdx, e.target.value)}
                                                                    placeholder={t('params.variationPlaceholder')}
                                                                  />
                                                              </div>
                                                         ) : (
                                                              <input 
                                                                className={`${baseInputClass} py-1 h-7`} 
                                                                value={v} 
                                                                onChange={(e) => handleUpdateVariation(idx, vIdx, e.target.value)}
                                                                placeholder={t('params.variationPlaceholder')}
                                                              />
                                                         )}
                                                     </div>
                                                     <button onClick={() => handleRemoveVariation(idx, vIdx)} className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover/var:opacity-100 transition-opacity">
                                                         <TrashIcon className="w-3.5 h-3.5" />
                                                     </button>
                                                 </div>
                                             ))}
                                             {(!item.Variations || item.Variations.length === 0) && <div className="text-[10px] text-gray-600 italic">{t('params.noVariations')}</div>}
                                         </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredIndices.length === 0 && (
                     <div className="text-center py-12 text-gray-600 flex flex-col items-center gap-3 border-2 border-dashed border-scum-800 rounded-2xl">
                         <span className="text-4xl opacity-20">📋</span>
                         <span>{searchTerm ? t('explorer.noMatch') : t('params.none')}</span>
                         {!searchTerm && <button onClick={handleAdd} className="mt-2 text-xs bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 px-4 py-2 rounded-lg hover:bg-fuchsia-500 hover:text-black transition-all font-bold">{t('btn.add')}</button>}
                     </div>
                )}
            </div>
        </div>
    );
};
