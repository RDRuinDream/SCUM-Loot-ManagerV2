
import React, { useState } from 'react';
import { GeneralZoneModifiersJson, ZoneModifier } from '../types';
import { TrashIcon, ExclamationTriangleIcon, EyeIcon, ArrowPathIcon } from './Icons';
import { useI18n } from '../i18n';

interface GeneralZoneModifiersEditorProps {
    data: GeneralZoneModifiersJson;
    onChange: (newData: GeneralZoneModifiersJson) => void;
    onPickZone: (modIndex: number, zoneIndex: number) => void;
    onLocateOnMap?: (modIndex: number, zoneIndex: number) => void;
}

const KNOWN_PROPS = [
    'SpawnerProbabilityMultiplier',
    'ExamineSpawnerProbabilityMultiplier',
    'ExamineSpawnerQuantityMultiplier'
];

export const GeneralZoneModifiersEditor: React.FC<GeneralZoneModifiersEditorProps> = ({ data, onChange, onPickZone, onLocateOnMap }) => {
    const { t } = useI18n();
    
    // Config for property labels
    const propLabels: Record<string, string> = {
        'SpawnerProbabilityMultiplier': t('modifiers.prop_spawnerProb'),
        'ExamineSpawnerProbabilityMultiplier': t('modifiers.prop_examineProb'),
        'ExamineSpawnerQuantityMultiplier': t('modifiers.prop_examineQty'),
    };

    const updateModifier = (index: number, newModifier: ZoneModifier) => {
        const list = [...(data.Modifiers || [])];
        list[index] = newModifier;
        onChange({ ...data, Modifiers: list });
    };

    const addModifier = () => {
        const list = [...(data.Modifiers || [])];
        list.push({
            Zones: [],
            ExamineSpawnerQuantityMultiplier: 1
        });
        onChange({ ...data, Modifiers: list });
    };

    const removeModifier = (index: number) => {
        const list = [...(data.Modifiers || [])];
        list.splice(index, 1);
        onChange({ ...data, Modifiers: list });
    };

    const addZone = (modIndex: number, type: 'rect' | 'sector') => {
        const modifier = { ...(data.Modifiers[modIndex] || {}) };
        const zones = [...(modifier.Zones || [])];
        if (type === 'rect') {
            zones.push({
                Name: `Zone_${zones.length + 1}`,
                TopLeft: "X=0 Y=0",
                BottomRight: "X=0 Y=0"
            });
        } else {
            // Sector based zone
            zones.push({
                Sector: "A1"
            });
        }
        modifier.Zones = zones;
        updateModifier(modIndex, modifier);
    };

    const updateZone = (modIndex: number, zoneIndex: number, field: string, value: string) => {
        const modifier = { ...(data.Modifiers[modIndex] || {}) };
        const zones = [...(modifier.Zones || [])];
        // @ts-ignore
        zones[zoneIndex] = { ...zones[zoneIndex], [field]: value };
        modifier.Zones = zones;
        updateModifier(modIndex, modifier);
    };

    const removeZone = (modIndex: number, zoneIndex: number) => {
        const modifier = { ...(data.Modifiers[modIndex] || {}) };
        const zones = [...(modifier.Zones || [])];
        zones.splice(zoneIndex, 1);
        modifier.Zones = zones;
        updateModifier(modIndex, modifier);
    };

    const updateProp = (modIndex: number, key: string, value: number) => {
        const modifier = { ...(data.Modifiers[modIndex] || {}) };
        modifier[key] = value;
        updateModifier(modIndex, modifier);
    };

    const toggleProp = (modIndex: number, key: string, enable: boolean) => {
        const modifier = { ...(data.Modifiers[modIndex] || {}) };
        if (enable) {
            modifier[key] = 1.0;
        } else {
            delete modifier[key];
        }
        updateModifier(modIndex, modifier);
    };

    const hasActiveModifiers = (mod: ZoneModifier) => {
        return KNOWN_PROPS.some(key => mod[key] !== undefined);
    };

    const baseInputClass = "w-full bg-scum-900/50 border border-scum-700/50 rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none focus:border-scum-accent focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-scum-900 transition-all duration-300 backdrop-blur-sm";

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 w-full max-w-5xl mx-auto animate-fade-in pb-20">
            <div className="flex items-center justify-between mb-8 border-b border-scum-700/50 pb-4 sticky top-0 bg-[#0f172a]/95 z-20 pt-2 backdrop-blur-xl rounded-b-xl px-2">
                <h2 className="text-xl font-bold text-teal-400 tracking-tight flex items-center gap-2 drop-shadow-[0_0_10px_currentColor]">
                    {t('modifiers.title')} <span className="bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded text-sm font-mono border border-teal-500/20 shadow-inner">{data.Modifiers?.length || 0}</span>
                </h2>
                <button onClick={addModifier} className="text-xs bg-teal-500/10 text-teal-400 border border-teal-500/30 px-4 py-2 rounded-lg hover:bg-teal-500 hover:text-black hover:shadow-[0_0_15px_rgba(45,212,191,0.5)] transition-all font-bold active:scale-95">{t('btn.add')}</button>
            </div>

            <div className="space-y-8">
                {data.Modifiers?.map((mod, modIdx) => {
                    const isValid = hasActiveModifiers(mod);

                    return (
                        <div key={modIdx} className="glass-card p-6 rounded-2xl animate-slide-up bg-scum-800/20 border border-teal-500/20 shadow-lg relative overflow-hidden group">
                             <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${isValid ? 'bg-teal-500/50 group-hover:bg-teal-400' : 'bg-red-500 animate-pulse'}`}></div>
                             
                             <div className="flex justify-between items-start mb-6 pl-2">
                                 <h3 className="text-sm font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
                                     <span className="bg-teal-500/20 text-teal-300 w-6 h-6 flex items-center justify-center rounded text-xs">#{modIdx + 1}</span>
                                     {t('modifiers.group')}
                                 </h3>
                                 <button onClick={() => removeModifier(modIdx)} className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-90"><TrashIcon /></button>
                             </div>

                             <div className={`mb-6 p-4 rounded-xl border transition-colors ${isValid ? 'bg-black/20 border-white/5' : 'bg-red-900/10 border-red-500/30'}`}>
                                 <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2 flex-wrap gap-2">
                                     <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                         {t('modifiers.params')}
                                         {!isValid && (
                                             <span className="text-red-400 flex items-center gap-1 text-[10px] bg-red-900/20 px-2 py-0.5 rounded border border-red-500/30 animate-pulse">
                                                 <ExclamationTriangleIcon className="w-3 h-3" />
                                                 {t('modifiers.validationWarning')}
                                             </span>
                                         )}
                                     </h4>
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                     {KNOWN_PROPS.map(key => {
                                         const isActive = mod[key] !== undefined;
                                         const value = isActive ? mod[key] : 1.0;

                                         return (
                                             <div key={key} className={`relative p-3 rounded-xl border transition-all duration-300 ${isActive ? 'bg-scum-900/50 border-teal-500/30 shadow-[0_0_15px_rgba(45,212,191,0.1)]' : 'bg-black/20 border-white/5 opacity-70'}`}>
                                                 <div className="flex justify-between items-start mb-3">
                                                     <label className={`text-[10px] font-bold uppercase leading-tight max-w-[80%] ${isActive ? 'text-teal-400' : 'text-gray-500'}`} title={key}>
                                                         {propLabels[key]}
                                                     </label>
                                                     <div onClick={() => toggleProp(modIdx, key, !isActive)} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors shrink-0 ${isActive ? 'bg-teal-500' : 'bg-gray-700'}`}>
                                                         <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all duration-200 ${isActive ? 'left-[17px]' : 'left-[2px]'}`}></div>
                                                     </div>
                                                 </div>
                                                 
                                                 <div className="relative">
                                                     <input type="number" step="0.1" min="0" disabled={!isActive} className={`w-full bg-black/30 font-mono text-sm font-bold focus:outline-none border-b transition-colors pb-1 ${isActive ? 'text-teal-300 border-teal-500/50 focus:border-teal-400' : 'text-gray-600 border-gray-700 cursor-not-allowed'}`} value={value} onChange={(e) => updateProp(modIdx, key, parseFloat(e.target.value))} />
                                                 </div>
                                                 <div className="text-[8px] text-gray-600 truncate mt-1.5 font-mono opacity-50">{key}</div>
                                             </div>
                                         );
                                     })}
                                 </div>
                             </div>

                             <div className="bg-scum-800/30 p-4 rounded-xl border border-white/5">
                                 <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                                     <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                         {t('editor.zones')} 
                                         <span className="text-xs bg-white/10 px-1.5 rounded-full text-gray-300">{mod.Zones?.length || 0}</span>
                                     </h4>
                                     <div className="flex gap-2">
                                         <button onClick={() => addZone(modIdx, 'sector')} className="text-[10px] text-yellow-400 hover:text-white flex items-center gap-1 hover:bg-yellow-500/20 px-2 py-1 rounded transition-colors">{t('modifiers.addSector')}</button>
                                         <button onClick={() => addZone(modIdx, 'rect')} className="text-[10px] text-yellow-400 hover:text-white flex items-center gap-1 hover:bg-yellow-500/20 px-2 py-1 rounded transition-colors">{t('modifiers.addRect')}</button>
                                     </div>
                                 </div>
                                 
                                 <div className="space-y-3">
                                     {mod.Zones?.map((zone, zIdx) => {
                                         const isSector = !!zone.Sector;
                                         return (
                                         <div key={zIdx} className="flex flex-col md:flex-row gap-3 items-center bg-black/20 p-2 rounded-lg border border-transparent hover:border-white/10 transition-colors group/zone relative overflow-hidden">
                                             <div className={`absolute left-0 top-0 bottom-0 w-1 ${isSector ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                                             <div className="w-8 text-center text-[10px] text-gray-600 font-mono ml-2">#{zIdx+1}</div>
                                             
                                             <div className="flex-1 w-full">
                                                 {isSector ? (
                                                     <div className="flex flex-col">
                                                         <label className="text-[9px] text-orange-400 font-bold uppercase mb-1">{t('modifiers.sectorId')}</label>
                                                         <input className={`${baseInputClass} text-xs py-1 h-8 font-mono text-orange-300 border-orange-500/30`} placeholder="e.g. A1" value={zone.Sector || ""} onChange={(e) => updateZone(modIdx, zIdx, 'Sector', e.target.value)} />
                                                     </div>
                                                 ) : (
                                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                         <div className="flex flex-col">
                                                             <label className="text-[9px] text-blue-400 font-bold uppercase mb-1">{t('common.name')}</label>
                                                             <input className={`${baseInputClass} text-xs py-1 h-7 text-blue-200/80 border-blue-500/20`} placeholder={t('common.namePlaceholder')} value={zone.Name || ""} onChange={(e) => updateZone(modIdx, zIdx, 'Name', e.target.value)} />
                                                         </div>
                                                         <div className="flex flex-col">
                                                             <label className="text-[9px] text-gray-500 uppercase mb-1">{t('common.topLeft')}</label>
                                                             <input className={`${baseInputClass} text-xs py-1 h-7 font-mono`} placeholder={t('common.coordPlaceholder')} value={zone.TopLeft || ""} onChange={(e) => updateZone(modIdx, zIdx, 'TopLeft', e.target.value)} />
                                                         </div>
                                                         <div className="flex flex-col">
                                                             <label className="text-[9px] text-gray-500 uppercase mb-1">{t('common.bottomRight')}</label>
                                                             <input className={`${baseInputClass} text-xs py-1 h-7 font-mono`} placeholder={t('common.coordPlaceholder')} value={zone.BottomRight || ""} onChange={(e) => updateZone(modIdx, zIdx, 'BottomRight', e.target.value)} />
                                                         </div>
                                                     </div>
                                                 )}
                                             </div>
                                             {!isSector && (
                                                 <div className="flex gap-1">
                                                     <button 
                                                         onClick={() => onLocateOnMap && onLocateOnMap(modIdx, zIdx)} 
                                                         className="p-1.5 text-yellow-400 hover:text-white hover:bg-yellow-500/20 rounded transition-all"
                                                         title={t('zone.locate')}
                                                     >
                                                         <ArrowPathIcon className="w-3.5 h-3.5" />
                                                     </button>
                                                     <button 
                                                         onClick={() => onPickZone(modIdx, zIdx)} 
                                                         className="p-1.5 text-scum-accent hover:text-white hover:bg-scum-accent/20 rounded transition-all"
                                                         title={t('zone.pickFromMap')}
                                                     >
                                                         <EyeIcon className="w-3.5 h-3.5" />
                                                     </button>
                                                 </div>
                                             )}
                                             <button onClick={() => removeZone(modIdx, zIdx)} className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover/zone:opacity-100"><TrashIcon className="w-3.5 h-3.5" /></button>
                                         </div>
                                     )})}
                                     {(!mod.Zones || mod.Zones.length === 0) && (
                                         <div className="text-center py-4 text-xs text-gray-600 italic">{t('modifiers.noZones')}</div>
                                     )}
                                 </div>
                             </div>
                        </div>
                    );
                })}
                
                {(!data.Modifiers || data.Modifiers.length === 0) && (
                     <div className="text-center py-12 text-gray-600 flex flex-col items-center gap-3 border-2 border-dashed border-scum-800 rounded-2xl">
                         <span className="text-4xl opacity-20">⚙️</span>
                         <span>{t('modifiers.empty')}</span>
                         <button onClick={addModifier} className="mt-2 text-xs bg-teal-500/10 text-teal-400 border border-teal-500/30 px-4 py-2 rounded-lg hover:bg-teal-500 hover:text-black transition-all font-bold">{t('modifiers.createFirst')}</button>
                     </div>
                )}
            </div>
        </div>
    );
};
