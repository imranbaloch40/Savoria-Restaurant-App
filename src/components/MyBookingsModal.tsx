import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Trash2, 
  CalendarCheck2, 
  Phone, 
  AlertCircle,
  CheckCircle2,
  CalendarX2
} from 'lucide-react';
import { Reservation } from '../types/restaurant';
import { cancelReservation } from '../services/restaurantService';

interface MyBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: Reservation[];
  onRefresh: () => void;
  onOpenNewBooking: () => void;
}

export const MyBookingsModal: React.FC<MyBookingsModalProps> = ({
  isOpen,
  onClose,
  reservations,
  onRefresh,
  onOpenNewBooking
}) => {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState('');

  if (!isOpen) return null;

  const handleCancel = async (id: string) => {
    if (window.confirm("Are you sure you want to cancel this reservation?")) {
      setCancellingId(id);
      setCancelError('');
      try {
        await cancelReservation(id);
        onRefresh();
      } catch (error) {
        setCancelError(error instanceof Error ? error.message : 'Could not cancel this reservation.');
      } finally {
        setCancellingId(null);
      }
    }
  };

  const getStatusBadge = (status: Reservation['status']) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            <span>Confirmed</span>
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold">
            <AlertCircle className="w-3 h-3" />
            <span>Awaiting Confirmation</span>
          </span>
        );
      case 'seated':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold">
            Currently Seated
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs font-semibold">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
            <CalendarX2 className="w-3 h-3" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-7 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif-display text-xl sm:text-2xl font-bold text-white">
                My Table Bookings
              </h2>
              <p className="text-xs text-zinc-400">
                Active & past reservations stored in Firebase
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

        {cancelError && <p role="alert" className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{cancelError}</p>}

        {/* Content */}
        <div className="py-4 space-y-4 flex-1">
          {reservations.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-zinc-800 text-zinc-500 mx-auto flex items-center justify-center">
                <Calendar className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">No Table Bookings Yet</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                  Ready for an unforgettable culinary evening? Reserve your table in seconds.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenNewBooking();
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
              >
                Book a Table Now
              </button>
            </div>
          ) : (
            reservations.map((res) => (
              <div
                key={res.id}
                className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 relative overflow-hidden space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-amber-400">
                        {res.bookingReference}
                      </span>
                      {res.tableNumber && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                          Table: {res.tableNumber}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-white mt-1">
                      {res.customerName}
                    </h4>
                  </div>
                  <div>
                    {getStatusBadge(res.status)}
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/50">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>{res.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{res.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>{res.guests} Guests</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span className="truncate">{res.seatingArea}</span>
                  </div>
                </div>

                {res.specialRequests && (
                  <p className="text-[11px] text-zinc-400 italic">
                    Note: "{res.specialRequests}"
                  </p>
                )}

                {/* Actions */}
                {(res.status === 'pending' || res.status === 'confirmed') && (
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                    <span className="text-[11px] text-zinc-500">Need to change? Call (555) 019-2831</span>
                    <button
                      onClick={() => handleCancel(res.id)}
                      disabled={cancellingId === res.id}
                      className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{cancellingId === res.id ? 'Cancelling...' : 'Cancel Booking'}</span>
                    </button>
                  </div>
                )}

              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onOpenNewBooking();
            }}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
          >
            + Add Another Reservation
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
