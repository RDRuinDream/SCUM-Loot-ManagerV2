
import React from 'react';
import { TrashIcon, ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from '../Icons';
import { RarityButton } from './RarityButton';
import { useI18n } from '../../i18n';

const RARITY_OPTIONS = ["Abundant", "Common", "Uncommon", "Rare", "VeryRare", "ExtremelyRare"];

interface BulkActionsToolbarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onDelete: () => void;
    onCopy: () => void;
    onPaste: () => void;
    onSetRarity: (rarity: string) => void;
    canPaste: boolean;
    showRarityControls: boolean;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({ 
    selectedCount, 
    onClearSelection, 
    onDelete, 
    onCopy, 
    onPaste,
    onSetRarity,
    canPaste,
    showRarityControls
}) => {
    const { t } = useI18n();
    const hasSelection = selectedCount > 0;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0f172a] border border-scum-accent/50 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] p-3 px-5 flex flex-col md:flex-row items-center gap-4 animate-slide-up ring-1 ring-white/10">
            <div className="flex items-center gap-3 border-r border-white/10 pr-4 mr-2">
                <span className={`font-bold text-xl ${hasSelection ? 'text-scum-accent' : 'text-gray-600'}`}>{selectedCount}</span>
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none">{t('editor.selected')}</span>
                    <button 
                        onClick={onClearSelection} 
                        disabled={!hasSelection}
                        className={`text-[10px] transition-colors text-left mt-0.5 underline decoration-dotted ${hasSelection ? 'text-gray-500 hover:text-white' : 'text-gray-700 cursor-not-allowed'}`}
                    >
                        {t('editor.deselectAll')}
                    </button>
                </div>
            </div>
            
            {showRarityControls && (
                <div className={`flex items-center gap-1.5 border-r border-white/10 pr-4 mr-2 ${!hasSelection ? 'opacity-50 pointer-events-none' : ''}`}>
                    {RARITY_OPTIONS.map(r => (
                        <RarityButton key={r} rarity={r} onClick={() => onSetRarity(r)} />
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2">
                <button 
                    onClick={onCopy} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors bg-scum-800 hover:bg-white/10 text-gray-300 hover:text-white border-scum-700`}
                    title={t('common.copy')}
                >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    <span className="text-xs font-bold">{t('common.copy')}</span>
                </button>

                <button 
                    onClick={onPaste} 
                    disabled={!canPaste}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border ${
                        canPaste 
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 cursor-pointer shadow-lg shadow-indigo-500/20' 
                        : 'bg-scum-900 text-gray-600 border-scum-800 cursor-not-allowed'
                    }`}
                    title={t('common.paste')}
                >
                    <ClipboardDocumentCheckIcon className="w-4 h-4" />
                    <span className="text-xs font-bold">{t('common.paste')}</span>
                </button>

                <div className="w-px h-6 bg-white/10 mx-1"></div>

                <button 
                    onClick={onDelete} 
                    disabled={!hasSelection}
                    className={`p-2 rounded-lg transition-colors border border-transparent ${hasSelection ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300 hover:border-red-500/30' : 'text-gray-700 cursor-not-allowed'}`}
                    title={t('editor.delete')}
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
