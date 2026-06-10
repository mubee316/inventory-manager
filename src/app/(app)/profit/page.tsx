'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { useProducts } from '@/hooks/useProducts';
import { naira } from '@/lib/formatters';
import type { Sale } from '@/types';

export default function ProfitPage() {
  const { appUser } = useAuthContext();
  const router = useRouter();
  const { products } = useProducts(appUser?.storeId);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser?.storeId) return;
    const q = query(
      collection(db, 'sales'),
      where('storeId', '==', appUser.storeId),
      where('createdAt', '>=', Timestamp.fromDate(startOfDay(new Date()))),
      where('createdAt', '<=', Timestamp.fromDate(endOfDay(new Date())))
    );
    const unsub = onSnapshot(q, (snap) => {
      setTodaySales(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale)));
      setLoading(false);
    });
    return unsub;
  }, [appUser?.storeId]);

  const profitByProduct = useMemo(() => {
    if (!todaySales.length || !products.length) return [];
    const costMap = new Map(products.map((p) => [p.id, p.cost]));
    const acc = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
    for (const sale of todaySales) {
      for (const item of sale.items) {
        const cost = costMap.get(item.productId) ?? 0;
        const revenue = item.unitPrice * item.qty;
        const profit = (item.unitPrice - cost) * item.qty;
        const prev = acc.get(item.productId);
        if (prev) {
          prev.qty += item.qty;
          prev.revenue += revenue;
          prev.profit += profit;
        } else {
          acc.set(item.productId, { name: item.name, qty: item.qty, revenue, profit });
        }
      }
    }
    return Array.from(acc.values()).sort((a, b) => b.profit - a.profit);
  }, [todaySales, products]);

  const totalRevenue = profitByProduct.reduce((s, p) => s + p.revenue, 0);
  const totalProfit = profitByProduct.reduce((s, p) => s + p.profit, 0);
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-5 pb-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-gray-600 active:bg-gray-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Today&apos;s Profit</h1>
          <p className="text-xs text-gray-400">{new Date().toDateString()}</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto flex flex-col gap-4">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
            <p className="text-xs text-gray-400 mb-1">Revenue</p>
            <p className="text-sm font-bold text-gray-900">{naira(totalRevenue)}</p>
          </div>
          <div className="bg-green-600 rounded-2xl p-3 text-center">
            <p className="text-xs text-green-100 mb-1">Profit</p>
            <p className="text-sm font-bold text-white">{naira(totalProfit)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
            <p className="text-xs text-gray-400 mb-1">Margin</p>
            <p className="text-sm font-bold text-gray-900">{margin.toFixed(1)}%</p>
          </div>
        </div>

        {/* Product breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Breakdown by Product</p>
          </div>

          {loading ? (
            <div className="p-4 flex flex-col gap-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : profitByProduct.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No sales recorded today</div>
          ) : (
            <>
              {/* Column headers */}
              <div className="flex items-center px-4 py-2 bg-gray-50 border-b border-gray-100">
                <p className="flex-1 text-xs font-semibold text-gray-400">Product</p>
                <p className="text-xs font-semibold text-gray-400 w-10 text-center">Qty</p>
                <p className="text-xs font-semibold text-gray-400 w-20 text-right">Revenue</p>
                <p className="text-xs font-semibold text-gray-400 w-20 text-right">Profit</p>
              </div>

              <div className="divide-y divide-gray-50">
                {profitByProduct.map((p, i) => (
                  <div key={i} className="flex items-center px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    </div>
                    <p className="text-sm text-gray-500 w-10 text-center">{p.qty}</p>
                    <p className="text-sm text-gray-700 w-20 text-right">{naira(p.revenue)}</p>
                    <p className={`text-sm font-semibold w-20 text-right ${p.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {naira(p.profit)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Total row */}
              <div className="flex items-center px-4 py-3 bg-green-50 border-t border-green-100">
                <p className="flex-1 text-sm font-bold text-green-800">Total</p>
                <p className="text-sm w-10" />
                <p className="text-sm font-bold text-gray-700 w-20 text-right">{naira(totalRevenue)}</p>
                <p className="text-sm font-bold text-green-700 w-20 text-right">{naira(totalProfit)}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
