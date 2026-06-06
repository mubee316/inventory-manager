'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { useProducts } from '@/hooks/useProducts';
import { recordSale } from '@/lib/firestore';
import { naira } from '@/lib/formatters';
import type { SaleItem } from '@/types';
import clsx from 'clsx';

interface CartItem extends SaleItem {
  stockQty: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const { appUser } = useAuthContext();
  const { products, search } = useProducts(appUser?.storeId);

  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Auto-focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Auto-focus amount when payment drawer opens
  useEffect(() => {
    if (showPayment) {
      setTimeout(() => amountRef.current?.focus(), 150);
    }
  }, [showPayment]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return products.slice(0, 8);
    return search(searchQuery).slice(0, 8);
  }, [searchQuery, products, search]);

  const addToCart = useCallback((product: (typeof products)[0]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          qty: 1,
          unitPrice: product.price,
          stockQty: product.stockQty,
        },
      ];
    });
    setSearchQuery('');
    searchRef.current?.focus();
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  }, []);

  const setQty = useCallback((productId: string, val: string) => {
    const n = parseInt(val);
    if (isNaN(n) || n < 0) return;
    if (n === 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
    } else {
      setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, qty: n } : i)));
    }
  }, []);

  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const paid = parseFloat(amountPaid) || 0;
  const status: 'paid' | 'partial' | 'unpaid' =
    paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
  const change = paid > total ? paid - total : 0;

  async function handleSave() {
    if (!appUser || cart.length === 0) return;
    setSaving(true);
    try {
      const id = await recordSale({
        storeId: appUser.storeId,
        items: cart.map(({ productId, name, qty, unitPrice }) => ({
          productId,
          name,
          qty,
          unitPrice,
        })),
        total,
        amountPaid: paid,
        status,
        ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
        soldBy: appUser.uid,
      });
      setSavedId(id);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  }

  // Success screen
  if (savedId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen gap-5 px-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-10 h-10 text-green-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Sale Recorded!</h2>
          <p className="text-gray-500 mt-1">{naira(total)} · {status}</p>
          {change > 0 && (
            <p className="text-green-600 font-semibold mt-1">Change: {naira(change)}</p>
          )}
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => {
              setCart([]);
              setSearchQuery('');
              setAmountPaid('');
              setCustomerName('');
              setShowPayment(false);
              setSaving(false);
              setSavedId(null);
            }}
            className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl active:bg-green-700"
          >
            New Sale
          </button>
          <button
            onClick={() => router.replace('/history')}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl active:bg-gray-200"
          >
            History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">Record Sale</h1>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-red-500 font-medium px-2.5 py-1.5 bg-red-50 rounded-lg active:bg-red-100"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product by name or code..."
            className="w-full pl-9 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            autoComplete="off"
          />
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mt-2 flex flex-col gap-1 max-h-52 overflow-y-auto">
            {searchResults.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                className="flex items-center justify-between px-3 py-2.5 bg-white rounded-xl border border-gray-100 active:bg-green-50 active:border-green-200 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-400">
                    {product.code && <span className="mr-2 text-blue-500">{product.code}</span>}
                    {product.stockQty} in stock
                  </p>
                </div>
                <span className="text-sm font-bold text-gray-900 ml-3 shrink-0">{naira(product.price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 mb-2 opacity-30">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <p className="text-sm">Search and tap a product to add</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {cart.map((item) => (
              <div key={item.productId} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 border border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{naira(item.unitPrice)} each</p>
                </div>

                {/* Qty stepper */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, -1)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-700 active:bg-gray-200 font-bold text-lg"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => setQty(item.productId, e.target.value)}
                    className="w-10 text-center text-sm font-bold bg-transparent focus:outline-none"
                    inputMode="numeric"
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, 1)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-700 active:bg-gray-200 font-bold text-lg"
                  >
                    +
                  </button>
                </div>

                <span className="text-sm font-bold text-gray-900 w-16 text-right shrink-0">
                  {naira(item.unitPrice * item.qty)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {cart.length > 0 && (
        <div className="sticky bottom-16 bg-white border-t border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 font-medium">Total</span>
            <span className="text-xl font-bold text-gray-900">{naira(total)}</span>
          </div>
          <button
            onClick={() => setShowPayment(true)}
            className="w-full py-3.5 bg-green-600 text-white font-bold text-base rounded-2xl active:bg-green-700 transition-colors"
          >
            Proceed to Payment
          </button>
        </div>
      )}

      {/* Payment drawer */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !saving && setShowPayment(false)}
          />
          <div className="relative bg-white rounded-t-3xl px-5 pt-4 pb-8 safe-area-bottom">
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            <h2 className="text-lg font-bold text-gray-900 mb-4">Payment</h2>

            <div className="flex flex-col gap-3 mb-5">
              <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-gray-600">Total</span>
                <span className="text-lg font-bold text-gray-900">{naira(total)}</span>
              </div>

              {/* Amount paid */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Amount Received (₦)</label>
                <input
                  ref={amountRef}
                  type="number"
                  inputMode="decimal"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Quick fill buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAmountPaid(total.toString())}
                  className="flex-1 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-xl active:bg-green-100"
                >
                  Exact: {naira(total)}
                </button>
                <button
                  type="button"
                  onClick={() => setAmountPaid('')}
                  className="py-2 px-4 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl active:bg-gray-200"
                >
                  Unpaid
                </button>
              </div>

              {/* Status preview */}
              <div className={clsx(
                'rounded-xl px-4 py-2 text-sm font-medium',
                status === 'paid' ? 'bg-green-50 text-green-700' :
                status === 'partial' ? 'bg-yellow-50 text-yellow-700' :
                'bg-red-50 text-red-700'
              )}>
                {status === 'paid' && `Paid in full${change > 0 ? ` · Change: ${naira(change)}` : ''}`}
                {status === 'partial' && `Partial payment · Balance: ${naira(total - paid)}`}
                {status === 'unpaid' && 'Unpaid — will show in debt list'}
              </div>

              {/* Customer name */}
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name (optional)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className={clsx(
                'w-full py-4 text-white font-bold text-base rounded-2xl transition-colors',
                saving ? 'bg-green-400' : 'bg-green-600 active:bg-green-700'
              )}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Sale'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
