'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { can } from '@/constants/roles';
import { useSales } from '@/hooks/useSales';
import { naira } from '@/lib/formatters';

interface DebtorGroup {
  customerName: string;
  totalOwed: number;
  saleCount: number;
  saleIds: string[];
}

export default function DebtorsPage() {
  const { appUser } = useAuthContext();
  const { sales, loading } = useSales(appUser?.storeId);

  const debtors = useMemo(() => {
    const unpaid = sales.filter((s) => s.status !== 'paid');
    const map = new Map<string, DebtorGroup>();

    for (const sale of unpaid) {
      const key = sale.customerName?.trim() || 'Unknown Customer';
      const owed = sale.total - sale.amountPaid;
      const existing = map.get(key);
      if (existing) {
        existing.totalOwed += owed;
        existing.saleCount += 1;
        existing.saleIds.push(sale.id);
      } else {
        map.set(key, {
          customerName: key,
          totalOwed: owed,
          saleCount: 1,
          saleIds: [sale.id],
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalOwed - a.totalOwed);
  }, [sales]);

  const totalOutstanding = debtors.reduce((sum, d) => sum + d.totalOwed, 0);

  if (!can(appUser, 'VIEW_HISTORY')) {
    return <p className="p-6 text-gray-500">You don&apos;t have permission to view debtors.</p>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-5 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Debtors</h1>
        {!loading && debtors.length > 0 && (
          <p className="text-sm text-gray-500 mt-0.5">
            {debtors.length} customer{debtors.length !== 1 ? 's' : ''} owe{debtors.length === 1 ? 's' : ''} you money
          </p>
        )}
      </div>

      {/* Total outstanding */}
      {!loading && totalOutstanding > 0 && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-red-700">Total Outstanding</p>
          <p className="text-lg font-bold text-red-600">{naira(totalOutstanding)}</p>
        </div>
      )}

      {/* List */}
      <div className="px-4 py-3 flex flex-col gap-2">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : debtors.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-green-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">All paid up!</p>
            <p className="text-gray-400 text-sm mt-1">No outstanding balances</p>
          </div>
        ) : (
          debtors.map((debtor) => (
            <div key={debtor.customerName} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Debtor header */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-red-600">
                      {debtor.customerName[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{debtor.customerName}</p>
                    <p className="text-xs text-gray-400">
                      {debtor.saleCount} unpaid sale{debtor.saleCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <p className="text-base font-bold text-red-500">{naira(debtor.totalOwed)}</p>
              </div>

              {/* Individual sales */}
              {debtor.saleIds.map((id) => {
                const sale = sales.find((s) => s.id === id);
                if (!sale) return null;
                const owed = sale.total - sale.amountPaid;
                return (
                  <Link
                    key={id}
                    href={`/sales/${id}`}
                    className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-100 active:bg-gray-100"
                  >
                    <div>
                      <p className="text-xs font-medium text-gray-700">
                        {sale.items.length} item{sale.items.length !== 1 ? 's' : ''} · {naira(sale.total)}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{sale.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-red-500">owes {naira(owed)}</span>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-300">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
