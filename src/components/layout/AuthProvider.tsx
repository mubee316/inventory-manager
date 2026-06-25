'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth, type AuthValue } from '@/hooks/useAuth';
import { InviteModal } from '@/components/layout/InviteModal';

const noop = async () => {};

const AuthContext = createContext<AuthValue>({
  user: null,
  appUser: null,
  pendingInvite: null,
  loading: true,
  acceptInvite: noop,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return (
    <AuthContext.Provider value={auth}>
      {children}
      <InviteModal />
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
