import React, { useState } from 'react';
import { Star, Plus, Check } from 'lucide-react';
import { FoodItem } from '../types/restaurant';
import { useCart } from '../context/CartContext';

interface FoodCardProps {
  item: FoodItem;
  onOpenDetail: (item: FoodItem) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ item, onOpenDetail }) => {
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(item, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1000);
  };

  return (
    <div
      onClick={() => onOpenDetail(item)}
      className="group relative flex flex-col bg-zinc-900 border border-zinc-800/90 hover:border-amber-500/40 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.98] shadow-sm"
    >
      {/* Dish Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-950">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-black/20" />

        {/* Rating Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-bold text-amber-400">
          <Star className="w-3 h-3 fill-amber-400" />
          <span>{item.rating.toFixed(1)}</span>
        </div>

        {/* Prep Time pill */}
        <div className="absolute bottom-2 left-2 text-[10px] font-medium text-zinc-300 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
          {item.prepTime}
        </div>
      </div>

      {/* Info Container */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          {/* Dietary tags */}
          <div className="flex items-center gap-1 mb-1">
            {item.dietary.slice(0, 1).map((d) => (
              <span
                key={d}
                className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 truncate"
              >
                {d}
              </span>
            ))}
            {item.spicyLevel && item.spicyLevel > 0 ? (
              <span className="text-[10px]">{'🌶️'.repeat(item.spicyLevel)}</span>
            ) : null}
          </div>

          {/* Dish Name */}
          <h3 className="font-semibold text-xs sm:text-sm text-zinc-100 line-clamp-1 leading-snug">
            {item.name}
          </h3>

          {/* Description snippet */}
          <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
            {item.description}
          </p>
        </div>

        {/* Price & Add Button */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-800/80">
          <span className="font-bold text-sm sm:text-base text-amber-400 font-serif-display">
            ${item.price.toFixed(2)}
          </span>

          <button
            onClick={handleQuickAdd}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-bold transition-all active:scale-90 ${
              justAdded
                ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-sm shadow-amber-500/20'
            }`}
          >
            {justAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

      </div>
    </div>
  );
};
