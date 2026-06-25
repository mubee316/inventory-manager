'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, limit, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { AppUser, PermissionKey } from '@/types';

export interface PendingInvite {
  id: string;
  storeId: string;
  storeName?: string;
  roleId: string;
  roleName: string;
  permissions: Partial<Record<PermissionKey, boolean>>;
}

interface AuthState {
  user: User | null;
  appUser: AppUser | null;
  pendingInvite: PendingInvite | null;
  loading: boolean;
}

export interface AuthValue extends AuthState {
  acceptInvite: () => Promise<void>;
}

export function useAuth(): AuthValue {
  const [state, setState] = useState<AuthState>({
    user: null,
    appUser: null,
    pendingInvite: null,
    loading: true,
  });

  // Holds the signed-in user + their pending invite so acceptInvite() can act
  // on the latest values without being re-created on every render.
  const pendingRef = useRef<{ user: User; invite: PendingInvite } | null>(null);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubUser?.();
      unsubUser = null;

      if (!user) {
        pendingRef.current = null;
        setState({ user: null, appUser: null, pendingInvite: null, loading: false });
        return;
      }

      unsubUser = onSnapshot(
        doc(db, 'users', user.uid),
        async (snap) => {
          if (snap.exists()) {
            const appUser = { uid: user.uid, ...snap.data() } as AppUser;
            pendingRef.current = null;
            setState({ user, appUser, pendingInvite: null, loading: false });
          } else if (user.email) {
            // No user doc yet — look for a pending invite for this email. We do
            // NOT auto-join; instead we surface it so the UI can prompt to join.
            try {
              const email = user.email.toLowerCase();
              const inviteSnap = await getDocs(
                query(
                  collection(db, 'invites'),
                  where('email', '==', email),
                  where('status', '==', 'pending'),
                  limit(1)
                )
              );
              if (!inviteSnap.empty) {
                const d = inviteSnap.docs[0];
                const data = d.data();
                const invite: PendingInvite = {
                  id: d.id,
                  storeId: data.storeId,
                  storeName: data.storeName,
                  roleId: data.roleId,
                  roleName: data.roleName,
                  permissions: data.permissions ?? {},
                };
                pendingRef.current = { user, invite };
                setState({ user, appUser: null, pendingInvite: invite, loading: false });
              } else {
                pendingRef.current = null;
                setState({ user, appUser: null, pendingInvite: null, loading: false });
              }
            } catch {
              pendingRef.current = null;
              setState({ user, appUser: null, pendingInvite: null, loading: false });
            }
          } else {
            pendingRef.current = null;
            setState({ user, appUser: null, pendingInvite: null, loading: false });
          }
        },
        () => {
          setState({ user, appUser: null, pendingInvite: null, loading: false });
        }
      );
    });

    return () => {
      unsubAuth();
      unsubUser?.();
    };
  }, []);

  // Claim the pending invite: create the staff user doc and mark the invite
  // accepted. The users/{uid} onSnapshot above then fires with the new doc,
  // which sets appUser and clears pendingInvite.
  const acceptInvite = useCallback(async () => {
    const p = pendingRef.current;
    if (!p || !p.user.email) return;
    await setDoc(doc(db, 'users', p.user.uid), {
      storeId: p.invite.storeId,
      role: 'staff',
      name: p.user.displayName || p.user.email.split('@')[0],
      email: p.user.email,
      customRoleId: p.invite.roleId,
      customRoleName: p.invite.roleName,
      permissions: p.invite.permissions ?? {},
    });
    await updateDoc(doc(db, 'invites', p.invite.id), { status: 'accepted' });
  }, []);

  return { ...state, acceptInvite };
}
