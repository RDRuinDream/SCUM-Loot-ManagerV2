
import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { UserManagement } from './UserManagement';
import { Cog6ToothIcon, XMarkIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ArrowPathIcon, ChartBarIcon, ChartPieIcon, ArrowRightOnRectangleIcon, FolderIcon, CubeIcon } from './Icons';
import { BooleanToggle } from './FormControls';
import { useSettings } from '../SettingsContext';

interface SettingsModalProps {
    onClose: () => void;
    autoSave: boolean;
    toggleAutoSave: () => void;
    onResetNodeLibrary: () => void;
    onUploadNodeLibrary: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onTranslationsUpdate?: () => void;
    onOpenTranslationManager: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, autoSave, toggleAutoSave, onResetNodeLibrary, onUploadNodeLibrary, onTranslationsUpdate, onOpenTranslationManager }) => {
    const { t, language, setLanguage } = useI18n();
    const { chartMode, setChartMode } = useSettings();
    const [activeTab, setActiveTab] = useState<'general' | 'data' | 'account'>('general');

    const handleOpenTrans = (type: 'items' | 'server' | 'files') => {
        // Open in new tab/window for multi-monitor support with specific type param
        window.open(`${window.location.origin}${window.location.pathname}?view=translations&type=${type}`, '_blank');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-4xl bg-scum-900 border border-scum-700 rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[80vh] md:h-[600px]">
                
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-black/20 border-b md:border-b-0 md:border-r border-scum-700/50 flex flex-col">
                    <div className="p-4 border-b border-scum-700/50 flex items-center gap-2 text-scum-accent font-bold">
                        <Cog6ToothIcon className="w-6 h-6" />
                        <span className="tracking-widest uppercase">{t('settings.title')}</span>
                    </div>
                    <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                        {[
                            { id: 'general', label: t('settings.tabGeneral') },
                            { id: 'data', label: t('settings.tabData') },
                            { id: 'account', label: t('settings.tabAccount') },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                                    activeTab === tab.id 
                                    ? 'bg-scum-accent/10 text-scum-accent border border-scum-accent/20' 
                                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#0b1120]">
                    <div className="flex justify-end p-4">
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-0 space-y-8">
                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-slide-up">
                                {/* Language */}
                                <div className="bg-scum-800/30 p-4 rounded-xl border border-scum-700/50">
                                    <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase">{t('settings.language')}</h3>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setLanguage('zh')}
                                            className={`flex-1 py-2 rounded border transition-all ${language === 'zh' ? 'bg-scum-accent text-black border-scum-accent font-bold' : 'bg-transparent border-scum-700 text-gray-400 hover:border-gray-500'}`}
                                        >
                                            中文 (Chinese)
                                        </button>
                                        <button 
                                            onClick={() => setLanguage('en')}
                                            className={`flex-1 py-2 rounded border transition-all ${language === 'en' ? 'bg-scum-accent text-black border-scum-accent font-bold' : 'bg-transparent border-scum-700 text-gray-400 hover:border-gray-500'}`}
                                        >
                                            English
                                        </button>
                                    </div>
                                </div>

                                {/* Chart Style */}
                                <div className="bg-scum-800/30 p-4 rounded-xl border border-scum-700/50">
                                    <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase">{t('settings.chartMode')}</h3>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setChartMode('bar')}
                                            className={`flex-1 py-2 rounded border transition-all flex items-center justify-center gap-2 ${chartMode === 'bar' ? 'bg-indigo-500 text-white border-indigo-500 font-bold' : 'bg-transparent border-scum-700 text-gray-400 hover:border-gray-500'}`}
                                        >
                                            <ChartBarIcon className="w-4 h-4" /> {t('settings.chartModeBar')}
                                        </button>
                                        <button 
                                            onClick={() => setChartMode('pie')}
                                            className={`flex-1 py-2 rounded border transition-all flex items-center justify-center gap-2 ${chartMode === 'pie' ? 'bg-indigo-500 text-white border-indigo-500 font-bold' : 'bg-transparent border-scum-700 text-gray-400 hover:border-gray-500'}`}
                                        >
                                            <ChartPieIcon className="w-4 h-4" /> {t('settings.chartModePie')}
                                        </button>
                                    </div>
                                </div>

                                {/* Auto Save */}
                                <div className="bg-scum-800/30 p-4 rounded-xl border border-scum-700/50 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-300 uppercase">{t('settings.autoSave')}</h3>
                                        <p className="text-xs text-gray-500 mt-1">{t('settings.autoSaveDesc')}</p>
                                    </div>
                                    <div className="h-6">
                                        <BooleanToggle 
                                            label=""
                                            value={autoSave}
                                            onChange={toggleAutoSave}
                                            color="cyan"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'data' && (
                            <div className="space-y-6 animate-slide-up">
                                {/* Translation Management Links */}
                                <div className="bg-scum-800/30 p-4 rounded-xl border border-scum-700/50">
                                    <h3 className="text-sm font-bold text-emerald-400 uppercase flex items-center gap-2 mb-4">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        {t('settings.transTitle')}
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-4">{t('settings.transDesc')}</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <button 
                                            onClick={() => handleOpenTrans('items')}
                                            className="flex flex-col items-center justify-center gap-2 bg-emerald-900/20 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black p-3 rounded-lg transition-all active:scale-95 group"
                                        >
                                            <CubeIcon className="w-6 h-6" />
                                            <span className="text-xs font-bold text-center">Items & Nodes</span>
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleOpenTrans('server')}
                                            className="flex flex-col items-center justify-center gap-2 bg-purple-900/20 border border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white p-3 rounded-lg transition-all active:scale-95 group"
                                        >
                                            <Cog6ToothIcon className="w-6 h-6" />
                                            <span className="text-xs font-bold text-center">Server Settings</span>
                                        </button>

                                        <button 
                                            onClick={() => handleOpenTrans('files')}
                                            className="flex flex-col items-center justify-center gap-2 bg-yellow-900/20 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500 hover:text-black p-3 rounded-lg transition-all active:scale-95 group"
                                        >
                                            <FolderIcon className="w-6 h-6" />
                                            <span className="text-xs font-bold text-center">File Names</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Node Library Management */}
                                <div className="bg-scum-800/30 p-4 rounded-xl border border-scum-700/50">
                                    <h3 className="text-sm font-bold text-gray-300 uppercase flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                        {t('settings.nodeLibTitle')}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1 mb-4">{t('settings.nodeLibDesc')}</p>
                                    
                                    <div className="flex gap-4">
                                        <label className="flex-1 flex items-center justify-center gap-2 bg-indigo-900/30 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500 hover:text-white py-2 rounded-lg transition-all text-xs font-bold cursor-pointer">
                                            <ArrowUpTrayIcon className="w-4 h-4" /> {t('settings.importNodeLib')}
                                            <input type="file" multiple className="hidden" onChange={onUploadNodeLibrary} />
                                        </label>
                                        <button onClick={onResetNodeLibrary} className="flex-1 flex items-center justify-center gap-2 bg-red-900/30 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white py-2 rounded-lg transition-all text-xs font-bold">
                                            <ArrowPathIcon className="w-4 h-4" /> {t('settings.resetNodeLib')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'account' && (
                            <div className="h-full animate-slide-up">
                                <UserManagement embedded={true} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
