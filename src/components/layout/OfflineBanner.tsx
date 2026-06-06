'use client';

import { useOffline } from '@/hooks/useOffline';

export function OfflineBanner() {
  const isOffline = useOffline();
  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white text-center text-sm font-medium py-2 px-4">
      You are offline — sales and changes will sync when you reconnect
    </div>
  );
}
