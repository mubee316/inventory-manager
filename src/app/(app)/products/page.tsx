'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { useProducts } from '@/hooks/useProducts';
import { can } from '@/constants/roles';
import { naira } from '@/lib/formatters';
import { Badge } from '@/components/ui/Badge';
import { deleteProduct } from '@/lib/firestore';
import clsx from 'clsx';

export default function ProductsPage() {
  const { appUser } = useAuthContext();
  const { products, loading, search, categories } = useProducts(appUser?.storeId);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const isOwner = can(appUser, 'VIEW_COST');

  const results = useMemo(() => {
    const searched = search(searchQuery);
    if (!activeCategory) return searched;
    return searched.filter((p) => p.category === activeCategory);
  }, [searchQuery, activeCategory, search]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await deleteProduct(id);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">Products</h1>
          {can(appUser,'ADD_EDIT_PRODUCT') && (
            <div className="flex gap-2">
              <Link
                href="/products/restock"
                className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm font-semibold px-3 py-2 rounded-xl active:bg-gray-200"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v12.59l1.95-2.1a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0L6.2 14.26a.75.75 0 111.1-1.02l1.95 2.1V2.75A.75.75 0 0110 2z" clipRule="evenodd" />
                </svg>
                Restock
              </Link>
              <Link
                href="/products/new"
                className="flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-3 py-2 rounded-xl active:bg-green-700"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                Add
              </Link>
            </div>
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
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or code..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 mt-2.5 overflow-x-auto scrollbar-hide pb-0.5">
            <button
              onClick={() => setActiveCategory('')}
              className={clsx(
                'shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors',
                !activeCategory ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? '' : cat)}
                className={clsx(
                  'shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors',
                  cat === activeCategory ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400">
              {searchQuery || activeCategory ? 'No products match your search' : 'No products yet'}
            </p>
            {can(appUser,'ADD_EDIT_PRODUCT') && !searchQuery && !activeCategory && (
              <Link href="/products/new" className="inline-block mt-3 text-green-600 font-semibold text-sm">
                Add your first product
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-2">
              {results.length} product{results.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-col gap-2">
              {results.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3"
                >
                  {/* Image or placeholder */}
                  <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0 overflow-hidden">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl font-bold">
                        {product.name[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm truncate">{product.name}</p>
                      {product.code && (
                        <Badge variant="blue">{product.code}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{product.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-gray-900">{naira(product.price)}</span>
                      {isOwner && (
                        <span className="text-xs text-gray-400">cost: {naira(product.cost)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={clsx(
                      'text-xs font-bold',
                      product.stockQty <= 0 ? 'text-red-500' : product.stockQty < 5 ? 'text-orange-500' : 'text-gray-500'
                    )}>
                      {product.stockQty} in stock
                    </span>
                    {can(appUser,'ADD_EDIT_PRODUCT') && (
                      <div className="flex gap-1.5">
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded-lg active:bg-green-100"
                        >
                          Edit
                        </Link>
                        {can(appUser,'DELETE_PRODUCT') && (
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="text-xs text-red-500 font-medium px-2 py-1 bg-red-50 rounded-lg active:bg-red-100"
                          >
                            Del
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
