
import React from 'react';
import { ScumJson, POST_SPAWN_ACTIONS } from '../../types';
import { useI18n } from '../../i18n';
import { BooleanToggle } from '../../components/FormControls';
import { PlusIcon, TrashIcon, CheckCircleIcon } from '../Icons';

interface GlobalSectionProps {
    data: ScumJson;
    updateGlobal: (field: keyof ScumJson, value: any) => void;
    deleteItem: (section: any, index: number) => void;
    addItem: (section: any) => void;
    updateStringItem: (section: any, index: number, value: string) => void;
    getInputClass: (errorKey?: string) => string;
    isBulkMode?: boolean;
    selectedGroups?: Set<string>;
    onToggleGroup?: (group: string) => void;
}

export const GlobalSection: React.FC<GlobalSectionProps> = ({ 
    data, 
    updateGlobal, 
    deleteItem, 
    addItem, 
    updateStringItem,
    getInputClass,
    isBulkMode,
    selectedGroups,
    onToggleGroup
}) => {
    const { t } = useI18n();

    const renderBulkCheckbox = (group: string) => {
        if (!isBulkMode || !onToggleGroup || !selectedGroups) return null;
        const isSelected = selectedGroups.has(group);
        return (
            <div 
                onClick={() => onToggleGroup(group)}
                className={`w-6 h-6 rounded border flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-scum-accent border-scum-accent shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-black/20 border-gray-600 hover:border-gray-400'}`}
            >
                {isSelected && <CheckCircleIcon className="w-4 h-4 text-black" />}
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Generation Control */}
            <div className={`space-y-4 glass-card p-6 rounded-2xl border-t-2 transition-all ${isBulkMode && selectedGroups?.has('gen') ? 'border-t-scum-accent ring-1 ring-scum-accent/30 bg-scum-800/60' : 'border-t-scum-accent/50'}`}>
                 <div className="flex justify-between items-center border-b border-scum-700/50 pb-2 mb-4">
                     <h4 className="text-xs font-bold text-scum-accent uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-scum-accent animate-pulse"></span>{t('global.genControl')}</h4>
                     {renderBulkCheckbox('gen')}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">{t('global.minQty')}</label><input type="number" step="any" min="0" className={getInputClass()} value={data.QuantityMin ?? ""} onChange={e => updateGlobal('QuantityMin', parseFloat(e.target.value))} /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">{t('global.maxQty')}</label><input type="number" step="any" min="0" className={getInputClass()} value={data.QuantityMax ?? ""} onChange={e => updateGlobal('QuantityMax', parseFloat(e.target.value))} /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">{t('global.prob')}</label><input type="number" step="any" min="0" className={getInputClass()} value={data.Probability ?? ""} onChange={e => updateGlobal('Probability', parseFloat(e.target.value))} /></div>
                 </div>
            </div>

            {/* Flags / Rules */}
            <div className={`glass-card p-6 rounded-2xl border-t-2 transition-all ${isBulkMode && selectedGroups?.has('flags') ? 'border-t-purple-500 ring-1 ring-purple-500/30 bg-scum-800/60' : 'border-t-purple-500/50'}`}>
                <div className="flex justify-between items-center border-b border-scum-700/50 pb-2 mb-4">
                    <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>{t('global.flags')}</h4>
                    {renderBulkCheckbox('flags')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <BooleanToggle label={t('global.allowDuplicates')} value={data.AllowDuplicates} onChange={v => updateGlobal('AllowDuplicates', v)} color="fuchsia" />
                    <BooleanToggle label={t('global.filterByZone')} value={data.ShouldFilterItemsByZone} onChange={v => updateGlobal('ShouldFilterItemsByZone', v)} color="fuchsia" />
                    <BooleanToggle label={t('global.probMod')} value={data.ShouldApplyLocationSpecificProbabilityModifier} onChange={v => updateGlobal('ShouldApplyLocationSpecificProbabilityModifier', v)} color="fuchsia" />
                    <BooleanToggle label={t('global.damageMod')} value={data.ShouldApplyLocationSpecificDamageModifier} onChange={v => updateGlobal('ShouldApplyLocationSpecificDamageModifier', v)} color="fuchsia" />
                </div>
            </div>

            {/* Item State (Damage/Usage) */}
            <div className={`glass-card p-6 rounded-2xl border-t-2 transition-all ${isBulkMode && selectedGroups?.has('damage') ? 'border-t-orange-500 ring-1 ring-orange-500/30 bg-scum-800/60' : 'border-t-orange-500/50'}`}>
                <div className="flex justify-between items-center border-b border-scum-700/50 pb-2 mb-4">
                    <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>{t('global.damageUsage')}</h4>
                    {renderBulkCheckbox('damage')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">{t('global.initDmg')}</label><input type="number" step="any" min="0" className={getInputClass()} value={data.InitialDamage ?? ""} onChange={e => updateGlobal('InitialDamage', parseFloat(e.target.value))} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">{t('global.rndDmg')}</label><input type="number" step="any" min="0" className={getInputClass()} value={data.RandomDamage ?? ""} onChange={e => updateGlobal('RandomDamage', parseFloat(e.target.value))} /></div>
                    </div>
                    <div className="space-y-4">
                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">{t('global.initUsg')}</label><input type="number" step="any" min="0" className={getInputClass()} value={data.InitialUsage ?? ""} onChange={e => updateGlobal('InitialUsage', parseFloat(e.target.value))} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block font-bold uppercase">{t('global.rndUsg')}</label><input type="number" step="any" min="0" className={getInputClass()} value={data.RandomUsage ?? ""} onChange={e => updateGlobal('RandomUsage', parseFloat(e.target.value))} /></div>
                    </div>
                </div>
            </div>

            {/* Post Spawn Actions */}
            <div className={`glass-card p-6 rounded-2xl border-t-2 transition-all ${isBulkMode && selectedGroups?.has('actions') ? 'border-t-emerald-500 ring-1 ring-emerald-500/30 bg-scum-800/60' : 'border-t-emerald-500/50'}`}>
                <div className="flex justify-between items-center border-b border-scum-700/50 pb-2 mb-4">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>{t('global.actions')}</h4>
                    <div className="flex items-center gap-3">
                        {!isBulkMode && <button onClick={() => addItem('PostSpawnActions')} className="text-[10px] text-emerald-400 hover:text-white flex items-center gap-1 hover:bg-emerald-500/20 px-2 py-1 rounded transition-colors"><PlusIcon /> {t('btn.add')}</button>}
                        {renderBulkCheckbox('actions')}
                    </div>
                </div>
                <div className="space-y-3">
                    {(data.PostSpawnActions || []).map((action, idx) => (
                        <div key={idx} className="bg-scum-900/30 p-2 rounded-lg border border-white/5 group flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <div className="flex-1">
                                    <select 
                                        className={`${getInputClass()} text-xs bg-transparent border-none`} 
                                        value={action} 
                                        onChange={(e) => updateStringItem('PostSpawnActions', idx, e.target.value)}
                                        disabled={isBulkMode}
                                    >
                                        {Object.keys(POST_SPAWN_ACTIONS).map(key => (
                                            <option key={key} value={key}>{t(`action_option.${key}`) || key}</option>
                                        ))}
                                    </select>
                                </div>
                                {!isBulkMode && <button onClick={() => deleteItem('PostSpawnActions', idx)} className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><TrashIcon /></button>}
                            </div>
                            <div className="text-[10px] text-gray-500 italic px-1 whitespace-pre-wrap leading-relaxed border-t border-white/5 pt-1 mt-1">
                                {t(`action.${action}`) || POST_SPAWN_ACTIONS[action]}
                            </div>
                        </div>
                    ))}
                    {(!data.PostSpawnActions || data.PostSpawnActions.length === 0) && (
                        <div className="text-center py-4 text-xs text-gray-600 italic border border-dashed border-gray-700/50 rounded-lg">{t('common.emptyList')}</div>
                    )}
                </div>
            </div>
        </div>
    );
};
