import React from 'react';
import { ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, ClipboardList } from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenManager: () => void;
  onOpenManagerLogin: () => void;
  onOpenOrders: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onOpenManager, onOpenManagerLogin, onOpenOrders }) => {
  const { userProfile, user, role } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        
        {/* Restaurant Name */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center font-bold text-zinc-950 text-base shadow-sm">
            S
          </div>
          <span className="font-serif-display text-xl font-extrabold tracking-wide text-white">
            SAVORIA
          </span>
        </div>

        {/* Sign In / User Profile */}
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={onOpenOrders}
              className="flex items-center gap-1.5 rounded-full border border-zinc-800 px-2.5 py-1.5 text-[10px] font-semibold text-zinc-300 hover:border-amber-500/50 hover:text-white"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">My Orders</span>
            </button>
          )}
          {(role === 'admin' || role === 'manager') && (
            <button
              onClick={onOpenManager}
              className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/20"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Management</span>
            </button>
          )}
          {!user && (
            <button
              onClick={onOpenManagerLogin}
              className="flex items-center gap-1 rounded-full border border-zinc-800 px-2.5 py-1.5 text-[10px] font-semibold text-zinc-300 hover:border-amber-500/50 hover:text-white"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Manager</span>
            </button>
          )}
          {userProfile ? (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 text-zinc-200 transition-all active:scale-95"
            >
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                {userProfile.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-semibold max-w-[90px] truncate">
                {userProfile.displayName || 'Profile'}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
