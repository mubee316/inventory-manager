'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { rolesQuery, invitesQuery, cancelInvite } from '@/lib/firestore';
import { useAuthContext } from '@/components/layout/AuthProvider';
import { PERMISSION_LABELS } from '@/constants/roles';
import { formatDate } from '@/lib/formatters';
import type { AppUser, Invite, PermissionKey, StoreRole } from '@/types';

export default function StaffPage() {
  const { appUser } = useAuthContext();
  const router = useRouter();
  const [staff, setStaff] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<StoreRole[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigningRole, setAssigningRole] = useState<string | null>(null);
  const [openRolePicker, setOpenRolePicker] = useState<string | null>(null);

  useEffect(() => {
    if (!appUser?.storeId) return;

    const staffQ = query(
      collection(db, 'users'),
      where('storeId', '==', appUser.storeId),
      where('role', '==', 'staff')
    );
    const unsubStaff = onSnapshot(staffQ, (snap) => {
      setStaff(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser)));
      setLoading(false);
    });

    const unsubRoles = onSnapshot(rolesQuery(appUser.storeId), (snap) => {
      setRoles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as StoreRole)));
    });

    const unsubInvites = onSnapshot(invitesQuery(appUser.storeId), (snap) => {
      setPendingInvites(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Invite))
          .filter((inv) => inv.status === 'pending')
      );
    });

    return () => { unsubStaff(); unsubRoles(); unsubInvites(); };
  }, [appUser?.storeId]);

  async function revokeInvite(id: string) {
    setCancelingId(id);
    try {
      await cancelInvite(id);
    } finally {
      setCancelingId(null);
    }
  }

  async function assignRole(member: AppUser, role: StoreRole) {
    setAssigningRole(member.uid);
    setOpenRolePicker(null);
    try {
      await updateDoc(doc(db, 'users', member.uid), {
        customRoleId: role.id,
        customRoleName: role.name,
        permissions: role.permissions,
      });
    } finally {
      setAssigningRole(null);
    }
  }

  function permissionCount(role: StoreRole) {
    return Object.values(role.permissions).filter(Boolean).length;
  }

  if (appUser?.role !== 'owner') {
    return <p className="p-6 text-gray-500">Access denied</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-gray-600 active:bg-gray-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Staff Access</h1>
        </div>
        <Link
          href="/staff/add"
          className="flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-3 py-2 rounded-xl active:bg-green-700"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Add Staff
        </Link>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto flex flex-col gap-5">

        {/* Roles section */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Roles</p>
            <Link href="/staff/create-role" className="text-xs font-semibold text-green-600">
              + Create Role
            </Link>
          </div>

          {roles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 text-center">
              <p className="text-sm text-gray-400">No roles yet</p>
              <Link href="/staff/create-role" className="inline-block mt-2 text-sm font-semibold text-green-600">
                Create your first role →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {roles.map((role) => (
                <div key={role.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{role.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {permissionCount(role)} permission{permissionCount(role) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 max-w-[160px] justify-end">
                    {(Object.entries(role.permissions) as [PermissionKey, boolean][])
                      .filter(([, v]) => v)
                      .slice(0, 3)
                      .map(([key]) => (
                        <span key={key} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">
                          {PERMISSION_LABELS[key].split(' ')[0]}
                        </span>
                      ))}
                    {permissionCount(role) > 3 && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                        +{permissionCount(role) - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Staff section */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Staff Members</p>

          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : staff.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 text-center">
              <p className="text-sm text-gray-400">No staff yet</p>
              <Link href="/staff/add" className="inline-block mt-2 text-sm font-semibold text-green-600">
                Add your first staff member →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {staff.map((member) => (
                <div key={member.uid} className="bg-white rounded-2xl border border-gray-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-green-700">
                        {member.name?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
                      <p className="text-xs text-gray-400 truncate">{member.email ?? 'Staff'}</p>
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setOpenRolePicker(openRolePicker === member.uid ? null : member.uid)}
                        disabled={assigningRole === member.uid || roles.length === 0}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-xl bg-gray-100 text-gray-700 active:bg-gray-200 disabled:opacity-50"
                      >
                        {assigningRole === member.uid
                          ? 'Saving…'
                          : (member.customRoleName ?? 'Assign Role')}
                        {roles.length > 0 && assigningRole !== member.uid && (
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-gray-400">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>

                      {openRolePicker === member.uid && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-20 min-w-[160px] overflow-hidden">
                          {roles.map((role) => (
                            <button
                              key={role.id}
                              onClick={() => assignRole(member, role)}
                              className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between gap-2"
                            >
                              {role.name}
                              {member.customRoleId === role.id && (
                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-600 shrink-0">
                                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pending Invites</p>
            <div className="flex flex-col gap-2">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-amber-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{invite.email}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {invite.roleName}
                      {invite.createdAt ? ` · invited ${formatDate(invite.createdAt)}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeInvite(invite.id)}
                    disabled={cancelingId === invite.id}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-xl text-red-600 bg-red-50 active:bg-red-100 disabled:opacity-50"
                  >
                    {cancelingId === invite.id ? 'Canceling…' : 'Cancel'}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Each person joins automatically when they sign up with the invited email.
            </p>
          </section>
        )}
      </div>

      {openRolePicker && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenRolePicker(null)} />
      )}
    </div>
  );
}
