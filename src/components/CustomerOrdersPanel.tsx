import React, { useEffect, useState } from 'react';
import { ArrowLeft, LoaderCircle, RefreshCw } from 'lucide-react';
import { Order, OrderStatus } from '../types/restaurant';
import { subscribeToOrders } from '../services/managerService';

interface CustomerOrdersPanelProps {
  uid: string;
  onBack: () => void;
}

const label = (value?: string) =>
  typeof value === 'string'
    ? value.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
    : 'Unknown';

export const CustomerOrdersPanel: React.FC<CustomerOrdersPanelProps> = ({ uid, onBack }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    const unsubscribe = subscribeToOrders(
      items => {
        setOrders(items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setLoading(false);
      },
      subscriptionError => {
        setError(subscriptionError.message);
        setLoading(false);
      },
      uid
    );
    return unsubscribe;
  }, [uid, retry]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button onClick={onBack} aria-label="Back to menu" className="rounded-xl bg-zinc-900 p-2 text-zinc-300"><ArrowLeft className="h-4 w-4" /></button>
          <div><h1 className="font-serif-display text-lg font-bold text-white">My Orders</h1><p className="text-[10px] text-zinc-500">Live order status</p></div>
        </div>
      </header>
      <section className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
        {loading && <div className="flex items-center gap-2 py-10 text-sm text-zinc-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading orders…</div>}
        {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}<button onClick={() => setRetry(value => value + 1)} className="ml-2 underline"><RefreshCw className="inline h-3 w-3" /> Retry</button></div>}
        {!loading && !error && orders.length === 0 && <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">Your order history will appear here.</div>}
        {!loading && orders.map(order => {
          const steps = order.orderType === 'delivery'
            ? ['pending', 'confirmed', 'preparing', 'ready-for-dispatch', 'on-the-way', 'delivered']
            : order.orderType === 'takeout'
              ? ['pending', 'confirmed', 'preparing', 'ready-for-pickup', 'picked-up']
              : ['pending', 'confirmed', 'preparing', 'ready-to-serve', 'served', 'completed'];
          const currentStatus = order.status === 'ready'
            ? order.orderType === 'delivery' ? 'ready-for-dispatch'
              : order.orderType === 'takeout' ? 'ready-for-pickup' : 'ready-to-serve'
            : order.status;
          const currentIndex = steps.indexOf(currentStatus);
          return (
            <article key={order.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-mono text-[10px] text-amber-400">{order.id}</p><p className="mt-1 text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString()}</p></div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${order.status === 'cancelled' ? 'border-rose-500/30 text-rose-300' : 'border-emerald-500/30 text-emerald-300'}`}>{label(currentStatus)}</span>
              </div>
              <div className="mt-3 space-y-1 text-xs text-zinc-400">
                {(Array.isArray(order.items) ? order.items : []).map(item => <p key={item.id}>{item.quantity || 0} × {item.name || 'Menu item'} <span className="text-zinc-600">(${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)})</span></p>)}
                <p className="border-t border-zinc-800 pt-2 font-semibold text-white">Total ${Number(order.total || 0).toFixed(2)}</p>
              </div>
              {order.status !== 'cancelled' && (
                <ol className="mt-4 flex flex-wrap gap-x-3 gap-y-2">
                  {steps.map((step, index) => (
                    <li key={step} className={`text-[10px] ${index <= currentIndex ? 'text-amber-300' : 'text-zinc-600'}`}>
                      <span className="mr-1">{index <= currentIndex ? '●' : '○'}</span>{label(step)}
                    </li>
                  ))}
                </ol>
              )}
              {order.status === 'cancelled' && <p className="mt-3 text-xs text-rose-300">This order was cancelled.</p>}
              <p className="mt-3 text-[10px] text-zinc-600">Timeline: {order.statusHistory?.map(entry => label(entry.status)).join(' → ') || label(currentStatus)}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
};
