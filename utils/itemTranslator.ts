
import { fuzzyMatch } from './helpers';
import { fileTranslations } from './translations/fileTranslations';
import { nodeTranslations } from './translations/nodeTranslations';
import { itemTranslations } from './translations/itemTranslations';
import { serverSettingsTranslations } from './translations/serverSettingsTranslations';
import { serverSettingsDescriptions } from './translations/serverSettingsDescriptions';

// Types
export type TranslationCategory = 'item' | 'node' | 'file' | 'global' | 'setting' | 'setting_desc';

export interface TranslationEntry {
    key: string;
    text: string;
    categories: TranslationCategory[];
    masked?: boolean; // New flag: if true, this entry effectively "deletes" a default translation
}

const STORAGE_KEY_V1 = 'scum_translations';
const STORAGE_KEY_V2 = 'scum_translations_v2'; 
const STORAGE_KEY_V3 = 'scum_translations_v3'; 
const STORAGE_KEY_V4 = 'scum_translations_v4'; // New version for array structure
const UPDATE_EVENT = 'scum_translations_updated';

// In-memory lookup maps
let itemMap: Record<string, string> = {};
let nodeMap: Record<string, string> = {};
let fileMap: Record<string, string> = {};
let settingsMap: Record<string, string> = {};
let settingDescMap: Record<string, string> = {};
let globalMap: Record<string, string> = {};

let customData: TranslationEntry[] = [];

const normalize = (key: string) => key.toLowerCase().trim();

const loadTranslations = () => {
    // 1. Load Defaults
    itemMap = { ...itemTranslations };
    nodeMap = { ...nodeTranslations };
    fileMap = { ...fileTranslations };
    settingsMap = { ...serverSettingsTranslations };
    settingDescMap = {};
    
    // Load descriptions with prefix
    Object.entries(serverSettingsDescriptions).forEach(([k, v]) => {
        settingDescMap[`DESC::${k}`] = v;
    });

    globalMap = {}; 

    // 2. Migration Logic (V3 object to V4 array)
    try {
        const v4Stored = localStorage.getItem(STORAGE_KEY_V4);
        if (v4Stored) {
            customData = JSON.parse(v4Stored);
        } else {
            const v3Stored = localStorage.getItem(STORAGE_KEY_V3);
            if (v3Stored) {
                const oldData = JSON.parse(v3Stored);
                customData = Object.entries(oldData).map(([key, entry]: [string, any]) => ({
                    key,
                    ...entry
                }));
                // Save migrated data
                localStorage.setItem(STORAGE_KEY_V4, JSON.stringify(customData));
            } else {
                customData = [];
            }
        }
    } catch (e) {
        console.warn("Translation load error", e);
        customData = [];
    }

    // 3. Populate Maps based on custom data overrides (Priority: First in array wins)
    // We iterate backwards so that the first items in the array (highest priority) 
    // are applied last and thus override previous ones in the map.
    [...customData].reverse().forEach((entry) => {
        const { key, text, categories, masked } = entry;
        
        // If masked, we map it to the key itself (or empty string for descriptions) to simulate deletion
        const effectiveText = masked ? (categories.includes('setting_desc') ? "" : key) : text;

        if (categories.includes('global')) {
            globalMap[key] = effectiveText;
            itemMap[key] = effectiveText;
            nodeMap[key] = effectiveText;
            fileMap[key] = effectiveText;
            settingsMap[key] = effectiveText;
            settingDescMap[key] = effectiveText;
        } else {
            if (categories.includes('item')) itemMap[key] = effectiveText;
            if (categories.includes('node')) nodeMap[key] = effectiveText;
            if (categories.includes('file')) fileMap[key] = effectiveText;
            if (categories.includes('setting')) settingsMap[key] = effectiveText;
            if (categories.includes('setting_desc')) settingDescMap[key] = effectiveText;
        }
    });
};

loadTranslations();

if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY_V4) {
            loadTranslations();
            window.dispatchEvent(new Event(UPDATE_EVENT));
        }
    });
}

export const subscribeToTranslationUpdates = (callback: () => void) => {
    const handler = () => callback();
    window.addEventListener(UPDATE_EVENT, handler);
    return () => window.removeEventListener(UPDATE_EVENT, handler);
};

// --- Lookup ---
const lookup = (key: string, primaryMap: Record<string, string>): string | null => {
    // 1. Exact Match in specific map (includes customs/masked)
    if (primaryMap[key]) return primaryMap[key];
    
    // 2. Check Custom Masking specifically if not found above but exists in customData as masked
    const customMatch = customData.find(d => d.key === key);
    if (customMatch && customMatch.masked) return key;

    // 3. Global Map
    if (globalMap[key]) return globalMap[key];

    // 4. Case-insensitive Search
    const lowerKey = normalize(key);
    const primaryMatch = Object.keys(primaryMap).find(k => normalize(k) === lowerKey);
    if (primaryMatch) return primaryMap[primaryMatch];

    const globalMatch = Object.keys(globalMap).find(k => normalize(k) === lowerKey);
    if (globalMatch) return globalMap[globalMatch];

    return null;
};

export const getItemTranslation = (id: string): string => lookup(id, itemMap) || id;
export const getNodeTranslation = (name: string): string => lookup(name, nodeMap) || name;
export const getFilePartTranslation = (part: string): string => lookup(part, fileMap) || part;
export const getSettingTranslation = (key: string): string => lookup(key, settingsMap) || "";
export const getSettingDescription = (key: string): string => lookup(`DESC::${key}`, settingDescMap) || "";

export const getFileNameTranslation = (filename: string): string => {
    const baseName = filename.replace(/\.json$/i, '');
    const parts = baseName.split(/([-_ ])/); 
    const translatedParts = parts.map(part => {
        if (part === '-' || part === '_' || part === ' ') return part;
        const translated = getFilePartTranslation(part);
        return translated !== part ? translated : part;
    });
    return translatedParts.join('');
};

export const hasTranslation = (id: string): boolean => {
    // Check custom masked first - if masked, we treat it as "no translation" for UI coloring purposes usually, 
    // BUT functionally it returns the ID. 
    // Here we return true if there is a translation entry (default or custom active).
    // If masked, we technically "have" a translation entry that says "don't translate".
    const customMatch = customData.find(d => d.key === id);
    if (customMatch?.masked) return false; 

    if (itemMap[id] || nodeMap[id] || fileMap[id] || globalMap[id] || settingsMap[id]) return true;
    const lower = normalize(id);
    const search = (map: Record<string, string>) => Object.keys(map).some(k => normalize(k) === lower);
    return search(itemMap) || search(nodeMap) || search(fileMap) || search(globalMap) || search(settingsMap);
};

// --- Management ---

export const saveTranslation = (key: string, value: string, category: TranslationCategory) => {
    const existingIndex = customData.findIndex(d => d.key === key);
    let newCategories: TranslationCategory[] = [];

    if (existingIndex !== -1) {
        const existing = customData[existingIndex];
        newCategories = [...existing.categories];
        if (category === 'global') {
            newCategories = ['global'];
        } else {
            if (!newCategories.includes(category)) {
                newCategories.push(category);
            }
        }
        customData[existingIndex] = { key, text: value, categories: newCategories, masked: false };
    } else {
        newCategories = [category];
        // New translations go to the TOP (highest priority)
        customData.unshift({ key, text: value, categories: newCategories, masked: false });
    }

    localStorage.setItem(STORAGE_KEY_V4, JSON.stringify(customData));
    loadTranslations();
    window.dispatchEvent(new Event(UPDATE_EVENT));
};

export const toggleTranslationCategory = (key: string, category: TranslationCategory, value: string) => {
    const existingIndex = customData.findIndex(d => d.key === key);
    let newCategories: TranslationCategory[] = existingIndex !== -1 ? [...customData[existingIndex].categories] : [];
    
    if (category === 'global') {
        if (newCategories.includes('global')) return; 
        newCategories = ['global'];
    } else {
        if (newCategories.includes('global')) newCategories = []; 

        if (newCategories.includes(category)) {
            newCategories = newCategories.filter(c => c !== category);
        } else {
            newCategories.push(category);
        }
    }

    if (newCategories.length === 0) {
        deleteTranslation(key); // Use smart delete
    } else {
        if (existingIndex !== -1) {
            customData[existingIndex] = { key, text: value, categories: newCategories, masked: false };
        } else {
            customData.unshift({ key, text: value, categories: newCategories, masked: false });
        }
        localStorage.setItem(STORAGE_KEY_V4, JSON.stringify(customData));
        loadTranslations();
        window.dispatchEvent(new Event(UPDATE_EVENT));
    }
};

/**
 * Deletes a translation.
 * If the translation exists in the hardcoded defaults, it "masks" it (hides the default).
 * If it's pure custom, it removes it entirely.
 */
export const deleteTranslation = (key: string) => {
    // Check if it exists in defaults
    let isDefault = false;
    if (itemTranslations[key] || nodeTranslations[key] || fileTranslations[key] || serverSettingsTranslations[key] || serverSettingsDescriptions[key.replace('DESC::', '')]) {
        isDefault = true;
    }

    const existingIndex = customData.findIndex(d => d.key === key);

    if (isDefault) {
        // Mask it instead of deleting
        const current = existingIndex !== -1 ? customData[existingIndex] : null;
        const maskedEntry: TranslationEntry = { 
            key,
            text: key, 
            categories: current ? current.categories : (['global'] as TranslationCategory[]), // Keep categories or default to global
            masked: true 
        };
        
        if (existingIndex !== -1) {
            customData[existingIndex] = maskedEntry;
        } else {
            customData.unshift(maskedEntry);
        }
    } else {
        // Truly delete
        if (existingIndex !== -1) {
            customData.splice(existingIndex, 1);
        }
    }

    localStorage.setItem(STORAGE_KEY_V4, JSON.stringify(customData));
    loadTranslations();
    window.dispatchEvent(new Event(UPDATE_EVENT));
};

export const reorderTranslations = (startIndex: number, endIndex: number) => {
    const result = Array.from(customData);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    customData = result;
    localStorage.setItem(STORAGE_KEY_V4, JSON.stringify(customData));
    loadTranslations();
    window.dispatchEvent(new Event(UPDATE_EVENT));
};

export const bulkSaveTranslations = (updates: { key: string, value: string, category: TranslationCategory }[]) => {
    updates.forEach(item => {
        saveTranslation(item.key, item.value, item.category);
    });
};

export const bulkDeleteTranslations = (keys: string[]) => {
    keys.forEach(key => {
        deleteTranslation(key);
    });
};

export const importTranslations = (jsonContent: any) => {
    try {
        const newData: TranslationEntry[] = [];
        
        if (Array.isArray(jsonContent)) {
            // New V4 format
            jsonContent.forEach(v => {
                if (v.key && (v.text || v.masked)) {
                    const cats = Array.isArray(v.categories) ? v.categories : ['global'];
                    newData.push({ key: v.key, text: v.text || v.key, categories: cats, masked: !!v.masked });
                }
            });
        } else {
            // Old V3 format
            Object.entries(jsonContent).forEach(([k, v]: [string, any]) => {
                if (typeof v === 'string') {
                    newData.push({ key: k, text: v, categories: ['global'], masked: false });
                } else if (typeof v === 'object' && (v.text || v.masked)) {
                    const cats = Array.isArray(v.categories) ? v.categories : (v.category ? [v.category] : ['global']);
                    newData.push({ key: k, text: v.text || k, categories: cats, masked: !!v.masked });
                }
            });
        }

        customData = newData;
        localStorage.setItem(STORAGE_KEY_V4, JSON.stringify(customData));
        loadTranslations();
        window.dispatchEvent(new Event(UPDATE_EVENT));
        return true;
    } catch(e) {
        return false;
    }
};

export const exportTranslations = (): string => {
    return JSON.stringify(customData, null, 4);
};

export const resetTranslations = () => {
    localStorage.removeItem(STORAGE_KEY_V4);
    loadTranslations();
    window.dispatchEvent(new Event(UPDATE_EVENT));
};

// Returns merged list of defaults and customs. 
// If a default is masked, it is returned with isMasked=true and value=key
export const getAllTranslations = (modeFilter?: 'items' | 'server' | 'files'): { key: string, value: string, categories: TranslationCategory[], isCustom: boolean, isMasked: boolean, priorityIndex?: number }[] => {
    const list: { key: string, value: string, categories: TranslationCategory[], isCustom: boolean, isMasked: boolean, priorityIndex?: number }[] = [];
    const seen = new Set<string>();

    // Helper to check if category matches mode
    const matchesMode = (cats: TranslationCategory[]) => {
        if (!modeFilter) return true;
        if (cats.includes('global')) return true; 
        if (modeFilter === 'items') return cats.includes('item') || cats.includes('node');
        if (modeFilter === 'server') return cats.includes('setting') || cats.includes('setting_desc');
        if (modeFilter === 'files') return cats.includes('file');
        return false;
    };

    // 1. Add Custom Data (including masks) - Keep original order for priority display
    customData.forEach((v, index) => {
        if (!matchesMode(v.categories)) return;
        
        list.push({ 
            key: v.key, 
            value: v.masked ? (v.categories.includes('setting_desc') ? "" : v.key) : v.text, 
            categories: v.categories, 
            isCustom: true,
            isMasked: !!v.masked,
            priorityIndex: index
        });
        seen.add(v.key);
    });

    // 2. Add Defaults (if not seen)
    const addDefaults = (map: Record<string, string>, cat: TranslationCategory, mapPrefix = "") => {
        if (modeFilter === 'items' && !['item', 'node'].includes(cat)) return;
        if (modeFilter === 'server' && !['setting', 'setting_desc'].includes(cat)) return;
        if (modeFilter === 'files' && cat !== 'file') return;

        Object.entries(map).forEach(([k, v]) => {
            const fullKey = mapPrefix ? `${mapPrefix}${k}` : k;
            if (!seen.has(fullKey)) {
                list.push({ key: fullKey, value: v, categories: [cat], isCustom: false, isMasked: false });
                seen.add(fullKey);
            }
        });
    };

    addDefaults(itemTranslations, 'item');
    addDefaults(nodeTranslations, 'node');
    addDefaults(fileTranslations, 'file');
    addDefaults(serverSettingsTranslations, 'setting');
    addDefaults(settingDescMap, 'setting_desc'); 

    // Sort: Customs first (by priorityIndex), then defaults by key
    return list.sort((a, b) => {
        if (a.isCustom && b.isCustom) return (a.priorityIndex ?? 0) - (b.priorityIndex ?? 0);
        if (a.isCustom) return -1;
        if (b.isCustom) return 1;
        return a.key.localeCompare(b.key);
    });
};

export const getIdsByTranslationMatch = (term: string): string[] => {
    if (!term) return [];
    const lower = normalize(term);
    const all = getAllTranslations(); // Search all, ignoring mode
    // Filter out masked items from search results usually? Or include them?
    // If masked, value == key, so it works naturally.
    return all.filter(t => !t.isMasked && t.value.toLowerCase().includes(lower)).map(t => t.key);
};

export const getIdsByFuzzyTranslationMatch = (term: string): string[] => {
    if (!term) return [];
    const all = getAllTranslations();
    return all.filter(t => !t.isMasked && fuzzyMatch(t.value, term)).map(t => t.key);
};
