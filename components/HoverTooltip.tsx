

import React, { useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ScumJson, RARITY_WEIGHTS } from '../types';
import { useI18n } from '../i18n';
import { getItemTranslation, hasTranslation } from '../utils/itemTranslator';
import { stringToColor } from '../utils/helpers';

interface HoverTooltipProps {
    x: number;
    y: number;
    content: ScumJson;
    id: string;
    fullPath?: string;
    previewType?: 'file' | 'node';
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

export const HoverTooltip: React.FC<HoverTooltipProps> = ({ x, y, content, id, fullPath, previewType = 'file', onMouseEnter, onMouseLeave }) => {
    const { t } = useI18n();
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = React.useState({ top: y, left: x });

    useLayoutEffect(() => {
        if (tooltipRef.current) {
            const rect = tooltipRef.current.getBoundingClientRect();
            let newX = x;
            let newY = y;
            
            // Boundary checks
            if (newX + rect.width > window.innerWidth) {
                newX = Math.max(10, window.innerWidth - rect.width - 20);
            }
            if (newY + rect.height > window.innerHeight) {
                newY = Math.max(10, window.innerHeight - rect.height - 10);
            }
            setStyle({ top: newY, left: newX });
        }
    }, [x, y]);

    const translation = hasTranslation(id) ? getItemTranslation(id) : null;

    // Pre-calculate weights for Items list to show percentages
    const totalItemWeight = content.Items 
        ? content.Items.reduce((acc, item) => acc + (RARITY_WEIGHTS[item.Rarity || 'Common'] || 1), 0)
        : 0;

    return createPortal(
        <div 
            ref={tooltipRef}
            className="fixed z-[9999] bg-[#0b1120]/95 backdrop-blur-xl border border-scum-700/80 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] p-6 w-[450px] text-sm animate-in fade-in zoom-in-95 duration-200 overflow-hidden pointer-events-auto ring-1 ring-white/10 font-sans"
            style={style}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
              <div className="border-b border-scum-700/50 pb-4 mb-5 bg-[#0b1120]/95 z-10 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col overflow-hidden mr-2">
                        <h5 className="font-bold text-scum-accent truncate text-xl drop-shadow-sm font-mono" title={id}>
                            {id}
                        </h5>
                        {translation && (
                            <span className="text-gray-400 text-sm font-bold truncate mt-1">
                                {translation}
                            </span>
                        )}
                    </div>
                    <span className="px-2 py-0.5 rounded bg-scum-800 text-xs text-gray-400 border border-scum-700 shadow-inner whitespace-nowrap">
                        {previewType === 'node' ? t('tooltip.nodePreview') : t('tooltip.preview')}
                    </span>
                  </div>
                  {fullPath && (
                      <div className="text-xs text-gray-500 truncate mt-2 flex items-center gap-2 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                          {fullPath}
                      </div>
                  )}
              </div>
              
              <div className="space-y-5 text-gray-300 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                   {/* Global Config Stats */}
                   {(content.Probability !== undefined || content.QuantityMin !== undefined || content.QuantityMax !== undefined) && (
                       <div className="bg-scum-800/30 rounded-xl p-3 border border-white/5">
                           <div className="text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">{t('tooltip.global')}</div>
                           <div className="grid grid-cols-3 gap-3">
                               <div className="flex flex-col bg-black/20 p-2 rounded"><span className="text-[10px] text-gray-500 uppercase">{t('tooltip.prob')}</span> <span className="text-scum-accent font-mono font-bold text-base">{content.Probability ?? '-'}%</span></div>
                               <div className="flex flex-col bg-black/20 p-2 rounded"><span className="text-[10px] text-gray-500 uppercase">{t('tooltip.min')}</span> <span className="text-white font-mono text-base">{content.QuantityMin ?? '-'}</span></div>
                               <div className="flex flex-col bg-black/20 p-2 rounded"><span className="text-[10px] text-gray-500 uppercase">{t('tooltip.max')}</span> <span className="text-white font-mono text-base">{content.QuantityMax ?? '-'}</span></div>
                           </div>
                       </div>
                   )}

                   {/* Fixed Items List - Displayed below probability section as requested */}
                  {content.FixedItems && content.FixedItems.length > 0 && (
                      <div className="bg-emerald-900/10 rounded-xl p-3 border border-emerald-500/20">
                          <span className="text-emerald-400 font-bold block mb-2 pb-2 border-b border-white/5 text-sm flex justify-between">
                              {t('section.fixed')}
                              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full">{content.FixedItems.length}</span>
                          </span>
                          <div className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                              {content.FixedItems.map((item: any, i: number) => {
                                 const id = typeof item === 'string' ? item : item.Id;
                                 const qty = typeof item === 'object' && item.Quantity ? item.Quantity : 1;
                                 return (
                                  <div key={i} className="flex justify-between text-xs leading-tight hover:bg-emerald-500/10 p-1.5 rounded group transition-colors border-b border-white/5 last:border-0">
                                      <span className="truncate text-gray-300 font-medium max-w-[250px]" title={id}>
                                          {hasTranslation(id) ? getItemTranslation(id) : id}
                                      </span>
                                      <span className="text-emerald-500 font-mono font-bold">x{qty}</span>
                                  </div>
                                 );
                              })}
                          </div>
                      </div>
                  )}

                   {/* Stats Grid */}
                   <div className="grid grid-cols-2 gap-3">
                       {(content.InitialDamage !== undefined || content.RandomDamage !== undefined) && (
                           <div className="bg-scum-800/30 rounded-xl p-3 border border-white/5">
                               <div className="text-xs text-orange-400 font-bold mb-2 uppercase">{t('tooltip.damage')}</div>
                               <div className="space-y-1">
                                    <div className="flex justify-between text-xs"><span>{t('tooltip.init')}:</span> <span className="text-white font-mono">{content.InitialDamage ?? 0}</span></div>
                                    <div className="flex justify-between text-xs"><span>{t('tooltip.rnd')}:</span> <span className="text-white font-mono">{content.RandomDamage ?? 0}</span></div>
                               </div>
                           </div>
                       )}
                       {(content.InitialUsage !== undefined || content.RandomUsage !== undefined) && (
                           <div className="bg-scum-800/30 rounded-xl p-3 border border-white/5">
                               <div className="text-xs text-blue-400 font-bold mb-2 uppercase">{t('tooltip.usage')}</div>
                               <div className="space-y-1">
                                    <div className="flex justify-between text-xs"><span>{t('tooltip.init')}:</span> <span className="text-white font-mono">{content.InitialUsage ?? 0}</span></div>
                                    <div className="flex justify-between text-xs"><span>{t('tooltip.rnd')}:</span> <span className="text-white font-mono">{content.RandomUsage ?? 0}</span></div>
                               </div>
                           </div>
                       )}
                  </div>

                  {/* Content Lists - No Slice Limit */}
                  {content.Items && content.Items.length > 0 && (
                      <div className="bg-scum-800/50 rounded-xl p-3 border border-white/5">
                          <span className="text-scum-accent font-bold block mb-2 pb-2 border-b border-white/5 text-sm flex justify-between">
                              {t(previewType === 'node' ? 'tooltip.nodeContents' : 'tooltip.items')}
                              <span className="bg-scum-accent/20 text-scum-accent text-xs px-2 py-0.5 rounded-full">{content.Items.length}</span>
                          </span>
                          <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                              {content.Items.map((item, i) => {
                                  const rarity = item.Rarity === 'N/A' || !item.Rarity ? 'Common' : item.Rarity;
                                  const weight = RARITY_WEIGHTS[rarity] || 1;
                                  const percentage = totalItemWeight > 0 ? (weight / totalItemWeight * 100).toFixed(1) : "0";
                                  const rarityColor = stringToColor(rarity);

                                  return (
                                  <div key={i} className="flex justify-between items-center text-xs leading-tight hover:bg-white/5 p-1.5 rounded group transition-colors border-b border-white/5 last:border-0">
                                      <div className="flex flex-col truncate max-w-[200px]">
                                         <span className="text-gray-300 truncate font-medium" title={item.Id}>
                                            {hasTranslation(item.Id || "") ? getItemTranslation(item.Id || "") : (item.Id || item.Name)}
                                         </span>
                                         {hasTranslation(item.Id || "") && <span className="text-[9px] text-gray-500 truncate">{item.Id || item.Name}</span>}
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <span 
                                            className="text-[9px] uppercase tracking-wider whitespace-nowrap px-1.5 py-0.5 rounded border opacity-80"
                                            style={{ 
                                                color: rarityColor, 
                                                borderColor: `${rarityColor}40`,
                                                backgroundColor: `${rarityColor}10` 
                                            }}
                                          >
                                              {rarity}
                                          </span>
                                          <span className="text-gray-400 font-mono w-10 text-right">{percentage}%</span>
                                      </div>
                                  </div>
                              )})}
                          </div>
                      </div>
                  )}
                  {content.Subpresets && content.Subpresets.length > 0 && (
                      <div className="bg-red-900/10 rounded-xl p-3 border border-red-500/30">
                           <span className="text-red-400 font-bold block mb-2 pb-2 border-b border-red-500/20 text-sm flex justify-between items-center">
                              <span>{t('tooltip.subpresets')} <span className="text-[10px] opacity-70">(Nested - Warning)</span></span>
                              <span className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full">{content.Subpresets.length}</span>
                          </span>
                          <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                              {content.Subpresets.map((item, i) => (
                                  <div key={i} className="flex justify-between text-xs leading-tight hover:bg-red-500/10 p-1.5 rounded group transition-colors border-b border-red-500/10 last:border-0">
                                      <div className="flex flex-col truncate max-w-[250px]">
                                         <span className="text-gray-300 truncate" title={item.Id}>{item.Id}</span>
                                      </div>
                                      <span className="text-gray-500 text-[10px] uppercase tracking-wider whitespace-nowrap ml-2">
                                          {t(`rarity.${item.Rarity}`) !== `rarity.${item.Rarity}` ? t(`rarity.${item.Rarity}`) : item.Rarity}
                                      </span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                  {!content.Items && !content.Subpresets && !content.FixedItems && (
                      <div className="text-gray-500 italic text-center py-4 text-xs">{t('zones.noItems')}</div>
                  )}
              </div>
        </div>,
        document.body
    );
};