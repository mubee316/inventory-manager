'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/layout/AuthProvider';

export default function RootPage() {
  const { user, appUser, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (!appUser) {
      router.replace('/create-store');
    } else {
      router.replace('/dashboard');
    }
  }, [user, appUser, loading, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <span className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
