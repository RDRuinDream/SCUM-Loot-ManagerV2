
import React, { useMemo, useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { stringToColor } from '../utils/helpers';
import { useI18n } from '../i18n';
import { getItemTranslation, hasTranslation } from '../utils/itemTranslator';
import { ZoomInIcon, ZoomOutIcon, ResetIcon } from './Icons';

interface RarityPieChartProps {
    stats: { id: string, percent: number }[];
    totalWeight: number | string;
    onItemClick?: (id: string) => void;
    onHoverItem?: (id: string | null) => void;
    hoveredId?: string | null;
}

export const RarityPieChart: React.FC<RarityPieChartProps> = ({ stats, totalWeight, onItemClick, onHoverItem, hoveredId }) => {
    const { t } = useI18n();
    const containerRef = useRef<HTMLDivElement>(null); 
    const outerRef = useRef<HTMLDivElement>(null); 
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [lines, setLines] = useState<{ id: string, path: string, color: string, endX: number, endY: number }[]>([]);

    const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    
    const dragRef = useRef({
        startX: 0,
        startY: 0,
        startViewX: 0,
        startViewY: 0,
        isDown: false,
        hasDragged: false
    });

    const statsWithAngles = useMemo(() => {
        let currentAngle = 0;
        return stats.map(s => {
            const size = (s.percent / 100) * 2 * Math.PI;
            const start = currentAngle;
            const end = currentAngle + size;
            const mid = start + size / 2;
            currentAngle += size;
            return { ...s, startAngle: start, endAngle: end, midAngle: mid };
        });
    }, [stats]);

    const { leftItems, rightItems } = useMemo(() => {
        const left: typeof statsWithAngles = [];
        const right: typeof statsWithAngles = [];

        statsWithAngles.forEach(s => {
            if (Math.cos(s.midAngle) >= 0) {
                right.push(s);
            } else {
                left.push(s);
            }
        });

        left.sort((a, b) => Math.sin(a.midAngle) - Math.sin(b.midAngle));
        right.sort((a, b) => Math.sin(a.midAngle) - Math.sin(b.midAngle));

        return { leftItems: left, rightItems: right };
    }, [statsWithAngles]);

    const updateLines = useCallback(() => {
        if (!containerRef.current) {
            setLines([]);
            return;
        }

        const containerRect = containerRef.current.getBoundingClientRect();
        const newLines: { id: string, path: string, color: string, endX: number, endY: number }[] = [];
        
        const pieEl = containerRef.current.querySelector('[data-pie-chart]');
        if (!pieEl) return;
        const pieRect = pieEl.getBoundingClientRect();
        
        const scale = viewState.scale;
        
        const centerX = (pieRect.left + pieRect.width / 2 - containerRect.left) / scale;
        const centerY = (pieRect.top + pieRect.height / 2 - containerRect.top) / scale;
        
        const pieLogicalWidth = pieRect.width / scale;
        const pieLogicalHeight = pieRect.height / scale;
        const radius = Math.min(pieLogicalWidth, pieLogicalHeight) / 2 * 0.9; 

        statsWithAngles.forEach(s => {
            const cardEl = cardRefs.current.get(s.id);
            if (!cardEl) return;

            const cardRect = cardEl.getBoundingClientRect();
            
            const anchorX = centerX + Math.cos(s.midAngle) * radius;
            const anchorY = centerY + Math.sin(s.midAngle) * radius;

            const relCardLeft = (cardRect.left - containerRect.left) / scale;
            const relCardTop = (cardRect.top - containerRect.top) / scale;
            const cardWidth = cardRect.width / scale;
            const cardHeight = cardRect.height / scale;
            
            const isRightSide = Math.cos(s.midAngle) >= 0;
            
            const targetX = isRightSide ? relCardLeft : relCardLeft + cardWidth;
            const targetY = relCardTop + cardHeight / 2;

            const cp1X = anchorX + Math.cos(s.midAngle) * 40; 
            const cp1Y = anchorY + Math.sin(s.midAngle) * 40;

            const cp2X = isRightSide ? targetX - 20 : targetX + 20;
            const cp2Y = targetY;

            const path = `M ${anchorX} ${anchorY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${targetX} ${targetY}`;
            
            newLines.push({
                id: s.id,
                path,
                color: stringToColor(s.id),
                endX: targetX,
                endY: targetY
            });
        });

        setLines(newLines);
    }, [statsWithAngles, viewState.scale]);

    useLayoutEffect(() => {
        updateLines();
    }, [updateLines, leftItems, rightItems]); 

    useEffect(() => {
        const handleResize = () => updateLines();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [updateLines]);

    useEffect(() => {
        const el = outerRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            if (e.target && (e.target as HTMLElement).closest('[data-scrollable]')) return;
            e.preventDefault();
            
            const zoomFactor = 0.1;
            const direction = e.deltaY > 0 ? -1 : 1;
            setViewState(prev => {
                const newScale = Math.max(0.2, Math.min(4, prev.scale + direction * zoomFactor));
                return { ...prev, scale: newScale };
            });
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    const getTooltipText = (id: string, percent: number) => {
        const trans = hasTranslation(id) ? `\n${getItemTranslation(id)}` : '';
        return `${id}${trans}: ${percent.toFixed(1)}%`;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; 
        dragRef.current = { 
            startX: e.clientX, 
            startY: e.clientY,
            startViewX: viewState.x,
            startViewY: viewState.y,
            isDown: true,
            hasDragged: false
        };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragRef.current.isDown) return;
        
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        
        if (!dragRef.current.hasDragged && Math.hypot(dx, dy) > 5) {
            dragRef.current.hasDragged = true;
            setIsDragging(true);
        }

        if (dragRef.current.hasDragged) {
            e.preventDefault();
            setViewState(prev => ({
                ...prev,
                x: dragRef.current.startViewX + dx,
                y: dragRef.current.startViewY + dy
            }));
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        dragRef.current.isDown = false;
        if (dragRef.current.hasDragged) {
            setIsDragging(false);
        }
    };

    const centerInfo = useMemo(() => {
        if (hoveredId) {
            const stat = stats.find(s => s.id === hoveredId);
            if (stat) {
                const name = hasTranslation(stat.id) ? getItemTranslation(stat.id) : stat.id;
                const isTranslated = hasTranslation(stat.id);
                return {
                    label: name,
                    subLabel: isTranslated ? stat.id : undefined,
                    value: `${stat.percent.toFixed(2)}%`,
                    color: stringToColor(stat.id),
                    isHover: true
                };
            }
        }
        return {
            label: t('stats.total'),
            value: totalWeight,
            color: 'text-gray-200',
            isHover: false
        };
    }, [hoveredId, stats, totalWeight, t]);

    const PieCard: React.FC<{ item: typeof statsWithAngles[0] }> = ({ item }) => {
        const displayName = hasTranslation(item.id) ? getItemTranslation(item.id) : item.id;
        const color = stringToColor(item.id);
        const isActive = hoveredId === item.id;

        return (
            <div 
                ref={(el) => {
                    if(el) cardRefs.current.set(item.id, el);
                    else cardRefs.current.delete(item.id);
                }}
                className={`
                    group cursor-pointer relative transition-all duration-300 w-full max-w-[280px] select-none
                    ${isActive ? 'z-20 scale-[1.05]' : 'hover:scale-[1.02]'}
                `}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!dragRef.current.hasDragged) {
                        onItemClick?.(item.id);
                    }
                }}
                onMouseEnter={() => onHoverItem?.(item.id)}
                onMouseLeave={() => onHoverItem?.(null)}
            >
                <div className={`
                    flex items-center justify-between p-1.5 px-3 rounded border shadow-sm backdrop-blur-md transition-colors duration-300 pointer-events-none
                    ${isActive 
                        ? 'bg-scum-700/80 border-scum-accent ring-1 ring-scum-accent/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                        : 'bg-[#0f172a]/60 border-scum-700/50 hover:bg-[#0f172a]/90 hover:border-scum-600'
                    }
                `}>
                    <div className="flex items-center gap-2 min-w-0">
                         <div className={`w-2 h-2 rounded-full shrink-0 transition-shadow duration-300 ${isActive ? 'shadow-[0_0_8px_currentColor]' : 'shadow-[0_0_5px_currentColor]'}`} style={{ backgroundColor: color }}></div>
                         <span className={`text-xs truncate font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-300'}`} title={item.id}>
                            {displayName}
                         </span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-gray-400 ml-2 whitespace-nowrap">
                        {item.percent.toFixed(1)}%
                    </span>
                </div>
                <div className="absolute inset-0 z-10"></div>
            </div>
        );
    };

    return (
        <div 
            ref={outerRef}
            className={`
                relative w-full h-[500px] overflow-hidden bg-[#0b1120] rounded-xl border border-white/5 shadow-inner touch-none
                ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
            `}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <style>
                {`
                    @keyframes beam-charge {
                        from { stroke-dashoffset: 1; }
                        to { stroke-dashoffset: 0; }
                    }
                `}
            </style>

            <div 
                ref={containerRef}
                style={{ 
                    transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`,
                    transformOrigin: 'center',
                }}
                className="w-full h-full flex items-center justify-center will-change-transform origin-center"
            >
                <div className="grid grid-cols-[1fr_auto_1fr] gap-16 justify-items-center items-center min-w-[800px]">
                    
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                        {lines.map(line => {
                            const isLineActive = hoveredId === line.id;
                            return (
                                <g key={line.id}>
                                    <path 
                                        d={line.path}
                                        stroke={line.color}
                                        strokeWidth={1}
                                        fill="none"
                                        className={`transition-opacity duration-300 ${isLineActive ? 'opacity-30' : 'opacity-10'}`}
                                        strokeDasharray="2,2"
                                    />
                                    <path 
                                        d={line.path}
                                        stroke={line.color}
                                        strokeWidth={isLineActive ? 2.5 : 0}
                                        fill="none"
                                        pathLength="1"
                                        strokeDasharray="1"
                                        strokeDashoffset="1"
                                        strokeLinecap="round"
                                        style={{
                                            opacity: isLineActive ? 1 : 0,
                                            filter: isLineActive ? `drop-shadow(0 0 4px ${line.color})` : 'none',
                                            animation: isLineActive ? 'beam-charge 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards' : 'none'
                                        }}
                                    />
                                    <circle 
                                        cx={line.endX} 
                                        cy={line.endY} 
                                        r={isLineActive ? 3 : 1.5} 
                                        fill={line.color}
                                        className={`transition-all duration-300 ${isLineActive ? 'opacity-100' : 'opacity-40'}`}
                                        style={{ filter: isLineActive ? `drop-shadow(0 0 5px ${line.color})` : 'none' }}
                                    />
                                </g>
                            );
                        })}
                    </svg>

                    <div className="flex flex-col gap-1 w-[280px] justify-center items-end py-4 z-10">
                        {leftItems.map((item) => <PieCard key={item.id} item={item} />)}
                    </div>

                    <div className="relative w-[300px] h-[300px] flex items-center justify-center shrink-0 self-center" data-pie-chart>
                        <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full drop-shadow-2xl overflow-visible">
                            {statsWithAngles.map((s) => {
                                const largeArcFlag = s.percent > 50 ? 1 : 0;
                                const startX = Math.cos(s.startAngle);
                                const startY = Math.sin(s.startAngle);
                                const endX = Math.cos(s.endAngle);
                                const endY = Math.sin(s.endAngle);
                                const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
                                const isActive = hoveredId === s.id;
                                const isDimmed = hoveredId && !isActive;
                                
                                const explosionOffset = 0.1; 
                                const moveX = isActive ? Math.cos(s.midAngle) * explosionOffset : 0;
                                const moveY = isActive ? Math.sin(s.midAngle) * explosionOffset : 0;

                                return (
                                <path
                                    key={s.id}
                                    d={pathData}
                                    fill={stringToColor(s.id)}
                                    transform={`translate(${moveX}, ${moveY}) scale(${isActive ? 1.05 : 1})`}
                                    style={{ transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s' }}
                                    className={`
                                        cursor-pointer stroke-[#0f172a] stroke-[0.02]
                                        ${isActive ? 'z-30 opacity-100 brightness-125 filter drop-shadow-[0_0_10px_currentColor]' : 'opacity-80 hover:opacity-100 hover:brightness-110'}
                                        ${isDimmed ? 'opacity-20' : ''}
                                    `}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!dragRef.current.hasDragged) {
                                            onItemClick?.(s.id);
                                        }
                                    }}
                                    onMouseEnter={() => onHoverItem?.(s.id)}
                                    onMouseLeave={() => onHoverItem?.(null)}
                                >
                                    <title>{getTooltipText(s.id, s.percent)}</title>
                                </path>
                            )})}
                            <circle cx="0" cy="0" r="0.65" fill="#0f172a" className="drop-shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]" />
                        </svg>
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center z-10 p-8">
                            <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 transition-opacity ${centerInfo.isHover ? 'text-scum-accent opacity-100' : 'text-gray-500 opacity-60'}`}>
                                {centerInfo.isHover ? t('editor.selected') : t('stats.total')}
                            </span>
                            
                            <span className="text-xl font-bold leading-tight break-words max-w-full drop-shadow-md" style={{ color: centerInfo.color || '#e2e8f0' }}>
                                {centerInfo.label}
                            </span>
                            
                            <span className={`text-sm font-mono mt-1 font-bold ${centerInfo.isHover ? 'text-white' : 'text-gray-400'}`}>
                                {centerInfo.value}
                            </span>

                            {centerInfo.subLabel && (
                                <span className="text-[10px] text-gray-500 mt-1 truncate max-w-full font-mono opacity-80 border-t border-white/10 pt-1">
                                    {centerInfo.subLabel}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 w-[280px] justify-center items-start py-4 z-10">
                        {rightItems.map((item) => <PieCard key={item.id} item={item} />)}
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50">
                <button 
                    onClick={(e) => { e.stopPropagation(); setViewState(prev => ({ ...prev, scale: Math.min(4, prev.scale * 1.2) })); }} 
                    className="p-2 bg-scum-800/80 hover:bg-scum-700 text-gray-200 rounded-lg shadow-lg backdrop-blur border border-white/5 active:scale-95 transition-all"
                    title={t('common.scale') + " +"}
                >
                    <ZoomInIcon />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); setViewState({ x: 0, y: 0, scale: 1 }); }} 
                    className="p-2 bg-scum-800/80 hover:bg-scum-700 text-gray-200 rounded-lg shadow-lg backdrop-blur border border-white/5 active:scale-95 transition-all"
                    title={t('library.reset')}
                >
                    <ResetIcon />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); setViewState(prev => ({ ...prev, scale: Math.max(0.2, prev.scale / 1.2) })); }} 
                    className="p-2 bg-scum-800/80 hover:bg-scum-700 text-gray-200 rounded-lg shadow-lg backdrop-blur border border-white/5 active:scale-95 transition-all"
                    title={t('common.scale') + " -"}
                >
                    <ZoomOutIcon />
                </button>
            </div>
        </div>
    );
};
