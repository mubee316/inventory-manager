'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  onSnapshot,
  query,
  collection,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Sale } from '@/types';

const PAGE_SIZE = 50;

export function useSales(storeId: string | undefined) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    const q = query(
      collection(db, 'sales'),
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );
    const unsub = onSnapshot(q, (snap) => {
      setSales(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale)));
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoading(false);
    });
    return unsub;
  }, [storeId]);

  const loadMore = useCallback(async () => {
    if (!storeId || !lastDoc) return;
    const q = query(
      collection(db, 'sales'),
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const newSales = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale));
    setSales((prev) => [...prev, ...newSales]);
    setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
    setHasMore(snap.docs.length === PAGE_SIZE);
  }, [storeId, lastDoc]);

  return { sales, loading, hasMore, loadMore };
}
