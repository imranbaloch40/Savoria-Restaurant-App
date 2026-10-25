

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Capacitor, SystemBarType, SystemBars } from '@capacitor/core';
import { getRoleLandingPage } from './firebase/authorization';
import { 
  AuthProvider, 
  useAuth 
} from './context/AuthContext';
import { 
  CartProvider, 
  useCart 
} from './context/CartContext';
import { 
  CategoryId, 
  DietaryTag, 
  FoodItem, 
  Reservation 
} from './types/restaurant';
import { 
  getFoodItems, 
  getUserReservations 
} from './services/restaurantService';
import { subscribeToReservations } from './services/managerService';

import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { HorizontalFoodScroller } from './components/HorizontalFoodScroller';
import { SearchAndFilter } from './components/SearchAndFilter';
import { FoodCard } from './components/FoodCard';
import { FoodModal } from './components/FoodModal';
import { ReservationModal } from './components/ReservationModal';
import { MyBookingsModal } from './components/MyBookingsModal';
import { CartDrawer } from './components/CartDrawer';
import { AuthModal } from './components/AuthModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ManagerDashboard } from './components/ManagerDashboard';
import { CustomerOrdersPanel } from './components/CustomerOrdersPanel';

import { UtensilsCrossed } from 'lucide-react';

function RestaurantAppContent() {
  const { user, role, loading: authLoading, roleResolutionError, refreshRole } = useAuth();
  const { totalItems } = useCart();

  // Data states
  const [items, setItems] = useState<FoodItem[]>([]);
  const [menuSource, setMenuSource] = useState<'firestore' | 'local'>('local');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [selectedDietary, setSelectedDietary] = useState<DietaryTag[]>([]);
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'price-asc' | 'price-desc' | 'preptime'>('recommended');

  // Modal states
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isMyBookingsOpen, setIsMyBookingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [managerLoginMode, setManagerLoginMode] = useState(false);
  const [selectedFoodDetail, setSelectedFoodDetail] = useState<FoodItem | null>(null);
  const [activePage, setActivePage] = useState<'restaurant' | 'manager' | 'orders'>('restaurant');

  // Mobile Bottom Navigation Tab
  const [mobileTab, setMobileTab] = useState<'menu' | 'search' | 'book' | 'bookings'>('menu');

  const searchInputRef = useRef<HTMLDivElement>(null);
  const roleLandingPage = getRoleLandingPage(
    Boolean(user),
    role,
    authLoading,
    roleResolutionError
  );

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    void SystemBars.hide({ bar: SystemBarType.StatusBar }).catch(error => {
      console.warn('Could not hide the Android status bar.', error);
    });
  }, []);

  useEffect(() => {
    if (roleLandingPage === 'manager') {
      setActivePage('manager');
    } else if (roleLandingPage === 'restaurant') {
      setActivePage(current => current === 'manager' ? 'restaurant' : current);
    }
  }, [roleLandingPage]);

  // Initial load of food items
  const loadMenuData = async () => {
    setLoading(true);
    const { items: loadedItems, source } = await getFoodItems();
    setItems(loadedItems);
    setMenuSource(source);
    setLoading(false);
  };

  // Initial load of reservations
  const loadReservations = async () => {
    if (!user) {
      setReservations([]);
      return;
    }
    try {
      setReservations(await getUserReservations(user.uid));
    } catch (error) {
      console.warn('Could not load customer reservations.', error);
    }
  };

  useEffect(() => {
    loadMenuData();
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) {
      setReservations([]);
      return () => { active = false; };
    }

    void getUserReservations(user.uid)
      .then(list => { if (active) setReservations(list); })
      .catch(error => console.warn('Could not load customer reservations.', error));
    const unsubscribe = subscribeToReservations(
      list => {
        if (active) {
          setReservations(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      },
      error => console.warn('Could not watch customer reservations.', error.message),
      user.uid
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.uid]);

  // Dietary toggle handler
  const toggleDietary = (tag: DietaryTag) => {
    setSelectedDietary(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Reset filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedDietary([]);
    setSortBy('recommended');
  };

  const hasActiveFilters = Boolean(
    searchQuery || 
    selectedCategory !== 'all' || 
    selectedDietary.length > 0 || 
    sortBy !== 'recommended'
  );

  // Featured / Chef's special items for the horizontal scroller
  const featuredItems = useMemo(() => {
    return items.filter(item => item.isChefSpecial || item.isPopular || item.rating >= 4.9);
  }, [items]);

  // Filtered & sorted menu items for the 2-column grid
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (item.available === false) return false;
      // 1. Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchIng = item.ingredients?.some(ing => ing.toLowerCase().includes(q));
        const matchTag = item.dietary?.some(tag => tag.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchIng && !matchTag) {
          return false;
        }
      }

      // 3. Dietary filters
      if (selectedDietary.length > 0) {
        const hasAllTags = selectedDietary.every(d => item.dietary?.includes(d));
        if (!hasAllTags) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'preptime') {
        const getMins = (str: string) => parseInt(str) || 0;
        return getMins(a.prepTime) - getMins(b.prepTime);
      }
      if (a.isChefSpecial && !b.isChefSpecial) return -1;
      if (!a.isChefSpecial && b.isChefSpecial) return 1;
      return b.rating - a.rating;
    });
  }, [items, selectedCategory, searchQuery, selectedDietary, sortBy]);

  const focusSearch = () => {
    searchInputRef.current?.scrollIntoView({ behavior: 'smooth' });
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) input.focus();
  };

  const activeReservationsCount = reservations.filter(r => r.status === 'pending' || r.status === 'confirmed').length;

  if (roleLandingPage === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-sm text-zinc-300">
        Checking your Savoria account access…
      </main>
    );
  }

  if (roleLandingPage === 'access-error') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
        <section className="max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <h1 className="font-serif-display text-xl font-bold">Could not verify account access</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Savoria could not read your manager role. Management access was not granted. Check your connection and role record, then retry.
          </p>
          <p className="mt-2 text-xs text-rose-300">Firestore error: {roleResolutionError}</p>
          <button
            onClick={() => { void refreshRole().catch(() => {}); }}
            className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950"
          >
            Retry access check
          </button>
        </section>
      </main>
    );
  }

  if (activePage === 'manager') {
    if (!user || (role !== 'admin' && role !== 'manager')) {
      return (
        <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
          <div className="mx-auto max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
            <h1 className="font-serif-display text-xl font-bold">Management access required</h1>
            <p className="mt-2 text-sm text-zinc-400">Sign in with an approved manager or administrator account to continue.</p>
            <button onClick={() => setActivePage('restaurant')} className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950">Back to Savoria</button>
          </div>
        </main>
      );
    }
    return (
      <ManagerDashboard
        uid={user.uid}
        isAdmin={role === 'admin'}
        onBack={() => setActivePage('restaurant')}
        onMenuChanged={loadMenuData}
      />
    );
  }

  if (activePage === 'orders') {
    return user
      ? <CustomerOrdersPanel uid={user.uid} onBack={() => setActivePage('restaurant')} />
      : null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 sm:bg-zinc-900/40 text-zinc-100 flex flex-col justify-start items-center">
      
      {/* Android Smartphone Container */}
      <div className="w-full max-w-md min-h-screen bg-zinc-950 flex flex-col shadow-2xl relative border-x border-zinc-900 pb-20">
        
        {/* Clean Top Navbar: Restaurant Name + Sign In */}
        <Navbar
          onOpenAuth={() => { setManagerLoginMode(false); setIsAuthOpen(true); }}
          onOpenManager={() => setActivePage('manager')}
          onOpenManagerLogin={() => { setManagerLoginMode(true); setIsAuthOpen(true); }}
          onOpenOrders={() => setActivePage('orders')}
        />

        {/* Scrollable Mobile App Body */}
        <div className="px-4 py-3 flex-1 space-y-4">
          
          {/* Promo Welcome Banner */}
          <HeroBanner
            onOpenBooking={() => setIsBookingOpen(true)}
            onScrollToMenu={focusSearch}
          />

          {menuSource === 'local' && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200">
              Sample menu preview: these items are local examples, not menu records loaded from Firestore.
            </p>
          )}

          {/* HORIZONTAL SCROLLER: Chef's Specials & Popular Picks */}
          <HorizontalFoodScroller
            title="Featured Specials"
            subtitle="Signature dishes curated by Chef Marc"
            items={featuredItems}
            onOpenDetail={setSelectedFoodDetail}
          />

          {/* Search Bar & Horizontal Category/Dietary Filters */}
          <div ref={searchInputRef}>
            <SearchAndFilter
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedDietary={selectedDietary}
              toggleDietary={toggleDietary}
              sortBy={sortBy}
              setSortBy={setSortBy}
              totalFilteredCount={filteredItems.length}
              onClearFilters={handleClearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          {/* Catalog Section Header */}
          <div className="flex items-center justify-between px-0.5 pt-1">
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Full Menu</span>
            </h3>
            <span className="text-[11px] text-zinc-400 font-medium">
              {filteredItems.length} items
            </span>
          </div>

          {/* 2 ITEMS PER LINE (grid grid-cols-2 gap-3) */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3 py-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-zinc-900 border border-zinc-800 rounded-2xl h-52" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 mx-auto flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">No dishes found</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Try another keyword or tap reset filters.
                </p>
              </div>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map(item => (
                <FoodCard
                  key={item.id}
                  item={item}
                  onOpenDetail={setSelectedFoodDetail}
                />
              ))}
            </div>
          )}

        </div>

        {/* Android Bottom Navigation Bar */}
        <MobileBottomNav
          activeTab={mobileTab}
          setActiveTab={setMobileTab}
          onOpenBooking={() => setIsBookingOpen(true)}
          onOpenMyBookings={() => setIsMyBookingsOpen(true)}
          onFocusSearch={focusSearch}
          bookingsCount={activeReservationsCount}
        />

      </div>

      {/* Modals & Android Bottom Sheets */}
      <FoodModal
        item={selectedFoodDetail}
        onClose={() => setSelectedFoodDetail(null)}
      />

      <ReservationModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onBookingConfirmed={() => {
          loadReservations();
        }}
      />

      <MyBookingsModal
        isOpen={isMyBookingsOpen}
        onClose={() => setIsMyBookingsOpen(false)}
        reservations={reservations}
        onRefresh={loadReservations}
        onOpenNewBooking={() => setIsBookingOpen(true)}
      />

      <CartDrawer onRequireAuth={() => setIsAuthOpen(true)} />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        managerMode={managerLoginMode}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <RestaurantAppContent />
      </CartProvider>
    </AuthProvider>
  );
}
