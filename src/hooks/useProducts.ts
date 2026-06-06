'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { onSnapshot } from 'firebase/firestore';
import Fuse from 'fuse.js';
import { db } from '@/lib/firebase';
import type { Product } from '@/types';
import { collection, query, where, orderBy } from 'firebase/firestore';

export function useProducts(storeId: string | undefined) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    const q = query(
      collection(db, 'products'),
      where('storeId', '==', storeId),
      orderBy('name', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      setLoading(false);
    });
    return unsub;
  }, [storeId]);

  const fuse = useMemo(
    () =>
      new Fuse(products, {
        keys: ['name', 'code', 'category'],
        threshold: 0.35,
        includeScore: true,
        minMatchCharLength: 1,
      }),
    [products]
  );

  const search = useCallback(
    (query: string): Product[] => {
      if (!query.trim()) return products;
      return fuse.search(query).map((r) => r.item);
    },
    [fuse, products]
  );

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products]
  );

  return { products, loading, search, categories };
}
