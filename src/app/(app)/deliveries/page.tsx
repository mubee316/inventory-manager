'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { can } from '@/constants/roles';
import { useSales } from '@/hooks/useSales';
import { useProducts } from '@/hooks/useProducts';
import { fulfillOwingSale, owingItemsOf } from '@/lib/firestore';
import { naira, formatDate } from '@/lib/formatters';
import type { Sale, SaleItem } from '@/types';
import clsx from 'clsx';

interface PendingDelivery {
  sale: Sale;
  items: SaleItem[];
  qty: number;
  value: number;
}

export default function DeliveriesPage() {
  const { appUser } = useAuthContext();
  const { sales, loading } = useSales(appUser?.storeId);
  const { products } = useProducts(appUser?.storeId);
  const [fulfilling, setFulfilling] = useState<string | null>(null);

  // Handing goods over is two writes with two different rules: stamping the sale
  // needs CONFIRM_PAYMENT, and taking the stock down needs one of the product
  // update permissions. The transaction is atomic, so missing either just fails —
  // keep the button in lockstep with firestore.rules rather than let that happen.
  const canFulfil =
    can(appUser, 'CONFIRM_PAYMENT') &&
    (can(appUser, 'RECORD_SALE') || can(appUser, 'RESTOCK') || can(appUser, 'EDIT_PRODUCT'));

  const pending = useMemo<PendingDelivery[]>(() => {
    return sales
      .filter((sale) => sale.owing && !sale.owingFulfilledAt)
      .map((sale) => {
        const items = owingItemsOf(sale);
        return {
          sale,
          items,
          qty: items.reduce((n, item) => n + item.qty, 0),
          value: items.reduce((n, item) => n + item.unitPrice * item.qty, 0),
        };
      })
      .filter((entry) => entry.items.length > 0);
  }, [sales]);

  const totalValue = pending.reduce((sum, entry) => sum + entry.value, 0);

  // Stock has usually been replenished by the time goods are handed over, so
  // show whether each line can actually be filled right now.
  const stockOf = (productId: string) =>
    products.find((p) => p.id === productId)?.stockQty ?? 0;

  async function handleFulfil(saleId: string) {
    if (!confirm('Mark these goods as handed over? This removes them from stock.')) return;
    setFulfilling(saleId);
    try {
      await fulfillOwingSale(saleId);
    } catch (err) {
      console.error(err);
      alert('Could not mark this delivery. Please try again.');
    } finally {
      setFulfilling(null);
    }
  }

  if (!can(appUser, 'VIEW_HISTORY')) {
    return <p className="p-6 text-gray-500">You don&apos;t have permission to view deliveries.</p>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-5 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Deliveries</h1>
        {!loading && pending.length > 0 && (
          <p className="text-sm text-gray-500 mt-0.5">
            {pending.length} sale{pending.length !== 1 ? 's' : ''} waiting on goods you owe
          </p>
        )}
      </div>

      {/* Total value of goods owed */}
      {!loading && totalValue > 0 && (
        <div className="mx-4 mt-4 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-orange-700">Goods Owed</p>
          <p className="text-lg font-bold text-orange-600">{naira(totalValue)}</p>
        </div>
      )}

      {/* List */}
      <div className="px-4 py-3 flex flex-col gap-2">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : pending.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-green-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Nothing outstanding</p>
            <p className="text-gray-400 text-sm mt-1">Every sale has been handed over</p>
          </div>
        ) : (
          pending.map(({ sale, items, qty, value }) => {
            const canFillNow = items.every((item) => stockOf(item.productId) >= item.qty);
            const balance = sale.total - sale.amountPaid;
            return (
              <div key={sale.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Customer */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-orange-600">
                        {(sale.customerName?.trim() || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {sale.customerName?.trim() || 'Unknown Customer'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {sale.customerPhone || 'No phone'} · {formatDate(sale.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="text-base font-bold text-orange-500 shrink-0">{naira(value)}</p>
                </div>

                {/* The lines still owed */}
                <div className="border-t border-gray-100">
                  {items.map((item) => {
                    const available = stockOf(item.productId);
                    return (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {item.qty} × {item.name}
                        </p>
                        <span
                          className={clsx(
                            'text-xs font-semibold shrink-0 ml-2',
                            available >= item.qty ? 'text-green-600' : 'text-orange-500'
                          )}
                        >
                          {available >= item.qty ? 'in stock' : `${available} in stock`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Payment state + hand-over */}
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">
                      {qty} item{qty !== 1 ? 's' : ''} owed
                    </p>
                    <p className={clsx('text-xs font-medium', balance > 0 ? 'text-red-500' : 'text-green-600')}>
                      {balance > 0 ? `${naira(balance)} still to pay` : 'Paid in full'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/sales/${sale.id}`}
                      className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-xl active:bg-gray-200"
                    >
                      View
                    </Link>
                    {canFulfil && (
                      <button
                        onClick={() => handleFulfil(sale.id)}
                        disabled={fulfilling === sale.id || !canFillNow}
                        className="px-3 py-2 text-xs font-bold text-white bg-green-600 rounded-xl active:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400"
                      >
                        {fulfilling === sale.id
                          ? 'Saving...'
                          : canFillNow
                            ? 'Mark Delivered'
                            : 'Restock first'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
