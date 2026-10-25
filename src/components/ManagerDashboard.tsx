import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  LoaderCircle,
  Menu as MenuIcon,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users
} from 'lucide-react';
import {
  FoodItem,
  ManagerApplication,
  Order,
  OrderStatus,
  Reservation,
  ReservationStatus
} from '../types/restaurant';
import {
  removeMenuItem,
  reviewManagerApplication,
  saveMenuItem,
  setOrderStatus,
  subscribeToManagerApplications,
  subscribeToMenu,
  subscribeToOrders,
  subscribeToReservations,
  updateReservation
} from '../services/managerService';

type DashboardSection = 'overview' | 'orders' | 'reservations' | 'reports' | 'menu' | 'applications';
type DateFilter = 'today' | 'yesterday' | 'custom';

const orderTransitions: Record<string, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  delivery: {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready-for-dispatch', 'cancelled'],
    ready: ['on-the-way', 'cancelled'],
    'ready-for-dispatch': ['on-the-way', 'cancelled'],
    'on-the-way': ['delivered']
  },
  takeout: {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready-for-pickup', 'cancelled'],
    ready: ['picked-up'],
    'ready-for-pickup': ['picked-up']
  },
  'dine-in': {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready-to-serve', 'cancelled'],
    ready: ['served'],
    'ready-to-serve': ['served'],
    served: ['completed']
  }
};

const reservationTransitions: Partial<Record<ReservationStatus, ReservationStatus[]>> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['seated', 'cancelled'],
  seated: ['completed', 'cancelled']
};

const todayISO = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const dateISO = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatStatus = (status?: string) =>
  typeof status === 'string'
    ? status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Unknown';

const localDateOf = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateISO(date);
};

interface ManagerDashboardProps {
  uid: string;
  isAdmin: boolean;
  onBack: () => void;
  onMenuChanged: () => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  uid,
  isAdmin,
  onBack,
  onMenuChanged
}) => {
  const [section, setSection] = useState<DashboardSection>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [menu, setMenu] = useState<FoodItem[]>([]);
  const [applications, setApplications] = useState<ManagerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStart, setCustomStart] = useState(todayISO());
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [orderDate, setOrderDate] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [reservationDate, setReservationDate] = useState('');
  const [reservationStatusFilter, setReservationStatusFilter] = useState('all');
  const [retry, setRetry] = useState(0);
  const [busyKey, setBusyKey] = useState('');
  const [editing, setEditing] = useState<FoodItem | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    const pending = new Set(['orders', 'reservations', 'menu', ...(isAdmin ? ['applications'] : [])]);
    const onData = <T,>(key: string, setter: (items: T[]) => void) => (items: T[]) => {
      setter(items);
      pending.delete(key);
      if (pending.size === 0) setLoading(false);
    };
    const onError = (loadError: Error) => {
      setError(loadError.message);
      setLoading(false);
    };
    const unsubs = [
      subscribeToOrders(onData('orders', setOrders), onError),
      subscribeToReservations(onData('reservations', setReservations), onError),
      subscribeToMenu(onData('menu', setMenu), onError)
    ];
    if (isAdmin) {
      unsubs.push(subscribeToManagerApplications(onData('applications', setApplications), onError));
    }
    return () => {
      unsubs.forEach(unsubscribe => unsubscribe());
    };
  }, [isAdmin, retry]);

  const dateRange = useMemo(() => {
    if (dateFilter === 'today') return [todayISO(), todayISO()];
    if (dateFilter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const date = dateISO(yesterday);
      return [date, date];
    }
    return [customStart, customEnd];
  }, [dateFilter, customStart, customEnd]);

  const rangeOrders = useMemo(
    () => orders.filter(order => {
      const date = localDateOf(order.createdAt);
      return date >= dateRange[0] && date <= dateRange[1];
    }),
    [orders, dateRange]
  );
  const activeOrders = orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'picked-up');
  const pendingOrders = orders.filter(order => order.status === 'pending');
  const completedOrders = orders.filter(order => ['completed', 'delivered', 'picked-up'].includes(order.status));
  const grossValue = rangeOrders
    .filter(order => order.status !== 'cancelled')
    .reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const completedValue = rangeOrders
    .filter(order => ['completed', 'delivered', 'picked-up'].includes(order.status))
    .reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const matchingOrders = orders.filter(order => {
    const term = search.toLowerCase().trim();
    return (!term ||
      order.id.toLowerCase().includes(term) ||
      (order.customerName || '').toLowerCase().includes(term) ||
      (order.customerEmail || '').toLowerCase().includes(term) ||
      (order.customerPhone || '').toLowerCase().includes(term)) &&
      (!orderDate || localDateOf(order.createdAt || '') === orderDate) &&
      (orderTypeFilter === 'all' || order.orderType === orderTypeFilter) &&
      (orderStatusFilter === 'all' || order.status === orderStatusFilter);
  });
  const matchingReservations = reservations.filter(reservation => {
    const term = search.toLowerCase().trim();
    return (!term ||
      (reservation.customerName || '').toLowerCase().includes(term) ||
      (reservation.customerPhone || '').toLowerCase().includes(term) ||
      (reservation.bookingReference || '').toLowerCase().includes(term)) &&
      (!reservationDate || reservation.date === reservationDate) &&
      (reservationStatusFilter === 'all' || reservation.status === reservationStatusFilter);
  });

  const reportByType = (type: Order['orderType']) => {
    const matching = rangeOrders.filter(order => order.orderType === type);
    return {
      count: matching.length,
      total: matching.filter(order => order.status !== 'cancelled')
        .reduce((sum, order) => sum + (Number(order.total) || 0), 0)
    };
  };
  const dailyReport = useMemo(() => {
    const totals = new Map<string, { count: number; gross: number; completed: number }>();
    for (const order of rangeOrders) {
      const date = localDateOf(order.createdAt || '');
      if (!date) continue;
      const totalsForDate = totals.get(date) || { count: 0, gross: 0, completed: 0 };
      totalsForDate.count++;
      if (order.status !== 'cancelled') totalsForDate.gross += Number(order.total) || 0;
      if (['completed', 'delivered', 'picked-up'].includes(order.status)) {
        totalsForDate.completed += Number(order.total) || 0;
      }
      totals.set(date, totalsForDate);
    }
    return [...totals.entries()].sort(([first], [second]) => second.localeCompare(first));
  }, [rangeOrders]);

  const runAction = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusyKey(key);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(message);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Action failed. Please retry.');
    } finally {
      setBusyKey('');
    }
  };

  const sections: { id: DashboardSection; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'orders', label: 'Orders', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'reservations', label: 'Reservations', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'reports', label: 'Sales & Reports', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'menu', label: 'Menu', icon: <MenuIcon className="h-4 w-4" /> },
    { id: 'applications', label: 'Manager Applications', icon: <Users className="h-4 w-4" />, adminOnly: true }
  ];

  const Metric = ({ label, value, detail }: { label: string; value: string | number; detail?: string }) => (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
      {detail && <p className="mt-1 text-[10px] text-zinc-500">{detail}</p>}
    </div>
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="rounded-xl bg-zinc-900 p-2 text-zinc-300 hover:text-white" aria-label="Back to restaurant">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="font-serif-display text-lg font-bold text-white">Savoria Management</p>
              <p className="text-[10px] text-amber-400">{isAdmin ? 'Administrator' : 'Approved Manager'} • UID {uid.slice(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={() => setRetry(value => value + 1)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:border-amber-500/50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {sections.filter(item => !item.adminOnly || isAdmin).map(item => (
            <button
              key={item.id}
              onClick={() => { setSection(item.id); setSearch(''); }}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                section === item.id
                  ? 'border-amber-500 bg-amber-500 text-zinc-950'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white'
              }`}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </nav>

        {error && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            <span>{error}</span>
            <button onClick={() => setRetry(value => value + 1)} className="font-semibold underline">Retry</button>
          </div>
        )}
        {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">{notice}</p>}
        {loading && <div className="flex items-center gap-2 py-10 text-sm text-zinc-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading live Firestore data…</div>}

        {!loading && section === 'overview' && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-serif-display text-2xl font-bold text-white">Operations overview</h1>
                <p className="mt-1 text-xs text-zinc-500">Live values from Firestore. Amounts are order value, not verified payments collected.</p>
              </div>
              <DatePicker {...{ dateFilter, setDateFilter, customStart, setCustomStart, customEnd, setCustomEnd }} />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="Gross order value" value={`$${grossValue.toFixed(2)}`} detail={`${dateRange[0]} to ${dateRange[1]}`} />
              <Metric label="Orders in range" value={rangeOrders.length} />
              <Metric label="Pending orders" value={pendingOrders.length} />
              <Metric label="Completed orders" value={completedOrders.length} />
              <Metric label="Active deliveries" value={activeOrders.filter(order => order.orderType === 'delivery').length} />
              <Metric label="Completed order value" value={`$${completedValue.toFixed(2)}`} detail="Delivered, picked up, served/completed" />
              <Metric label="Today's upcoming reservations" value={reservations.filter(item =>
                item.date === todayISO() && ['pending', 'confirmed'].includes(item.status)
              ).length} />
              {isAdmin && <Metric label="Pending manager applications" value={applications.filter(item => item.status === 'pending').length} />}
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-white">Order type totals</h2>
              <div className="grid gap-2 sm:grid-cols-3">
                {(['dine-in', 'takeout', 'delivery'] as const).map(type => {
                  const summary = reportByType(type);
                  return <div key={type} className="rounded-xl bg-zinc-950 p-3 text-xs">
                    <p className="capitalize text-zinc-400">{type === 'takeout' ? 'Takeaway' : type}</p>
                    <p className="mt-1 font-bold text-white">${summary.total.toFixed(2)}</p>
                    <p className="mt-1 text-zinc-500">{summary.count} orders</p>
                  </div>;
                })}
              </div>
            </div>
          </section>
        )}

        {!loading && section === 'orders' && (
          <section className="space-y-4">
            <SectionHeading title="Order management" description="Status transitions are restricted by Firestore rules and recorded with the manager UID." />
            <SearchBox value={search} onChange={setSearch} placeholder="Search order, customer, email, phone…" />
            <div className="flex flex-wrap gap-2">
              <input type="date" aria-label="Filter orders by date" value={orderDate} onChange={event => setOrderDate(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-200" />
              <select aria-label="Filter orders by type" value={orderTypeFilter} onChange={event => setOrderTypeFilter(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-200">
                <option value="all">All types</option><option value="delivery">Delivery</option><option value="takeout">Takeaway</option><option value="dine-in">Dine-in</option>
              </select>
              <select aria-label="Filter orders by status" value={orderStatusFilter} onChange={event => setOrderStatusFilter(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-200">
                <option value="all">All statuses</option>{['pending', 'confirmed', 'preparing', 'ready-for-dispatch', 'on-the-way', 'delivered', 'ready-for-pickup', 'picked-up', 'ready-to-serve', 'served', 'completed', 'cancelled', 'ready'].map(status => <option key={status} value={status}>{formatStatus(status)}</option>)}
              </select>
            </div>
            {matchingOrders.length === 0 ? <Empty message="No orders match this search." /> : (
              <div className="space-y-3">
                {matchingOrders.map(order => (
                  <article key={order.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-amber-400">{order.id}</p>
                        <h3 className="mt-1 font-semibold text-white">{order.customerName || 'Customer name unavailable'}</h3>
                          <p className="text-[11px] text-zinc-500">{order.customerEmail || 'Email unavailable'} • {order.customerPhone || 'Phone unavailable'}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={order.status} />
                        <p className="mt-2 text-sm font-bold text-white">${Number(order.total || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
                      <p>Type: <span className="capitalize text-zinc-200">{order.orderType === 'takeout' ? 'Takeaway' : order.orderType}</span></p>
                      <p>Placed: <span className="text-zinc-200">{order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Date unavailable'}</span></p>
                      <p>Payment: <span className="text-zinc-200">Not tracked by the current app</span></p>
                      <p className="sm:col-span-2">Items: <span className="text-zinc-200">{(Array.isArray(order.items) ? order.items : []).map(item => `${item.quantity || 0} × ${item.name || 'Menu item'}`).join(', ') || 'Legacy order details unavailable'}</span></p>
                      {order.orderType === 'delivery' && order.deliveryAddress && (
                        <p className="sm:col-span-2">Delivery: <span className="text-zinc-200">{addressLabel(order)}</span></p>
                      )}
                      {order.tableNumber && <p>Table: <span className="text-zinc-200">{order.tableNumber}</span></p>}
                      {order.statusHistory?.length ? (
                        <p className="sm:col-span-2">Status history: <span className="text-zinc-200">
                          {order.statusHistory.map(entry => `${formatStatus(entry.status)} (${new Date(entry.changedAt).toLocaleString()}, ${entry.changedBy})`).join(' → ')}
                        </span></p>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <label htmlFor={`status-${order.id}`} className="text-[11px] text-zinc-500">Next status</label>
                      <select
                        id={`status-${order.id}`}
                        value=""
                        disabled={busyKey === order.id || !(orderTransitions[order.orderType]?.[order.status]?.length)}
                        onChange={event => {
                          const nextStatus = event.target.value as OrderStatus;
                          if (nextStatus && window.confirm(`Change this order to ${formatStatus(nextStatus)}?`)) {
                            void runAction(order.id, () => setOrderStatus(order.id, nextStatus), 'Order status updated.');
                          }
                        }}
                        className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-200"
                      >
                        <option value="">Select action…</option>
                        {(orderTransitions[order.orderType]?.[order.status] || []).map(status =>
                          <option key={status} value={status}>{formatStatus(status)}</option>
                        )}
                      </select>
                      {busyKey === order.id && <LoaderCircle className="h-4 w-4 animate-spin text-amber-400" />}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {!loading && section === 'reservations' && (
          <section className="space-y-4">
            <SectionHeading title="Reservation management" description="Review saved bookings and update their status. Table-conflict checks are not available in this Spark-only setup." />
            <SearchBox value={search} onChange={setSearch} placeholder="Search guest, phone, booking reference…" />
            <div className="flex flex-wrap gap-2">
              <input type="date" aria-label="Filter reservations by date" value={reservationDate} onChange={event => setReservationDate(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-200" />
              <select aria-label="Filter reservations by status" value={reservationStatusFilter} onChange={event => setReservationStatusFilter(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-200">
                <option value="all">All statuses</option>{['pending', 'confirmed', 'seated', 'completed', 'cancelled'].map(status => <option key={status} value={status}>{formatStatus(status)}</option>)}
              </select>
            </div>
            {matchingReservations.length === 0 ? <Empty message="No reservations match this search." /> : (
              <div className="space-y-3">
                {matchingReservations.map(reservation => (
                  <ReservationCard key={reservation.id} reservation={reservation} busy={busyKey === reservation.id}
                    onUpdate={(status, message) => runAction(reservation.id, () => updateReservation(reservation.id, { status }), message)} />
                ))}
              </div>
            )}
          </section>
        )}

        {!loading && section === 'reports' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionHeading title="Sales & reports" description="Gross order value excludes cancellations. Collected payment is not tracked by the current app." />
              <DatePicker {...{ dateFilter, setDateFilter, customStart, setCustomStart, customEnd, setCustomEnd }} />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="Gross order value" value={`$${grossValue.toFixed(2)}`} />
              <Metric label="Completed order value" value={`$${completedValue.toFixed(2)}`} />
              <Metric label="Orders" value={rangeOrders.length} />
              <Metric label="Pending orders" value={rangeOrders.filter(order => order.status === 'pending').length} />
              <Metric label="Cancelled" value={rangeOrders.filter(order => order.status === 'cancelled').length} />
              {(['delivery', 'takeout', 'dine-in'] as const).map(type => {
                const result = reportByType(type);
                return <Metric key={type} label={`${type === 'takeout' ? 'Takeaway' : formatStatus(type)} sales`} value={`$${result.total.toFixed(2)}`} detail={`${result.count} orders`} />;
              })}
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-white">Popular items by quantity</h2>
              <PopularItems orders={rangeOrders} />
            </div>
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-white">Sales by date</h2>
              {dailyReport.length === 0 ? <p className="text-xs text-zinc-500">No orders in this date range.</p> : (
                <table className="w-full min-w-[420px] text-left text-xs">
                  <thead className="text-zinc-500"><tr><th className="pb-2">Date</th><th className="pb-2">Orders</th><th className="pb-2">Gross order value</th><th className="pb-2">Completed order value</th></tr></thead>
                  <tbody>{dailyReport.map(([date, result]) => <tr key={date} className="border-t border-zinc-800 text-zinc-300">
                    <td className="py-2">{date}</td><td>{result.count}</td><td>${result.gross.toFixed(2)}</td><td>${result.completed.toFixed(2)}</td>
                  </tr>)}</tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {!loading && section === 'menu' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <SectionHeading title="Menu management" description="Changes save to the existing foodItems collection and update the customer menu when you return." />
              <button onClick={() => setEditing(blankMenuItem())} className="flex shrink-0 items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-zinc-950"><Plus className="h-4 w-4" /> Add</button>
            </div>
            {editing && <MenuEditor item={editing} onChange={setEditing} onCancel={() => setEditing(null)} onSave={() => {
              void runAction('menu', async () => {
                await saveMenuItem(editing);
                onMenuChanged();
                setEditing(null);
              }, 'Menu item saved.');
            }} busy={busyKey === 'menu'} />}
            {menu.length === 0 ? <Empty message="No Firestore menu items found. Existing local menu fallback remains available to customers." /> : (
              <div className="space-y-2">
                {menu.map(item => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                    <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                      <p className="text-[11px] text-zinc-500">{item.category} • ${Number(item.price || 0).toFixed(2)} • {item.available === false ? 'Unavailable' : 'Available'}</p>
                    </div>
                      <button
                        onClick={() => void runAction(item.id, async () => {
                          await saveMenuItem({ ...item, available: item.available === false });
                          onMenuChanged();
                        }, item.available === false ? 'Menu item is available.' : 'Menu item is unavailable.')}
                        className="rounded-lg border border-zinc-700 px-2 py-2 text-[10px] text-zinc-300"
                      >
                        {item.available === false ? 'Enable' : 'Disable'}
                      </button>
                      <button onClick={() => setEditing({ ...item })} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300">Edit</button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete ${item.name} from the menu?`)) {
                          void runAction(item.id, async () => {
                            await removeMenuItem(item.id);
                            onMenuChanged();
                          }, 'Menu item deleted.');
                        }
                      }}
                      aria-label={`Delete ${item.name}`}
                      className="rounded-lg border border-rose-500/30 p-2 text-rose-300"
                    ><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {!loading && section === 'applications' && isAdmin && (
          <section className="space-y-4">
            <SectionHeading title="Manager applications" description="Only the administrator can approve or reject an application. Approval creates a manager role record protected by Firestore rules." />
            {applications.length === 0
              ? <Empty message="No pending manager applications." />
              : applications.map(application => (
                <article key={application.uid} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{application.fullName}</h3>
                      <p className="text-xs text-zinc-400">{application.email} • {application.phoneNumber}</p>
                      <p className="mt-2 text-xs text-zinc-500">{application.restaurantDetails || 'No additional manager details supplied.'}</p>
                      <p className="mt-2 text-[10px] text-zinc-600">Applied {new Date(application.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={application.status} />
                      {application.status === 'pending' && <>
                      <button onClick={() => {
                        if (window.confirm(`Approve manager access for ${application.fullName}?`)) {
                          void runAction(application.uid, () => reviewManagerApplication(application.uid, 'approved'), 'Manager application approved.');
                        }
                      }} disabled={busyKey === application.uid} className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-zinc-950"><Check className="h-3.5 w-3.5" /> Approve</button>
                      <button onClick={() => {
                        if (window.confirm(`Reject the manager application from ${application.fullName}?`)) {
                          void runAction(application.uid, () => reviewManagerApplication(application.uid, 'rejected'), 'Manager application rejected.');
                        }
                      }} disabled={busyKey === application.uid} className="rounded-lg border border-rose-500/40 px-3 py-2 text-xs text-rose-300">Reject</button>
                      </>}
                    </div>
                  </div>
                </article>
              ))}
          </section>
        )}
      </div>
    </main>
  );
};

const DatePicker: React.FC<{
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;
  customStart: string;
  setCustomStart: (value: string) => void;
  customEnd: string;
  setCustomEnd: (value: string) => void;
}> = ({ dateFilter, setDateFilter, customStart, setCustomStart, customEnd, setCustomEnd }) => (
  <div className="flex flex-wrap items-center gap-2">
    <select value={dateFilter} onChange={event => setDateFilter(event.target.value as DateFilter)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-200">
      <option value="today">Today</option><option value="yesterday">Yesterday</option><option value="custom">Custom range</option>
    </select>
    {dateFilter === 'custom' && <>
      <input aria-label="Start date" type="date" value={customStart} onChange={event => setCustomStart(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-200" />
      <input aria-label="End date" type="date" value={customEnd} onChange={event => setCustomEnd(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-200" />
    </>}
  </div>
);

const SectionHeading: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div><h1 className="font-serif-display text-2xl font-bold text-white">{title}</h1><p className="mt-1 text-xs text-zinc-500">{description}</p></div>
);

const SearchBox: React.FC<{ value: string; onChange: (value: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
    <Search className="h-4 w-4 text-zinc-500" />
    <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full bg-transparent text-xs text-white outline-none placeholder:text-zinc-600" />
  </label>
);

const Empty: React.FC<{ message: string }> = ({ message }) => <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">{message}</div>;

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
    status === 'cancelled' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' :
    ['delivered', 'completed', 'picked-up', 'served'].includes(status) ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' :
    status === 'pending' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' :
    'border-sky-500/30 bg-sky-500/10 text-sky-300'
  }`}>{formatStatus(status)}</span>
);

const addressLabel = (order: Order) => {
  const address = order.deliveryAddress;
  return [address.houseNumber, address.streetAddress, address.area, address.city, address.country]
    .filter(Boolean).join(', ');
};

const ReservationCard: React.FC<{
  reservation: Reservation;
  busy: boolean;
  onUpdate: (status: ReservationStatus, message: string) => void;
}> = ({ reservation, busy, onUpdate }) => {
  const nextStatuses = reservationTransitions[reservation.status] || [];
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-amber-400">{reservation.bookingReference}</p>
          <h3 className="mt-1 font-semibold text-white">{reservation.customerName}</h3>
          <p className="text-[11px] text-zinc-500">{reservation.customerEmail} • {reservation.customerPhone}</p>
        </div>
        <StatusBadge status={reservation.status} />
      </div>
      <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
        <p>Date/time: <span className="text-zinc-200">{reservation.date} • {reservation.time}</span></p>
        <p>Party: <span className="text-zinc-200">{reservation.guests} guests • {reservation.seatingArea}</span></p>
        {reservation.tableNumber && <p>Table: <span className="text-zinc-200">{reservation.tableNumber}</span></p>}
        {reservation.specialRequests && <p className="sm:col-span-2">Requests: <span className="text-zinc-200">{reservation.specialRequests}</span></p>}
        {reservation.statusHistory?.length ? <p className="sm:col-span-2">Status history: <span className="text-zinc-200">{reservation.statusHistory.map(entry => `${formatStatus(entry.status)} by ${entry.changedBy}`).join(' → ')}</span></p> : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select disabled={busy || nextStatuses.length === 0} value="" onChange={event => {
          const status = event.target.value as ReservationStatus;
          if (status && window.confirm(`Change reservation to ${formatStatus(status)}?`)) {
            onUpdate(status, 'Reservation status updated.');
          }
        }} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-200">
          <option value="">Status…</option>{nextStatuses.map(status => <option key={status} value={status}>{formatStatus(status)}</option>)}
        </select>
        {busy && <LoaderCircle className="h-4 w-4 animate-spin text-amber-400" />}
      </div>
    </article>
  );
};

const blankMenuItem = (): FoodItem => ({
  id: `menu-${Date.now().toString(36)}`,
  name: '',
  description: '',
  price: 0,
  category: 'mains',
  image: '',
  rating: 0,
  reviewsCount: 0,
  prepTime: '20 min',
  calories: 0,
  dietary: [],
  available: true,
  ingredients: []
});

const MenuEditor: React.FC<{
  item: FoodItem;
  onChange: (item: FoodItem) => void;
  onCancel: () => void;
  onSave: () => void;
  busy: boolean;
}> = ({ item, onChange, onCancel, onSave, busy }) => (
  <form className="grid gap-3 rounded-2xl border border-amber-500/20 bg-zinc-900 p-4 sm:grid-cols-2" onSubmit={event => {
    event.preventDefault();
    if (item.name.trim() && item.description.trim() && item.image.trim() && item.price > 0) onSave();
  }}>
    <label className="space-y-1 text-[11px] text-zinc-400">Name *<input required value={item.name} onChange={event => onChange({ ...item, name: event.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white" /></label>
    <label className="space-y-1 text-[11px] text-zinc-400">Price *<input required min="0.01" step="0.01" type="number" value={item.price} onChange={event => onChange({ ...item, price: Number(event.target.value) })} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white" /></label>
    <label className="space-y-1 text-[11px] text-zinc-400">Category *<select value={item.category} onChange={event => onChange({ ...item, category: event.target.value as FoodItem['category'] })} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white">{['starters', 'mains', 'italian', 'grill', 'asian', 'desserts', 'beverages'].map(category => <option key={category}>{category}</option>)}</select></label>
    <label className="space-y-1 text-[11px] text-zinc-400">Image URL *<input required value={item.image} onChange={event => onChange({ ...item, image: event.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white" /></label>
    <label className="space-y-1 text-[11px] text-zinc-400 sm:col-span-2">Description *<textarea required value={item.description} onChange={event => onChange({ ...item, description: event.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white" /></label>
    <div className="flex gap-2 sm:col-span-2"><button disabled={busy} className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950">Save item</button><button type="button" onClick={onCancel} className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300">Cancel</button></div>
  </form>
);

const PopularItems: React.FC<{ orders: Order[] }> = ({ orders }) => {
  const popular = new Map<string, number>();
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    for (const item of Array.isArray(order.items) ? order.items : []) {
      popular.set(item.name, (popular.get(item.name) || 0) + item.quantity);
    }
  }
  const sorted = [...popular].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return sorted.length ? <div className="space-y-2">{sorted.map(([name, count]) => <div key={name} className="flex justify-between text-xs"><span className="text-zinc-300">{name}</span><span className="font-semibold text-amber-400">{count} sold</span></div>)}</div> : <p className="text-xs text-zinc-500">No item-level order data is available for this period.</p>;
};
