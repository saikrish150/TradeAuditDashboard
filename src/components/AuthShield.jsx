import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Lock, LogIn, Shield as ShieldIcon, LogOut, User as UserIcon } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

const AuthShield = ({ children }) => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // The institutional Terminal is locked to this specific email
  const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        if (OWNER_EMAIL && currentUser.email !== OWNER_EMAIL) {
          setError("ACCESS DENIED: Unauthorized Identity");
          signOut(auth);
          setUser(null);
        } else {
          setUser(currentUser);
          setError(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [OWNER_EMAIL]);

  const handleLogin = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login Error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError("AUTHENTICATION BLOCKED: Please enable popups in your browser and try again.");
      } else if (err.code === 'auth/configuration-not-found') {
        setError("SYSTEM CONFIGURATION ERROR: Please ensure Google Auth is enabled in your Firebase Console.");
      } else {
        setError("FAILED TO CONNECT: Institutional Identity Provider offline.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[1000] bg-[#020617] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-t-2 border-indigo-500 rounded-full animate-spin shadow-[0_0_20px_rgba(99,102,241,0.3)]" />
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Syncing Identity...</p>
      </div>
    );
  }

  if (user && (!OWNER_EMAIL || user.email === OWNER_EMAIL)) {
    return (
      <>
        {children}
        {/* Floating Logout for Owner */}
        <div className="fixed bottom-6 right-6 z-[2000] flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-white/10 p-2 pl-4 rounded-full shadow-2xl">
           <div className="flex flex-col items-end">
             <p className="text-[10px] font-black text-white italic uppercase tracking-tighter leading-none">Terminal Connected</p>
             <p className="text-[8px] text-slate-500 font-bold leading-none mt-1">{user.email}</p>
           </div>
           <button 
             onClick={() => signOut(auth)}
             className="w-10 h-10 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center transition-all border border-rose-500/20"
             title="Disconnect Terminal"
           >
             <LogOut size={18} />
           </button>
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-[#020617] flex items-center justify-center p-6 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="modern-glass p-8 md:p-12 rounded-[32px] border border-white/10 shadow-2xl shadow-indigo-500/10 text-center">
          <div className="w-24 h-24 bg-indigo-600/10 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-indigo-500/20 relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
             <Lock className="text-indigo-400 relative z-10" size={40} />
          </div>

          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none mb-2">
            Trader<span className="text-indigo-500">Dashboard</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-10">Institutional Cloud Access</p>

          <div className="space-y-4">
             <button
                onClick={handleLogin}
                className="w-full bg-white text-slate-950 font-black uppercase tracking-widest py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
             >
                <div className="w-6 h-6 bg-slate-950 rounded flex items-center justify-center">
                   <LogIn size={14} className="text-white" />
                </div>
                Connect with Google
             </button>

             <AnimatePresence>
                {error && (
                  <Motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 mt-4"
                  >
                    <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" size={16} />
                    <div className="text-left">
                       <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">Access Error</p>
                       <p className="text-[11px] text-rose-300/80 font-bold leading-tight">{error}</p>
                    </div>
                  </Motion.div>
                )}
             </AnimatePresence>
          </div>

          <div className="mt-12 flex flex-col gap-4 text-center">
            <div className="flex items-center justify-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-widest">
              <ShieldCheck size={12} className="text-slate-700" /> Biometric Identity Verification Active
            </div>
            <p className="text-[9px] text-slate-600 font-bold uppercase leading-relaxed px-4">
              This terminal is locked to the Master Institutional Identity. 
              Only verified Google accounts with administrative clearance can modify trade records.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-slate-900/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-800/50">
               <ShieldIcon size={12} className="text-indigo-400" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{OWNER_EMAIL || "Unassigned Master Identity"}</span>
            </div>
        </div>
      </Motion.div>
    </div>
  );
};

export default AuthShield;
