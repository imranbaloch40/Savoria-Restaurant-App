import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles,
  LogOut,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ManagerAccessPanel } from './ManagerAccessPanel';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  managerMode?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, managerMode = false }) => {
  const { userProfile, user, role, signIn, signUp, signOut, signInDemoUser, refreshRole } = useAuth();
  
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (tab === 'signin') {
      const res = await signIn(email, password);
      if (res.success) {
        setSuccessMsg('Signed in successfully!');
        setTimeout(() => onClose(), 800);
      } else {
        setError(res.error || 'Failed to sign in');
      }
    } else {
      if (!name.trim()) {
        setError('Please enter your full name');
        setLoading(false);
        return;
      }
      const res = await signUp(email, password, name, phone);
      if (res.success) {
        setSuccessMsg('Account created successfully!');
        setTimeout(() => onClose(), 800);
      } else {
        setError(res.error || 'Failed to create account');
      }
    }
    setLoading(false);
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    await signInDemoUser();
    setSuccessMsg('Logged in as VIP Guest Alex Montgomery!');
    setTimeout(() => onClose(), 800);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {userProfile ? (
          /* Profile Details Screen */
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-zinc-950 font-extrabold text-2xl mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
              {userProfile.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>

            <div>
              <h3 className="font-serif-display text-2xl font-bold text-white">
                {userProfile.displayName}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                {userProfile.email}
              </p>
              {userProfile.phoneNumber && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  {userProfile.phoneNumber}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-left text-xs space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Account Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authenticated</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>User ID</span>
                <span className="font-mono text-[11px] text-zinc-300 truncate max-w-[150px]">
                  {userProfile.uid}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {(role === 'admin' || role === 'manager') && (
                <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-semibold text-amber-300">
                  {role === 'admin' ? 'Administrator access is active.' : 'Approved manager access is active.'}
                </p>
              )}
              <button
                onClick={handleSignOut}
                className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
            {user && role === 'customer' && (
              <ManagerAccessPanel
                uid={user.uid}
                defaultName={userProfile.displayName}
                phone={userProfile.phoneNumber || ''}
                refreshRole={refreshRole}
              />
            )}
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <div className="space-y-5">
            {/* Header */}
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Firebase Authentication</span>
              </div>
              <h3 className="font-serif-display text-2xl font-bold text-white">
                {managerMode
                  ? 'Manager / Admin Sign In'
                  : tab === 'signin' ? 'Welcome Back to Savoria' : 'Create Your Dining Account'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {managerMode
                  ? 'Sign in with an approved Firebase manager account. New manager accounts require administrator approval.'
                  : 'Save favorites, track reservations & enjoy chef table perks'}
              </p>
            </div>

            {/* Tab switch */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => { setTab('signin'); setError(''); }}
                className={`py-2 rounded-lg font-semibold transition-all ${
                  tab === 'signin' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setTab('signup'); setError(''); }}
                className={`py-2 rounded-lg font-semibold transition-all ${
                  tab === 'signup' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error / Success message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {tab === 'signup' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-300 block">Full Name</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Imran Khan"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-zinc-300 block">Phone Number (Optional)</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs text-zinc-300 block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-300 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-98 transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : tab === 'signin' ? 'Sign In to Account' : 'Register Account'}
              </button>
            </form>

            {/* Quick Demo Test Mode */}
            {!managerMode && <div className="pt-2 border-t border-zinc-800 text-center">
              <span className="text-[11px] text-zinc-500 block mb-2">Want to test immediately?</span>
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-amber-300 border border-zinc-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant VIP Guest Login (1-Click Demo)</span>
              </button>
            </div>}

          </div>
        )}

      </div>
    </div>
  );
};
