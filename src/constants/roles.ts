import type { AppUser, PermissionKey, Role } from '@/types';

// These are the FALLBACK defaults used only when a user's doc has no explicit
// entry for the permission. Owners implicitly get everything. Staff get NOTHING
// by default — every capability must be granted explicitly via their assigned
// custom role's `permissions` map. This keeps can() (client) in lockstep with
// hasPerm() (Firestore rules), where absent === denied.
export const PERMISSIONS: Record<PermissionKey, Role[]> = {
  MANAGE_SETTINGS:  ['owner'],
  RECORD_SALE:      ['owner'],
  CONFIRM_PAYMENT:  ['owner'],
  RECORD_RETURNS:   ['owner'],
  ADD_PRODUCT:      ['owner'],
  EDIT_PRODUCT:     ['owner'],
  DELETE_PRODUCT:   ['owner'],
  RESTOCK:          ['owner'],
  VIEW_COST:        ['owner'],
  VIEW_HISTORY:     ['owner'],
  VIEW_DASHBOARD:   ['owner'],
};

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  MANAGE_SETTINGS:  'Manage Settings',
  RECORD_SALE:      'Record Sale',
  CONFIRM_PAYMENT:  'Confirm Sales Payment',
  RECORD_RETURNS:   'Record Returns',
  ADD_PRODUCT:      'Add Product',
  EDIT_PRODUCT:     'Edit Product',
  DELETE_PRODUCT:   'Delete Product',
  RESTOCK:          'Record Restock',
  VIEW_COST:        'View Cost Prices',
  VIEW_HISTORY:     'View Sales History',
  VIEW_DASHBOARD:   'View Dashboard & Revenue',
};

// Permissions shown in the "Create Role" screen. MANAGE_SETTINGS and
// RECORD_RETURNS are intentionally omitted until those features are built and
// enforced — re-add them here once they do something.
export const ROLE_PERMISSION_KEYS: PermissionKey[] = [
  'VIEW_DASHBOARD',
  'VIEW_HISTORY',
  'RECORD_SALE',
  'CONFIRM_PAYMENT',
  'ADD_PRODUCT',
  'EDIT_PRODUCT',
  'DELETE_PRODUCT',
  'RESTOCK',
];

export function can(
  user: AppUser | Role | null | undefined,
  permission: PermissionKey
): boolean {
  if (!user) return false;

  const role: Role = typeof user === 'string' ? user : user.role;
  const permissions = typeof user === 'string' ? undefined : user.permissions;

  // Owners can do anything (mirrors isOwner() in firestore.rules).
  if (role === 'owner') return true;

  // Role-settable permissions are governed solely by the user's permission map:
  // absent means denied. This matches the server-side hasPerm() rule, so a custom
  // role only grants what it explicitly checks.
  if (ROLE_PERMISSION_KEYS.includes(permission)) {
    return permissions?.[permission] === true;
  }

  // Non-settable permissions (VIEW_COST, MANAGE_SETTINGS, RECORD_RETURNS) fall
  // back to the role's built-in defaults.
  if (permissions && permission in permissions) {
    return permissions[permission] ?? false;
  }
  return PERMISSIONS[permission].includes(role);
}
