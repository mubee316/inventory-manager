'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { useSales } from '@/hooks/useSales';
import { naira, formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui/Badge';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import clsx from 'clsx';

type StatusFilter = 'all' | 'paid' | 'partial' | 'unpaid';
type DateFilter = 'all' | 'today' | 'week' | 'month';

function tsToDate(ts: Timestamp | null | undefined): Date | null {
  if (!ts) return null;
  return typeof (ts as Timestamp).toDate === 'function' ? (ts as Timestamp).toDate() : null;
}

export default function HistoryPage() {
  const { appUser } = useAuthContext();
  const { sales, loading, hasMore, loadMore } = useSales(appUser?.storeId);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const filtered = useMemo(() => {
    return sales.filter((sale) => {
      if (statusFilter !== 'all' && sale.status !== statusFilter) return false;
      if (dateFilter !== 'all') {
        const saleDate = tsToDate(sale.createdAt);
        if (!saleDate) return false;
        const now = new Date();
        if (dateFilter === 'today') {
          return saleDate >= startOfDay(now) && saleDate <= endOfDay(now);
        }
        if (dateFilter === 'week') {
          return saleDate >= startOfDay(subDays(now, 7));
        }
        if (dateFilter === 'month') {
          return saleDate >= startOfDay(subDays(now, 30));
        }
      }
      return true;
    });
  }, [sales, statusFilter, dateFilter]);

  const totalRevenue = filtered.reduce((s, sale) => s + sale.total, 0);
  const totalReceived = filtered.reduce((s, sale) => s + sale.amountPaid, 0);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-5 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Sales History</h1>

        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-2">
          {(['all', 'paid', 'partial', 'unpaid'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                'shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors capitalize',
                statusFilter === s ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
              )}
            >
              {s === 'all' ? 'All' : s === 'unpaid' ? 'Owes me' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Date filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {([['all', 'All time'], ['today', 'Today'], ['week', 'This week'], ['month', '30 days']] as [DateFilter, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDateFilter(val)}
              className={clsx(
                'shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors',
                dateFilter === val ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{filtered.length} sales</p>
            <p className="text-sm font-bold text-gray-900">{naira(totalRevenue)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Received</p>
            <p className="text-sm font-bold text-green-600">{naira(totalReceived)}</p>
          </div>
          {totalRevenue > totalReceived && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Outstanding</p>
              <p className="text-sm font-bold text-red-500">{naira(totalRevenue - totalReceived)}</p>
            </div>
          )}
        </div>
      )}

      {/* Sales list */}
      <div className="px-4 py-3">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No sales found</p>
            {statusFilter === 'unpaid' && (
              <p className="text-gray-400 text-xs mt-1">No outstanding balances</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((sale) => (
              <Link
                key={sale.id}
                href={`/sales/${sale.id}`}
                className="bg-white rounded-2xl p-4 border border-gray-100 active:bg-gray-50 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">
                      {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                    </p>
                    <StatusBadge status={sale.status} />
                  </div>
                  {sale.customerName && (
                    <p className="text-xs text-gray-500 mt-0.5">{sale.customerName}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(sale.createdAt)}</p>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-sm font-bold text-gray-900">{naira(sale.total)}</p>
                  {sale.status !== 'paid' && (
                    <p className="text-xs text-red-500">
                      owes {naira(sale.total - sale.amountPaid)}
                    </p>
                  )}
                </div>
              </Link>
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                className="w-full py-3 text-sm text-green-600 font-medium bg-green-50 rounded-xl active:bg-green-100"
              >
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
