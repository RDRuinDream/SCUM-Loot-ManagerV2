
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
    categories: TranslationCategory[]; // Changed from single category to array
}

export interface TranslationData {
    [key: string]: TranslationEntry;
}

const STORAGE_KEY_V1 = 'scum_translations';
const STORAGE_KEY_V2 = 'scum_translations_v2'; 
const STORAGE_KEY_V3 = 'scum_translations_v3'; // Bump version for new structure
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

    // 2. Migration Logic
    try {
        const v3Stored = localStorage.getItem(STORAGE_KEY_V3);
        const v2Stored = localStorage.getItem(STORAGE_KEY_V2);
        const v1Stored = localStorage.getItem(STORAGE_KEY_V1);

        if (v3Stored) {
            customData = JSON.parse(v3Stored);
        } else if (v2Stored) {
            // Upgrade V2 to V3 (Single category -> Array)
            const v2Data = JSON.parse(v2Stored);
            customData = {};
            Object.entries(v2Data).forEach(([k, v]: [string, any]) => {
                customData[k] = { 
                    text: v.text, 
                    categories: v.category === 'global' ? ['global'] : [v.category] 
                };
            });
            localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(customData));
        } else if (v1Stored) {
            // Upgrade V1 to V3
            const v1Data = JSON.parse(v1Stored);
            customData = {};
            Object.entries(v1Data).forEach(([k, v]) => {
                customData[k] = { text: String(v), categories: ['global'] };
            });
            localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(customData));
        } else {
            customData = {};
        }
    } catch (e) {
        console.warn("Translation load error", e);
        customData = {};
    }

    // 3. Populate Maps based on active categories
    Object.entries(customData).forEach(([key, entry]) => {
        const { text, categories } = entry;
        
        if (categories.includes('global')) {
            globalMap[key] = text;
            itemMap[key] = text;
            nodeMap[key] = text;
            fileMap[key] = text;
            settingsMap[key] = text;
            settingDescMap[key] = text;
        } else {
            if (categories.includes('item')) itemMap[key] = text;
            if (categories.includes('node')) nodeMap[key] = text;
            if (categories.includes('file')) fileMap[key] = text;
            if (categories.includes('setting')) settingsMap[key] = text;
            if (categories.includes('setting_desc')) settingDescMap[key] = text;
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
    if (primaryMap[key]) return primaryMap[key];
    if (globalMap[key]) return globalMap[key];

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

    customData[key] = { text: value, categories: newCategories };
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
        deleteTranslation(key);
    } else {
        customData[key] = { text: value, categories: newCategories };
        localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(customData));
        loadTranslations();
        window.dispatchEvent(new Event(UPDATE_EVENT));
    }
};

export const deleteTranslation = (key: string) => {
    delete customData[key];
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
        delete customData[key];
    });
    localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(customData));
    loadTranslations();
    window.dispatchEvent(new Event(UPDATE_EVENT));
};

export const importTranslations = (jsonContent: any) => {
    try {
        Object.entries(jsonContent).forEach(([k, v]: [string, any]) => {
            if (typeof v === 'string') {
                customData[k] = { text: v, categories: ['global'] };
            } else if (typeof v === 'object' && v.text) {
                const cats = Array.isArray(v.categories) ? v.categories : (v.category ? [v.category] : ['global']);
                customData[k] = { text: v.text, categories: cats };
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

export const getAllTranslations = (): { key: string, value: string, categories: TranslationCategory[], isCustom: boolean }[] => {
    const list: { key: string, value: string, categories: TranslationCategory[], isCustom: boolean }[] = [];
    const seen = new Set<string>();

    Object.entries(customData).forEach(([k, v]) => {
        list.push({ key: k, value: v.text, categories: v.categories, isCustom: true });
        seen.add(k);
    });

    const addDefaults = (map: Record<string, string>, cat: TranslationCategory) => {
        Object.entries(map).forEach(([k, v]) => {
            if (!seen.has(k)) {
                list.push({ key: k, value: v, categories: [cat], isCustom: false });
                seen.add(k);
            }
        });
    };

    addDefaults(itemTranslations, 'item');
    addDefaults(nodeTranslations, 'node');
    addDefaults(fileTranslations, 'file');
    addDefaults(serverSettingsTranslations, 'setting');
    addDefaults(settingDescMap, 'setting_desc');

    return list.sort((a, b) => a.key.localeCompare(b.key));
};

export const getIdsByTranslationMatch = (term: string): string[] => {
    if (!term) return [];
    const lower = normalize(term);
    const all = getAllTranslations();
    return all.filter(t => t.value.toLowerCase().includes(lower)).map(t => t.key);
};

export const getIdsByFuzzyTranslationMatch = (term: string): string[] => {
    if (!term) return [];
    const all = getAllTranslations();
    return all.filter(t => fuzzyMatch(t.value, term)).map(t => t.key);
};
