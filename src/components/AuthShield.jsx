import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, ShieldCheck, Lock, LogIn, Shield as ShieldIcon, 
  LogOut, User as UserIcon, Mail, Key, UserPlus, ArrowRight,
  Loader2, CheckCircle2
} from 'lucide-react';
import { authService } from '../services/authService';

const AuthShield = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Check initial session
    authService.getSession().then(session => {
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const subscription = authService.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user || null);
      if (event === 'SIGNED_IN') {
        setError(null);
        setSuccess(null);
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await authService.signIn(email, password);
      } else {
        await authService.signUp(email, password);
        setSuccess("INTEGRITY VERIFIED: Verification link sent to your inbox.");
      }
    } catch (err) {
      console.error("Auth Error:", err);
      let message = err.message;
      if (message.includes('Invalid login credentials')) {
        message = "ACCESS DENIED: Credentials mismatch in master registry.";
      } else if (message.includes('Email not confirmed')) {
        message = "PENDING CLEARANCE: Please verify your email identity.";
      }
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[1000] bg-[#020617] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-t-2 border-indigo-500 rounded-full animate-spin shadow-[0_0_30px_rgba(99,102,241,0.2)]" />
          <ShieldIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400/50 animate-pulse" size={24} />
        </div>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Establishing Secure Session...</p>
      </div>
    );
  }

  if (user) return children;

  return (
    <div className="fixed inset-0 z-[1000] bg-[#020617] flex items-center justify-center p-6 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], x: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[150px]" 
        />
        <Motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2], x: [0, -70, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px]" 
        />
      </div>

      <Motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-[450px] w-full relative z-10"
      >
        <div className="modern-glass p-8 md:p-12 rounded-[40px] border border-white/10 shadow-2xl shadow-indigo-500/10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-indigo-500/20 relative group">
               <div className="absolute inset-0 bg-indigo-500/5 rounded-3xl blur-xl group-hover:bg-indigo-500/10 transition-all" />
               <Lock className="text-indigo-400 relative z-10" size={32} />
            </div>

            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none mb-2">
              Trader<span className="text-indigo-500">Dashboard</span>
            </h2>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] mb-2">Multi-User Terminal Access</p>
            <div className="h-px w-12 bg-indigo-500/30 mx-auto mt-4" />
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Identity (Email)</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input 
                  type="email" 
                  required
                  placeholder="name@firm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 focus:border-indigo-500/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white outline-none transition-all placeholder:text-slate-700"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Terminal Key (Password)</label>
              <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 focus:border-indigo-500/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white outline-none transition-all placeholder:text-slate-700"
                />
              </div>
            </div>

            {/* Error/Success Feedbacks */}
            <AnimatePresence>
              {error && (
                <Motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3"
                >
                  <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" size={16} />
                  <p className="text-[11px] text-rose-300/80 font-bold leading-tight uppercase tracking-tight">{error}</p>
                </Motion.div>
              )}
              {success && (
                <Motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3"
                >
                  <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                  <p className="text-[11px] text-emerald-300/80 font-bold leading-tight uppercase tracking-tight">{success}</p>
                </Motion.div>
              )}
            </AnimatePresence>

            {/* Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-wait mt-4 group"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                  <span>{mode === 'login' ? 'Establish Connection' : 'Register Identity'}</span>
                  <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-8 text-center">
            <button 
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccess(null); }}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors"
            >
              {mode === 'login' ? "New operative? Create credentials" : "Already registered? Switch to login"}
            </button>
          </div>

          {/* Aesthetic Footer */}
          <div className="mt-12 flex flex-col gap-4 text-center border-t border-white/5 pt-8">
            <div className="flex items-center justify-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-widest">
              <ShieldCheck size={12} className="text-slate-700" /> AES-256 Multi-User Encryption Active
            </div>
            <p className="text-[8px] text-slate-700 font-bold uppercase leading-relaxed px-4">
              Access to this terminal is strictly controlled. Unauthorized attempts are logged and analyzed by the institutional security layer.
            </p>
          </div>
        </div>
      </Motion.div>
    </div>
  );
};

export default AuthShield;
