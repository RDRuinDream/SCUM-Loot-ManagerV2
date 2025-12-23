
import React, { useState, useMemo } from 'react';
import { useI18n } from '../i18n';
import { SearchIcon, XMarkIcon, CheckCircleIcon, ClipboardDocumentCheckIcon, FileIcon } from './Icons';
import { getFileNameTranslation } from '../utils/itemTranslator';

interface PasteModalProps {
    onClose: () => void;
    onConfirm: (selectedPaths: string[], isOverwrite: boolean) => void;
    availableFiles: string[];
    contentType: string; // 'Items', 'Nodes', 'Global', etc.
    count: number;
}

export const PasteModal: React.FC<PasteModalProps> = ({ onClose, onConfirm, availableFiles, contentType, count }) => {
    const { t } = useI18n();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
    const [isOverwrite, setIsOverwrite] = useState(false);

    const filteredFiles = useMemo(() => {
        if (!searchTerm) return availableFiles;
        const lower = searchTerm.toLowerCase();
        return availableFiles.filter(f => {
            if (f.toLowerCase().includes(lower)) return true;
            // Also check translated name
            const name = f.split('/').pop() || "";
            const trans = getFileNameTranslation(name);
            if (trans.toLowerCase().includes(lower)) return true;
            return false;
        });
    }, [availableFiles, searchTerm]);

    const handleSelect = (path: string) => {
        const newSet = new Set(selectedPaths);
        if (newSet.has(path)) newSet.delete(path);
        else newSet.add(path);
        setSelectedPaths(newSet);
    };

    const handleSelectAll = () => {
        if (selectedPaths.size === filteredFiles.length) {
            setSelectedPaths(new Set());
        } else {
            const newSet = new Set(selectedPaths);
            filteredFiles.forEach(f => newSet.add(f));
            setSelectedPaths(newSet);
        }
    };

    const handleConfirm = () => {
        if (selectedPaths.size === 0) {
            alert(t('pasteModal.noSelection'));
            return;
        }
        onConfirm(Array.from(selectedPaths), isOverwrite);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-fade-in font-sans">
            <div className="w-full max-w-3xl bg-[#0b1120] border border-scum-accent/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col relative animate-scale-in overflow-hidden ring-1 ring-white/10 h-[80vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#0f172a]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 animate-pulse">
                            <ClipboardDocumentCheckIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-wide">{t('pasteModal.title')}</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                {t('pasteModal.desc', [t(`section.${contentType.toLowerCase()}`) || contentType])}
                                <span className="ml-2 bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-bold border border-indigo-500/30">{count} Items</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-white/5 bg-[#0b1120]/50 flex gap-4 items-center flex-wrap">
                    <div className="relative flex-1 group min-w-[200px]">
                        <input 
                            type="text" 
                            className="w-full bg-black/40 border border-scum-700 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-scum-accent transition-all placeholder-gray-600 shadow-inner"
                            placeholder={t('explorer.search')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-scum-accent transition-colors" />
                    </div>
                    <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-white/10">
                        <button 
                            onClick={() => setIsOverwrite(false)}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${!isOverwrite ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            title={t('pasteModal.appendDesc')}
                        >
                            {t('pasteModal.appendMode')}
                        </button>
                        <button 
                            onClick={() => setIsOverwrite(true)}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${isOverwrite ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            title={t('pasteModal.overwriteDesc')}
                        >
                            {t('pasteModal.overwriteMode')}
                        </button>
                    </div>
                    <button 
                        onClick={handleSelectAll} 
                        className="px-4 py-2.5 bg-scum-800 border border-scum-700 text-gray-300 rounded-lg text-xs font-bold hover:bg-scum-700 hover:text-white transition-all whitespace-nowrap"
                    >
                        {selectedPaths.size === filteredFiles.length && filteredFiles.length > 0 ? t('editor.deselectAll') : t('editor.selectAll')}
                    </button>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 grid grid-cols-1 md:grid-cols-2 gap-2 content-start bg-[#050a14]">
                    {filteredFiles.map(path => {
                        const isSelected = selectedPaths.has(path);
                        const fileName = path.split('/').pop() || path;
                        const displayName = getFileNameTranslation(fileName);

                        return (
                            <div 
                                key={path}
                                onClick={() => handleSelect(path)}
                                className={`
                                    flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 group
                                    ${isSelected 
                                        ? 'bg-scum-accent/10 border-scum-accent/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                                        : 'bg-[#0f172a] border-white/5 hover:bg-[#161f32] hover:border-white/10'
                                    }
                                `}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-scum-accent border-scum-accent' : 'border-gray-600 group-hover:border-gray-400 bg-black/20'}`}>
                                    {isSelected && <CheckCircleIcon className="w-3.5 h-3.5 text-black" />}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                        {displayName}
                                    </div>
                                    <div className="text-[10px] text-gray-600 font-mono truncate flex items-center gap-1">
                                        <FileIcon className="w-3 h-3 opacity-50" />
                                        {path}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredFiles.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500 italic">
                            {t('explorer.noMatch')}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-[#0f172a] flex justify-end gap-3 items-center">
                    <span className="text-xs text-gray-400 mr-auto">
                        {t('editor.selected')}: <span className="font-bold text-white">{selectedPaths.size}</span>
                        {isOverwrite && <span className="ml-2 text-red-400 font-bold bg-red-900/20 px-2 py-0.5 rounded border border-red-500/20">{t('pasteModal.overwriteMode')}</span>}
                    </span>
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 bg-transparent border border-gray-700 text-gray-300 rounded-xl text-sm font-bold hover:bg-white/5 transition-all"
                    >
                        {t('importer.cancel')}
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={selectedPaths.size === 0}
                        className={`
                            px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2
                            ${selectedPaths.size > 0 
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 active:scale-95' 
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                        `}
                    >
                        <ClipboardDocumentCheckIcon className="w-4 h-4" />
                        {t('pasteModal.pasteTo', [selectedPaths.size])}
                    </button>
                </div>
            </div>
        </div>
    );
};
