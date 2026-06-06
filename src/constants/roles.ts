import type { Role } from '@/types';

export const PERMISSIONS = {
  VIEW_COST: ['owner'] as Role[],
  DELETE_PRODUCT: ['owner'] as Role[],
  ADD_EDIT_PRODUCT: ['owner', 'staff'] as Role[],
  RECORD_SALE: ['owner', 'staff'] as Role[],
  VIEW_HISTORY: ['owner', 'staff'] as Role[],
  VIEW_DASHBOARD: ['owner', 'staff'] as Role[],
} as const;

export function can(role: Role | undefined, permission: keyof typeof PERMISSIONS): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as Role[]).includes(role);
}
