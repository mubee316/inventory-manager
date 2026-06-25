'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { rolesQuery, createInvite } from '@/lib/firestore';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { StoreRole } from '@/types';

export default function AddStaffPage() {
  const { appUser } = useAuthContext();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<StoreRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<StoreRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    if (!appUser?.storeId) return;
    const unsub = onSnapshot(rolesQuery(appUser.storeId), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StoreRole));
      setRoles(list);
      if (list.length > 0 && !selectedRole) setSelectedRole(list[0]);
    });
    // Store name is stamped onto the invite so the invitee can see who invited
    // them before they're a member (they can't read the store doc yet).
    getDoc(doc(db, 'stores', appUser.storeId)).then((snap) => {
      if (snap.exists()) setStoreName((snap.data().name as string) ?? '');
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.storeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appUser?.storeId) return;
    if (!email.trim()) { setError('Email address is required'); return; }
    if (!selectedRole) { setError('Please select or create a role first'); return; }

    setSaving(true);
    setError('');
    try {
      await createInvite({
        email: email.trim().toLowerCase(),
        storeId: appUser.storeId,
        ...(storeName ? { storeName } : {}),
        roleId: selectedRole.id,
        roleName: selectedRole.name,
        permissions: selectedRole.permissions,
        invitedBy: appUser.uid,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setSaving(false);
    }
  }

  if (appUser?.role !== 'owner') {
    return <p className="p-6 text-gray-500">Access denied</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-5 pb-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-gray-600 active:bg-gray-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Add Staff</h1>
      </div>

      {success ? (
        <div className="px-4 py-10 max-w-lg mx-auto text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Invite Sent!</p>
            <p className="text-sm text-gray-500 mt-1">
              When <span className="font-medium">{email}</span> signs up with that email, they will automatically join your store as <span className="font-medium">{selectedRole?.name}</span>.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full mt-2">
            <Button size="lg" onClick={() => { setEmail(''); setSuccess(false); }} className="w-full">
              Add Another Staff
            </Button>
            <button onClick={() => router.push('/staff')} className="text-sm text-gray-500 py-2">
              Back to Staff
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-4 py-5 max-w-lg mx-auto flex flex-col gap-5">

          {/* Email */}
          <section className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Email Address</h2>
            <p className="text-xs text-gray-400 mb-3">
              Enter the email address of the person you want to add
            </p>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              autoComplete="email"
              required
            />
          </section>

          {/* Role picker */}
          <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">What can this person do?</h2>
              <p className="text-xs text-gray-400 mt-0.5">Choose the role that best fits their responsibilities</p>
            </div>

            <div className="divide-y divide-gray-50">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-gray-50">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selectedRole?.id === role.id
                      ? 'bg-green-600 border-green-600'
                      : 'border-gray-300 bg-white'
                  }`}>
                    {selectedRole?.id === role.id && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{role.name}</p>
                    <p className="text-xs text-gray-400">
                      {Object.values(role.permissions).filter(Boolean).length} permissions
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    className="sr-only"
                    checked={selectedRole?.id === role.id}
                    onChange={() => setSelectedRole(role)}
                  />
                </label>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-gray-100">
              <Link
                href="/staff/create-role"
                className="flex items-center gap-2 text-sm font-semibold text-green-600"
              >
                <div className="w-5 h-5 rounded-full border-2 border-dashed border-green-400 flex items-center justify-center">
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 text-green-600">
                    <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                  </svg>
                </div>
                Create New Role
              </Link>
            </div>
          </section>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            loading={saving}
            className="w-full"
            disabled={!selectedRole}
          >
            Add Staff
          </Button>
        </form>
      )}
    </div>
  );
}
