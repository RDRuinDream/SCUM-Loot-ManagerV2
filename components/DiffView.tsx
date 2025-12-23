
import React, { useMemo } from 'react';
import { useI18n } from '../i18n';
import { computeLineDiff } from '../utils/diff';

export const DiffView = ({ original, modified }: { original: string, modified: string }) => {
    const { t } = useI18n();

    // Normalize JSON to ignore whitespace/indentation changes
    const { normOriginal, normModified } = useMemo(() => {
        const normalize = (val: string) => {
            try {
                // Parse and re-stringify with standard 4-space indent
                return JSON.stringify(JSON.parse(val), null, 4);
            } catch (e) {
                return val; // Fallback to raw string if not valid JSON
            }
        };
        return {
            normOriginal: normalize(original || ""),
            normModified: normalize(modified || "")
        };
    }, [original, modified]);

    const diffResult = useMemo(() => computeLineDiff(normOriginal, normModified), [normOriginal, normModified]);
    
    // Process diffResult into aligned left/right lines
    const { leftLines, rightLines } = useMemo(() => {
        const left: { text: string, type: 'same' | 'removed' | 'empty' }[] = [];
        const right: { text: string, type: 'same' | 'added' | 'empty' }[] = [];
        
        diffResult.forEach(part => {
            if (part.type === 'same') {
                left.push({ text: part.value, type: 'same' });
                right.push({ text: part.value, type: 'same' });
            } else if (part.type === 'removed') {
                left.push({ text: part.value, type: 'removed' });
                right.push({ text: '', type: 'empty' }); 
            } else if (part.type === 'added') {
                left.push({ text: '', type: 'empty' }); 
                right.push({ text: part.value, type: 'added' });
            }
        });
        return { leftLines: left, rightLines: right };
    }, [diffResult]);

    return (
        <div className="flex flex-col h-full bg-[#0b1120] text-xs font-mono overflow-y-auto custom-scrollbar p-4">
             {/* Header Row */}
             <div className="grid grid-cols-2 gap-4 mb-2 sticky top-0 z-10 bg-[#0b1120] pb-2 border-b border-white/5">
                 <div className="text-gray-500 font-bold uppercase">{t('editor.original')}</div>
                 <div className="text-scum-accent font-bold uppercase">{t('editor.modified')}</div>
             </div>
             
             {/* Content Rows */}
             <div className="flex flex-col gap-[1px]">
                {leftLines.map((_, i) => (
                    <div key={i} className="grid grid-cols-2 gap-4 group hover:bg-white/5">
                        {/* Left Side */}
                        <div className={`
                            px-2 py-0.5 whitespace-pre-wrap break-all border-l-2
                            ${leftLines[i].type === 'removed' ? 'bg-red-900/20 text-red-400 border-red-500/50' : ''}
                            ${leftLines[i].type === 'same' ? 'text-gray-500 border-transparent opacity-60' : ''}
                            ${leftLines[i].type === 'empty' ? 'border-transparent bg-transparent select-none' : ''}
                        `}>
                            {leftLines[i].type === 'empty' ? ' ' : leftLines[i].text}
                        </div>
                        
                        {/* Right Side */}
                        <div className={`
                            px-2 py-0.5 whitespace-pre-wrap break-all border-l-2
                            ${rightLines[i].type === 'added' ? 'bg-green-900/20 text-green-400 border-green-500/50' : ''}
                            ${rightLines[i].type === 'same' ? 'text-gray-300 border-transparent' : ''}
                            ${rightLines[i].type === 'empty' ? 'border-transparent bg-transparent select-none' : ''}
                        `}>
                            {rightLines[i].type === 'empty' ? ' ' : rightLines[i].text}
                        </div>
                    </div>
                ))}
             </div>
        </div>
    );
};
