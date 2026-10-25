import React, { useEffect, useState } from 'react';
import { LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { ManagerApplication } from '../types/restaurant';
import { submitManagerApplication, subscribeToOwnManagerApplication } from '../services/managerService';

interface ManagerAccessPanelProps {
  uid: string;
  defaultName: string;
  phone: string;
  refreshRole: () => Promise<string>;
}

export const ManagerAccessPanel: React.FC<ManagerAccessPanelProps> = ({
  uid,
  defaultName,
  phone,
  refreshRole
}) => {
  const [application, setApplication] = useState<ManagerApplication | null>(null);
  const [name, setName] = useState(defaultName);
  const [phoneNumber, setPhoneNumber] = useState(phone);
  const [restaurantDetails, setRestaurantDetails] = useState('');
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => subscribeToOwnManagerApplication(
    uid,
    setApplication,
    subscriptionError => setError(subscriptionError.message)
  ), [uid]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await submitManagerApplication({ fullName: name, phoneNumber, restaurantDetails });
      setShowApplicationForm(false);
      setMessage('Your manager account is awaiting administrator approval.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit your application.');
    } finally {
      setLoading(false);
    }
  };

  const checkApproval = async () => {
    setRoleLoading(true);
    setError('');
    try {
      const role = await refreshRole();
      if (role === 'manager' || role === 'admin') {
        setMessage('Manager access is active. Close and reopen your profile to continue.');
      } else if (application?.status === 'rejected') {
        setMessage('Your application was not approved.');
      } else {
        setMessage('Your manager account is awaiting administrator approval.');
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh your access.');
    } finally {
      setRoleLoading(false);
    }
  };

  return (
    <div className="mt-5 border-t border-zinc-800 pt-5 text-left">
      <div className="mb-3 flex items-center gap-2 text-amber-300">
        <ShieldCheck className="h-4 w-4" />
        <h4 className="text-sm font-semibold">Manager access</h4>
      </div>
      {application && !showApplicationForm ? (
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs text-zinc-300">
            Application status: <span className="font-semibold capitalize text-amber-300">{application.status}</span>
          </p>
          {application.status === 'pending' && <p className="text-xs text-zinc-500">Your manager account is awaiting administrator approval.</p>}
          <button type="button" onClick={checkApproval} disabled={roleLoading} className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 py-2 text-xs text-zinc-200">
            {roleLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Check approval
          </button>
          {application.status === 'rejected' && (
            <button type="button" onClick={() => setShowApplicationForm(true)} className="w-full rounded-lg bg-amber-500 py-2 text-xs font-bold text-zinc-950">
              Submit a new application
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <input required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="Full name" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white" />
          <input required type="tel" minLength={7} maxLength={30} value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="Phone number" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white" />
          <textarea maxLength={500} value={restaurantDetails} onChange={event => setRestaurantDetails(event.target.value)} placeholder="Restaurant / manager details (optional)" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white" />
          <button disabled={loading} className="w-full rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-zinc-950 disabled:opacity-50">
            {loading ? 'Submitting…' : 'Apply for manager access'}
          </button>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-rose-300">{error}</p>}
      {message && <p role="status" className="mt-2 text-xs text-emerald-300">{message}</p>}
    </div>
  );
};
