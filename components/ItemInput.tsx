
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getAllTranslations } from '../utils/itemTranslator';
import { fuzzyMatch } from '../utils/helpers';

interface ItemInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: () => void;
    isSubpreset?: boolean; // Determines D&D behavior
    onDropFile?: (fileName: string) => void;
}

export const ItemInput: React.FC<ItemInputProps> = ({ 
    value, 
    onChange, 
    placeholder, 
    className, 
    onMouseEnter, 
    onMouseLeave,
    isSubpreset,
    onDropFile
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [suggestions, setSuggestions] = useState<{id: string, trans: string}[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);
    
    // Calculate suggestions based on input
    useEffect(() => {
        if (!isFocused || !value || value.length < 2) {
            setSuggestions([]);
            return;
        }

        const term = value.toLowerCase();
        const all = getAllTranslations();
        
        // Priority:
        // 1. ID Starts With
        // 2. Translation Contains
        // 3. ID Contains
        
        const exactStart = all.filter(({ key }) => key.toLowerCase().startsWith(term));
        const transMatch = all.filter(({ key, value }) => !key.toLowerCase().startsWith(term) && value.toLowerCase().includes(term));
        const fuzzyId = all.filter(({ key }) => !key.toLowerCase().startsWith(term) && key.toLowerCase().includes(term));
        
        const combined = [...exactStart, ...transMatch, ...fuzzyId];
        // Deduplicate
        const unique = new Map();
        combined.forEach(({ key, value }) => {
            if(!unique.has(key)) unique.set(key, value);
        });
        
        setSuggestions(Array.from(unique.entries()).slice(0, 8).map(([id, trans]) => ({ id, trans })));

    }, [value, isFocused]);

    // Handle clicks outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (id: string) => {
        onChange(id);
        setIsFocused(false);
        setSuggestions([]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 1. Try generic ID drag (from FileTree or other inputs)
        const idData = e.dataTransfer.getData('text/plain');
        if (idData && idData !== 'scum-item-reorder') {
             // If dragging a file for subpreset, format it
             if (isSubpreset) {
                 // Remove extension if present
                 const cleanId = idData.replace(/\.json$/i, '');
                 onChange(cleanId);
                 if (onDropFile) onDropFile(idData); // Notify parent potentially
             } else {
                 onChange(idData);
             }
             return;
        }

        // 2. Try File Drop (from OS)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            const name = file.name.replace(/\.json$/i, '');
            onChange(name);
        }
    };

    return (
        <div 
            ref={wrapperRef} 
            className="relative flex-1 group/input"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <input 
                type="text"
                className={className}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                placeholder={placeholder}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
            />

            {/* Suggestions Dropdown */}
            {isFocused && suggestions.length > 0 && (
                <div className="absolute top-full left-0 w-full bg-scum-900 border border-scum-accent/50 rounded-lg shadow-xl z-50 mt-1 max-h-48 overflow-y-auto custom-scrollbar backdrop-blur-xl">
                    {suggestions.map((s) => (
                        <div 
                            key={s.id}
                            className="px-3 py-2 hover:bg-scum-accent/20 cursor-pointer border-b border-white/5 last:border-0 flex flex-col group/item transition-colors"
                            onClick={() => handleSelect(s.id)}
                        >
                            <span className="text-xs font-bold text-gray-200 font-mono group-hover/item:text-white">
                                {s.id}
                            </span>
                            <span className="text-[10px] text-scum-accent opacity-80">
                                {s.trans}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
