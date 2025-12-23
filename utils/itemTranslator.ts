
import { fuzzyMatch } from './helpers';
import { fileTranslations } from './translations/fileTranslations';
import { nodeTranslations } from './translations/nodeTranslations';
import { itemTranslations } from './translations/itemTranslations';
import { serverSettingsTranslations } from './translations/serverSettingsTranslations';
import { serverSettingsDescriptions } from './translations/serverSettingsDescriptions';

// Types
export type TranslationCategory = 'item' | 'node' | 'file' | 'global' | 'setting' | 'setting_desc';

export interface TranslationEntry {
    text: string;
    categories: TranslationCategory[];
    masked?: boolean; // New flag: if true, this entry effectively "deletes" a default translation
}

export interface TranslationData {
    [key: string]: TranslationEntry;
}

const STORAGE_KEY_V1 = 'scum_translations';
const STORAGE_KEY_V2 = 'scum_translations_v2'; 
const STORAGE_KEY_V3 = 'scum_translations_v3'; 
const UPDATE_EVENT = 'scum_translations_updated';

// In-memory lookup maps
let itemMap: Record<string, string> = {};
let nodeMap: Record<string, string> = {};
let fileMap: Record<string, string> = {};
let settingsMap: Record<string, string> = {};
let settingDescMap: Record<string, string> = {};
let globalMap: Record<string, string> = {};

let customData: TranslationData = {};

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

    // 2. Migration Logic (Simplified for V3 existing)
    try {
        const v3Stored = localStorage.getItem(STORAGE_KEY_V3);
        if (v3Stored) {
            customData = JSON.parse(v3Stored);
        } else {
            customData = {};
        }
    } catch (e) {
        console.warn("Translation load error", e);
        customData = {};
    }

    // 3. Populate Maps based on custom data overrides
    Object.entries(customData).forEach(([key, entry]) => {
        const { text, categories, masked } = entry;
        
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
        if (e.key === STORAGE_KEY_V3) {
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
    if (customData[key] && customData[key].masked) return key;

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
    if (customData[id]?.masked) return false; 

    if (itemMap[id] || nodeMap[id] || fileMap[id] || globalMap[id] || settingsMap[id]) return true;
    const lower = normalize(id);
    const search = (map: Record<string, string>) => Object.keys(map).some(k => normalize(k) === lower);
    return search(itemMap) || search(nodeMap) || search(fileMap) || search(globalMap) || search(settingsMap);
};

// --- Management ---

export const saveTranslation = (key: string, value: string, category: TranslationCategory) => {
    const existing = customData[key];
    let newCategories: TranslationCategory[] = [];

    if (existing) {
        newCategories = [...existing.categories];
        if (category === 'global') {
            newCategories = ['global'];
        } else {
            if (!newCategories.includes(category)) {
                newCategories.push(category);
            }
        }
    } else {
        newCategories = [category];
    }

    customData[key] = { text: value, categories: newCategories, masked: false };
    localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(customData));
    loadTranslations();
    window.dispatchEvent(new Event(UPDATE_EVENT));
};

export const toggleTranslationCategory = (key: string, category: TranslationCategory, value: string) => {
    const existing = customData[key];
    let newCategories: TranslationCategory[] = existing ? [...existing.categories] : [];
    
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
        customData[key] = { text: value, categories: newCategories, masked: false };
        localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(customData));
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

    if (isDefault) {
        // Mask it instead of deleting
        const current = customData[key];
        customData[key] = { 
            text: key, 
            categories: current ? current.categories : ['global'], // Keep categories or default to global
            masked: true 
        };
    } else {
        // Truly delete
        delete customData[key];
    }

    localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(customData));
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
        Object.entries(jsonContent).forEach(([k, v]: [string, any]) => {
            if (typeof v === 'string') {
                customData[k] = { text: v, categories: ['global'], masked: false };
            } else if (typeof v === 'object' && (v.text || v.masked)) {
                const cats = Array.isArray(v.categories) ? v.categories : (v.category ? [v.category] : ['global']);
                customData[k] = { text: v.text || k, categories: cats, masked: !!v.masked };
            }
        });
        localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(customData));
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
    localStorage.removeItem(STORAGE_KEY_V3);
    loadTranslations();
    window.dispatchEvent(new Event(UPDATE_EVENT));
};

// Returns merged list of defaults and customs. 
// If a default is masked, it is returned with isMasked=true and value=key
export const getAllTranslations = (modeFilter?: 'items' | 'server' | 'files'): { key: string, value: string, categories: TranslationCategory[], isCustom: boolean, isMasked: boolean }[] => {
    const list: { key: string, value: string, categories: TranslationCategory[], isCustom: boolean, isMasked: boolean }[] = [];
    const seen = new Set<string>();

    // Helper to check if category matches mode
    const matchesMode = (cats: TranslationCategory[]) => {
        if (!modeFilter) return true;
        if (cats.includes('global')) return true; // Global shows everywhere? Or maybe restrictive? Let's show everywhere.
        if (modeFilter === 'items') return cats.includes('item') || cats.includes('node');
        if (modeFilter === 'server') return cats.includes('setting') || cats.includes('setting_desc');
        if (modeFilter === 'files') return cats.includes('file');
        return false;
    };

    // 1. Add Custom Data (including masks)
    Object.entries(customData).forEach(([k, v]) => {
        if (!matchesMode(v.categories)) return;
        
        list.push({ 
            key: k, 
            value: v.masked ? (v.categories.includes('setting_desc') ? "" : k) : v.text, 
            categories: v.categories, 
            isCustom: true,
            isMasked: !!v.masked
        });
        seen.add(k);
    });

    // 2. Add Defaults (if not seen)
    const addDefaults = (map: Record<string, string>, cat: TranslationCategory, mapPrefix = "") => {
        // Optimization: Only scan maps relevant to mode
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
    addDefaults(settingDescMap, 'setting_desc'); // Note: These keys already have DESC:: prefix in the map

    return list.sort((a, b) => a.key.localeCompare(b.key));
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
