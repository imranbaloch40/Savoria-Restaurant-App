import React from 'react';
import { CalendarCheck2, Clock, MapPin, Sparkles } from 'lucide-react';

interface HeroBannerProps {
  onOpenBooking: () => void;
  onScrollToMenu: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onOpenBooking
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800/80 mb-4 shadow-lg">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80')`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-5 flex flex-col justify-between min-h-[160px]">
        
        {/* Top Tag */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Michelin Selected 2026</span>
          </span>

          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>12:00 PM – 11:30 PM</span>
          </span>
        </div>

        {/* Headline */}
        <div className="my-2">
          <h2 className="font-serif-display text-lg sm:text-xl font-bold text-white leading-tight">
            Artisanal Culinary & Intimate Dining
          </h2>
          <p className="text-[11px] text-zinc-300 line-clamp-1 mt-0.5">
            Handcrafted pasta, dry-aged steaks & terrace tables
          </p>
        </div>

        {/* Quick Action */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
            <MapPin className="w-3 h-3 text-amber-400" />
            <span className="truncate max-w-[170px]">Grand Promenade, Suite 400</span>
          </div>

          <button
            onClick={onOpenBooking}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-3 py-1.5 rounded-xl text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all"
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>Book Table</span>
          </button>
        </div>

      </div>
    </div>
  );
};
