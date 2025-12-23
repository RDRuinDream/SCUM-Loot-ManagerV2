
import React, { useState, useMemo } from 'react';
import { TrashIcon } from './Icons';
import { useI18n } from '../i18n';
import { ItemSpawningParameter } from '../types';

interface BulkImporterProps {
  onImport: (items: any[], target: 'Items' | 'FixedItems' | 'Parameters') => void;
  onSuccess?: (msg: string) => void;
}

export const BulkImporter: React.FC<BulkImporterProps> = ({ onImport, onSuccess }) => {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [previewTarget, setPreviewTarget] = useState<'Items' | 'FixedItems' | 'Parameters' | null>(null);

  const handleParse = (target: 'Items' | 'FixedItems' | 'Parameters') => {
    const lines = text.split('\n');
    const parsedItems: any[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) return;
      
      const parts = trimmed.split(/\s+/);
      // Logic from python: #spawnitem Id qty
      if (parts[0].replace('#', '').toLowerCase() === 'spawnitem' && parts.length >= 2) {
         const id = parts[1];
         const qty = parseInt(parts[2] || "1") || 1;
         
         if (target === 'Items') {
             for (let i = 0; i < qty; i++) {
                parsedItems.push({ Id: id, Rarity: 'Common' });
             }
         } else if (target === 'FixedItems') {
             for (let i = 0; i < qty; i++) {
                 parsedItems.push(id);
             }
         } else if (target === 'Parameters') {
             // For Parameters, create one entry per command, regardless of quantity usually,
             // but let's just add one per command.
             const newItem: ItemSpawningParameter = {
                Id: id,
                IsDisabledForSpawning: false,
                AllowedLocations: ["Coastal", "Continental", "Mountain"],
                CooldownPerSquadMemberMin: 0,
                CooldownPerSquadMemberMax: 0,
                CooldownGroup: "",
                Variations: [],
                ShouldOverrideInitialAndRandomUsage: false,
                InitialUsageOverride: 0,
                RandomUsageOverrideUsage: 0
             };
             parsedItems.push(newItem);
         }
      }
    });

    if (parsedItems.length > 0) {
        setPreviewData(parsedItems);
        setPreviewTarget(target);
    } else {
        alert(t('importer.noValid'));
    }
  };

  const confirmImport = () => {
    if (previewData && previewTarget) {
      onImport(previewData, previewTarget);
      setText("");
      setPreviewData(null);
      setPreviewTarget(null);
      if (onSuccess) {
          let targetName = "";
          if (previewTarget === 'Items') targetName = t('importer.importToItems');
          else if (previewTarget === 'FixedItems') targetName = t('importer.importToFixed');
          else if (previewTarget === 'Parameters') targetName = t('importer.importToParams');
          
          onSuccess(t('importer.success', [previewData.length, targetName]));
      }
    }
  };

  const cancelPreview = () => {
    setPreviewData(null);
    setPreviewTarget(null);
  };

  // Group data for display: "Item * Count"
  const aggregatedPreview = useMemo(() => {
      if (!previewData) return [];
      const map = new Map<string, { id: string, count: number, indices: number[] }>();

      previewData.forEach((item, originalIndex) => {
          const id = typeof item === 'string' ? item : item.Id;
          if (!map.has(id)) {
              map.set(id, { id, count: 0, indices: [] });
          }
          const entry = map.get(id)!;
          entry.count++;
          entry.indices.push(originalIndex);
      });

      return Array.from(map.values());
  }, [previewData]);

  const removeGroup = (indicesToRemove: number[]) => {
      if (!previewData) return;
      const newData = previewData.filter((_, idx) => !indicesToRemove.includes(idx));
      
      if (newData.length === 0) {
          setPreviewData(null);
          setPreviewTarget(null);
      } else {
          setPreviewData(newData);
      }
  };

  const wrapperClass = "p-4 bg-scum-900/60 backdrop-blur-xl border border-white/10 rounded-xl h-full flex flex-col shadow-2xl";

  if (previewData) {
    return (
      <div className={wrapperClass}>
        <h3 className="text-sm font-bold text-scum-accent mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-scum-accent animate-pulse"></span>
            {t('importer.previewTitle')}
        </h3>
        <p className="text-xs text-gray-500 mb-3">{t('importer.target')}: <span className="text-gray-300 font-bold">{
             previewTarget === 'Items' ? t('section.items') : 
             previewTarget === 'FixedItems' ? t('section.fixed') : t('params.title')
        }</span> - {t('importer.totalItems')} {previewData.length}</p>
        
        <div className="flex-1 overflow-y-auto bg-scum-900/50 border border-scum-700 rounded-lg p-2 mb-3 custom-scrollbar">
          {aggregatedPreview.map((group) => (
            <div key={group.id} className="flex items-center justify-between text-xs py-1.5 border-b border-scum-700/50 last:border-0 group">
              <span className="text-gray-300 truncate mr-2 font-mono">
                {group.id} <span className="text-scum-accent font-bold bg-scum-accent/10 px-1 rounded">x{group.count}</span>
              </span>
              <button 
                onClick={() => removeGroup(group.indices)}
                className="text-gray-600 hover:text-scum-danger opacity-0 group-hover:opacity-100 transition"
                title={t('btn.delete')}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button 
            onClick={confirmImport}
            className="flex-1 bg-scum-accent text-black hover:bg-cyan-400 text-xs py-2 rounded-lg transition font-bold shadow-lg shadow-cyan-500/20"
          >
            {t('importer.confirm')}
          </button>
          <button 
            onClick={cancelPreview}
            className="flex-1 bg-scum-700 hover:bg-scum-600 text-white text-xs py-2 rounded-lg transition"
          >
            {t('importer.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <h3 className="text-sm font-bold text-scum-accent mb-2">{t('importer.title')}</h3>
      <p className="text-xs text-gray-500 mb-2">{t('importer.instruction')}</p>
      
      <textarea
        className="flex-1 w-full bg-scum-900 border border-scum-700 rounded-lg p-3 text-xs font-mono text-gray-300 resize-none focus:outline-none focus:border-scum-accent mb-4 transition-colors"
        placeholder={`#spawnitem Lockpick_Advanced_Item 1\n#spawnitem Apple 5`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      
      <div className="flex gap-2">
        <button 
          onClick={() => handleParse('Items')}
          className="flex-1 bg-scum-700 hover:bg-scum-600 text-white text-xs py-2.5 rounded-lg transition font-medium border border-scum-600"
        >
          {t('importer.importToItems')}
        </button>
        <button 
          onClick={() => handleParse('FixedItems')}
          className="flex-1 bg-scum-700 hover:bg-scum-600 text-white text-xs py-2.5 rounded-lg transition font-medium border border-scum-600"
        >
          {t('importer.importToFixed')}
        </button>
        <button 
          onClick={() => handleParse('Parameters')}
          className="flex-1 bg-fuchsia-900/40 hover:bg-fuchsia-800/60 text-fuchsia-200 hover:text-white text-xs py-2.5 rounded-lg transition font-medium border border-fuchsia-900/50"
        >
          {t('importer.importToParams')}
        </button>
      </div>
    </div>
  );
};
