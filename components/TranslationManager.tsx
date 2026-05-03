
import React, { useState, useMemo, useEffect } from 'react';
import { useI18n } from '../i18n';
import { 
    getAllTranslations, 
    saveTranslation, 
    deleteTranslation, 
    importTranslations, 
    exportTranslations, 
    resetTranslations, 
    subscribeToTranslationUpdates, 
    TranslationCategory, 
    bulkSaveTranslations, 
    bulkDeleteTranslations, 
    toggleTranslationCategory,
    reorderTranslations
} from '../utils/itemTranslator';
import { 
    SearchIcon, 
    ArrowPathIcon, 
    ArrowDownTrayIcon, 
    ArrowUpTrayIcon, 
    TrashIcon, 
    PlusIcon, 
    CheckCircleIcon, 
    XMarkIcon,
    DragHandleIcon
} from './Icons';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';

interface TranslationManagerProps {
    onBack: () => void;
    mode?: 'items' | 'server' | 'files'; 
}

type FilterCategory = TranslationCategory | 'all' | 'custom';

interface SortableItemProps {
    id: string;
    tItem: any;
    isBulkMode: boolean;
    isSelected: boolean;
    isEditing: boolean;
    editingValue: string;
    onSelect: (key: string) => void;
    onEdit: (key: string, value: string) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onDelete: (key: string) => void;
    onToggleCategory: (key: string, cat: TranslationCategory, val: string) => void;
    setEditingValue: (val: string) => void;
    t: (key: string, params?: any) => string;
    mode: string;
}

const SortableTranslationRow: React.FC<SortableItemProps> = ({
    id, tItem, isBulkMode, isSelected, isEditing, editingValue,
    onSelect, onEdit, onSaveEdit, onCancelEdit, onDelete, onToggleCategory,
    setEditingValue, t, mode
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    const { key, value, isCustom, isMasked, priorityIndex } = tItem;
    const isDesc = tItem.categories.includes('setting_desc');

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className={`grid ${isBulkMode ? 'grid-cols-[auto_auto_1.5fr_2fr_1fr_auto]' : 'grid-cols-[auto_1.5fr_2fr_1fr_auto]'} gap-4 items-center p-3 rounded-lg border transition-all duration-200 ${isDragging ? 'bg-scum-accent/20 border-scum-accent shadow-2xl scale-[1.02]' : (isEditing ? 'bg-scum-800 border-scum-accent shadow-lg z-20 scale-[1.01]' : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5')} ${isSelected ? 'bg-scum-accent/10 border-scum-accent/30' : ''}`}
        >
            {/* Drag Handle */}
            <div 
                {...attributes} 
                {...listeners} 
                className={`p-1 cursor-grab active:cursor-grabbing text-gray-600 hover:text-scum-accent transition-colors ${!isCustom ? 'opacity-0 pointer-events-none' : ''}`}
                title="Drag to reorder priority"
            >
                <DragHandleIcon className="w-4 h-4" />
            </div>

            {isBulkMode && (
                <div className="flex items-center justify-center">
                    <div 
                        className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center transition-colors ${isSelected ? 'bg-scum-accent border-scum-accent' : 'border-gray-600 hover:border-gray-400 bg-black/20'}`}
                        onClick={() => onSelect(key)}
                    >
                        {isSelected && <CheckCircleIcon className="w-3.5 h-3.5 text-black" />}
                    </div>
                </div>
            )}

            <div className="font-mono text-xs text-gray-400 truncate select-all flex items-center gap-2" title={key}>
                {isDesc ? <span className="text-purple-400">{key}</span> : key}
                {isCustom && priorityIndex === 0 && (
                    <span className="text-[9px] bg-scum-accent/20 text-scum-accent px-1.5 py-0.5 rounded border border-scum-accent/30 font-bold animate-pulse">
                        PRIORITY 1
                    </span>
                )}
            </div>
            
            <div>
                {isEditing ? (
                    <textarea 
                        className="w-full bg-black/40 border border-scum-accent rounded px-2 py-1 text-sm text-white focus:outline-none shadow-inner resize-y min-h-[40px]" 
                        value={editingValue} 
                        onChange={e => setEditingValue(e.target.value)} 
                        autoFocus
                        rows={isDesc ? 3 : 1}
                        onKeyDown={e => {
                            if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSaveEdit(); }
                            if(e.key === 'Escape') onCancelEdit();
                        }}
                    />
                ) : (
                    <div className={`text-sm ${isMasked ? 'text-red-400 line-through opacity-50' : (isCustom ? 'text-scum-accent font-bold' : 'text-gray-300')} whitespace-pre-wrap leading-relaxed`}>
                        {isMasked ? (key) : value}
                        {isMasked && <span className="text-[9px] no-underline ml-2 bg-red-900/30 px-1 rounded text-red-300 uppercase">Masked</span>}
                    </div>
                )}
            </div>

            <div>
                <CategoryToggleRow item={tItem} mode={mode} onToggle={onToggleCategory} />
            </div>

            <div className="flex items-center justify-end gap-2">
                {isEditing ? (
                    <>
                        <button onClick={onSaveEdit} className="p-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500 hover:text-black transition-colors"><CheckCircleIcon className="w-4 h-4" /></button>
                        <button onClick={onCancelEdit} className="p-1.5 bg-gray-700/50 text-gray-400 rounded hover:bg-gray-600 hover:text-white transition-colors"><XMarkIcon className="w-4 h-4" /></button>
                    </>
                ) : (
                    <>
                        <button onClick={() => onEdit(key, isMasked ? "" : value)} className="px-3 py-1 bg-white/5 text-gray-400 rounded text-xs hover:bg-white/10 hover:text-white transition-colors border border-transparent hover:border-white/10">
                            {t('trans.edit')}
                        </button>
                        {!isEditing && !isBulkMode && (
                            <button onClick={() => onDelete(key)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors" title={t('trans.delete')}>
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const CategoryToggleRow = ({ item, mode, onToggle }: { item: any, mode: string, onToggle: any }) => {
    const isGlobal = item.categories.includes('global');
    const allowedCats = mode === 'items' ? ['item', 'node'] : (mode === 'server' ? ['setting', 'setting_desc'] : ['file']);

    return (
        <div className="flex gap-1 flex-wrap justify-end">
            {isGlobal ? (
                <button 
                    className="text-[10px] uppercase font-bold px-3 py-1 rounded border border-green-500/30 bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors cursor-help"
                    title="Global (Merged)"
                    onClick={() => onToggle(item.key, 'global', item.value)}
                >
                    GLOBAL
                </button>
            ) : (
                <>
                    {allowedCats.map((cat) => {
                        const isActive = item.categories.includes(cat as TranslationCategory);
                        let color = "";
                        let label = cat;
                        
                        if (cat === 'item') color = isActive ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "text-gray-600 border-gray-700 hover:border-blue-500/30";
                        if (cat === 'node') color = isActive ? "bg-pink-500/20 text-pink-300 border-pink-500/30" : "text-gray-600 border-gray-700 hover:border-pink-500/30";
                        if (cat === 'file') color = isActive ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : "text-gray-600 border-gray-700 hover:border-yellow-500/30";
                        if (cat === 'setting') {
                            color = isActive ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "text-gray-600 border-gray-700 hover:border-cyan-500/30";
                            label = "INI Key";
                        }
                        if (cat === 'setting_desc') {
                            color = isActive ? "bg-purple-500/20 text-purple-300 border-purple-500/30" : "text-gray-600 border-gray-700 hover:border-purple-500/30";
                            label = "INI Hint";
                        }

                        return (
                            <button
                                key={cat}
                                onClick={() => onToggle(item.key, cat as TranslationCategory, item.value)}
                                className={`text-[10px] uppercase font-bold px-2 py-1 rounded border transition-colors whitespace-nowrap ${color}`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </>
            )}
        </div>
    );
};

export const TranslationManager: React.FC<TranslationManagerProps> = ({ onBack, mode = 'items' }) => {
    const { t } = useI18n();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
    const [translations, setTranslations] = useState<{ key: string, value: string, categories: TranslationCategory[], isCustom: boolean, isMasked: boolean }[]>([]);
    
    // Default category based on mode
    const defaultCategory = useMemo(() => {
        if (mode === 'server') return 'setting';
        if (mode === 'files') return 'file';
        return 'item';
    }, [mode]);

    // Add New State
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");
    const [newCategory, setNewCategory] = useState<TranslationCategory>(defaultCategory);
    
    // Edit State
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState("");

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Bulk Edit State
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

    const refreshData = () => {
        setTranslations(getAllTranslations(mode));
    };

    useEffect(() => {
        refreshData();
        const unsubscribe = subscribeToTranslationUpdates(() => {
            refreshData();
        });
        return () => unsubscribe();
    }, [mode]); // Refresh when mode changes

    useEffect(() => {
        setNewCategory(defaultCategory);
    }, [mode, defaultCategory]);

    const filteredList = useMemo(() => {
        let list = translations;
        
        if (filterCategory !== 'all') {
            if (filterCategory === 'custom') {
                list = list.filter((t) => t.isCustom);
            } else {
                // If filtering by specific category, show items that HAVE that category (or global)
                list = list.filter((t) => t.categories.includes(filterCategory as TranslationCategory) || t.categories.includes('global'));
            }
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            list = list.filter((t) => t.key.toLowerCase().includes(lower) || t.value.toLowerCase().includes(lower));
        }

        return list;
    }, [translations, filterCategory, searchTerm]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = translations.findIndex(t => t.key === active.id);
            const newIndex = translations.findIndex(t => t.key === over.id);
            
            // Only reorder if both are custom (defaults can't be reordered)
            if (translations[oldIndex].isCustom && translations[newIndex].isCustom) {
                // Find global indices in customData
                const customOnly = translations.filter(t => t.isCustom);
                const customOldIndex = customOnly.findIndex(t => t.key === active.id);
                const customNewIndex = customOnly.findIndex(t => t.key === over.id);
                
                reorderTranslations(customOldIndex, customNewIndex);
            }
        }
    };

    const handleSaveEdit = () => {
        if (editingKey) {
            const entry = translations.find(t => t.key === editingKey);
            if(entry) {
                const cat = entry.categories[0] || 'global';
                saveTranslation(editingKey, editingValue, cat);
            }
            setEditingKey(null);
        }
    };

    const handleDelete = (key: string) => {
        if (confirm(t('common.confirmDelete'))) {
            deleteTranslation(key);
        }
    };

    const handleAddNew = () => {
        if (!newKey || !newValue) return;
        
        let finalKey = newKey;
        // Auto-prefix for descriptions if user didn't type it
        if (newCategory === 'setting_desc' && !finalKey.startsWith('DESC::')) {
            finalKey = `DESC::${finalKey}`;
        }

        saveTranslation(finalKey, newValue, newCategory);
        setNewKey("");
        setNewValue("");
        setNewCategory(defaultCategory);
    };

    const handleExport = () => {
        const json = exportTranslations();
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scum_translations_${mode}.json`;
        a.click();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                if (importTranslations(json)) {
                    alert(t('settings.transImportSuccess'));
                } else {
                    alert(t('settings.transImportFail'));
                }
            } catch (err) {
                alert(t('settings.transImportFail'));
            }
        };
        reader.readAsText(file);
    };

    const handleReset = () => {
        if(confirm(t('trans.confirmReset'))) resetTranslations();
    };

    const toggleBulkMode = () => {
        setIsBulkMode(!isBulkMode);
        setSelectedKeys(new Set());
    };

    const handleSelect = (key: string) => {
        const newSet = new Set(selectedKeys);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        setSelectedKeys(newSet);
    };

    const handleSelectAll = () => {
        if (selectedKeys.size === filteredList.length) {
            setSelectedKeys(new Set());
        } else {
            const newSet = new Set(selectedKeys);
            filteredList.forEach(t => newSet.add(t.key));
            setSelectedKeys(newSet);
        }
    };

    const handleBulkDelete = () => {
        if (selectedKeys.size === 0) return;
        if (confirm(t('trans.confirmBulkDelete', [selectedKeys.size]))) {
            bulkDeleteTranslations(Array.from(selectedKeys));
            setSelectedKeys(new Set());
        }
    };

    // Determine available categories based on mode
    const availableCategories = useMemo(() => {
        const cats: {id: string, label: string}[] = [{ id: 'all', label: t('trans.catAll') }];
        
        if (mode === 'items') {
            cats.push({ id: 'item', label: t('trans.catItems') });
            cats.push({ id: 'node', label: t('trans.catNodes') });
        } else if (mode === 'server') {
            cats.push({ id: 'setting', label: "Settings (INI Key)" });
            cats.push({ id: 'setting_desc', label: "Descriptions (Hint)" });
        } else if (mode === 'files') {
            cats.push({ id: 'file', label: t('trans.catFiles') });
        }
        
        cats.push({ id: 'custom', label: t('trans.catCustom') });
        return cats;
    }, [mode, t]);

    // Render category pills
    const CategoryToggle = ({ item }: { item: typeof translations[0] }) => {
        const isGlobal = item.categories.includes('global');
        const allowedCats = mode === 'items' ? ['item', 'node'] : (mode === 'server' ? ['setting', 'setting_desc'] : ['file']);

        return (
            <div className="flex gap-1 flex-wrap justify-end">
                {isGlobal ? (
                    <button 
                        className="text-[10px] uppercase font-bold px-3 py-1 rounded border border-green-500/30 bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors cursor-help"
                        title="Global (Merged)"
                        onClick={() => toggleTranslationCategory(item.key, 'global', item.value)}
                    >
                        GLOBAL
                    </button>
                ) : (
                    <>
                        {allowedCats.map((cat) => {
                            const isActive = item.categories.includes(cat as TranslationCategory);
                            let color = "";
                            let label = cat;
                            
                            if (cat === 'item') color = isActive ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "text-gray-600 border-gray-700 hover:border-blue-500/30";
                            if (cat === 'node') color = isActive ? "bg-pink-500/20 text-pink-300 border-pink-500/30" : "text-gray-600 border-gray-700 hover:border-pink-500/30";
                            if (cat === 'file') color = isActive ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : "text-gray-600 border-gray-700 hover:border-yellow-500/30";
                            if (cat === 'setting') {
                                color = isActive ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "text-gray-600 border-gray-700 hover:border-cyan-500/30";
                                label = "INI Key";
                            }
                            if (cat === 'setting_desc') {
                                color = isActive ? "bg-purple-500/20 text-purple-300 border-purple-500/30" : "text-gray-600 border-gray-700 hover:border-purple-500/30";
                                label = "INI Hint";
                            }

                            return (
                                <button
                                    key={cat}
                                    onClick={() => toggleTranslationCategory(item.key, cat as TranslationCategory, item.value)}
                                    className={`text-[10px] uppercase font-bold px-2 py-1 rounded border transition-colors whitespace-nowrap ${color}`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </>
                )}
            </div>
        );
    };

    // Mode Title
    const modeTitle = mode === 'items' ? "Items & Nodes" : (mode === 'server' ? "Server Settings" : "Filenames");

    return (
        <div className="flex flex-col h-full bg-[#0b1120] text-gray-200 animate-fade-in absolute inset-0 z-50">
            {/* Header */}
            <div className="h-16 border-b border-scum-700/50 bg-[#0f172a]/90 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 shadow-lg z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-red-500/20 rounded-full transition-colors text-gray-400 hover:text-white" title="Close">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold text-scum-accent tracking-widest uppercase flex items-center gap-3">
                        <span className="text-2xl filter drop-shadow-[0_0_10px_rgba(255,107,0,0.5)]">🌐</span> 
                        {t('trans.title')} 
                        <span className="text-gray-600 text-sm px-2 py-0.5 border border-gray-700 rounded bg-black/20">{modeTitle}</span>
                    </h2>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleBulkMode}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-xs font-bold ${isBulkMode ? 'bg-scum-accent text-black border-scum-accent shadow-[0_0_10px_rgba(255,107,0,0.4)]' : 'bg-transparent text-gray-400 border-gray-600 hover:text-white'}`}
                    >
                        <CheckCircleIcon className="w-4 h-4" /> {t('trans.bulkEdit')}
                    </button>
                    <div className="h-6 w-px bg-white/10 mx-1"></div>
                    <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all text-xs font-bold active:scale-95">
                        <ArrowPathIcon className="w-4 h-4" /> {t('trans.delete')}
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-scum-800 border border-scum-700 text-gray-300 hover:text-white hover:border-scum-500 transition-all text-xs font-bold active:scale-95">
                        <ArrowDownTrayIcon className="w-4 h-4" /> {t('settings.exportTrans')}
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-scum-accent/10 border border-scum-accent/30 text-scum-accent hover:bg-scum-accent hover:text-black transition-all text-xs font-bold cursor-pointer active:scale-95 hover:shadow-[0_0_15px_rgba(255,107,0,0.3)]">
                        <ArrowUpTrayIcon className="w-4 h-4" /> {t('settings.importTrans')}
                        <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                    </label>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar */}
                <div className="w-80 bg-black/30 border-r border-scum-700/50 flex flex-col p-4 gap-4 overflow-y-auto backdrop-blur-sm">
                    <div className="relative group">
                        <input 
                            type="text" 
                            className="w-full bg-scum-900/50 border border-scum-700 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-scum-accent transition-all placeholder-gray-600 shadow-inner"
                            placeholder={t('trans.searchPlaceholder')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-scum-accent transition-colors" />
                    </div>

                    <div className="flex flex-col gap-1">
                        {availableCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setFilterCategory(cat.id as FilterCategory)}
                                className={`text-left px-4 py-3 rounded-lg text-sm font-bold transition-all ${filterCategory === cat.id ? 'bg-scum-accent/20 text-scum-accent border border-scum-accent/30 shadow-md' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-auto bg-scum-800/50 p-4 rounded-xl border border-white/5 shadow-inner">
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                            <PlusIcon className="w-3 h-3" /> {t('trans.addTitle')}
                        </h3>
                        <div className="space-y-3">
                            <input className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-scum-accent focus:outline-none font-mono" placeholder={t('trans.keyPlaceholder')} value={newKey} onChange={e => setNewKey(e.target.value)} />
                            <textarea rows={3} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-scum-accent focus:outline-none resize-none" placeholder={t('trans.valPlaceholder')} value={newValue} onChange={e => setNewValue(e.target.value)} />
                            
                            <div className="flex gap-2">
                                <select 
                                    className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-gray-300 focus:border-scum-accent focus:outline-none flex-1 cursor-pointer"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value as TranslationCategory)}
                                >
                                    {mode === 'items' && <><option value="item">Item</option><option value="node">Node</option></>}
                                    {mode === 'server' && <><option value="setting">Setting</option><option value="setting_desc">Hint</option></>}
                                    {mode === 'files' && <option value="file">File</option>}
                                    <option value="global">Global</option>
                                </select>
                                <button onClick={handleAddNew} disabled={!newKey || !newValue} className="bg-scum-accent text-black font-bold text-xs px-4 py-2 rounded hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-orange-500/20 active:scale-95">
                                    {t('btn.add')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative pb-24 bg-gradient-to-br from-[#0b1120] to-[#02040a]">
                    <div className={`grid ${isBulkMode ? 'grid-cols-[auto_auto_1.5fr_2fr_1fr_auto]' : 'grid-cols-[auto_1.5fr_2fr_1fr_auto]'} gap-4 mb-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0 bg-[#0b1120]/95 backdrop-blur-sm pb-2 border-b border-white/10 z-30 transition-all`}>
                        <div className="w-4"></div> {/* Drag spacer */}
                        {isBulkMode && (
                            <div className="flex items-center justify-center">
                                <button onClick={handleSelectAll} className="hover:text-white transition-colors text-[10px] border border-gray-700 px-1 rounded">{t('editor.selectAll')}</button>
                            </div>
                        )}
                        <div>{t('trans.original')}</div>
                        <div>{t('trans.translation')}</div>
                        <div className="text-right">Type</div>
                        <div className="text-right">{t('trans.actions')}</div>
                    </div>

                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext 
                            items={filteredList.map(t => t.key)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                <AnimatePresence initial={false}>
                                    {filteredList.length === 0 ? (
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-center py-20 text-gray-600 italic flex flex-col items-center gap-2"
                                        >
                                            <span className="text-4xl opacity-20">📭</span>
                                            {t('explorer.noMatch')}
                                        </motion.div>
                                    ) : (
                                        filteredList.slice(0, 200).map((tItem) => (
                                            <motion.div
                                                key={tItem.key}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <SortableTranslationRow 
                                                    id={tItem.key}
                                                    tItem={tItem}
                                                    isBulkMode={isBulkMode}
                                                    isSelected={selectedKeys.has(tItem.key)}
                                                    isEditing={editingKey === tItem.key}
                                                    editingValue={editingValue}
                                                    onSelect={handleSelect}
                                                    onEdit={(key, val) => { setEditingKey(key); setEditingValue(val); }}
                                                    onSaveEdit={handleSaveEdit}
                                                    onCancelEdit={() => setEditingKey(null)}
                                                    onDelete={handleDelete}
                                                    onToggleCategory={toggleTranslationCategory}
                                                    setEditingValue={setEditingValue}
                                                    t={t}
                                                    mode={mode}
                                                />
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                                {filteredList.length > 200 && (
                                    <div className="text-center py-4 text-gray-500 text-xs italic">
                                        ... {filteredList.length - 200} more items. Use search to find specific keys.
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Bulk Actions Toolbar */}
                {isBulkMode && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0f172a] border border-scum-accent/50 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] p-3 px-5 flex items-center gap-4 animate-slide-up ring-1 ring-white/10 w-auto min-w-[300px]">
                        <div className="flex items-center gap-3 border-r border-white/10 pr-4 mr-2">
                            <span className="font-bold text-xl text-scum-accent">{selectedKeys.size}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none">
                                {t('trans.selected', [selectedKeys.size])}
                            </span>
                        </div>

                        <div className="flex-1 flex items-center gap-2">
                            <button 
                                onClick={handleBulkDelete}
                                disabled={selectedKeys.size === 0}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${selectedKeys.size > 0 ? 'bg-red-900/30 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white' : 'bg-transparent text-gray-600 border-gray-800 cursor-not-allowed'}`}
                            >
                                <TrashIcon className="w-4 h-4" />
                                <span className="text-xs font-bold">{t('trans.bulkDelete')}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
