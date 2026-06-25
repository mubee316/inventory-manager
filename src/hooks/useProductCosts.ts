'use client';

import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { productCostsQuery } from '@/lib/firestore';

/**
 * Live map of productId -> cost. Costs live in the owner-only `productCosts`
 * collection, so this only subscribes when `enabled` (i.e. the user is an owner);
 * staff get an empty map and never read margins.
 */
export function useProductCosts(storeId: string | undefined, enabled = true) {
  const [costs, setCosts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!storeId || !enabled) {
      setCosts(new Map());
      return;
    }
    const unsub = onSnapshot(productCostsQuery(storeId), (snap) => {
      setCosts(new Map(snap.docs.map((d) => [d.id, (d.data().cost as number) ?? 0])));
    });
    return unsub;
  }, [storeId, enabled]);

  return costs;
}
