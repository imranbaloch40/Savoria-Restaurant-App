import React from 'react';
import { Star, Plus, Check, Flame, Award, ChevronRight } from 'lucide-react';
import { FoodItem } from '../types/restaurant';
import { useCart } from '../context/CartContext';

interface HorizontalFoodScrollerProps {
  title: string;
  subtitle?: string;
  items: FoodItem[];
  onOpenDetail: (item: FoodItem) => void;
}

export const HorizontalFoodScroller: React.FC<HorizontalFoodScrollerProps> = ({
  title,
  subtitle,
  items = [],
  onOpenDetail
}) => {
  const { addToCart } = useCart();
  const [addedId, setAddedId] = React.useState<string | null>(null);

  const handleQuickAdd = (e: React.MouseEvent, item: FoodItem) => {
    e.stopPropagation();
    addToCart(item, 1);
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 1000);
  };

  if (!items.length) return null;

  return (
    <div className="py-2 space-y-2.5">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>{title}</span>
          </h3>
          {subtitle && (
            <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <span className="text-[11px] text-amber-400 font-medium flex items-center gap-0.5">
          <span>Swipe</span>
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>

      {/* Horizontal Scroller Container */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-4 px-4 snap-x snap-mandatory">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onOpenDetail(item)}
            className="w-52 sm:w-56 flex-shrink-0 snap-start bg-zinc-900 border border-zinc-800/90 hover:border-amber-500/40 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 active:scale-95 shadow-md flex flex-col justify-between"
          >
            {/* Image */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-950">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-black/30" />

              {/* Badges */}
              <div className="absolute top-2 left-2 flex items-center gap-1">
                {item.isChefSpecial && (
                  <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[9px] font-extrabold uppercase">
                    <Award className="w-2.5 h-2.5" />
                    <span>Special</span>
                  </span>
                )}
              </div>

              <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-amber-400">
                <Star className="w-3 h-3 fill-amber-400" />
                <span>{item.rating.toFixed(1)}</span>
              </div>

              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-zinc-300 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
                <Flame className="w-2.5 h-2.5 text-rose-400" />
                <span>{item.calories} kcal</span>
              </div>
            </div>

            {/* Info */}
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-xs text-white line-clamp-1">
                  {item.name}
                </h4>
                <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-800/80">
                <span className="font-bold text-sm text-amber-400 font-serif-display">
                  ${item.price.toFixed(2)}
                </span>
                <button
                  onClick={(e) => handleQuickAdd(e, item)}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold transition-all active:scale-90 ${
                    addedId === item.id
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                  }`}
                >
                  {addedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};
