import React from 'react';
import { 
  Search, 
  X, 
  SlidersHorizontal, 
  Sparkles, 
  Leaf, 
  Flame, 
  Award, 
  ArrowUpDown
} from 'lucide-react';
import { CategoryId, DietaryTag } from '../types/restaurant';
import { CATEGORIES } from '../data/seedData';

interface SearchAndFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: CategoryId;
  setSelectedCategory: (cat: CategoryId) => void;
  selectedDietary: DietaryTag[];
  toggleDietary: (tag: DietaryTag) => void;
  sortBy: 'recommended' | 'rating' | 'price-asc' | 'price-desc' | 'preptime';
  setSortBy: (sort: 'recommended' | 'rating' | 'price-asc' | 'price-desc' | 'preptime') => void;
  totalFilteredCount: number;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const DIETARY_OPTIONS: { tag: DietaryTag; icon: React.ReactNode; label: string }[] = [
  { tag: 'Chef Special', icon: <Award className="w-3 h-3 text-amber-400" />, label: "Special" },
  { tag: 'Vegetarian', icon: <Leaf className="w-3 h-3 text-emerald-400" />, label: 'Veg' },
  { tag: 'Vegan', icon: <Leaf className="w-3 h-3 text-green-400" />, label: 'Vegan' },
  { tag: 'Gluten-Free', icon: <Sparkles className="w-3 h-3 text-sky-400" />, label: 'GF' },
  { tag: 'Halal', icon: <Sparkles className="w-3 h-3 text-teal-400" />, label: 'Halal' },
  { tag: 'Spicy', icon: <Flame className="w-3 h-3 text-rose-400" />, label: 'Spicy' },
];

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedDietary,
  toggleDietary,
  sortBy,
  setSortBy,
  totalFilteredCount,
  onClearFilters,
  hasActiveFilters
}) => {
  return (
    <div className="space-y-3 mb-4">
      
      {/* Mobile Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search food, dishes, ingredients..."
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-amber-500 transition-all shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Horizontal Scroller for Categories */}
      <div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5 -mx-4 px-4">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal Scroller for Dietary Filters + Sort */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {DIETARY_OPTIONS.map((item) => {
            const isSelected = selectedDietary.includes(item.tag);
            return (
              <button
                key={item.tag}
                onClick={() => toggleDietary(item.tag)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sort selector */}
        <div className="relative flex-shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="appearance-none pl-6 pr-6 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] font-medium focus:outline-none focus:border-amber-500"
          >
            <option value="recommended">⭐ Top</option>
            <option value="rating">Rating</option>
            <option value="price-asc">Price: Low</option>
            <option value="price-desc">Price: High</option>
            <option value="preptime">Quick</option>
          </select>
          <ArrowUpDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-400 pointer-events-none" />
        </div>
      </div>

      {/* Filter status row */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
          <span>{totalFilteredCount} items found</span>
          <button
            onClick={onClearFilters}
            className="text-amber-400 hover:text-amber-300 font-medium"
          >
            Reset filters
          </button>
        </div>
      )}

    </div>
  );
};
