import type { Timestamp } from 'firebase/firestore';

export type Role = 'owner' | 'staff';

export interface Store {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Timestamp;
}

export type PermissionKey =
  | 'VIEW_COST'
  | 'DELETE_PRODUCT'
  | 'ADD_EDIT_PRODUCT'
  | 'RECORD_SALE'
  | 'VIEW_HISTORY'
  | 'VIEW_DASHBOARD';

export interface AppUser {
  uid: string;
  storeId: string;
  role: Role;
  name: string;
  permissions?: Partial<Record<PermissionKey, boolean>>;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  code?: string;
  category: string;
  price: number;
  cost: number;
  stockQty: number;
  imageUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SaleItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  storeId: string;
  items: SaleItem[];
  total: number;
  amountPaid: number;
  status: 'paid' | 'partial' | 'unpaid';
  customerName?: string;
  soldBy: string;
  createdAt: Timestamp;
}
