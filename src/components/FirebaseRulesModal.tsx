import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ShieldCheck, 
  Database, 
  ExternalLink, 
  Layers, 
  KeyRound,
  FileCode2,
  RefreshCw
} from 'lucide-react';
import { seedMenuToFirestore } from '../services/restaurantService';
import firestoreRules from '../../firestore.rules?raw';

interface FirebaseRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshMenu?: () => void;
}

export const FirebaseRulesModal: React.FC<FirebaseRulesModalProps> = ({
  isOpen,
  onClose,
  onRefreshMenu
}) => {
  const [copied, setCopied] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const rulesCode = firestoreRules;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(rulesCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSeedMenu = async () => {
    setSeeding(true);
    setSeedResult(null);
    const res = await seedMenuToFirestore();
    if (res.success) {
      setSeedResult(`Successfully seeded ${res.count} items into your Firestore!`);
      if (onRefreshMenu) onRefreshMenu();
    } else {
      setSeedResult(`Notice: ${res.error || 'Check rules code in Firebase Console.'}`);
    }
    setSeeding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif-display text-xl sm:text-2xl font-bold text-white">
                Firebase Setup & Security Rules
              </h2>
              <p className="text-xs text-zinc-400">
                Connected project: <span className="font-mono text-amber-400 font-bold">resturent-6210f</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-6 flex-1 text-xs">
          
          {/* Quick Setup Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-center leading-5 text-[11px]">1</span>
                <span>Firestore Rules</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Copy the rules below, go to <strong className="text-zinc-200">Firebase Console &gt; Firestore &gt; Rules</strong>, paste and hit <strong className="text-zinc-200">Publish</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-center leading-5 text-[11px]">2</span>
                <span>Email/Password Auth</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                In Firebase Console &gt; <strong className="text-zinc-200">Authentication &gt; Sign-in method</strong>, enable <strong className="text-zinc-200">Email/Password</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-center leading-5 text-[11px]">3</span>
                <span>Seed Menu Data</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Click the seed button below to instantly populate your Firestore database with the 16 dishes!
              </p>
            </div>
          </div>

          {/* Seed Menu Action Button */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-950 to-zinc-950 border border-emerald-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-emerald-300 text-sm flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Instant Firestore Menu Seeding</span>
              </h4>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Writes all 16 artisanal dishes directly to your Firestore `foodItems` collection.
              </p>
              {seedResult && (
                <p className="text-xs text-amber-300 font-medium mt-1">{seedResult}</p>
              )}
            </div>
            <button
              onClick={handleSeedMenu}
              disabled={seeding}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex-shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
              <span>{seeding ? 'Seeding...' : 'Seed 16 Dishes to Firestore'}</span>
            </button>
          </div>

          {/* Code Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-zinc-200">firestore.rules (Ready for Firebase Console)</span>
              </div>
              <button
                onClick={handleCopyRules}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-all active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Rules Code</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 selection:bg-amber-500 selection:text-black">
              {rulesCode}
            </pre>
          </div>

          {/* Collections Schema Summary */}
          <div className="space-y-2">
            <h4 className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Firestore Collections Schema</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <strong className="text-amber-400 font-mono">/users/{'{userId}'}</strong>
                <p className="text-zinc-400 mt-1">User profile: displayName, email, phoneNumber, createdAt</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <strong className="text-amber-400 font-mono">/foodItems/{'{itemId}'}</strong>
                <p className="text-zinc-400 mt-1">Menu dishes: name, price, category, rating, image, dietary</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <strong className="text-amber-400 font-mono">/reservations/{'{reservationId}'}</strong>
                <p className="text-zinc-400 mt-1">Table bookings: customerName, date, time, guests, seatingArea, reference</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <strong className="text-amber-400 font-mono">/orders/{'{orderId}'}</strong>
                <p className="text-zinc-400 mt-1">Owner-scoped orders with UID, delivery details, items, totals, status, and audit history</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <strong className="text-amber-400 font-mono">/managerApplications/{'{uid}'}</strong>
                <p className="text-zinc-400 mt-1">Private manager requests and administrator review state</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <strong className="text-amber-400 font-mono">/menuSettings/default</strong>
                <p className="text-zinc-400 mt-1">Tracks intentional menu initialization, including an empty menu</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
          <a
            href="https://console.firebase.google.com/project/resturent-6210f/firestore/rules"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium"
          >
            <span>Open Firebase Console Rules Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};
