
import React, { useMemo } from 'react';
import { useI18n } from '../../i18n';
import { resolveNodeToItems } from '../../utils/lootNodeResolver';
import { hasTranslation, getItemTranslation } from '../../utils/itemTranslator';
import { stringToColor } from '../../utils/helpers';
import { ScumJson } from '../../types';

interface NodeEffectivePoolProps {
    nodeIds: string[] | undefined;
    library: any;
    nodeOverrides?: Record<string, ScumJson>;
}

export const NodeEffectivePool: React.FC<NodeEffectivePoolProps> = React.memo(({ nodeIds, library, nodeOverrides }) => {
    const { t } = useI18n();
    
    const effectiveItems = useMemo(() => {
        if (!nodeIds || nodeIds.length === 0) return [];
        const allItems: { Id: string, Rarity: string }[] = [];
        nodeIds.forEach(id => {
            // resolveNodeToItems returns { Id, Rarity }[]
            // Pass the overrides here
            allItems.push(...resolveNodeToItems(id, library, nodeOverrides));
        });
        
        // Deduplicate items by ID to show unique list
        const unique = new Map<string, string>();
        allItems.forEach(i => unique.set(i.Id, i.Rarity));
        
        return Array.from(unique.entries())
            .map(([Id, Rarity]) => ({ Id, Rarity }))
            .sort((a, b) => {
                 // Sort by translated name if available, else ID
                 const nameA = hasTranslation(a.Id) ? getItemTranslation(a.Id) : a.Id;
                 const nameB = hasTranslation(b.Id) ? getItemTranslation(b.Id) : b.Id;
                 return nameA.localeCompare(nameB);
            });
    }, [nodeIds, library, nodeOverrides]);

    if (!nodeIds || nodeIds.length === 0) return null;

    return (
        <div className="mt-3 border-t border-white/5 pt-3">
             <div className="flex items-center justify-between mb-2">
                 <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    {t('nodes.generatedItems')}
                    <span className="bg-white/10 text-gray-300 px-1.5 rounded text-[9px] border border-white/5">{effectiveItems.length}</span>
                </h5>
             </div>
             
             {effectiveItems.length > 0 ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1 bg-black/20 p-2 rounded-lg border border-white/5">
                     {effectiveItems.map((item) => {
                         const hasTrans = hasTranslation(item.Id);
                         const translation = hasTrans ? getItemTranslation(item.Id) : null;
                         return (
                            <div key={item.Id} className="flex items-center gap-2 bg-scum-900/50 border border-white/5 rounded px-2 py-1.5 hover:bg-white/5 transition-colors group/pool-item overflow-hidden" title={item.Id}>
                                 <div className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_5px_currentColor]" style={{ backgroundColor: stringToColor(item.Id) }}></div>
                                 <div className="flex flex-col min-w-0">
                                     <span className={`text-[10px] font-medium truncate ${hasTrans ? 'text-sky-300' : 'text-gray-300'}`}>
                                        {translation || item.Id}
                                     </span>
                                     {hasTrans && <span className="text-[9px] text-gray-600 font-mono truncate">{item.Id}</span>}
                                 </div>
                            </div>
                         );
                     })}
                 </div>
             ) : (
                  <div className="text-[10px] text-gray-500 italic py-1 border border-dashed border-gray-700/50 rounded-lg p-2 text-center bg-black/10">{t('nodes.noItems')}</div>
             )}
        </div>
    );
});
