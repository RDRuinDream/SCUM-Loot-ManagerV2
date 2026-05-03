import React, { useState, useEffect, useDeferredValue } from 'react';
import { useAppStore } from '../src/store';
import { 
    CommandDialog, 
    CommandInput, 
    CommandList, 
    CommandEmpty, 
    CommandGroup, 
    CommandItem 
} from '../src/components/ui/command';
import { FileNode } from '../types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { flattenFileNodes } from '../utils/treeUtils';
import { getIdsByTranslationMatch, hasTranslation, getItemTranslation } from '../utils/itemTranslator';
import { FileIcon, FolderIcon } from './Icons';

export function CommandPalette({ open, onOpenChange, files, onSelectFile }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    files: FileNode[];
    onSelectFile: (path: string) => void;
}) {
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    
    // Flatten files
    const allFiles = React.useMemo(() => flattenFileNodes(files), [files]);
    
    // Filter
    const filteredItems = React.useMemo(() => {
        if (!deferredSearch) return allFiles.slice(0, 100);
        
        const term = deferredSearch.toLowerCase();
        const matchingTrans = getIdsByTranslationMatch(term);
        
        return allFiles.filter(f => {
            if (f.name.toLowerCase().includes(term)) return true;
            if (matchingTrans.some(id => f.name.includes(id))) return true;
            return false;
        });
    }, [deferredSearch, allFiles]);

    const parentRef = React.useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: filteredItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 40,
        overscan: 5,
    });

    const handleSelect = (path: string) => {
        onSelectFile(path);
        onOpenChange(false);
    };

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CommandInput 
                placeholder="Search files or items..." 
                value={search} 
                onValueChange={setSearch} 
            />
            <CommandList ref={parentRef} className="max-h-[300px] overflow-y-auto">
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Files">
                    <div
                        style={{
                            height: `${virtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {virtualizer.getVirtualItems().map((virtualItem) => {
                            const file = filteredItems[virtualItem.index];
                            const isTrans = hasTranslation(file.name.replace('.json', ''));
                            const trans = isTrans ? getItemTranslation(file.name.replace('.json', '')) : null;
                            
                            return (
                                <CommandItem
                                    key={file.path}
                                    value={file.path}
                                    onSelect={() => handleSelect(file.path)}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualItem.size}px`,
                                        transform: `translateY(${virtualItem.start}px)`,
                                    }}
                                >
                                    {file.kind === 'directory' ? <FolderIcon className="mr-2 h-4 w-4 text-yellow-500" /> : <FileIcon className="mr-2 h-4 w-4 text-gray-400" />}
                                    <span className="truncate">{file.name}</span>
                                    {trans && <span className="ml-2 text-xs text-muted-foreground truncate">{trans}</span>}
                                </CommandItem>
                            );
                        })}
                    </div>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
