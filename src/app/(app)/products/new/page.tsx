'use client';

import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { useProducts } from '@/hooks/useProducts';
import { ProductForm } from '@/components/products/ProductForm';

export default function NewProductPage() {
  const router = useRouter();
  const { appUser } = useAuthContext();
  const { categories } = useProducts(appUser?.storeId);

  return (
    <div>
      <div className="sticky top-0 bg-white z-10 px-4 pt-5 pb-3 border-b border-gray-100 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-xl text-gray-600 active:bg-gray-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Add Product</h1>
      </div>
      <ProductForm categories={categories} />
    </div>
  );
}
