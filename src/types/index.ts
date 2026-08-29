import type { Timestamp } from 'firebase/firestore';

export type Role = 'owner' | 'staff';

export interface Store {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Timestamp;
}

export type PermissionKey =
  | 'MANAGE_SETTINGS'
  | 'RECORD_SALE'
  | 'CONFIRM_PAYMENT'
  | 'RECORD_RETURNS'
  | 'ADD_PRODUCT'
  | 'EDIT_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'RESTOCK'
  | 'VIEW_COST'
  | 'VIEW_HISTORY'
  | 'VIEW_DASHBOARD';

export interface StoreRole {
  id: string;
  storeId: string;
  name: string;
  permissions: Partial<Record<PermissionKey, boolean>>;
  createdAt: Timestamp;
}

export interface Invite {
  id: string;
  email: string;
  storeId: string;
  storeName?: string;
  roleId: string;
  roleName: string;
  permissions: Partial<Record<PermissionKey, boolean>>;
  invitedBy: string;
  status: 'pending' | 'accepted';
  createdAt: Timestamp;
}

export interface AppUser {
  uid: string;
  storeId: string;
  role: Role;
  name: string;
  email?: string;
  customRoleId?: string;
  customRoleName?: string;
  permissions?: Partial<Record<PermissionKey, boolean>>;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  code?: string;
  category: string;
  price: number;
  // Cost is NOT stored on this (staff-readable) doc — it lives in the owner-only
  // `productCosts/{id}` collection. Owner-facing screens attach it after fetching.
  cost?: number;
  stockQty: number;
  imageUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProductCost {
  storeId: string;
  cost: number;
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
  customerPhone?: string;
  soldBy: string;
  owing?: boolean;
  createdAt: Timestamp;
}
