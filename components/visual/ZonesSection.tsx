
import React from 'react';
import { TrashIcon, EyeIcon, CheckCircleIcon } from '../Icons'; 
import { useI18n } from '../../i18n';

interface ZonesSectionProps {
    zones: any[];
    handleContainerDrop: (e: React.DragEvent, section: any) => void;
    deleteItem: (section: any, index: number) => void;
    updateItem: (section: any, index: number, field: string, value: any) => void;
    getInputClass: (key?: string) => string;
    onPickZone?: (index: number) => void;
    isBulkMode?: boolean;
    selectedIndices?: Set<number>;
    onSelect?: (index: number) => void;
}

export const ZonesSection: React.FC<ZonesSectionProps> = ({
    zones,
    handleContainerDrop,
    deleteItem,
    updateItem,
    getInputClass,
    onPickZone,
    isBulkMode,
    selectedIndices,
    onSelect
}) => {
    const { t } = useI18n();

    return (
        <div className="space-y-3 min-h-[100px]" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleContainerDrop(e, 'Zones')}>
            {(zones || []).map((zone, idx) => {
                const isSelected = selectedIndices?.has(idx);
                return (
                <div 
                    key={idx} 
                    className={`
                        relative p-4 rounded-lg flex items-center gap-4 border transition-all focus-within:z-50
                        ${isSelected ? 'bg-scum-800/80 border-yellow-500/50 ring-1 ring-yellow-500/30' : 'bg-scum-800/30 border-scum-700/50 hover:bg-scum-800/60'}
                    `} 
                    data-scum-item-id={'Zone #' + idx}
                >
                    {isBulkMode && onSelect ? (
                        <div 
                            className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center transition-colors ${isSelected ? 'bg-yellow-500 border-yellow-500' : 'border-gray-600 hover:border-gray-400'}`}
                            onClick={() => onSelect(idx)}
                        >
                            {isSelected && <CheckCircleIcon className="w-3.5 h-3.5 text-black" />}
                        </div>
                    ) : (
                        <div className="text-[10px] font-mono text-gray-600 w-6">#{idx+1}</div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 flex-1">
                        <div><label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">{t('common.topLeft')}</label><input className={`${getInputClass()} font-mono text-xs`} value={zone.TopLeft} onChange={e => updateItem('Zones', idx, 'TopLeft', e.target.value)} /></div>
                        <div><label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">{t('common.bottomRight')}</label><input className={`${getInputClass()} font-mono text-xs`} value={zone.BottomRight} onChange={e => updateItem('Zones', idx, 'BottomRight', e.target.value)} /></div>
                    </div>
                    {onPickZone && (
                        <button 
                            onClick={() => onPickZone(idx)} 
                            className="p-2 bg-black/20 hover:bg-scum-accent/20 text-scum-accent border border-scum-accent/30 rounded-lg transition-all"
                            title={t('zone.pickFromMap')}
                        >
                            <EyeIcon className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={() => deleteItem('Zones', idx)} className="p-2 text-gray-600 hover:text-scum-danger"><TrashIcon /></button>
                </div>
            )})}
        </div>
    );
};
