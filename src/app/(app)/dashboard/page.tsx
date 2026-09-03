'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  collection, query, where, onSnapshot, Timestamp,
  getAggregateFromServer, sum, count, getDoc, doc,
} from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { can } from '@/constants/roles';
import { lowStockQuery } from '@/lib/firestore';
import { useProducts } from '@/hooks/useProducts';
import { useProductCosts } from '@/hooks/useProductCosts';
import { naira, formatDate } from '@/lib/formatters';
import type { Sale, Product, Store } from '@/types';
import Link from 'next/link';

export default function DashboardPage() {
  const { appUser } = useAuthContext();
  const { products } = useProducts(appUser?.storeId);
  const [store, setStore] = useState<Store | null>(null);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [allTime, setAllTime] = useState<{ revenue: number; received: number; count: number } | null>(null);

  // What this user is allowed to see on the dashboard.
  const canViewDashboard = can(appUser, 'VIEW_DASHBOARD'); // revenue / sales figures
  const canViewHistory = can(appUser, 'VIEW_HISTORY');     // recent activity / debtors
  const canSeeSales = canViewDashboard || canViewHistory;

  useEffect(() => {
    if (!appUser?.storeId) return;

    getDoc(doc(db, 'stores', appUser.storeId)).then((snap) => {
      if (snap.exists()) setStore({ id: snap.id, ...snap.data() } as Store);
    });

    const unsubStock = onSnapshot(lowStockQuery(appUser.storeId), (snap) => {
      setLowStock(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
    });

    // Only read sales for users permitted to see them (also avoids rules denials).
    if (!canSeeSales) {
      setLoadingSales(false);
      return () => { unsubStock(); };
    }

    const todayStart = Timestamp.fromDate(startOfDay(new Date()));
    const todayEnd = Timestamp.fromDate(endOfDay(new Date()));

    const salesQ = query(
      collection(db, 'sales'),
      where('storeId', '==', appUser.storeId),
      where('createdAt', '>=', todayStart),
      where('createdAt', '<=', todayEnd)
    );

    const unsubSales = onSnapshot(salesQ, (snap) => {
      setTodaySales(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale)));
      setLoadingSales(false);
    });

    const allSalesQ = query(collection(db, 'sales'), where('storeId', '==', appUser.storeId));
    getAggregateFromServer(allSalesQ, {
      revenue: sum('total'),
      received: sum('amountPaid'),
      txCount: count(),
    }).then((snap) => {
      setAllTime({
        revenue: snap.data().revenue,
        received: snap.data().received,
        count: snap.data().txCount,
      });
    }).catch(() => {});

    return () => { unsubSales(); unsubStock(); };
  }, [appUser?.storeId, canSeeSales]);

  const todayTotal = todaySales.reduce((s, sale) => s + sale.total, 0);
  const isOwner = appUser?.role === 'owner';
  const costs = useProductCosts(appUser?.storeId, isOwner);

  const profitByProduct = useMemo(() => {
    if (!isOwner || !todaySales.length) return [];
    const acc = new Map<string, { name: string; qty: number; profit: number }>();
    for (const sale of todaySales) {
      for (const item of sale.items) {
        const cost = costs.get(item.productId) ?? 0;
        const profit = (item.unitPrice - cost) * item.qty;
        const prev = acc.get(item.productId);
        if (prev) {
          prev.qty += item.qty;
          prev.profit += profit;
        } else {
          acc.set(item.productId, { name: item.name, qty: item.qty, profit });
        }
      }
    }
    return Array.from(acc.values()).sort((a, b) => b.profit - a.profit);
  }, [todaySales, costs, isOwner]);

  const todayProfit = profitByProduct.reduce((s, p) => s + p.profit, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-10 pb-4 border-b border-gray-100">
        <p className="text-gray-400 text-xs mb-0.5">Good {getGreeting()}, {appUser?.name}</p>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">{store?.name ?? 'Your Store'}</h1>
          {canViewHistory && (
            <Link href="/history" className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
              View All
            </Link>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Store Overview</p>
      </div>

      <div className="px-4 py-4 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Stat row — inventory stats are always shown; Sales Today needs dashboard access */}
        <div className={`grid gap-3 ${canViewDashboard ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <Link href="/products" className="bg-white rounded-2xl p-3 border border-gray-100 text-center active:bg-gray-50">
            <p className="text-2xl font-bold text-blue-600">{products.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Products</p>
          </Link>
          <Link href="/products" className="bg-white rounded-2xl p-3 border border-gray-100 text-center active:bg-gray-50">
            <p className="text-2xl font-bold text-orange-500">{lowStock.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Low Stock</p>
          </Link>
          {canViewDashboard && (
            <div className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
              {loadingSales ? (
                <div className="h-8 w-10 bg-gray-100 rounded animate-pulse mx-auto mb-1" />
              ) : (
                <p className="text-2xl font-bold text-green-600">{todaySales.length}</p>
              )}
              <p className="text-xs text-gray-500 mt-0.5">Sales Today</p>
            </div>
          )}
        </div>

        {/* Today's revenue */}
        {canViewDashboard && (
          <div className="bg-green-600 rounded-2xl p-4 text-white">
            <p className="text-green-100 text-xs font-medium mb-1">Today&apos;s Revenue</p>
            {loadingSales ? (
              <div className="h-8 w-32 bg-green-500 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold">{naira(todayTotal)}</p>
            )}
            {allTime && (
              <p className="text-green-200 text-xs mt-1">
                All-time: {naira(allTime.revenue)} · {allTime.count} sales
              </p>
            )}
          </div>
        )}

        {/* Today's profit — owner only */}
        {isOwner && !loadingSales && (
          <Link href="/profit" className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between active:bg-gray-50">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Today&apos;s Profit</p>
              <p className="text-lg font-bold text-green-600">
                {profitByProduct.length === 0 ? naira(0) : naira(todayProfit)}
              </p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        {/* Quick actions — each only shown if the user's role allows it */}
        {(() => {
          const actions = [
            { label: 'Add Product', href: '/products/new', perm: 'ADD_PRODUCT', bg: 'bg-blue-50', color: 'text-blue-600',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /> },
            { label: 'Restock', href: '/products/restock', perm: 'RESTOCK', bg: 'bg-orange-50', color: 'text-orange-600',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /> },
            { label: 'Record Sale', href: '/sales/new', perm: 'RECORD_SALE', bg: 'bg-green-50', color: 'text-green-600',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /> },
            { label: 'Debtors', href: '/debtors', perm: 'VIEW_HISTORY', bg: 'bg-red-50', color: 'text-red-500',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /> },
            { label: 'Deliveries', href: '/deliveries', perm: 'VIEW_HISTORY', bg: 'bg-orange-50', color: 'text-orange-500',
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /> },
          ] as const;
          const visible = actions.filter((a) => can(appUser, a.perm));
          if (visible.length === 0) return null;
          return (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Actions</p>
              <div className="grid grid-cols-4 gap-2">
                {visible.map((action) => (
                  <Link key={action.label} href={action.href}
                    className="flex flex-col items-center gap-1.5 active:opacity-70"
                  >
                    <div className={`w-14 h-14 ${action.bg} rounded-2xl flex items-center justify-center`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-6 h-6 ${action.color}`}>
                        {action.icon}
                      </svg>
                    </div>
                    <span className="text-xs text-gray-600 font-medium text-center leading-tight">{action.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-orange-800">Low Stock</p>
              <Link href="/products/restock" className="text-xs text-orange-700 font-medium">Restock →</Link>
            </div>
            <div className="flex flex-col gap-1.5">
              {lowStock.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                  <span className="text-sm text-gray-800 truncate">{p.name}</span>
                  <span className="text-xs font-bold text-red-600 ml-2 shrink-0">{p.stockQty} left</span>
                </div>
              ))}
              {lowStock.length > 3 && (
                <p className="text-xs text-orange-700 font-medium text-center mt-1">+{lowStock.length - 3} more</p>
              )}
            </div>
          </div>
        )}

        {/* Recent activity — sales history */}
        {canViewHistory && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">Recent Activity</p>
            <Link href="/history" className="text-xs text-green-600 font-medium">View All</Link>
          </div>

          {loadingSales ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : todaySales.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-gray-400 text-sm">No sales today</p>
              <Link href="/sales/new" className="inline-block mt-2 text-green-600 font-semibold text-sm">
                Record first sale →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {todaySales.slice(0, 8).map((sale) => (
                <Link key={sale.id} href={`/sales/${sale.id}`}
                  className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 border border-gray-100 active:bg-gray-50"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    sale.status === 'paid' ? 'bg-green-100' : sale.status === 'partial' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                      className={`w-4 h-4 ${sale.status === 'paid' ? 'text-green-600' : sale.status === 'partial' ? 'text-yellow-600' : 'text-red-500'}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {sale.items[0]?.name}{sale.items.length > 1 ? ` and ${sale.items.length - 1} more` : ''}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(sale.createdAt)} · {sale.status}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 shrink-0">{naira(sale.total)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
