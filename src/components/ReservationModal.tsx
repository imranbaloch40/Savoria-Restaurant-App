import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  Heart, 
  Briefcase, 
  PartyPopper, 
  Phone, 
  Mail, 
  User as UserIcon,
  Wine,
  ShieldCheck,
  CalendarCheck2
} from 'lucide-react';
import { SeatingArea, DiningOccasion, Reservation } from '../types/restaurant';
import { createReservation } from '../services/restaurantService';
import { useAuth } from '../context/AuthContext';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingConfirmed: (reservation: Reservation) => void;
}

const SEATING_AREAS: { area: SeatingArea; desc: string; icon: string }[] = [
  { area: 'Main Dining Hall', desc: 'Warm chandeliers & live acoustic ambient jazz', icon: '🏛️' },
  { area: 'Romantic Terrace', desc: 'Candlelit al fresco tables with garden breeze', icon: '🌿' },
  { area: 'Rooftop Sky Lounge', desc: 'Panoramic downtown skyline night views', icon: '✨' },
  { area: 'Chef Table & Counter', desc: 'Front-row culinary view of the flame kitchen', icon: '🔥' },
  { area: 'VIP Private Suite', desc: 'Exclusive dining room with private sommelier', icon: '🍷' },
];

const TIME_SLOTS = [
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM'
];

const OCCASIONS: { name: DiningOccasion; icon: React.ReactNode }[] = [
  { name: 'Casual Dining', icon: <Wine className="w-4 h-4 text-amber-400" /> },
  { name: 'Date Night', icon: <Heart className="w-4 h-4 text-rose-400" /> },
  { name: 'Birthday Celebration', icon: <PartyPopper className="w-4 h-4 text-yellow-400" /> },
  { name: 'Romantic Anniversary', icon: <Sparkles className="w-4 h-4 text-pink-400" /> },
  { name: 'Business Dinner', icon: <Briefcase className="w-4 h-4 text-sky-400" /> },
];

export const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  onBookingConfirmed
}) => {
  const { userProfile, user } = useAuth();

  // Form states
  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('07:30 PM');
  const [seatingArea, setSeatingArea] = useState<SeatingArea>('Romantic Terrace');
  const [occasion, setOccasion] = useState<DiningOccasion>('Casual Dining');
  const [customerName, setCustomerName] = useState(userProfile?.displayName || '');
  const [customerEmail, setCustomerEmail] = useState(userProfile?.email || user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(userProfile?.phoneNumber || '+1 ');
  const [specialRequests, setSpecialRequests] = useState('');
  
  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Reservation | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // Set quick date helpers
  const handleQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address for confirmation');
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 6) {
      setErrorMessage('Please enter a contact phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createReservation({
        userId: user?.uid || null,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        date,
        time,
        guests,
        seatingArea,
        occasion,
        specialRequests: specialRequests.trim() || undefined
      });

      setConfirmedBooking(res);
      onBookingConfirmed(res);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }

    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to book table. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setConfirmedBooking(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Confirmation Screen */}
        {confirmedBooking ? (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-amber-400">Request Submitted</span>
              <h2 className="font-serif-display text-3xl font-bold text-white mt-1">Awaiting Restaurant Confirmation</h2>
              <p className="text-zinc-400 text-sm mt-2 max-w-md mx-auto">
                Your reservation request is recorded for <strong className="text-white">{confirmedBooking.customerName}</strong>. The restaurant will confirm your table shortly.
              </p>
            </div>

            {/* Ticket Card */}
            <div className="max-w-md mx-auto bg-zinc-950 border border-amber-500/30 rounded-2xl p-5 text-left relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Booking Reference</span>
                  <span className="font-mono text-lg font-bold text-amber-400">{confirmedBooking.bookingReference}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Table Assignment</span>
                  <span className="font-mono text-base font-bold text-white">{confirmedBooking.tableNumber || 'Pending'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                <div>
                  <span className="text-zinc-400 block">Date & Time</span>
                  <span className="font-semibold text-zinc-200">{confirmedBooking.date} • {confirmedBooking.time}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block">Party Size</span>
                  <span className="font-semibold text-zinc-200">{confirmedBooking.guests} Guests</span>
                </div>
                <div>
                  <span className="text-zinc-400 block">Atmosphere / Seating</span>
                  <span className="font-semibold text-zinc-200">{confirmedBooking.seatingArea}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block">Occasion</span>
                  <span className="font-semibold text-zinc-200">{confirmedBooking.occasion}</span>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 pt-3 border-t border-zinc-800/80 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Saved securely to Firestore `reservations/{confirmedBooking.id}`</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleClose}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all"
              >
                Done & Return to Menu
              </button>
            </div>
          </div>
        ) : (
          /* Booking Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
                <CalendarCheck2 className="w-4 h-4" />
                <span>Instant Table Reservation</span>
              </div>
              <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-white">
                Book Your Dining Experience
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Directly connected to Firebase database. Choose your party size, preferred atmosphere, and time.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            {/* 1. Party Size */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                <span>Party Size (Number of Guests)</span>
                <span className="text-amber-400 font-bold">{guests} {guests === 1 ? 'Guest' : 'Guests'}</span>
              </label>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGuests(num)}
                    className={`w-11 h-11 rounded-2xl font-bold text-sm flex-shrink-0 transition-all ${
                      guests === num
                        ? 'bg-amber-500 text-zinc-950 font-extrabold shadow-md shadow-amber-500/20 scale-105'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Date Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Dining Date</span>
              </label>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDate(0)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                    date === new Date().toISOString().split('T')[0]
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(1)}
                  className="py-2 px-3 rounded-xl text-xs font-medium border bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 text-center transition-all"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(2)}
                  className="py-2 px-3 rounded-xl text-xs font-medium border bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 text-center transition-all"
                >
                  Day After
                </button>
                <div className="col-span-3 sm:col-span-1">
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Time Slot */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Preferred Time Slot</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTime(slot)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium text-center transition-all ${
                      time === slot
                        ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Seating Area */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Seating Atmosphere</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SEATING_AREAS.map((item) => (
                  <div
                    key={item.area}
                    onClick={() => setSeatingArea(item.area)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      seatingArea === item.area
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                        : 'bg-zinc-800/80 border-zinc-700/80 hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <h4 className="font-semibold text-xs text-white">{item.area}</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Dining Occasion */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Dining Occasion
              </label>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((occ) => (
                  <button
                    key={occ.name}
                    type="button"
                    onClick={() => setOccasion(occ.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      occasion === occ.name
                        ? 'bg-amber-500 text-zinc-950 font-bold'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                    }`}
                  >
                    {occ.icon}
                    <span>{occ.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Guest Contact Details */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Guest Contact Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 block">Full Name *</label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Imran Khan"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 block">Phone Number *</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs text-zinc-300 block">Email for Confirmation *</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs text-zinc-300 block">Special Requests (Optional)</label>
                  <input
                    type="text"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="e.g. Quiet corner table, high chair, dietary allergy notes..."
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm sm:text-base shadow-xl shadow-amber-500/20 active:scale-98 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Reserving Table in Firebase...' : `Confirm Table for ${guests} Guests • ${time}`}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
