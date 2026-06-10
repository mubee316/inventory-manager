import type { AppUser, PermissionKey, Role } from '@/types';

export const PERMISSIONS: Record<PermissionKey, Role[]> = {
  VIEW_COST:         ['owner'],
  DELETE_PRODUCT:    ['owner'],
  ADD_EDIT_PRODUCT:  ['owner', 'staff'],
  RECORD_SALE:       ['owner', 'staff'],
  VIEW_HISTORY:      ['owner', 'staff'],
  VIEW_DASHBOARD:    ['owner', 'staff'],
};

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  RECORD_SALE:       'Record Sales',
  VIEW_HISTORY:      'View Sales History',
  ADD_EDIT_PRODUCT:  'Add & Edit Products',
  DELETE_PRODUCT:    'Delete Products',
  VIEW_COST:         'View Cost Prices',
  VIEW_DASHBOARD:    'View Dashboard',
};

export function can(
  user: AppUser | Role | null | undefined,
  permission: PermissionKey
): boolean {
  if (!user) return false;
  if (typeof user === 'string') {
    return PERMISSIONS[permission].includes(user);
  }
  // Check per-user override first, then fall back to role default
  if (user.permissions && permission in user.permissions) {
    return user.permissions[permission] ?? false;
  }
  return PERMISSIONS[permission].includes(user.role);
}
