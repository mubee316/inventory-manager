'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { can } from '@/constants/roles';
import { useProducts } from '@/hooks/useProducts';
import { recordSale } from '@/lib/firestore';
import { naira } from '@/lib/formatters';
import type { SaleItem } from '@/types';
import clsx from 'clsx';

interface CartItem extends SaleItem {
  stockQty: number;
  // Narrowed from SaleItem's optional flag: every cart line resolves this at
  // the moment it is added, from the product's stock at that time.
  owing: boolean;
}

export default function NewSalePage() {
  const router = useRouter();
  const { appUser } = useAuthContext();
  const { products, categories, search } = useProducts(appUser?.storeId);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const visibleProducts = useMemo(() => {
    let list = searchQuery.trim() ? search(searchQuery) : products;
    if (activeCategory !== 'All' && !searchQuery.trim()) {
      list = list.filter((p) => p.category === activeCategory);
    }
    return list;
  }, [searchQuery, activeCategory, products, search]);

  const addToCart = useCallback((product: (typeof products)[0]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        qty: 1,
        unitPrice: product.price,
        stockQty: product.stockQty,
        owing: product.stockQty <= 0,
      }];
    });
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => i.productId === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
          .filter((i) => i.qty > 0)
    );
  }, []);

  const cartQty = (productId: string) => cart.find((i) => i.productId === productId)?.qty ?? 0;
  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
  const paid = parseFloat(amountPaid) || 0;
  const status: 'paid' | 'partial' | 'unpaid' =
    paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
  const change = paid > total ? paid - total : 0;
  const owingCount = cart.reduce((n, item) => n + (item.owing ? 1 : 0), 0);
  const hasOwing = owingCount > 0;

  async function handleSave() {
    if (!appUser || cart.length === 0) return;
    if (hasOwing && !customerName.trim()) {
      alert('Customer name is required when goods are owed');
      return;
    }
    if (hasOwing && !customerPhone.trim()) {
      alert('Customer phone is required when goods are owed');
      return;
    }
    setSaving(true);
    try {
      const id = await recordSale({
        storeId: appUser.storeId,
        items: cart.map(({ productId, name, qty, unitPrice, owing }) => ({
          productId, name, qty, unitPrice, ...(owing ? { owing: true } : {}),
        })),
        total,
        amountPaid: paid,
        status,
        ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
        ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
        ...(hasOwing ? { owing: true } : {}),
        soldBy: appUser.uid,
      });
      setSavedId(id);
    } catch (err) {
      console.error(err);
      alert('Could not save the sale. Please try again.');
      setSaving(false);
    }
  }

  // ── Permission guard ────────────────────────────────────────────
  if (!can(appUser, 'RECORD_SALE')) {
    return <p className="p-6 text-gray-500">You don&apos;t have permission to record sales.</p>;
  }

  // ── Success screen ──────────────────────────────────────────────
  if (savedId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen gap-5 px-6 bg-white">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-10 h-10 text-green-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Sale Recorded!</h2>
          <p className="text-gray-500 mt-1">{naira(total)} · {status}</p>
          {change > 0 && <p className="text-green-600 font-semibold mt-1">Change: {naira(change)}</p>}
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => { setCart([]); setAmountPaid(''); setCustomerName(''); setCustomerPhone(''); setSaving(false); setSavedId(null); setShowPayment(false); setShowCart(false); }}
            className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl"
          >New Sale</button>
          <button onClick={() => router.replace('/history')} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">
            History
          </button>
        </div>
      </div>
    );
  }

  // ── Main page ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">

      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100 px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">Record Sale</h1>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-red-500 font-medium px-2.5 py-1.5 bg-red-50 rounded-lg">
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
            type="search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setActiveCategory('All'); }}
            placeholder="Search product by name or code..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            autoComplete="off"
          />
        </div>

        {/* Category tabs */}
        {!searchQuery && (
          <div className="flex gap-2 mt-2.5 overflow-x-auto scrollbar-hide pb-0.5">
            {['All', ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={clsx(
                  'shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors',
                  activeCategory === cat ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-32">
        {visibleProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No products found</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visibleProducts.map((product) => {
              const qty = cartQty(product.id);
              const outOfStock = product.stockQty <= 0;
              return (
                <div
                  key={product.id}
                  className={clsx(
                    'bg-white rounded-2xl p-3 border flex flex-col gap-2 transition-colors',
                    qty > 0 ? 'border-green-300' : 'border-gray-100',
                    outOfStock && qty === 0 && 'border-orange-200'
                  )}
                >
                  {/* Product initial avatar */}
                  <div className="w-full h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-300">{product.name[0].toUpperCase()}</span>
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-400">{product.stockQty} in stock</p>
                    {outOfStock && <p className="text-xs text-orange-500 font-medium">Out of stock · sells as owed</p>}
                    <p className="text-sm font-bold text-green-600 mt-0.5">{naira(product.price)}</p>
                  </div>

                  {/* Add / qty stepper */}
                  {qty === 0 ? (
                    <button
                      onClick={() => addToCart(product)}
                      className={clsx(
                        'w-full py-2 text-white text-xs font-bold rounded-xl',
                        outOfStock ? 'bg-orange-500 active:bg-orange-600' : 'bg-green-600 active:bg-green-700'
                      )}
                    >
                      {outOfStock ? 'Sell as Owed' : 'Add'}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 rounded-xl px-2 py-1">
                      <button onClick={() => updateQty(product.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-gray-700 font-bold shadow-sm active:bg-gray-100">−</button>
                      <span className="text-sm font-bold text-green-700">{qty}</span>
                      <button onClick={() => addToCart(product)} className="w-7 h-7 flex items-center justify-center bg-green-600 rounded-lg text-white font-bold active:bg-green-700">+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky cart bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-white border-t border-gray-100 z-20">
          <button
            onClick={() => setShowCart(true)}
            className="w-full py-3.5 bg-green-600 text-white font-bold text-base rounded-2xl flex items-center justify-between px-5 active:bg-green-700"
          >
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalItems}</span>
            <span>View Cart</span>
            <span>{naira(total)}</span>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="relative bg-white rounded-t-3xl px-5 pt-4 pb-6 max-h-[80vh] flex flex-col">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Cart ({totalItems} items)</h2>
              <button onClick={() => setShowCart(false)} className="text-xs text-gray-400 px-2 py-1">Done</button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-4">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{naira(item.unitPrice)} each</p>
                    {item.owing && <p className="text-xs text-orange-500 font-medium">Owed — not in stock</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => updateQty(item.productId, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-gray-700 font-bold shadow-sm">−</button>
                    <span className="text-sm font-bold w-5 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.productId, 1)} className="w-7 h-7 flex items-center justify-center bg-green-600 rounded-lg text-white font-bold">+</button>
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-16 text-right shrink-0">{naira(item.unitPrice * item.qty)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-3 px-1">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="text-xl font-bold text-gray-900">{naira(total)}</span>
            </div>
            <button
              onClick={() => { setShowCart(false); setShowPayment(true); }}
              className="w-full py-3.5 bg-green-600 text-white font-bold rounded-2xl active:bg-green-700"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      )}

      {/* Payment drawer */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setShowPayment(false)} />
          <div className="relative bg-white rounded-t-3xl px-5 pt-4 pb-8 safe-area-bottom">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-bold text-gray-900 mb-4">Payment</h2>

            <div className="flex flex-col gap-3 mb-5">
              <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-gray-600">Total</span>
                <span className="text-lg font-bold text-gray-900">{naira(total)}</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Amount Received (₦)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex gap-2">
                <button onClick={() => setAmountPaid(total.toString())} className="flex-1 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-xl">
                  Exact: {naira(total)}
                </button>
                <button onClick={() => setAmountPaid('')} className="py-2 px-4 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl">
                  Unpaid
                </button>
              </div>

              <div className={clsx(
                'rounded-xl px-4 py-2 text-sm font-medium',
                status === 'paid' ? 'bg-green-50 text-green-700' :
                status === 'partial' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
              )}>
                {status === 'paid' && `Paid in full${change > 0 ? ` · Change: ${naira(change)}` : ''}`}
                {status === 'partial' && `Partial · Balance: ${naira(total - paid)}`}
                {status === 'unpaid' && 'Unpaid — will show in debtors'}
              </div>

              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={hasOwing ? 'Customer name (required)' : 'Customer name (optional)'}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />

              {hasOwing && (
                <>
                  <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg flex flex-col gap-1">
                    <span className="font-semibold">
                      {owingCount} item{owingCount !== 1 ? 's' : ''} out of stock — owed to this customer
                    </span>
                    <span>Their stock is untouched until you hand the goods over from Deliveries.</span>
                  </div>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Customer phone (required)"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving || cart.length === 0 || (hasOwing && (!customerName.trim() || !customerPhone.trim()))}
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
              ) : 'Save Sale'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
