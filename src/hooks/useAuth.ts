'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { AppUser } from '@/types';

interface AuthState {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    appUser: null,
    loading: true,
  });

  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Clean up previous user doc listener when auth user changes
      unsubUser?.();
      unsubUser = null;

      if (!user) {
        setState({ user: null, appUser: null, loading: false });
        return;
      }

      // Use onSnapshot so appUser updates immediately when the doc is written
      // (fixes the create-store → dashboard redirect race condition)
      unsubUser = onSnapshot(
        doc(db, 'users', user.uid),
        (snap) => {
          const appUser = snap.exists()
            ? ({ uid: user.uid, ...snap.data() } as AppUser)
            : null;
          setState({ user, appUser, loading: false });
        },
        () => {
          setState({ user, appUser: null, loading: false });
        }
      );
    });

    return () => {
      unsubAuth();
      unsubUser?.();
    };
  }, []);

  return state;
}
