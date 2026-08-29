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
  setDoc,
  serverTimestamp,
  runTransaction,
  limit,
  startAfter,
  type WithFieldValue,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PermissionKey, Product, Sale } from '@/types';

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
  // `cost` never goes on the staff-readable product doc — see setProductCost.
  const rest = { ...data };
  delete (rest as { cost?: number }).cost;
  return addDoc(collection(db, 'products'), {
    ...rest,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProduct(
  id: string,
  data: Partial<WithFieldValue<Omit<Product, 'id' | 'storeId' | 'createdAt'>>>
) {
  const rest = { ...data };
  delete (rest as { cost?: unknown }).cost;
  return updateDoc(doc(db, 'products', id), {
    ...rest,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(id: string) {
  // Remove the owner-only cost doc alongside the product (no-op if absent).
  await deleteDoc(doc(db, 'productCosts', id)).catch(() => {});
  return deleteDoc(doc(db, 'products', id));
}

export async function getProduct(id: string) {
  return getDoc(doc(db, 'products', id));
}

// --- Product costs (owner-only) ---

export const productCostsQuery = (storeId: string) =>
  query(collection(db, 'productCosts'), where('storeId', '==', storeId));

export async function setProductCost(productId: string, storeId: string, cost: number) {
  return setDoc(
    doc(db, 'productCosts', productId),
    { storeId, cost, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getProductCost(productId: string): Promise<number | undefined> {
  const snap = await getDoc(doc(db, 'productCosts', productId));
  return snap.exists() ? (snap.data().cost as number) : undefined;
}

// --- Roles ---

export const rolesQuery = (storeId: string) =>
  query(collection(db, 'roles'), where('storeId', '==', storeId), orderBy('createdAt', 'asc'));

export async function createRole(
  storeId: string,
  name: string,
  permissions: Partial<Record<PermissionKey, boolean>>
) {
  return addDoc(collection(db, 'roles'), {
    storeId,
    name,
    permissions,
    createdAt: serverTimestamp(),
  });
}

// --- Invites ---

export async function createInvite(data: {
  email: string;
  storeId: string;
  storeName?: string;
  roleId: string;
  roleName: string;
  permissions: Partial<Record<PermissionKey, boolean>>;
  invitedBy: string;
}) {
  return addDoc(collection(db, 'invites'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

// All invites for a store (filter by status client-side to avoid a composite index).
export const invitesQuery = (storeId: string) =>
  query(collection(db, 'invites'), where('storeId', '==', storeId));

export async function cancelInvite(id: string) {
  return deleteDoc(doc(db, 'invites', id));
}

// --- Sale with atomic stock decrement ---

export async function recordSale(
  saleData: Omit<Sale, 'id' | 'createdAt'>
): Promise<string> {
  const saleRef = doc(collection(db, 'sales'));

  await runTransaction(db, async (tx) => {
    // Write the sale document
    tx.set(saleRef, {
      ...saleData,
      createdAt: serverTimestamp(),
    });

    // Only decrement stock if NOT an owing sale
    if (!saleData.owing) {
      // Read all product docs first (Firestore transaction rule: all reads before writes)
      const productRefs = saleData.items.map((item) =>
        doc(db, 'products', item.productId)
      );
      const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)));

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
    }
  });

  return saleRef.id;
}
