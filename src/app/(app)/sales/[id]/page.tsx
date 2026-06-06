'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { naira, formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui/Badge';
import type { Sale } from '@/types';
import clsx from 'clsx';

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [additional, setAdditional] = useState('');
  const [saving, setSaving] = useState(false);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'sales', id), (snap) => {
      setSale(snap.exists() ? ({ id: snap.id, ...snap.data() } as Sale) : null);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  async function handleRecordPayment() {
    if (!sale) return;
    const amount = parseFloat(additional);
    if (isNaN(amount) || amount <= 0) {
      setPayError('Enter a valid amount');
      return;
    }
    setPayError('');
    setSaving(true);
    try {
      const newAmountPaid = sale.amountPaid + amount;
      const newStatus: Sale['status'] =
        newAmountPaid >= sale.total ? 'paid' : newAmountPaid > 0 ? 'partial' : 'unpaid';
      await updateDoc(doc(db, 'sales', id), {
        amountPaid: newAmountPaid,
        status: newStatus,
      });
      setAdditional('');
      setShowPayment(false);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <span className="w-6 h-6 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sale) {
    return <p className="p-6 text-gray-500">Sale not found</p>;
  }

  const balance = sale.total - sale.amountPaid;

  function shareReceipt() {
    if (!sale) return;
    const lines = [
      `🧾 *StoreSync Receipt*`,
      `─────────────────`,
      ...sale.items.map((i) => `${i.name} x${i.qty}  ₦${(i.unitPrice * i.qty).toLocaleString()}`),
      `─────────────────`,
      `Total:  ₦${sale.total.toLocaleString()}`,
      `Paid:   ₦${sale.amountPaid.toLocaleString()}`,
      balance > 0 ? `Owes:   ₦${balance.toLocaleString()}` : '',
      sale.customerName ? `\nCustomer: ${sale.customerName}` : '',
      `\nStatus: ${sale.status.toUpperCase()}`,
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      navigator.share({ text: lines });
    } else {
      navigator.clipboard.writeText(lines);
      alert('Receipt copied to clipboard');
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-5 pb-3 border-b border-gray-100 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-xl text-gray-600 active:bg-gray-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Sale Details</h1>
          <p className="text-xs text-gray-400">{formatDate(sale.createdAt)}</p>
        </div>
        <button
          onClick={shareReceipt}
          className="p-2 rounded-xl text-gray-600 active:bg-gray-100"
          title="Share receipt"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4 max-w-lg mx-auto">
        {/* Status + summary */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <StatusBadge status={sale.status} />
            {sale.customerName && (
              <span className="text-sm text-gray-600">{sale.customerName}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Total</span>
            <span className="text-xl font-bold text-gray-900">{naira(sale.total)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-gray-500 text-sm">Paid</span>
            <span className="text-sm font-semibold text-green-600">{naira(sale.amountPaid)}</span>
          </div>
          {balance > 0 && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-red-500 text-sm font-medium">Balance owed</span>
              <span className="text-sm font-bold text-red-500">{naira(balance)}</span>
            </div>
          )}
        </div>

        {/* Record payment button */}
        {balance > 0 && (
          <button
            onClick={() => setShowPayment(true)}
            className="w-full py-3.5 bg-green-600 text-white font-bold rounded-2xl active:bg-green-700"
          >
            Record Payment
          </button>
        )}

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Items ({sale.items.length})</h2>
          </div>
          {sale.items.map((item, idx) => (
            <div
              key={idx}
              className="px-4 py-3 flex items-center justify-between border-b border-gray-50 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-400">
                  {naira(item.unitPrice)} × {item.qty}
                </p>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {naira(item.unitPrice * item.qty)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment drawer */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !saving && setShowPayment(false)}
          />
          <div className="relative bg-white rounded-t-3xl px-5 pt-4 pb-8">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Record Payment</h2>
            <p className="text-sm text-gray-500 mb-4">
              Outstanding balance: <span className="font-semibold text-red-500">{naira(balance)}</span>
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Amount received (₦)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={additional}
                  onChange={(e) => setAdditional(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Quick fill */}
              <button
                type="button"
                onClick={() => setAdditional(balance.toString())}
                className="w-full py-2 text-sm font-medium text-green-600 bg-green-50 rounded-xl active:bg-green-100"
              >
                Pay full balance: {naira(balance)}
              </button>

              {payError && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{payError}</p>
              )}

              <button
                onClick={handleRecordPayment}
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
                  'Confirm Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
