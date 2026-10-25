import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  CheckCircle2, 
  Utensils, 
  Bike, 
  PackageCheck,
  ShieldCheck 
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../services/restaurantService';
import { DeliveryAddress } from '../types/restaurant';

interface CartDrawerProps {
  onRequireAuth: () => void;
}

const emptyAddress: DeliveryAddress = {
  country: '',
  city: '',
  area: '',
  houseNumber: '',
  streetAddress: '',
  additionalDetails: ''
};

type CheckoutErrorField = 'customerName' | 'customerPhone' | keyof DeliveryAddress;

const requiredAddressFields: {
  key: keyof Pick<DeliveryAddress, 'country' | 'city' | 'area' | 'houseNumber' | 'streetAddress'>;
  label: string;
  placeholder: string;
}[] = [
  { key: 'country', label: 'Country', placeholder: 'Country' },
  { key: 'city', label: 'City', placeholder: 'City' },
  { key: 'area', label: 'Area / Locality', placeholder: 'Area or locality' },
  { key: 'houseNumber', label: 'House Number / Building Name', placeholder: 'House number or building name' },
  { key: 'streetAddress', label: 'Street Address', placeholder: 'Street address' }
];

export const CartDrawer: React.FC<CartDrawerProps> = ({ onRequireAuth }) => {
  const { 
    cart, 
    isCartOpen, 
    setIsCartOpen, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    subtotal, 
    tax, 
    total 
  } = useCart();
  
  const { userProfile, user } = useAuth();

  const [orderType, setOrderType] = useState<'dine-in' | 'takeout' | 'delivery'>('dine-in');
  const [tableNumber, setTableNumber] = useState('Table 14');
  const [customerName, setCustomerName] = useState(userProfile?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState(userProfile?.phoneNumber || '');
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    ...emptyAddress,
    ...userProfile?.deliveryAddress
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CheckoutErrorField, string>>>({});
  const [isReviewing, setIsReviewing] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlacedId, setOrderPlacedId] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const submissionInProgress = useRef(false);

  useEffect(() => {
    if (!userProfile) return;
    setCustomerName(userProfile.displayName || '');
    setCustomerPhone(userProfile.phoneNumber || '');
    setDeliveryAddress({
      ...emptyAddress,
      ...userProfile.deliveryAddress
    });
  }, [userProfile?.uid]);

  if (!isCartOpen) return null;

  const validateCheckout = () => {
    const errors: Partial<Record<CheckoutErrorField, string>> = {};
    if (!customerName.trim()) {
      errors.customerName = 'Enter your full name.';
    }

    const phone = customerPhone.trim();
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phone) {
      errors.customerPhone = 'Enter your phone number.';
    } else if (
      !/^\+?[\d\s().-]+$/.test(phone) ||
      phone.length > 30 ||
      phoneDigits.length < 7 ||
      phoneDigits.length > 15
    ) {
      errors.customerPhone = 'Enter a valid phone number with 7 to 15 digits.';
    }

    for (const field of requiredAddressFields) {
      if (!deliveryAddress[field.key].trim()) {
        errors[field.key] = `${field.label} is required.`;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReviewOrder = () => {
    if (cart.length === 0 || submissionInProgress.current) return;
    setSubmissionError(null);
    setAuthRequired(false);
    if (!user) {
      setAuthRequired(true);
      onRequireAuth();
      return;
    }
    if (validateCheckout()) {
      setIsReviewing(true);
    }
  };

  const handleConfirmOrder = async () => {
    if (cart.length === 0 || submissionInProgress.current) return;
    if (!user) {
      setAuthRequired(true);
      onRequireAuth();
      return;
    }

    submissionInProgress.current = true;
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const order = await createOrder({
        customerName: customerName.trim(),
        customerEmail: user.email || userProfile?.email || '',
        customerPhone: customerPhone.trim(),
        deliveryAddress: {
          country: deliveryAddress.country.trim(),
          city: deliveryAddress.city.trim(),
          area: deliveryAddress.area.trim(),
          houseNumber: deliveryAddress.houseNumber.trim(),
          streetAddress: deliveryAddress.streetAddress.trim(),
          ...(deliveryAddress.additionalDetails?.trim()
            ? { additionalDetails: deliveryAddress.additionalDetails.trim() }
            : {})
        },
        items: cart.map(c => ({
          id: c.foodItem.id,
          name: c.foodItem.name,
          price: c.foodItem.price,
          quantity: c.quantity
        })),
        orderType,
        ...(orderType === 'dine-in' && tableNumber.trim()
          ? { tableNumber: tableNumber.trim() }
          : {}),
        subtotal,
        tax,
        tip: 0,
        total
      });

      setOrderPlacedId(order.id);
      clearCart();

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.5 }
        });
      } catch {
        // ignore
      }
    } catch (err) {
      const code =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        typeof err.code === 'string'
          ? err.code
          : 'unknown';
      console.error('Order submission failed.', { code });
      setSubmissionError('We could not place your order. Please try again.');
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  const updateAddressField = (field: keyof DeliveryAddress, value: string) => {
    setDeliveryAddress(previous => ({ ...previous, [field]: value }));
    setFieldErrors(previous => ({ ...previous, [field]: undefined }));
  };

  const handleClose = () => {
    setOrderPlacedId(null);
    setSubmissionError(null);
    setIsReviewing(false);
    setAuthRequired(false);
    setIsCartOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col justify-between">
          
          {/* Header */}
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h2 className="font-serif-display text-xl font-bold text-white">Your Order</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto flex-1 space-y-5">
            
            {orderPlacedId ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-serif-display text-2xl font-bold text-white">Order Sent to Kitchen!</h3>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                  Our chefs are currently preparing your dishes. Order reference has been recorded in Firestore:
                </p>
                <div className="p-2.5 rounded-xl bg-zinc-950 font-mono text-xs text-amber-400 border border-zinc-800">
                  ID: {orderPlacedId}
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleClose}
                    className="w-full py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
                  >
                    Back to Menu
                  </button>
                </div>
              </div>
            ) : cart.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-zinc-800 text-zinc-500 mx-auto flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-white text-base">Your cart is empty</h3>
                <p className="text-xs text-zinc-400">
                  Select and add exquisite dishes from our menu to begin your culinary journey.
                </p>
              </div>
            ) : (
              <>
                {/* Dining Mode Toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Dining Option</label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950 rounded-2xl border border-zinc-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setOrderType('dine-in')}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-medium transition-colors ${
                        orderType === 'dine-in' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      <span>Dine In</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('takeout')}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-medium transition-colors ${
                        orderType === 'takeout' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Pick Up</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('delivery')}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-medium transition-colors ${
                        orderType === 'delivery' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Bike className="w-3.5 h-3.5" />
                      <span>Delivery</span>
                    </button>
                  </div>
                </div>

                {authRequired && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                    <p>Please sign in or create an account to place your order.</p>
                    <button
                      type="button"
                      onClick={onRequireAuth}
                      className="mt-2 font-semibold underline underline-offset-2"
                    >
                      Sign In or Create Account
                    </button>
                  </div>
                )}

                <div className="space-y-3 rounded-2xl bg-zinc-950 border border-zinc-800 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Customer & Delivery Details
                  </h3>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400 block" htmlFor="checkout-name">Full Name *</label>
                    <input
                      id="checkout-name"
                      type="text"
                      autoComplete="name"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setFieldErrors(previous => ({ ...previous, customerName: undefined }));
                        setIsReviewing(false);
                      }}
                      aria-invalid={Boolean(fieldErrors.customerName)}
                      placeholder="Your full name"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                    />
                    {fieldErrors.customerName && <p role="alert" className="text-[11px] text-rose-400">{fieldErrors.customerName}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400 block" htmlFor="checkout-phone">Phone Number *</label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      autoComplete="tel"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setFieldErrors(previous => ({ ...previous, customerPhone: undefined }));
                        setIsReviewing(false);
                      }}
                      aria-invalid={Boolean(fieldErrors.customerPhone)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                    />
                    {fieldErrors.customerPhone && <p role="alert" className="text-[11px] text-rose-400">{fieldErrors.customerPhone}</p>}
                  </div>
                  {requiredAddressFields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs text-zinc-400 block" htmlFor={`checkout-${field.key}`}>
                        {field.label} *
                      </label>
                      <input
                        id={`checkout-${field.key}`}
                        type="text"
                        autoComplete={field.key === 'country' ? 'country-name' : 'off'}
                        value={deliveryAddress[field.key]}
                        onChange={(e) => {
                          updateAddressField(field.key, e.target.value);
                          setIsReviewing(false);
                        }}
                        aria-invalid={Boolean(fieldErrors[field.key])}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                      />
                      {fieldErrors[field.key] && <p role="alert" className="text-[11px] text-rose-400">{fieldErrors[field.key]}</p>}
                    </div>
                  ))}
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400 block" htmlFor="checkout-additional-details">
                      Additional Address Details / Landmark (optional)
                    </label>
                    <input
                      id="checkout-additional-details"
                      type="text"
                      value={deliveryAddress.additionalDetails || ''}
                      onChange={(e) => {
                        updateAddressField('additionalDetails', e.target.value);
                        setIsReviewing(false);
                      }}
                      placeholder="Apartment, floor, nearby landmark..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {orderType === 'dine-in' && (
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400 block">Table Number / Location</label>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="e.g. Table 14 or Terrace 2"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {/* Cart Items List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Items ({cart.length})</span>
                    <button onClick={clearCart} className="text-rose-400 hover:text-rose-300">Clear all</button>
                  </div>

                  <div className="space-y-2.5">
                    {cart.map((item) => (
                      <div
                        key={item.foodItem.id}
                        className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3"
                      >
                        <img
                          src={item.foodItem.image}
                          alt={item.foodItem.name}
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-white truncate">{item.foodItem.name}</h4>
                          <span className="text-xs text-amber-400 font-bold">
                            ${(item.foodItem.price * item.quantity).toFixed(2)}
                          </span>
                          {item.specialInstructions && (
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                              "{item.specialInstructions}"
                            </p>
                          )}
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-1.5 bg-zinc-800 rounded-xl p-1 border border-zinc-700">
                          <button
                            onClick={() => updateQuantity(item.foodItem.id, item.quantity - 1)}
                            className="w-6 h-6 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-white min-w-[16px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.foodItem.id, item.quantity + 1)}
                            className="w-6 h-6 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {isReviewing && (
                  <section className="space-y-3 rounded-2xl bg-zinc-950 border border-amber-500/30 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white text-sm">Final Order Summary</h3>
                      <button
                        type="button"
                        onClick={() => setIsReviewing(false)}
                        className="text-xs text-amber-400 hover:text-amber-300"
                      >
                        Edit details
                      </button>
                    </div>
                    <div className="space-y-2 text-xs">
                      {cart.map(item => (
                        <div key={item.foodItem.id} className="flex justify-between gap-3 text-zinc-300">
                          <span>{item.quantity} × {item.foodItem.name}</span>
                          <span>${(item.foodItem.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-zinc-800 pt-3 space-y-1 text-xs">
                      <p className="text-zinc-200"><span className="text-zinc-500">Name:</span> {customerName.trim()}</p>
                      <p className="text-zinc-200"><span className="text-zinc-500">Phone:</span> {customerPhone.trim()}</p>
                      <p className="text-zinc-200">
                        <span className="text-zinc-500">Delivery address:</span>{' '}
                        {[deliveryAddress.houseNumber, deliveryAddress.streetAddress, deliveryAddress.area, deliveryAddress.city, deliveryAddress.country]
                          .map(part => part.trim())
                          .filter(Boolean)
                          .join(', ')}
                        {deliveryAddress.additionalDetails?.trim() ? ` (${deliveryAddress.additionalDetails.trim()})` : ''}
                      </p>
                    </div>
                    <div className="flex justify-between border-t border-zinc-800 pt-3 text-sm font-bold text-white">
                      <span>Total</span>
                      <span className="text-amber-400">${total.toFixed(2)}</span>
                    </div>
                  </section>
                )}

              </>
            )}

          </div>

          {/* Footer with Calculations */}
          {cart.length > 0 && !orderPlacedId && (
            <div className="p-5 border-t border-zinc-800 bg-zinc-950 space-y-3">
              <div className="space-y-1.5 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-zinc-200 font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8.25%)</span>
                  <span className="text-zinc-200 font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-zinc-800">
                  <span>Total</span>
                  <span className="text-amber-400 font-serif-display text-lg">${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={isReviewing ? handleConfirmOrder : handleReviewOrder}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-xl shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>
                  {isSubmitting
                    ? 'Placing Order...'
                    : `${isReviewing ? 'Confirm Order' : 'Review Order'} • $${total.toFixed(2)}`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {submissionError && (
                <p role="alert" className="text-center text-xs text-rose-400">
                  {submissionError}
                </p>
              )}

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Orders persist live to Firebase Firestore `orders`</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
