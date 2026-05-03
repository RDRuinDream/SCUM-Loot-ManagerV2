
import React, { useState } from 'react';
import { stringToColor } from '../utils/helpers';
import { useI18n } from '../i18n';
import { getItemTranslation, hasTranslation } from '../utils/itemTranslator';
import { ChevronRight } from './Icons';

interface RarityBarChartProps {
    stats: { id: string, percent: number }[];
    onItemClick?: (id: string) => void;
    onHoverItem?: (id: string | null) => void;
    hoveredId?: string | null;
}

export const RarityBarChart: React.FC<RarityBarChartProps> = ({ stats, onItemClick, onHoverItem, hoveredId }) => {
    const { t } = useI18n();
    const [isExpanded, setIsExpanded] = useState(false);
    const VISIBLE_COUNT = 18;

    const visibleItems = isExpanded ? stats : stats.slice(0, VISIBLE_COUNT);
    const hiddenCount = stats.length - VISIBLE_COUNT;

    return (
        <div className="flex flex-col gap-4 animate-fade-in">
             {/* Top Visual Bar */}
             <div className="relative h-6 w-full bg-black/40 rounded-full overflow-hidden flex shadow-inner">
                 {stats.map(s => (
                     <div 
                        key={s.id} 
                        style={{ width: `${s.percent}%`, backgroundColor: stringToColor(s.id) }} 
                        className="h-full relative group transition-all duration-300 cursor-pointer hover:brightness-110 opacity-80 hover:opacity-100 first:rounded-l-full last:rounded-r-full"
                        onClick={() => onItemClick?.(s.id)}
                        onMouseEnter={() => onHoverItem?.(s.id)}
                        onMouseLeave={() => onHoverItem?.(null)}
                     >
                        <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap border border-white/10 shadow-xl">
                            {s.id}: {s.percent.toFixed(1)}%
                        </div>
                     </div>
                 ))}
             </div>

             {/* Grid - Compact List Style */}
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                 {visibleItems.map((s) => {
                     const color = stringToColor(s.id);
                     const isActive = hoveredId === s.id;
                     const displayName = hasTranslation(s.id) ? getItemTranslation(s.id) : s.id;
                     
                     return (
                        <div 
                            key={s.id}
                            className={`
                                flex items-center justify-between p-2 rounded border transition-all cursor-pointer group h-9
                                ${isActive 
                                    ? 'bg-scum-accent/10 border-scum-accent/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
                                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                                }
                            `}
                            onClick={() => onItemClick?.(s.id)}
                            onMouseEnter={() => onHoverItem?.(s.id)}
                            onMouseLeave={() => onHoverItem?.(null)}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_5px_currentColor]" style={{ backgroundColor: color }}></div>
                                <span className={`text-xs truncate transition-colors ${isActive ? 'text-white font-bold' : 'text-gray-400 group-hover:text-gray-200'}`} title={s.id}>
                                    {displayName}
                                </span>
                            </div>
                            <span className={`text-[10px] font-mono font-bold ml-2 ${isActive ? 'text-scum-accent' : 'text-gray-500 group-hover:text-gray-400'}`}>
                                {s.percent.toFixed(1)}%
                            </span>
                        </div>
                     );
                 })}
             </div>
             
             {/* Show More Button */}
             {hiddenCount > 0 && (
                 <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="self-center flex items-center gap-1.5 px-3 py-1.5 bg-black/20 hover:bg-black/40 text-gray-500 hover:text-white rounded-full text-xs transition-all border border-white/5 hover:border-white/10"
                 >
                     {isExpanded ? (
                         <>{t('stats.collapse')} <ChevronRight className="w-3 h-3 rotate-90" /></>
                     ) : (
                         <>{t('stats.showMore', [hiddenCount])} <ChevronRight className="w-3 h-3 rotate-0" /></>
                     )}
                 </button>
             )}
         </div>
    );
};