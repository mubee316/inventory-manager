import {
  collection,
  query,
  where,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  runTransaction,
  limit,
  startAfter,
  type WithFieldValue,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Product, Sale } from '@/types';

// --- Collection helpers ---

export const productsQuery = (storeId: string) =>
  query(
    collection(db, 'products'),
    where('storeId', '==', storeId),
    orderBy('name', 'asc')
  );

export const salesQuery = (storeId: string, pageSize = 50) =>
  query(
    collection(db, 'sales'),
    where('storeId', '==', storeId),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

export const salesAfterCursor = (
  storeId: string,
  cursor: QueryDocumentSnapshot<DocumentData>,
  pageSize = 50
) =>
  query(
    collection(db, 'sales'),
    where('storeId', '==', storeId),
    orderBy('createdAt', 'desc'),
    startAfter(cursor),
    limit(pageSize)
  );

export const lowStockQuery = (storeId: string, threshold = 5) =>
  query(
    collection(db, 'products'),
    where('storeId', '==', storeId),
    where('stockQty', '<', threshold)
  );

// --- Product CRUD ---

export async function addProduct(
  data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
) {
  return addDoc(collection(db, 'products'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProduct(
  id: string,
  data: Partial<WithFieldValue<Omit<Product, 'id' | 'storeId' | 'createdAt'>>>
) {
  return updateDoc(doc(db, 'products', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(id: string) {
  return deleteDoc(doc(db, 'products', id));
}

export async function getProduct(id: string) {
  return getDoc(doc(db, 'products', id));
}

// --- Sale with atomic stock decrement ---

export async function recordSale(
  saleData: Omit<Sale, 'id' | 'createdAt'>
): Promise<string> {
  const saleRef = doc(collection(db, 'sales'));

  await runTransaction(db, async (tx) => {
    // Read all product docs first (Firestore transaction rule: all reads before writes)
    const productRefs = saleData.items.map((item) =>
      doc(db, 'products', item.productId)
    );
    const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)));

    // Write the sale document
    tx.set(saleRef, {
      ...saleData,
      createdAt: serverTimestamp(),
    });

    // Decrement stock for each product
    productSnaps.forEach((snap, i) => {
      if (snap.exists()) {
        const currentQty = (snap.data() as Product).stockQty;
        tx.update(productRefs[i], {
          stockQty: Math.max(0, currentQty - saleData.items[i].qty),
          updatedAt: serverTimestamp(),
        });
      }
    });
  });

  return saleRef.id;
}
