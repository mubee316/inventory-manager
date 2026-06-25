'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function CreateStorePage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState('');
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
      // Create the store document
      const storeRef = await addDoc(collection(db, 'stores'), {
        name: storeName.trim(),
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });

      // Create the user document with owner role
      await setDoc(doc(db, 'users', user.uid), {
        storeId: storeRef.id,
        role: 'owner',
        name: name.trim() || user.email?.split('@')[0] || 'Owner',
        ...(user.email ? { email: user.email } : {}),
      });

      sessionStorage.removeItem('pendingName');
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create store');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create your store</h1>
          <p className="text-gray-500 mt-1">You&apos;ll be the store owner</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Your name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chidi Okafor"
            required
          />
          <Input
            label="Store name"
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="e.g. Mama Nkechi Supermarket"
            required
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
            Create Store
          </Button>
        </form>

        <p className="text-center text-gray-500 mt-6 text-sm">
          Joining someone else&apos;s store?{' '}
          <Link href="/join-store" className="text-green-600 font-semibold">
            Join as staff
          </Link>
        </p>
      </div>
    </div>
  );
}
