
import React, { useState } from 'react';
import { LockClosedIcon, UserIcon, ArrowRightOnRectangleIcon, CubeIcon } from './Icons';
import { login, setupDatabase } from '../services/auth';
import { useI18n } from '../i18n';

interface LoginScreenProps {
  onLogin: (success: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(username, password);
    if (result.success) {
      onLogin(true);
    } else {
      setError(result.error || t('login.error'));
      setLoading(false);
    }
  };

  const handleSetup = async () => {
      if(confirm(t('login.setupConfirm'))) {
          setLoading(true);
          const msg = await setupDatabase();
          setLoading(false);
          alert(msg);
      }
  };

  return (
    <div className="fixed inset-0 bg-[#050a14] flex items-center justify-center z-[10000] font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-scum-accent/5 blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      </div>

      <div className="w-full max-w-md p-8 relative z-10">
         <div className="glass-card bg-scum-900/40 border border-scum-700/50 rounded-2xl p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5 animate-scale-in">
            <div className="text-center mb-8">
               <div className="w-16 h-16 bg-scum-800/50 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-scum-700 shadow-[0_0_20px_rgba(6,182,212,0.1)] text-2xl">
                  🔒
               </div>
               <h1 className="text-2xl font-bold text-gray-100 tracking-wider">{t('login.title')}</h1>
               <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest">{t('login.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">{t('login.identity')}</label>
                  <div className="relative group">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="text-gray-500 group-focus-within:scale-110 transition-transform" />
                     </div>
                     <input
                        type="text"
                        required
                        className="block w-full pl-10 pr-3 py-2.5 bg-black/20 border border-scum-700/50 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-scum-accent focus:bg-scum-900/50 transition-all text-sm"
                        placeholder={t('login.usernamePlaceholder')}
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                     />
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">{t('login.passcode')}</label>
                  <div className="relative group">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LockClosedIcon className="text-gray-500 group-focus-within:scale-110 transition-transform" />
                     </div>
                     <input
                        type="password"
                        required
                        className="block w-full pl-10 pr-3 py-2.5 bg-black/20 border border-scum-700/50 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-scum-accent focus:bg-scum-900/50 transition-all text-sm"
                        placeholder={t('login.passwordPlaceholder')}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                     />
                  </div>
               </div>

               {error && (
                 <div className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 p-2 rounded flex items-center justify-center text-center">
                    {error}
                 </div>
               )}

               <button
                  type="submit"
                  disabled={loading}
                  className={`
                    w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-black bg-scum-accent hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-scum-accent focus:ring-offset-scum-900 transition-all duration-200 mt-6
                    ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
                  `}
               >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                       {t('login.authenticate')} <ArrowRightOnRectangleIcon className="ml-2" />
                    </>
                  )}
               </button>
            </form>

            <div className="mt-8 pt-6 border-t border-scum-700/50 text-center flex flex-col gap-2">
               <p className="text-[10px] text-gray-600 font-mono">
                  {t('login.footer')}
               </p>
               <button 
                   onClick={handleSetup} 
                   className="text-[10px] text-scum-800 hover:text-scum-accent transition-colors font-bold uppercase tracking-widest flex items-center justify-center gap-1 mx-auto"
                   title="Initialize Database Tables"
               >
                   <CubeIcon /> {t('login.systemRepair')}
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};
