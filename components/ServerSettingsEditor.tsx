
import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../i18n';
import { BooleanToggle } from './FormControls';
import { SearchIcon, Cog6ToothIcon, ChevronDown, ChevronRight, CheckCircleIcon } from './Icons';
import { getSettingTranslation, getSettingDescription } from '../utils/itemTranslator';

interface ServerSettingsEditorProps {
    content: string;
    onChange: (newContent: string) => void;
}

// Map<SectionName, Map<Key, Value>>
type IniData = Record<string, Record<string, string>>;

export const ServerSettingsEditor: React.FC<ServerSettingsEditorProps> = ({ content, onChange }) => {
    const { t } = useI18n();
    const [searchTerm, setSearchTerm] = useState("");
    const [parsedData, setParsedData] = useState<IniData>({});
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    
    // Parse INI on load
    useEffect(() => {
        const lines = content.split(/\r?\n/);
        const data: IniData = {};
        let currentSection = "";

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) return;

            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                currentSection = trimmed.slice(1, -1);
                data[currentSection] = {};
            } else if (currentSection && trimmed.includes('=')) {
                const eqIdx = trimmed.indexOf('=');
                const key = trimmed.substring(0, eqIdx).trim();
                const val = trimmed.substring(eqIdx + 1).trim();
                data[currentSection][key] = val;
            }
        });
        setParsedData(data);
    }, [content]);

    const handleUpdate = (section: string, key: string, value: string | boolean) => {
        const newData = { ...parsedData };
        if (!newData[section]) newData[section] = {};
        
        let stringVal = String(value);
        // Ensure standard casing for booleans in SCUM INI
        if (typeof value === 'boolean') {
            stringVal = value ? "True" : "False";
        }
        
        newData[section][key] = stringVal;
        setParsedData(newData);
        
        // Reconstruct INI string
        let newContent = "";
        Object.keys(newData).forEach(sec => {
            newContent += `[${sec}]\n`;
            Object.entries(newData[sec]).forEach(([k, v]) => {
                newContent += `${k}=${v}\n`;
            });
            newContent += "\n";
        });
        
        onChange(newContent.trim());
    };

    const toggleSection = (section: string) => {
        const newSet = new Set(collapsedSections);
        if (newSet.has(section)) newSet.delete(section);
        else newSet.add(section);
        setCollapsedSections(newSet);
    };

    const sections = Object.keys(parsedData);

    // Filtering logic
    const filteredSections = useMemo(() => {
        if (!searchTerm) return sections;
        const lowerSearch = searchTerm.toLowerCase();
        
        return sections.filter(sec => {
            // Check section name
            if (sec.toLowerCase().includes(lowerSearch)) return true;
            // Check translated section name
            const transSection = getSettingTranslation(sec);
            if (transSection && transSection.toLowerCase().includes(lowerSearch)) return true;

            // Check keys within section
            const keys = Object.keys(parsedData[sec]);
            return keys.some(k => {
                if (k.toLowerCase().includes(lowerSearch)) return true;
                const cleanKey = k.replace(/^scum\./i, '');
                const transKey = getSettingTranslation(k) || getSettingTranslation(cleanKey);
                return transKey && transKey.toLowerCase().includes(lowerSearch);
            });
        });
    }, [sections, parsedData, searchTerm]);

    const getSectionColor = (name: string) => {
        switch(name) {
            case 'General': return 'text-scum-accent border-scum-accent/50';
            case 'SCUM.GameMode': 
            case 'GameMode': return 'text-green-400 border-green-500/50';
            case 'SCUM.RespawnSettings':
            case 'Respawn': return 'text-red-400 border-red-500/50';
            case 'SCUM.Vehicles':
            case 'Vehicles': return 'text-yellow-400 border-yellow-500/50';
            case 'SCUM.WorldSettings':
            case 'World': return 'text-blue-400 border-blue-500/50';
            default: return 'text-gray-300 border-gray-600/50';
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0b1120] text-gray-200">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-white/5 flex flex-col gap-4 sticky top-0 bg-[#0b1120]/95 backdrop-blur-xl z-20 shadow-lg">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <Cog6ToothIcon className="w-6 h-6 text-scum-accent" />
                        {t('serverSettings.title')}
                    </h2>
                    <div className="text-xs text-gray-500 font-mono">ServerSettings.ini</div>
                </div>
                
                <div className="relative group">
                    <input 
                        type="text" 
                        className="w-full bg-scum-900 border border-scum-700 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-scum-accent transition-all placeholder-gray-600 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        placeholder={t('explorer.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-500 group-focus-within:text-scum-accent transition-colors" />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 pb-20">
                {filteredSections.map(section => {
                    const keys = Object.keys(parsedData[section]);
                    const visibleKeys = searchTerm 
                        ? keys.filter(k => {
                            const cleanKey = k.replace(/^scum\./i, '');
                            if (k.toLowerCase().includes(searchTerm.toLowerCase())) return true;
                            
                            const trans = getSettingTranslation(k) || getSettingTranslation(cleanKey);
                            if (trans && trans.toLowerCase().includes(searchTerm.toLowerCase())) return true;
                            
                            // Also show all keys if section matches
                            const sectionTrans = getSettingTranslation(section);
                            return section.toLowerCase().includes(searchTerm.toLowerCase()) || (sectionTrans && sectionTrans.toLowerCase().includes(searchTerm.toLowerCase()));
                        })
                        : keys;

                    if (visibleKeys.length === 0) return null;

                    const isCollapsed = collapsedSections.has(section) && !searchTerm;
                    const colorClass = getSectionColor(section);
                    const cleanSectionName = section.replace('SCUM.', '');
                    const sectionTrans = getSettingTranslation(section);

                    return (
                        <div key={section} className="animate-slide-up">
                            <div 
                                className={`flex items-center justify-between gap-2 mb-3 pb-2 border-b cursor-pointer group select-none ${colorClass.split(' ')[1]}`}
                                onClick={() => toggleSection(section)}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                                        <ChevronDown className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                    </span>
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-bold uppercase tracking-widest ${colorClass.split(' ')[0]}`}>
                                            {sectionTrans || cleanSectionName}
                                        </span>
                                        {sectionTrans && <span className="text-[9px] text-gray-500 font-mono">{section}</span>}
                                    </div>
                                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-500 border border-white/5 ml-2">{visibleKeys.length}</span>
                                </div>
                            </div>
                            
                            {!isCollapsed && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 animate-fade-in">
                                    {visibleKeys.map(key => {
                                        const value = parsedData[section][key];
                                        const isBool = value.toLowerCase() === 'true' || value.toLowerCase() === 'false';
                                        
                                        // Robust key cleaning for translation: remove optional "scum." prefix (case-insensitive)
                                        const cleanKey = key.replace(/^scum\./i, '');
                                        // Try exact key first, then cleaned key
                                        const transKey = getSettingTranslation(key) || getSettingTranslation(cleanKey);
                                        // Use dynamic translation lookup for description
                                        const description = getSettingDescription(key) || getSettingDescription(cleanKey);
                                        
                                        return (
                                            <div 
                                                key={key} 
                                                className="bg-scum-800/30 rounded-lg border border-white/5 hover:bg-scum-800/50 transition-colors group px-4 py-3 flex flex-col gap-2 relative overflow-visible"
                                            >
                                                {/* Tooltip Popup */}
                                                {description && (
                                                    <div className="absolute left-0 bottom-full mb-2 w-full z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-2 transform translate-y-1 group-hover:translate-y-0">
                                                        <div className="bg-black/90 text-gray-300 text-xs p-3 rounded-lg border border-scum-accent/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md relative">
                                                            <div className="font-bold text-scum-accent mb-1 flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-scum-accent"></span> 
                                                                Info
                                                            </div>
                                                            <div className="whitespace-pre-wrap leading-relaxed">{description}</div>
                                                            {/* Arrow */}
                                                            <div className="absolute top-full left-6 -mt-[1px] border-4 border-transparent border-t-black/90"></div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex flex-col mb-1 relative">
                                                    <label className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors break-words flex items-center justify-between cursor-help">
                                                        <span>{transKey || cleanKey}</span>
                                                        {description && <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-scum-accent/50 transition-colors"></div>}
                                                    </label>
                                                    {transKey && <span className="text-[9px] text-gray-500 font-mono truncate select-all">{key}</span>}
                                                </div>
                                                
                                                {isBool ? (
                                                    <div className="w-full">
                                                        <BooleanToggle 
                                                            label={""} 
                                                            value={value.toLowerCase() === 'true'}
                                                            onChange={(v) => handleUpdate(section, key, v)}
                                                            color={value.toLowerCase() === 'true' ? 'cyan' : 'fuchsia'}
                                                            size="sm"
                                                        />
                                                    </div>
                                                ) : (
                                                    <input 
                                                        type="text" 
                                                        className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-scum-accent transition-colors shadow-inner"
                                                        value={value}
                                                        onChange={(e) => handleUpdate(section, key, e.target.value)}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {filteredSections.length === 0 && (
                    <div className="text-center py-12 text-gray-500 italic">No matching settings found.</div>
                )}
            </div>
        </div>
    );
};
