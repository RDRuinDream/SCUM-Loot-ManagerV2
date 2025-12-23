
import React from 'react';
import { SearchIcon, CheckCircleIcon, LibraryIcon, ClipboardDocumentCheckIcon } from '../Icons';
import { useI18n } from '../../i18n';

interface SectionHeaderProps {
    title: string;
    count: number;
    onAdd: () => void;
    typeColor: string;
    sectionList: any[];
    extraControls?: React.ReactNode;
    isBulkMode: boolean;
    onToggleBulk: () => void;
    searchTerm: string;
    onSearchChange: (val: string) => void;
    onToggleLibrary?: () => void;
    showLibrary?: boolean;
    allowLibrary?: boolean;
    onPaste?: () => void;
    canPaste?: boolean;
    onSelectAll?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = React.memo(({ 
    title, 
    count, 
    onAdd, 
    typeColor, 
    sectionList, 
    extraControls, 
    isBulkMode, 
    onToggleBulk, 
    searchTerm, 
    onSearchChange, 
    onToggleLibrary, 
    showLibrary, 
    allowLibrary, 
    onPaste, 
    canPaste, 
    onSelectAll 
}) => {
    const { t } = useI18n();

    return (
        <div className="flex flex-col gap-4 mb-8 border-b border-scum-700/50 pb-4 sticky top-0 bg-[#0f172a]/95 z-20 pt-2 backdrop-blur-xl rounded-b-xl px-2 transition-all shadow-lg">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <h2 className={`text-xl font-bold ${typeColor} tracking-tight flex items-center gap-2 drop-shadow-[0_0_10px_currentColor] opacity-90`}>
                      {title} <span className={`bg-white/5 ${typeColor} px-2 py-0.5 rounded text-sm font-mono border border-white/10 shadow-inner`}>{count}</span>
                  </h2>
                  <button 
                      onClick={onToggleBulk}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${isBulkMode ? 'bg-scum-accent text-black border-scum-accent font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-transparent text-gray-500 border-scum-700 hover:text-gray-300 hover:border-gray-500'}`}
                  >
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      {isBulkMode ? t('editor.exitBulkEdit') : t('editor.bulkEdit')}
                  </button>
                  {isBulkMode && onSelectAll && sectionList.length > 0 && (
                      <button 
                          onClick={onSelectAll}
                          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors border border-transparent hover:border-gray-600"
                      >
                          {t('editor.selectAll')}
                      </button>
                  )}
                  {extraControls}
              </div>
              <div className="flex items-center gap-2">
                   {onPaste && (
                       <button 
                           onClick={onPaste}
                           disabled={!canPaste}
                           className={`text-xs border px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                               canPaste 
                               ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20' 
                               : 'bg-scum-800 text-gray-500 border-scum-700 cursor-not-allowed'
                           }`}
                           title={t('common.paste')}
                       >
                           <ClipboardDocumentCheckIcon className="w-4 h-4" />
                       </button>
                   )}
                   {allowLibrary && (
                       <button 
                          onClick={onToggleLibrary}
                          className={`text-xs px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${showLibrary ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-transparent text-gray-500 border-scum-700 hover:text-gray-300'}`}
                          title="Toggle Node Library"
                       >
                          <LibraryIcon className="w-4 h-4" />
                       </button>
                   )}
                   <button onClick={onAdd} className={`text-xs bg-white/5 ${typeColor} border border-white/10 px-4 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-all font-bold active:scale-95 shadow-lg`}>{t('btn.add')}</button>
              </div>
           </div>
           {!isBulkMode && (
               <div className="relative group">
                   <input 
                      type="text" 
                      placeholder={t('explorer.search')}
                      className="w-full bg-scum-800/50 border border-scum-700 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-300 focus:outline-none focus:border-scum-accent focus:bg-scum-900 transition-all placeholder-gray-600 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                      value={searchTerm}
                      onChange={(e) => onSearchChange(e.target.value)}
                   />
                   <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-500 group-focus-within:text-scum-accent transition-colors" />
               </div>
           )}
        </div>
    );
});
