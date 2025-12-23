
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ScumZoneRect, ScumJson } from '../types';
import { useI18n } from '../i18n';
import { ZoomInIcon, ZoomOutIcon, ResetIcon, CheckCircleIcon, GridIcon, TagIcon, EyeIcon, FilterIcon } from './Icons'; 
import { getItemTranslation, hasTranslation } from '../utils/itemTranslator';

interface ZoneData extends ScumZoneRect {
    x: number; 
    y: number; 
    width: number; 
    height: number; 
    area: number; 
    originalIndex: number;
    color: string;
    sourcePath: string;
}

interface ZonesVisualizerProps {
    zones: Record<string, { color: string, data: ScumZoneRect[] }>;
    onHighlightFile: (path: string | null) => void;
    onNavigateToFile: (path: string) => void;
    onPeekFile: (path: string) => Promise<ScumJson | null>;
    isPickingMode?: boolean;
    onConfirmSelection?: (rect: { TopLeft: string, BottomRight: string }) => void;
    onSelectZone?: (path: string, index: number) => void;
    activeLayerFilter: 'all' | 'zones' | 'modifiers';
}

const MAP_IMAGE_SIZE = 1280;
const MAP_IMAGE_PATH = 'https://raw.githubusercontent.com/LXHuiMeng/SCUMMap/main/Img/scummap.webp';

const WORLD_TOP_LEFT_X = 620000;
const WORLD_TOP_LEFT_Y = 620000;
const WORLD_BOTTOM_RIGHT_X = -905000;
const WORLD_BOTTOM_RIGHT_Y = -905000;

const GRID_ROWS = ['D', 'C', 'B', 'A', 'Z'];
const GRID_COLS = ['4', '3', '2', '1', '0'];
const GRID_CELL_SIZE = MAP_IMAGE_SIZE / 5;

const parseCoord = (str: string) => {
    const xMatch = str.match(/X=([\d.-]+)/);
    const yMatch = str.match(/Y=([\d.-]+)/);
    return {
        x: xMatch ? parseFloat(xMatch[1]) : 0,
        y: yMatch ? parseFloat(yMatch[1]) : 0
    };
};

// Map technical modifier keys to translation keys
const MODIFIER_PROP_MAP: Record<string, string> = {
    'SpawnerProbabilityMultiplier': 'modifiers.prop_spawnerProb',
    'ExamineSpawnerProbabilityMultiplier': 'modifiers.prop_examineProb',
    'ExamineSpawnerQuantityMultiplier': 'modifiers.prop_examineQty',
};

export const ZonesVisualizer: React.FC<ZonesVisualizerProps> = ({ zones, onHighlightFile, onNavigateToFile, onPeekFile, isPickingMode, onConfirmSelection, onSelectZone, activeLayerFilter }) => {
    const { t } = useI18n();
    const [hoveredZone, setHoveredZone] = useState<ZoneData | null>(null);
    const [tooltipData, setTooltipData] = useState<{ path: string, content: ScumJson | null } | null>(null);
    const hoverTimeout = useRef<number | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
    
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const isMouseDownRef = useRef(false);
    const clickStartRef = useRef({ x: 0, y: 0 });
    
    const [showGrid, setShowGrid] = useState(() => localStorage.getItem('scum_map_grid') === 'true');
    const [showLabels, setShowLabels] = useState(() => localStorage.getItem('scum_map_labels') === 'true');
    const [showNameTags, setShowNameTags] = useState(() => localStorage.getItem('scum_map_nametags') !== 'false');

    const [mapSrc, setMapSrc] = useState<string>(MAP_IMAGE_PATH);

    const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null);
    const [currentSelection, setCurrentSelection] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [selectionWorldCoords, setSelectionWorldCoords] = useState<{ TopLeft: string, BottomRight: string } | null>(null);

    useEffect(() => {
        const loadCachedMap = async () => {
            if ('caches' in window) {
                try {
                    const cacheName = 'scum-map-cache-v1';
                    const cache = await caches.open(cacheName);
                    const response = await cache.match(MAP_IMAGE_PATH);
                    if (response) setMapSrc(URL.createObjectURL(await response.blob()));
                } catch (e) {}
            }
        };
        loadCachedMap();
    }, []);

    const toggleGrid = () => { setShowGrid(v => !v); localStorage.setItem('scum_map_grid', String(!showGrid)); };
    const toggleLabels = () => { setShowLabels(v => !v); localStorage.setItem('scum_map_labels', String(!showLabels)); };
    const toggleNameTags = () => { setShowNameTags(v => !v); localStorage.setItem('scum_map_nametags', String(!showNameTags)); };

    useEffect(() => {
        if (containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            const scale = Math.min(width / MAP_IMAGE_SIZE, height / MAP_IMAGE_SIZE);
            setTransform({ x: (width - MAP_IMAGE_SIZE * scale) / 2, y: (height - MAP_IMAGE_SIZE * scale) / 2, k: scale });
        }
    }, []);

    const gameToSvg = (gx: number, gy: number) => ({
        x: ((gx - WORLD_TOP_LEFT_X) / (WORLD_BOTTOM_RIGHT_X - WORLD_TOP_LEFT_X)) * MAP_IMAGE_SIZE,
        y: ((gy - WORLD_TOP_LEFT_Y) / (WORLD_BOTTOM_RIGHT_Y - WORLD_TOP_LEFT_Y)) * MAP_IMAGE_SIZE
    });

    const svgToGame = (sx: number, sy: number) => ({
        x: WORLD_TOP_LEFT_X + (sx / MAP_IMAGE_SIZE) * (WORLD_BOTTOM_RIGHT_X - WORLD_TOP_LEFT_X),
        y: WORLD_TOP_LEFT_Y + (sy / MAP_IMAGE_SIZE) * (WORLD_BOTTOM_RIGHT_Y - WORLD_TOP_LEFT_Y)
    });

    const processedZones = useMemo(() => {
        const result: ZoneData[] = [];
        Object.keys(zones).forEach((key) => {
            const { color, data } = zones[key];
            data.forEach((zone) => {
                // Filter by activeLayerFilter
                const isStandard = zone.sourceType === 'standard';
                const isModifier = zone.sourceType === 'modifier';

                if (activeLayerFilter === 'zones' && !isStandard) return;
                if (activeLayerFilter === 'modifiers' && !isModifier) return;

                const pt1 = gameToSvg(parseCoord(zone.TopLeft).x, parseCoord(zone.TopLeft).y);
                const pt2 = gameToSvg(parseCoord(zone.BottomRight).x, parseCoord(zone.BottomRight).y);

                result.push({
                    ...zone,
                    x: Math.min(pt1.x, pt2.x),
                    y: Math.min(pt1.y, pt2.y),
                    width: Math.abs(pt2.x - pt1.x),
                    height: Math.abs(pt2.y - pt1.y),
                    area: Math.abs(pt2.x - pt1.x) * Math.abs(pt2.y - pt1.y),
                    color,
                    originalIndex: zone.parentIndex || 0,
                    sourcePath: zone.sourcePath || key
                });
            });
        });
        return result.sort((a, b) => b.area - a.area);
    }, [zones, activeLayerFilter]);

    const handleZoom = (e: React.WheelEvent) => {
        const rect = containerRef.current!.getBoundingClientRect();
        const factor = 1 + (e.deltaY > 0 ? -0.1 : 0.1);
        let newK = Math.max(0.05, Math.min(20, transform.k * factor));
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        setTransform({ x: mx - (mx - transform.x) * (newK / transform.k), y: my - (my - transform.y) * (newK / transform.k), k: newK });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const rect = containerRef.current!.getBoundingClientRect();
        const svgX = (e.clientX - rect.left - transform.x) / transform.k;
        const svgY = (e.clientY - rect.top - transform.y) / transform.k;

        if (isPickingMode && svgX >= 0 && svgX <= MAP_IMAGE_SIZE && svgY >= 0 && svgY <= MAP_IMAGE_SIZE) {
            setSelectionStart({ x: svgX, y: svgY });
            setCurrentSelection({ x: svgX, y: svgY, w: 0, h: 0 });
            setSelectionWorldCoords(null);
        } else {
            isMouseDownRef.current = true;
            setDragStart({ x: e.clientX, y: e.clientY });
            clickStartRef.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = containerRef.current!.getBoundingClientRect();
        const svgX = (e.clientX - rect.left - transform.x) / transform.k;
        const svgY = (e.clientY - rect.top - transform.y) / transform.k;

        if (isPickingMode && selectionStart) {
            const cx = Math.max(0, Math.min(MAP_IMAGE_SIZE, svgX));
            const cy = Math.max(0, Math.min(MAP_IMAGE_SIZE, svgY));
            setCurrentSelection({ x: Math.min(selectionStart.x, cx), y: Math.min(selectionStart.y, cy), w: Math.abs(cx - selectionStart.x), h: Math.abs(cy - selectionStart.y) });
        } else if (isMouseDownRef.current) {
            if (!isDragging && Math.hypot(e.clientX - clickStartRef.current.x, e.clientY - clickStartRef.current.y) > 5) setIsDragging(true);
            if (isDragging) {
                setTransform(p => ({ ...p, x: p.x + e.clientX - dragStart.x, y: p.y + e.clientY - dragStart.y }));
                setDragStart({ x: e.clientX, y: e.clientY });
            }
        }
    };

    const handleMouseUp = () => {
        if (isPickingMode && selectionStart && currentSelection && currentSelection.w > 5) {
            const pt1 = svgToGame(currentSelection.x, currentSelection.y);
            const pt2 = svgToGame(currentSelection.x + currentSelection.w, currentSelection.y + currentSelection.h);
            setSelectionWorldCoords({ TopLeft: `X=${pt1.x.toFixed(4)} Y=${pt1.y.toFixed(4)}`, BottomRight: `X=${pt2.x.toFixed(4)} Y=${pt2.y.toFixed(4)}` });
        }
        isMouseDownRef.current = false;
        setSelectionStart(null);
        setTimeout(() => setIsDragging(false), 0);
    };

    const handleEnterRect = (zone: ZoneData) => {
        if (isDragging || isPickingMode || isMouseDownRef.current) return;
        setHoveredZone(zone);
        onHighlightFile(zone.sourcePath);
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        hoverTimeout.current = window.setTimeout(async () => {
            const content = await onPeekFile(zone.sourcePath);
            setTooltipData({ path: zone.sourcePath, content });
        }, 300);
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#02040a] relative overflow-hidden">
            <div ref={containerRef} className={`w-full h-full relative overflow-hidden ${isPickingMode ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} onWheel={handleZoom} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => { handleMouseUp(); setHoveredZone(null); onHighlightFile(null); }}>
                <div style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`, transformOrigin: '0 0', width: MAP_IMAGE_SIZE, height: MAP_IMAGE_SIZE }} className="relative">
                    <img src={mapSrc} className="w-[1280px] h-[1280px] pointer-events-none select-none block" draggable={false} alt="Map" />
                    
                    {showGrid && (
                        <svg viewBox={`0 0 ${MAP_IMAGE_SIZE} ${MAP_IMAGE_SIZE}`} className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
                            {[1, 2, 3, 4].map(i => <React.Fragment key={i}>
                                <line x1={i * GRID_CELL_SIZE} y1={0} x2={i * GRID_CELL_SIZE} y2={MAP_IMAGE_SIZE} stroke="white" strokeWidth={1 / transform.k} />
                                <line x1={0} y1={i * GRID_CELL_SIZE} x2={MAP_IMAGE_SIZE} y2={i * GRID_CELL_SIZE} stroke="white" strokeWidth={1 / transform.k} />
                            </React.Fragment>)}
                        </svg>
                    )}

                    {showLabels && (
                        <svg viewBox={`0 0 ${MAP_IMAGE_SIZE} ${MAP_IMAGE_SIZE}`} className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
                            {GRID_ROWS.map((r, ri) => GRID_COLS.map((c, ci) => (
                                <text key={r + c} x={ci * GRID_CELL_SIZE + GRID_CELL_SIZE / 2} y={ri * GRID_CELL_SIZE + GRID_CELL_SIZE / 2} textAnchor="middle" dominantBaseline="middle" fill="white" style={{ fontSize: '100px', fontWeight: 'bold' }}>{r}{c}</text>
                            )))}
                        </svg>
                    )}

                    <svg viewBox={`0 0 ${MAP_IMAGE_SIZE} ${MAP_IMAGE_SIZE}`} className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                        {processedZones.map((z, idx) => {
                            const isHovered = hoveredZone?.sourcePath === z.sourcePath && hoveredZone?.originalIndex === z.originalIndex;
                            const isMod = z.sourceType === 'modifier';
                            return (
                                <g key={`${z.sourcePath}-${idx}`}>
                                    <rect x={z.x} y={z.y} width={z.width} height={z.height} fill={isMod ? '#06b6d4' : z.color} fillOpacity={isHovered ? 0.6 : 0.2} stroke={isMod ? '#06b6d4' : z.color} strokeWidth={(isHovered ? 4 : 1.5) / transform.k} className="pointer-events-auto cursor-pointer transition-all duration-200" onMouseEnter={() => handleEnterRect(z)} onMouseUp={() => !isDragging && !isPickingMode && (onSelectZone ? onSelectZone(z.sourcePath, z.originalIndex) : onNavigateToFile(z.sourcePath))} />
                                    {showNameTags && z.Name && z.area > (5000 / transform.k) && (
                                        <text x={z.x + z.width / 2} y={z.y + z.height / 2} textAnchor="middle" dominantBaseline="middle" fill="white" className="pointer-events-none font-bold drop-shadow-md" style={{ fontSize: `${Math.max(4, Math.min(24, 12 / transform.k))}px`, textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>{z.Name}</text>
                                    )}
                                </g>
                            );
                        })}
                        {currentSelection && <rect x={currentSelection.x} y={currentSelection.y} width={currentSelection.w} height={currentSelection.h} fill="rgba(6,182,212,0.1)" stroke="#06b6d4" strokeWidth={2 / transform.k} />}
                    </svg>
                </div>
            </div>

            {/* Float Controls */}
            <div className="absolute top-6 right-6 flex flex-col gap-2 z-30">
                <button 
                    onClick={toggleGrid} 
                    className={`p-3 rounded-full shadow-xl backdrop-blur-md border transition-all ${showGrid ? 'bg-scum-accent text-black border-scum-accent' : 'bg-scum-800 text-gray-200 border-white/10'}`}
                    title={t('zone.toggleGrid')}
                >
                    <GridIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={toggleLabels} 
                    className={`p-3 rounded-full shadow-xl backdrop-blur-md border transition-all ${showLabels ? 'bg-scum-accent text-black border-scum-accent' : 'bg-scum-800 text-gray-200 border-white/10'}`}
                    title={t('zone.toggleLabels')}
                >
                    <TagIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={toggleNameTags} 
                    className={`p-3 rounded-full shadow-xl backdrop-blur-md border transition-all ${showNameTags ? 'bg-scum-accent text-black border-scum-accent' : 'bg-scum-800 text-gray-200 border-white/10'}`}
                    title={t('zone.toggleNames')}
                >
                    <EyeIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Zone Prober (Inspector) */}
            {hoveredZone && !isDragging && (
                <div className="absolute bottom-6 left-6 max-w-sm w-full bg-scum-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-scale-in overflow-hidden z-40 pointer-events-none ring-1 ring-scum-accent/20">
                    <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: hoveredZone.color }}></span>
                            <div className="flex flex-col">
                                <span className="font-mono font-bold text-sm text-gray-100">{hoveredZone.sourcePath.split('/').pop()}</span>
                                <span className="text-[10px] text-scum-accent font-mono uppercase tracking-widest">{hoveredZone.sourceType === 'modifier' ? 'MODIFIER ZONE' : 'STANDARD ZONE'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 space-y-4">
                        {hoveredZone.Name && (
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t('common.name')}</span>
                                <span className="text-lg font-bold text-white drop-shadow-sm">{hoveredZone.Name}</span>
                            </div>
                        )}
                        
                        {hoveredZone.modifiers && Object.keys(hoveredZone.modifiers).length > 0 && (
                            <div className="space-y-2 bg-black/30 p-3 rounded-xl border border-scum-accent/20">
                                <span className="text-[10px] text-scum-accent uppercase font-bold tracking-widest block border-b border-scum-accent/10 pb-1 mb-2">{t('zone.inspector')}</span>
                                {Object.entries(hoveredZone.modifiers).map(([k, v]) => (
                                    <div key={k} className="flex justify-between items-center group">
                                        <span className="text-[10px] text-gray-400 max-w-[150px] truncate" title={k}>
                                            {t(MODIFIER_PROP_MAP[k] || k).replace('Multiplier', '')}
                                        </span>
                                        <span className={`text-sm font-mono font-bold ${v > 1 ? 'text-green-400' : v < 1 ? 'text-red-400' : 'text-gray-300'}`}>x{v.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-[9px] font-mono text-gray-500">
                            <div className="flex flex-col"><span className="uppercase">{t('common.topLeft')}</span><span className="text-gray-300 truncate">{hoveredZone.TopLeft}</span></div>
                            <div className="flex flex-col"><span className="uppercase">{t('common.bottomRight')}</span><span className="text-gray-300 truncate">{hoveredZone.BottomRight}</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Selection/Picking UI */}
            {isPickingMode && selectionWorldCoords && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-scum-900/95 border border-scum-accent rounded-2xl shadow-2xl p-6 backdrop-blur-xl animate-slide-up flex flex-col gap-4 items-center z-50 min-w-[300px]">
                    <div className="flex flex-col gap-2 text-center w-full font-mono">
                        <div className="text-xs text-scum-accent bg-black/40 px-3 py-2 rounded-lg border border-scum-accent/20 w-full">{selectionWorldCoords.TopLeft}</div>
                        <div className="text-xs text-scum-accent bg-black/40 px-3 py-2 rounded-lg border border-scum-accent/20 w-full">{selectionWorldCoords.BottomRight}</div>
                    </div>
                    <button onClick={() => onConfirmSelection?.(selectionWorldCoords)} className="w-full bg-scum-accent text-black font-bold py-3 rounded-xl hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all">{t('common.confirm')}</button>
                </div>
            )}

            {/* Navigation buttons */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-30">
                <button onClick={() => setTransform(p => ({ ...p, k: p.k * 1.2 }))} className="p-3 bg-scum-800/90 text-gray-200 rounded-full border border-white/10"><ZoomInIcon className="w-5 h-5" /></button>
                <button onClick={() => setTransform(p => ({ ...p, k: p.k / 1.2 }))} className="p-3 bg-scum-800/90 text-gray-200 rounded-full border border-white/10"><ZoomOutIcon className="w-5 h-5" /></button>
            </div>
        </div>
    );
};
