'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/layout/AuthProvider';

export function InviteModal() {
  const { pendingInvite, acceptInvite } = useAuthContext();
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState('');

  if (!pendingInvite || dismissed) return null;

  async function join() {
    setJoining(true);
    setError('');
    try {
      await acceptInvite();
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join. Please try again.');
      setJoining(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-8 mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7 text-green-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center">You&apos;ve been invited</h2>
        <p className="text-sm text-gray-500 text-center mt-1">
          Join{' '}
          <span className="font-semibold text-gray-900">
            {pendingInvite.storeName || 'a store'}
          </span>{' '}
          as <span className="font-semibold text-gray-900">{pendingInvite.roleName}</span>.
        </p>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl mt-4 text-center">{error}</p>
        )}

        <button
          onClick={join}
          disabled={joining}
          className="w-full mt-6 py-3.5 bg-green-600 text-white font-bold rounded-2xl active:bg-green-700 disabled:bg-green-400"
        >
          {joining ? 'Joining…' : `Join ${pendingInvite.storeName || 'store'}`}
        </button>
        <button
          onClick={() => setDismissed(true)}
          disabled={joining}
          className="w-full mt-2 py-2 text-sm font-medium text-gray-500"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
