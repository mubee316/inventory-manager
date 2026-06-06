'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { useProducts } from '@/hooks/useProducts';
import type { Product } from '@/types';

interface RestockEntry {
  product: Product;
  addQty: string;
}

export default function RestockPage() {
  const router = useRouter();
  const { appUser } = useAuthContext();
  const { products, loading } = useProducts(appUser?.storeId);
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.code ?? '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const changedEntries: RestockEntry[] = products
    .filter((p) => entries[p.id] && parseInt(entries[p.id]) > 0)
    .map((p) => ({ product: p, addQty: entries[p.id] }));

  function setQty(id: string, val: string) {
    setEntries((prev) => ({ ...prev, [id]: val }));
  }

  async function handleSave() {
    if (changedEntries.length === 0) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      for (const { product, addQty } of changedEntries) {
        const add = parseInt(addQty);
        if (isNaN(add) || add <= 0) continue;
        batch.update(doc(db, 'products', product.id), {
          stockQty: product.stockQty + add,
        });
      }
      await batch.commit();
      setSaved(true);
      setEntries({});
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-xl text-gray-600 active:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">Restock</h1>
          {changedEntries.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm font-semibold px-4 py-2 bg-green-600 text-white rounded-xl active:bg-green-700 disabled:bg-green-400"
            >
              {saving ? 'Saving…' : saved ? 'Saved ✓' : `Update ${changedEntries.length}`}
            </button>
          )}
        </div>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Product list */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-2">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">No products found</p>
        ) : (
          filtered.map((product) => {
            const qty = entries[product.id] ?? '';
            const hasChange = qty && parseInt(qty) > 0;
            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl px-4 py-3 border flex items-center gap-3 transition-colors ${
                  hasChange ? 'border-green-300 bg-green-50' : 'border-gray-100'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                  <p className={`text-xs font-medium mt-0.5 ${
                    product.stockQty <= 0 ? 'text-red-500' : product.stockQty < 5 ? 'text-orange-500' : 'text-gray-400'
                  }`}>
                    {product.stockQty} in stock
                    {hasChange && (
                      <span className="text-green-600"> → {product.stockQty + parseInt(qty)}</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">Add</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={qty}
                    onChange={(e) => setQty(product.id, e.target.value)}
                    placeholder="0"
                    className="w-16 text-center text-sm font-bold px-2 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom save bar */}
      {changedEntries.length > 0 && (
        <div className="sticky bottom-16 px-4 py-3 bg-white border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 bg-green-600 text-white font-bold rounded-2xl active:bg-green-700 disabled:bg-green-400"
          >
            {saving ? 'Saving…' : `Update Stock (${changedEntries.length} product${changedEntries.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      )}
    </div>
  );
}
