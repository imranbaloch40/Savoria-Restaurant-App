import React from 'react';
import { 
  UtensilsCrossed, 
  Search, 
  CalendarCheck2, 
  ClipboardList, 
  ShoppingBag 
} from 'lucide-react';
import { useCart } from '../context/CartContext';

interface MobileBottomNavProps {
  activeTab: 'menu' | 'search' | 'book' | 'bookings';
  setActiveTab: (tab: 'menu' | 'search' | 'book' | 'bookings') => void;
  onOpenBooking: () => void;
  onOpenMyBookings: () => void;
  onFocusSearch: () => void;
  bookingsCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenBooking,
  onOpenMyBookings,
  onFocusSearch,
  bookingsCount
}) => {
  const { totalItems, setIsCartOpen } = useCart();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800/90 py-2 safe-area-bottom">
      <div className="max-w-md mx-auto px-4 grid grid-cols-5 items-center justify-items-center text-center">
        
        {/* Menu Tab */}
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center gap-1 p-1 transition-colors ${
            activeTab === 'menu' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <UtensilsCrossed className="w-5 h-5" />
          <span className="text-[10px]">Menu</span>
        </button>

        {/* Search Tab */}
        <button
          onClick={() => {
            setActiveTab('search');
            onFocusSearch();
          }}
          className={`flex flex-col items-center gap-1 p-1 transition-colors ${
            activeTab === 'search' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px]">Search</span>
        </button>

        {/* Central Book Button */}
        <button
          onClick={onOpenBooking}
          className="relative -top-4 flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 font-extrabold shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
        >
          <CalendarCheck2 className="w-6 h-6" />
        </button>

        {/* My Bookings */}
        <button
          onClick={onOpenMyBookings}
          className="relative flex flex-col items-center gap-1 p-1 text-zinc-400 hover:text-white transition-colors"
        >
          <ClipboardList className="w-5 h-5" />
          {bookingsCount > 0 && (
            <span className="absolute top-0 right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-zinc-950 text-[9px] font-bold flex items-center justify-center">
              {bookingsCount}
            </span>
          )}
          <span className="text-[10px]">Bookings</span>
        </button>

        {/* Cart */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center gap-1 p-1 text-zinc-400 hover:text-white transition-colors"
        >
          <ShoppingBag className="w-5 h-5" />
          {totalItems > 0 && (
            <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold flex items-center justify-center">
              {totalItems}
            </span>
          )}
          <span className="text-[10px]">Cart</span>
        </button>

      </div>
    </div>
  );
};
