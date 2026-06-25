'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function JoinStorePage() {
  const router = useRouter();
  const [storeId, setStoreId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pending = sessionStorage.getItem('pendingName');
    if (pending) setName(pending);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Verify the store exists
      const storeSnap = await getDoc(doc(db, 'stores', storeId.trim()));
      if (!storeSnap.exists()) {
        setError('Store not found. Check the invite code and try again.');
        return;
      }

      // Create staff user doc
      await setDoc(doc(db, 'users', user.uid), {
        storeId: storeId.trim(),
        role: 'staff',
        name: name.trim() || user.email?.split('@')[0] || 'Staff',
        ...(user.email ? { email: user.email } : {}),
      });

      sessionStorage.removeItem('pendingName');
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join store');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Join a store</h1>
          <p className="text-gray-500 mt-1">Enter the invite code from your store owner</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Your name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Emeka Eze"
            required
          />
          <Input
            label="Store invite code"
            type="text"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            placeholder="Paste the code here"
            required
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
            Join Store
          </Button>
        </form>

        <p className="text-center text-gray-500 mt-6 text-sm">
          Creating a new store?{' '}
          <Link href="/create-store" className="text-green-600 font-semibold">
            Create store
          </Link>
        </p>
      </div>
    </div>
  );
}
