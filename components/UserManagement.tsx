

import React, { useState, useEffect } from 'react';
import { User, getUsers, addUser, removeUser, getCurrentUser, getSecurityLogs, unlockIp, SecurityLog, toggleUserStatus, resetUserPassword, getAccessHistory, AccessLog, revokeUserSessions, setupDatabase } from '../services/auth';
import { TrashIcon, PlusIcon, UserIcon, XMarkIcon, LockClosedIcon, CheckCircleIcon, ArrowPathIcon, ArrowRightOnRectangleIcon, CubeIcon } from './Icons';
import { useI18n } from '../i18n';

interface UserManagementProps {
    onClose?: () => void;
    embedded?: boolean;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onClose, embedded = false }) => {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<'users' | 'security' | 'history'>('users');
    
    const [users, setUsers] = useState<User[]>([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'user' as 'user' | 'admin', email: '' });
    const [userError, setUserError] = useState('');
    const [logs, setLogs] = useState<SecurityLog[]>([]);
    const [history, setHistory] = useState<AccessLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [dbError, setDbError] = useState<string | null>(null);
    const currentUser = getCurrentUser();

    // Reset Password Modal State
    const [resetTarget, setResetTarget] = useState<string | null>(null);
    const [resetPass, setResetPass] = useState("");

    useEffect(() => {
        setDbError(null);
        if (activeTab === 'users') loadUsers();
        else if (activeTab === 'security') loadLogs();
        else if (activeTab === 'history') loadHistory();
    }, [activeTab]);

    const loadUsers = async () => { 
        setLoading(true); 
        try {
            const data = await getUsers();
            setUsers(data);
        } catch(e: any) {
            console.error(e);
            setDbError(e.message || t('users.loadFail'));
        }
        setLoading(false); 
    };

    const loadLogs = async () => { 
        setLoading(true); 
        try {
            const data = await getSecurityLogs();
            setLogs(data);
        } catch(e: any) {
            console.error(e);
            setDbError(e.message || "Failed to load logs");
        }
        setLoading(false); 
    };

    const loadHistory = async () => { 
        setLoading(true); 
        try {
            const data = await getAccessHistory();
            setHistory(data);
        } catch(e: any) {
            console.error(e);
            setDbError(e.message || "Failed to load history");
        }
        setLoading(false); 
    };

    const handleSetupDb = async () => {
        if(confirm(t('db.initConfirm'))) {
            setLoading(true);
            const msg = await setupDatabase();
            setLoading(false);
            alert(msg);
            setDbError(null);
            // Retry loading current tab
            if (activeTab === 'users') loadUsers();
            else if (activeTab === 'security') loadLogs();
            else if (activeTab === 'history') loadHistory();
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setUserError('');
        if (!newUser.username || !newUser.password) { setUserError(t('users.errorRequired')); return; }
        
        setLoading(true);
        const success = await addUser(newUser);
        setLoading(false);

        if (success) {
            await loadUsers();
            setNewUser({ username: '', password: '', name: '', role: 'user', email: '' });
        } else {
            setUserError(t('users.errorAdd'));
        }
    };

    const handleDeleteUser = async (username: string) => {
        if (username === currentUser.username) { alert(t('users.errorSelfDelete')); return; }
        if (confirm(t('users.confirmDelete', [username]))) {
            setLoading(true); await removeUser(username); await loadUsers(); setLoading(false);
        }
    };

    const handleToggleStatus = async (username: string, currentStatus: number) => {
        if (username === currentUser.username) return;
        const newStatus = currentStatus === 1 ? false : true;
        setLoading(true);
        await toggleUserStatus(username, newStatus);
        await loadUsers();
        setLoading(false);
    };

    const handleResetPassword = async () => {
        if (!resetTarget || !resetPass) return;
        setLoading(true);
        const ok = await resetUserPassword(resetTarget, resetPass);
        setLoading(false);
        if (ok) {
            alert(t('users.resetSuccess'));
            setResetTarget(null);
            setResetPass("");
        } else {
            alert(t('users.resetFail'));
        }
    };

    const handleRevokeSessions = async (username: string) => {
        if(confirm(t('users.revokeConfirm', [username]))) {
            setLoading(true);
            const ok = await revokeUserSessions(username);
            setLoading(false);
            if(ok) alert(t('users.revokedSuccess'));
        }
    };

    const handleUnlockIp = async (ip: string) => {
        if(confirm(t('security.confirmUnban', [ip]))) {
            setLoading(true); await unlockIp(ip); await loadLogs(); setLoading(false);
        }
    };

    // Helper to detect seconds vs milliseconds and format
    const formatHistoryTime = (ts: number) => {
        // If timestamp is small (e.g. < 20000000000), it's likely seconds (unix epoch)
        // If larger, it's ms. Cutoff ~ year 2603 for seconds.
        const isSeconds = ts < 100000000000; 
        return new Date(ts * (isSeconds ? 1000 : 1)).toLocaleString();
    };

    const baseInput = "w-full bg-black/20 border border-scum-700/50 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-scum-accent transition-colors";
    const containerClass = embedded ? "w-full h-full flex flex-col" : "fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in";
    const innerClass = embedded ? "flex-1 flex flex-col overflow-hidden" : "w-full max-w-4xl bg-scum-900 border border-scum-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]";

    return (
        <div className={containerClass}>
            <div className={innerClass}>
                <div className={`p-4 border-b border-scum-700/50 flex justify-between items-center ${embedded ? 'bg-transparent pt-0 px-0' : 'bg-[#0b1120]'}`}>
                    {!embedded && <h3 className="text-lg font-bold text-scum-accent flex items-center gap-2"><UserIcon className="w-5 h-5" /> {t('users.title')}</h3>}
                    <div className="flex bg-scum-800 rounded-lg p-1 border border-scum-700/50">
                        {['users', 'security', 'history'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-3 py-1 text-xs font-bold rounded transition-colors uppercase ${activeTab === tab ? 'bg-scum-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                                {t(`users.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`) !== `users.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}` ? t(`users.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`) : tab}
                            </button>
                        ))}
                    </div>
                    {!embedded && onClose && <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>}
                </div>

                <div className={`flex-1 overflow-y-auto custom-scrollbar ${embedded ? 'pr-2' : 'p-6'}`}>
                    {dbError && (
                        <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center animate-pulse">
                            <h4 className="text-red-400 font-bold flex items-center gap-2"><CubeIcon className="w-5 h-5" /> {t('db.errorTitle')}</h4>
                            <p className="text-xs text-gray-400 font-mono">{dbError}</p>
                            <p className="text-[10px] text-gray-500">{t('db.errorDesc')}</p>
                            <button 
                                onClick={handleSetupDb}
                                className="mt-2 bg-red-500 hover:bg-red-400 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <CubeIcon className="w-3 h-3" /> {t('db.initBtn')}
                            </button>
                        </div>
                    )}

                    {!dbError && activeTab === 'users' && (
                        <div className="space-y-6">
                            {/* User List Table */}
                            <div>
                                <h4 className="text-xs uppercase font-bold text-gray-500 mb-4 tracking-wider flex justify-between">
                                    <span>{t('users.existing')}</span> {loading && <span className="text-scum-accent animate-pulse">{t('common.syncing')}</span>}
                                </h4>
                                <div className="overflow-x-auto rounded-lg border border-scum-700/50">
                                    <table className="w-full text-left text-sm text-gray-300">
                                        <thead className="bg-scum-800/50 text-xs uppercase font-bold text-gray-500">
                                            <tr>
                                                <th className="px-4 py-3">{t('table.user')}</th>
                                                <th className="px-4 py-3">{t('table.role')}</th>
                                                <th className="px-4 py-3">{t('table.status')}</th>
                                                <th className="px-4 py-3 text-right">{t('table.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-scum-700/30 bg-black/10">
                                            {users.map(u => (
                                                <tr key={u.username} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${u.role === 'admin' ? 'bg-scum-accent text-black' : 'bg-gray-700 text-gray-300'}`}>{u.username.substring(0, 2).toUpperCase()}</div>
                                                            <div>
                                                                <div className="font-bold">{u.username} {u.username === currentUser?.username && <span className="text-[10px] bg-green-500/20 text-green-400 px-1 rounded ml-1">{t('users.you')}</span>}</div>
                                                                <div className="text-xs text-gray-500">{u.email || t('users.noEmail')}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 uppercase text-xs font-bold opacity-70">{u.role}</td>
                                                    <td className="px-4 py-3">
                                                        <button 
                                                            onClick={() => handleToggleStatus(u.username, u.is_active || 0)}
                                                            disabled={u.username === currentUser?.username}
                                                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${u.is_active ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'} ${u.username === currentUser?.username ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {u.is_active ? t('status.active') : t('status.disabled')}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => handleRevokeSessions(u.username)} disabled={u.username === currentUser?.username} className="p-1.5 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 rounded" title={t('users.forceLogoutTooltip')}><ArrowRightOnRectangleIcon className="w-4 h-4" /></button>
                                                            <button onClick={() => setResetTarget(u.username)} className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded" title={t('users.resetPassTooltip')}><ArrowPathIcon className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteUser(u.username)} disabled={u.username === currentUser?.username} className={`p-1.5 rounded ${u.username === currentUser?.username ? 'text-gray-700 cursor-not-allowed' : 'text-gray-500 hover:text-red-400 hover:bg-red-900/20'}`}><TrashIcon className="w-4 h-4" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Add User */}
                            <div className="bg-scum-800/20 p-6 rounded-xl border border-white/5">
                                <h4 className="text-xs uppercase font-bold text-gray-500 mb-4 tracking-wider flex items-center gap-2"><PlusIcon className="w-4 h-4" /> {t('users.add')}</h4>
                                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" required className={baseInput} value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} placeholder={t('users.usernamePlaceholder')} />
                                    <input type="email" className={baseInput} value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder={t('users.emailPlaceholder')} />
                                    <input type="password" required className={baseInput} value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder={t('users.initPassPlaceholder')} />
                                    <select className={baseInput} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}><option value="user">User</option><option value="admin">Admin</option></select>
                                    <div className="md:col-span-2">
                                        {userError && <div className="text-red-400 text-xs mb-2">{userError}</div>}
                                        <button type="submit" disabled={loading} className="w-full py-2 bg-scum-accent text-black font-bold rounded-lg hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/20 disabled:opacity-50">{t('users.create')}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Reset Password Modal Overlay */}
                    {resetTarget && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                            <div className="bg-scum-900 border border-scum-700 p-6 rounded-xl w-80 shadow-2xl">
                                <h3 className="text-lg font-bold text-white mb-4">{t('users.resetModalTitle')}</h3>
                                <p className="text-xs text-gray-400 mb-4">{t('users.resetModalDesc', [resetTarget])}</p>
                                <input type="password" autoFocus className={`${baseInput} mb-4`} value={resetPass} onChange={e => setResetPass(e.target.value)} placeholder="New Password" />
                                <div className="flex gap-2">
                                    <button onClick={handleResetPassword} className="flex-1 bg-scum-accent text-black py-2 rounded font-bold hover:bg-cyan-400">{t('common.confirm') || "Reset"}</button>
                                    <button onClick={() => { setResetTarget(null); setResetPass(""); }} className="flex-1 bg-gray-700 text-white py-2 rounded hover:bg-gray-600">{t('importer.cancel')}</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!dbError && activeTab === 'security' && (
                        <div className="space-y-4">
                            <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-200 flex items-start gap-2">
                                <LockClosedIcon className="w-4 h-4 shrink-0 mt-0.5" />
                                <div><span className="font-bold">{t('security.bruteForceTitle')}</span><p className="opacity-80 mt-1">{t('security.bruteForceDesc')}</p></div>
                            </div>
                            <div className="overflow-hidden rounded-lg border border-scum-700/50">
                                <table className="w-full text-left text-sm text-gray-400">
                                    <thead className="bg-scum-800/50 text-xs uppercase font-bold text-gray-500"><tr><th className="px-4 py-3">{t('security.ip')}</th><th className="px-4 py-3">{t('security.attempts')}</th><th className="px-4 py-3">{t('security.status')}</th><th className="px-4 py-3 text-right">{t('security.actions')}</th></tr></thead>
                                    <tbody className="divide-y divide-scum-700/30 bg-black/10">
                                        {logs.map(log => {
                                            const isLocked = log.lock_until > Date.now();
                                            return (
                                                <tr key={log.ip} className="hover:bg-white/5"><td className="px-4 py-3 font-mono text-gray-300">{log.ip}</td><td className="px-4 py-3"><span className="bg-scum-800 px-2 py-0.5 rounded">{log.attempts}</span></td><td className="px-4 py-3">{isLocked ? <span className="text-red-400 font-bold">{t('security.locked')}</span> : <span className="text-green-500">{t('security.active')}</span>}</td><td className="px-4 py-3 text-right"><button onClick={() => handleUnlockIp(log.ip)} className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded hover:bg-red-500 hover:text-white">{t('security.unban')}</button></td></tr>
                                            );
                                        })}
                                        {logs.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">{t('security.noLogs')}</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {!dbError && activeTab === 'history' && (
                        <div className="space-y-4">
                            <h4 className="text-xs uppercase font-bold text-gray-500 mb-2">{t('history.title')}</h4>
                            <div className="overflow-hidden rounded-lg border border-scum-700/50">
                                <table className="w-full text-left text-sm text-gray-400">
                                    <thead className="bg-scum-800/50 text-xs uppercase font-bold text-gray-500"><tr><th className="px-4 py-3">{t('table.time')}</th><th className="px-4 py-3">{t('table.user')}</th><th className="px-4 py-3">{t('table.action')}</th><th className="px-4 py-3 text-right">{t('table.ip')}</th></tr></thead>
                                    <tbody className="divide-y divide-scum-700/30 bg-black/10">
                                        {history.map((h, i) => (
                                            <tr key={i} className="hover:bg-white/5"><td className="px-4 py-3 font-mono text-xs opacity-70">{formatHistoryTime(h.timestamp)}</td><td className="px-4 py-3 font-bold text-gray-300">{h.username}</td><td className="px-4 py-3"><span className="bg-white/5 px-2 py-0.5 rounded text-xs border border-white/10">{h.action}</span></td><td className="px-4 py-3 text-right font-mono text-xs opacity-50">{h.ip}</td></tr>
                                        ))}
                                        {history.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">{t('history.empty')}</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
