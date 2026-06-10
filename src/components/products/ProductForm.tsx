'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteField } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { addProduct, updateProduct } from '@/lib/firestore';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { can } from '@/constants/roles';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';
import type { Product } from '@/types';

const PRESET_CATEGORIES = [
  'Food & Drinks',
  'Beverages',
  'Snacks',
  'Groceries',
  'Household',
  'Personal Care',
  'Baby Items',
  'Electronics',
  'Clothing',
  'Medicines',
  'Stationery',
  'Other',
];

interface ProductFormProps {
  product?: Product;
  categories?: string[];
}

export function ProductForm({ product, categories = [] }: ProductFormProps) {
  const router = useRouter();
  const { appUser } = useAuthContext();
  const isOwner = can(appUser, 'VIEW_COST');
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? '');
  const [code, setCode] = useState(product?.code ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustom, setShowCustom] = useState(
    !!product?.category && !PRESET_CATEGORIES.includes(product.category) && !categories.includes(product.category)
  );
  const [price, setPrice] = useState(product?.price?.toString() ?? '');
  const [cost, setCost] = useState(product?.cost?.toString() ?? '');
  const [stockQty, setStockQty] = useState(product?.stockQty?.toString() ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const storeOnlyCategories = categories.filter((c) => !PRESET_CATEGORIES.includes(c));

  function selectCategory(label: string) {
    setCategory(label);
    setShowCustom(false);
    setCustomCategory('');
  }

  function openCustom() {
    setCategory('');
    setShowCustom(true);
  }

  async function uploadImage(productId: string): Promise<string | null> {
    if (!imageFile) return null;
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `products/${productId}/${imageFile.name}`);
      const task = uploadBytesResumable(storageRef, imageFile);
      task.on(
        'state_changed',
        (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        async () => resolve(await getDownloadURL(task.snapshot.ref))
      );
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appUser?.storeId) return;

    const priceNum = parseFloat(price);
    const costNum = parseFloat(cost) || 0;
    const stockNum = parseInt(stockQty) || 0;

    if (!category.trim()) {
      setError('Please select a category');
      return;
    }

    if (isNaN(priceNum) || priceNum < 0) {
      setError('Enter a valid price');
      return;
    }

    setError('');
    setSaving(true);

    try {
      if (isEdit && product) {
        let imageUrl = product.imageUrl;
        if (imageFile) {
          imageUrl = (await uploadImage(product.id)) ?? imageUrl;
        }
        await updateProduct(product.id, {
          name: name.trim(),
          code: code.trim() || deleteField(),
          category: category.trim(),
          price: priceNum,
          cost: costNum,
          stockQty: stockNum,
          ...(imageUrl ? { imageUrl } : {}),
        });
      } else {
        const tempId = Date.now().toString();
        let imageUrl: string | undefined;
        if (imageFile) {
          imageUrl = (await uploadImage(tempId)) ?? undefined;
        }
        await addProduct({
          storeId: appUser.storeId,
          name: name.trim(),
          ...(code.trim() ? { code: code.trim() } : {}),
          category: category.trim(),
          price: priceNum,
          cost: costNum,
          stockQty: stockNum,
          ...(imageUrl ? { imageUrl } : {}),
        });
      }
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-4">
      <Input
        label="Product name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Indomie Noodles"
        required
      />

      <Input
        label="Short code (optional)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="e.g. INDO"
      />

      {/* Category picker */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Category</label>

        <div className="flex flex-wrap gap-2">
          {[...PRESET_CATEGORIES, ...storeOnlyCategories].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => selectCategory(cat)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                category === cat
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
              )}
            >
              {cat}
            </button>
          ))}

          <button
            type="button"
            onClick={openCustom}
            className={clsx(
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
              showCustom
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-400 border-dashed border-gray-300 active:bg-gray-50'
            )}
          >
            + Custom
          </button>
        </div>

        {showCustom && (
          <input
            autoFocus
            type="text"
            value={customCategory}
            onChange={(e) => { setCustomCategory(e.target.value); setCategory(e.target.value); }}
            placeholder="Type category name..."
            className="w-full px-4 py-2.5 rounded-xl border border-green-400 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 mt-1"
          />
        )}
      </div>

      <Input
        label="Selling price (₦) *"
        type="number"
        inputMode="decimal"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="0"
        min="0"
        required
      />

      {isOwner && (
        <Input
          label="Cost price (₦)"
          type="number"
          inputMode="decimal"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="0"
          min="0"
        />
      )}

      <Input
        label="Stock quantity"
        type="number"
        inputMode="numeric"
        value={stockQty}
        onChange={(e) => setStockQty(e.target.value)}
        placeholder="0"
        min="0"
      />

      {/* Image upload */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Product image (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          className="text-sm text-gray-500 file:mr-3 file:text-sm file:font-medium file:text-green-600 file:bg-green-50 file:border-0 file:px-3 file:py-1.5 file:rounded-lg"
        />
        {imageFile && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div
              className="bg-green-600 h-1.5 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
        {product?.imageUrl && !imageFile && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="current" className="mt-1 h-20 w-20 object-cover rounded-xl" />
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
      )}

      <div className="flex gap-3 mt-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => router.back()}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" size="lg" loading={saving} className="flex-1">
          {isEdit ? 'Save Changes' : 'Add Product'}
        </Button>
      </div>
    </form>
  );
}
