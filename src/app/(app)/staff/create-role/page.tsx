'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRole } from '@/lib/firestore';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { ROLE_PERMISSION_KEYS, PERMISSION_LABELS } from '@/constants/roles';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { PermissionKey } from '@/types';

export default function CreateRolePage() {
  const { appUser } = useAuthContext();
  const router = useRouter();
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<Partial<Record<PermissionKey, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggle(key: PermissionKey) {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appUser?.storeId) return;
    if (!name.trim()) { setError('Role name is required'); return; }

    setSaving(true);
    setError('');
    try {
      await createRole(appUser.storeId, name.trim(), permissions);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role');
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
        <h1 className="text-xl font-bold text-gray-900">Create Role</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 max-w-lg mx-auto flex flex-col gap-5">

        {/* Role name */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Role Name</h2>
          <p className="text-xs text-gray-400 mb-3">Enter a descriptive name for this role</p>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales Representative"
            required
          />
        </section>

        {/* Permissions */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">What can this role do?</h2>
            <p className="text-xs text-gray-400 mt-0.5">Choose the permissions that best fit this role</p>
          </div>

          <div className="divide-y divide-gray-50">
            {ROLE_PERMISSION_KEYS.map((key) => {
              const enabled = !!permissions[key];
              return (
                <label
                  key={key}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-gray-50"
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    enabled ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white'
                  }`}>
                    {enabled && (
                      <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-gray-700">{PERMISSION_LABELS[key]}</span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={enabled}
                    onChange={() => toggle(key)}
                  />
                </label>
              );
            })}
          </div>
        </section>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
        )}

        <Button type="submit" size="lg" loading={saving} className="w-full">
          Create Role
        </Button>
      </form>
    </div>
  );
}
