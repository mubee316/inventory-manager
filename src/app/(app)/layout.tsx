'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { BottomNav } from '@/components/layout/BottomNav';
import { useOffline } from '@/hooks/useOffline';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, appUser, loading } = useAuthContext();
  const router = useRouter();
  const isOffline = useOffline();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!appUser) {
      router.replace('/create-store');
    }
  }, [user, appUser, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <span className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !appUser) return null;

  return (
    <div className={`flex flex-col min-h-screen ${isOffline ? 'pt-10' : ''}`}>
      <main className="flex-1 pb-20 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
