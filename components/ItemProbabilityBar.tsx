
import React, { useMemo, useState } from 'react';
import { RARITY_WEIGHTS } from '../types';
import { useI18n } from '../i18n';
import { useSettings } from '../SettingsContext';
import { ChevronDown } from './Icons';
import { RarityBarChart } from './RarityBarChart';
import { RarityPieChart } from './RarityPieChart';

interface ItemProbabilityBarProps {
  items: any[];
  type: 'Item' | 'Subpreset' | 'Node' | 'FixedItem';
  onItemClick?: (id: string) => void;
  onHoverItem?: (id: string | null) => void;
  hoveredId?: string | null;
  customStats?: { id: string, percent: number, count?: number, rarity?: string }[];
}

export const ItemProbabilityBar: React.FC<ItemProbabilityBarProps> = ({ items, type, onItemClick, onHoverItem, hoveredId, customStats }) => {
    const { t } = useI18n();
    const { chartMode } = useSettings();
    const [isSectionCollapsed, setIsSectionCollapsed] = useState(false);

    // calculate basic stats or use customStats
    const rawStats = useMemo(() => {
        if (customStats) {
            // Use pre-calculated stats if provided
            return { 
                stats: customStats.map(s => ({ ...s, weight: s.percent })), // Map percent to weight for compatibility
                totalWeight: '100%' // Custom stats are assumed to be 0-100%
            };
        }

        const groups: Record<string, { id: string, weight: number, count: number, rarity: string }> = {};
        let total = 0;

        items.forEach((item, idx) => {
            let id = "";
            let weight = 0;
            let rarity = item.Rarity || "Common";

            if (type === 'FixedItem') {
                id = typeof item === 'string' ? item : (item.Id || `Item #${idx+1}`);
                const qty = (typeof item === 'object' && item.Quantity) ? item.Quantity : 1;
                weight = qty;
            } else {
                weight = RARITY_WEIGHTS[item.Rarity] || 0;
                
                if (type === 'Item') id = item.Id || item.Name || `Item #${idx+1}`;
                else if (type === 'Subpreset') id = item.Id || `Subpreset #${idx+1}`;
                else if (type === 'Node') {
                     const firstId = item.Ids && item.Ids.length > 0 ? item.Ids[0] : null;
                     id = firstId ? `Node [${firstId}${item.Ids.length > 1 ? '...' : ''}]` : `Node #${idx+1}`;
                }
            }

            if (!groups[id]) {
                groups[id] = { id, weight: 0, count: 0, rarity };
            }
            if (weight > 0) {
                groups[id].weight += weight;
                groups[id].count += 1;
                total += weight;
            }
        });

        const sorted = Object.values(groups)
            .map(g => ({ ...g, percent: total > 0 ? (g.weight / total) * 100 : 0 }))
            .filter(g => g.weight > 0)
            .sort((a, b) => b.percent - a.percent);

        return { stats: sorted, totalWeight: total };
    }, [items, type, customStats]);

    // Don't hide if customStats is present even if items is empty
    if ((!items || items.length === 0) && !customStats) return null;

    return (
        <div className="mb-8 relative group/container">
             <div className="bg-white/5 border border-white/5 rounded-xl backdrop-blur-sm p-4 animate-fade-in transition-all">
                 {/* Header */}
                 <div 
                    className="flex justify-between items-center cursor-pointer select-none"
                    onClick={() => setIsSectionCollapsed(!isSectionCollapsed)}
                 >
                     <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-white/5 border border-white/10">
                             <div className="w-2 h-2 bg-scum-accent rounded-full animate-pulse"></div>
                        </div>
                        <div>
                             <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                                {t('stats.rarityDist')}
                            </h4>
                        </div>
                     </div>

                     <div className="flex items-center">
                         <span className={`transition-transform duration-300 ${isSectionCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                             <ChevronDown className="w-4 h-4 text-gray-500" />
                         </span>
                     </div>
                 </div>
                 
                 {/* Content Area */}
                 {!isSectionCollapsed && (
                     <div className="w-full relative min-h-[100px] mt-4 pt-2 border-t border-white/5 animate-slide-down">
                         {chartMode === 'bar' ? (
                             <RarityBarChart 
                                stats={rawStats.stats} 
                                onItemClick={onItemClick}
                                onHoverItem={onHoverItem}
                                hoveredId={hoveredId}
                             />
                         ) : (
                             <RarityPieChart 
                                stats={rawStats.stats}
                                totalWeight={rawStats.totalWeight}
                                onItemClick={onItemClick}
                                onHoverItem={onHoverItem}
                                hoveredId={hoveredId}
                             />
                         )}
                     </div>
                 )}
             </div>
        </div>
    );
};