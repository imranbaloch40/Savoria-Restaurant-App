import React, { useState } from 'react';
import { 
  X, 
  Star, 
  Clock, 
  Flame, 
  Minus, 
  Plus, 
  Check, 
  AlertTriangle, 
  Award, 
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { FoodItem } from '../types/restaurant';
import { useCart } from '../context/CartContext';

interface FoodModalProps {
  item: FoodItem | null;
  onClose: () => void;
}

export const FoodModal: React.FC<FoodModalProps> = ({ item, onClose }) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [added, setAdded] = useState(false);

  if (!item) return null;

  const handleAddToCart = () => {
    addToCart(item, quantity, instructions.trim() || undefined);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 800);
  };

  const totalPrice = (item.price * quantity).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white backdrop-blur-md border border-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Image */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-zinc-950 flex-shrink-0">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/30" />

          {/* Badges on image */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.isChefSpecial && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 text-zinc-950 text-xs font-bold uppercase tracking-wider">
                  <Award className="w-3.5 h-3.5" />
                  <span>Chef's Signature</span>
                </span>
              )}
              {item.isPopular && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-900/90 text-amber-300 text-xs font-bold border border-amber-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Guest Favorite</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white text-xs font-semibold">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{item.rating.toFixed(1)}</span>
              <span className="text-zinc-400">({item.reviewsCount})</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header Title & Price */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-white mb-1">
                {item.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{item.prepTime} preparation</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>{item.calories} Calories</span>
                </span>
                {item.spicyLevel ? (
                  <>
                    <span>•</span>
                    <span className="text-rose-400 font-medium">
                      Spice level: {'🌶️'.repeat(item.spicyLevel)}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-zinc-400 block font-light">Price each</span>
              <span className="font-serif-display text-2xl font-bold text-amber-400">
                ${item.price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-zinc-300 text-sm leading-relaxed">
            {item.description}
          </p>

          {/* Dietary tags */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Dietary & Lifestyle</h4>
            <div className="flex flex-wrap gap-1.5">
              {item.dietary.map((d) => (
                <span
                  key={d}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-amber-300 border border-zinc-700/60"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Fresh Ingredients</h4>
            <div className="flex flex-wrap gap-1.5">
              {item.ingredients.map((ing) => (
                <span
                  key={ing}
                  className="px-2.5 py-1 rounded-lg text-xs bg-zinc-800/80 text-zinc-300 border border-zinc-700/40"
                >
                  {ing}
                </span>
              ))}
            </div>
          </div>

          {/* Allergens warning */}
          {item.allergens && item.allergens.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>Contains: {item.allergens.join(', ')}</span>
            </div>
          )}

          {/* Special Preparation Instructions */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
              Special Instructions for the Chef (Optional)
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Extra dressing, sauce on the side, no onions..."
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

        </div>

        {/* Modal Footer (Quantity + Add to Cart) */}
        <div className="p-4 sm:p-6 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between gap-4 sticky bottom-0">
          
          {/* Quantity Selector */}
          <div className="flex items-center gap-3 bg-zinc-800 rounded-2xl p-1.5 border border-zinc-700">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-white text-base min-w-[20px] text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white flex items-center justify-center transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base transition-all duration-200 active:scale-95 ${
              added
                ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-xl shadow-amber-500/20'
            }`}
          >
            {added ? (
              <>
                <Check className="w-5 h-5" />
                <span>Added to Order</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5 text-zinc-950" />
                <span>Add {quantity} to Order • ${totalPrice}</span>
              </>
            )}
          </button>

        </div>

      </div>
    </div>
  );
};
