'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { PERMISSION_LABELS } from '@/constants/roles';
import type { AppUser, PermissionKey } from '@/types';

const STAFF_PERMISSIONS: PermissionKey[] = [
  'RECORD_SALE',
  'VIEW_HISTORY',
  'ADD_EDIT_PRODUCT',
  'DELETE_PRODUCT',
  'VIEW_COST',
];

const DEFAULTS: Record<PermissionKey, boolean> = {
  RECORD_SALE: true,
  VIEW_HISTORY: true,
  ADD_EDIT_PRODUCT: true,
  DELETE_PRODUCT: false,
  VIEW_COST: false,
  VIEW_DASHBOARD: true,
};

export default function StaffPage() {
  const { appUser } = useAuthContext();
  const router = useRouter();
  const [staff, setStaff] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!appUser?.storeId) return;
    const q = query(
      collection(db, 'users'),
      where('storeId', '==', appUser.storeId),
      where('role', '==', 'staff')
    );
    const unsub = onSnapshot(q, (snap) => {
      setStaff(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser)));
      setLoading(false);
    });
    return unsub;
  }, [appUser?.storeId]);

  function resolvedPerm(member: AppUser, key: PermissionKey): boolean {
    if (member.permissions && key in member.permissions) {
      return member.permissions[key] ?? DEFAULTS[key];
    }
    return DEFAULTS[key];
  }

  async function toggle(member: AppUser, key: PermissionKey) {
    const current = resolvedPerm(member, key);
    setSaving(`${member.uid}-${key}`);
    try {
      await updateDoc(doc(db, 'users', member.uid), {
        [`permissions.${key}`]: !current,
      });
    } finally {
      setSaving(null);
    }
  }

  if (appUser?.role !== 'owner') {
    return <p className="p-6 text-gray-500">Access denied</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white z-10 px-4 pt-5 pb-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-gray-600 active:bg-gray-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Staff Access</h1>
          <p className="text-xs text-gray-400">Manage what each staff member can do</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : staff.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">No staff members yet</p>
            <p className="text-gray-400 text-xs mt-1">Share your invite code from Account → Store</p>
          </div>
        ) : (
          staff.map((member) => (
            <div key={member.uid} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Staff header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-green-700">
                    {member.name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-400">Staff</p>
                </div>
              </div>

              {/* Permission toggles */}
              <div className="divide-y divide-gray-50">
                {STAFF_PERMISSIONS.map((key) => {
                  const enabled = resolvedPerm(member, key);
                  const isSaving = saving === `${member.uid}-${key}`;
                  return (
                    <div key={key} className="flex items-center justify-between px-4 py-3">
                      <p className="text-sm text-gray-700">{PERMISSION_LABELS[key]}</p>
                      <button
                        onClick={() => toggle(member, key)}
                        disabled={isSaving}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                          enabled ? 'bg-green-500' : 'bg-gray-200'
                        } ${isSaving ? 'opacity-50' : ''}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                          enabled ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
