'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthContext } from '@/components/layout/AuthProvider';
import type { Store } from '@/types';

export default function SettingsPage() {
  const { appUser } = useAuthContext();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!appUser?.storeId) return;
    getDoc(doc(db, 'stores', appUser.storeId)).then((snap) => {
      if (snap.exists()) setStore({ id: snap.id, ...snap.data() } as Store);
    });
  }, [appUser?.storeId]);

  async function copyInviteCode() {
    if (!appUser?.storeId) return;
    await navigator.clipboard.writeText(appUser.storeId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveName() {
    if (!appUser || !nameInput.trim()) return;
    setSavingName(true);
    try {
      await updateDoc(doc(db, 'users', appUser.uid), { name: nameInput.trim() });
      setEditingName(false);
    } finally {
      setSavingName(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut(auth);
    router.replace('/login');
  }

  return (
    <div className="px-4 pt-6 pb-8 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Account</h1>

      {/* Profile */}
      <section className="mb-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Profile</p>
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Name</p>
              {editingName ? (
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  className="text-sm font-medium text-gray-900 border-b border-green-500 outline-none bg-transparent mt-0.5"
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">{appUser?.name}</p>
              )}
            </div>
            {editingName ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingName(false)}
                  className="text-xs text-gray-500 px-2 py-1 rounded-lg bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="text-xs text-white px-2 py-1 rounded-lg bg-green-600 disabled:bg-green-400"
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setNameInput(appUser?.name ?? ''); setEditingName(true); }}
                className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded-lg"
              >
                Edit
              </button>
            )}
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-400">Role</p>
            <p className="text-sm font-medium text-gray-900 capitalize">{appUser?.role}</p>
          </div>
        </div>
      </section>

      {/* Store */}
      <section className="mb-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Store</p>
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
          <div className="px-4 py-3">
            <p className="text-xs text-gray-400">Store name</p>
            <p className="text-sm font-medium text-gray-900">{store?.name ?? '—'}</p>
          </div>

          {appUser?.role === 'owner' && (
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Invite code</p>
              <p className="text-xs text-gray-500 mb-2">
                Share this code with staff so they can join your store.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-xl font-mono break-all">
                  {appUser.storeId}
                </code>
                <button
                  onClick={copyInviteCode}
                  className="shrink-0 text-xs font-semibold px-3 py-2 rounded-xl transition-colors bg-green-600 text-white active:bg-green-700"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Staff management — owner only */}
      {appUser?.role === 'owner' && (
        <section className="mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Team</p>
          <Link
            href="/staff"
            className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between active:bg-gray-50"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">Manage Staff Access</p>
              <p className="text-xs text-gray-400">Control what each staff member can do</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>
      )}

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="w-full py-3.5 rounded-2xl font-semibold text-red-600 bg-red-50 active:bg-red-100 disabled:opacity-50"
      >
        {signingOut ? 'Signing out…' : 'Sign Out'}
      </button>
    </div>
  );
}
