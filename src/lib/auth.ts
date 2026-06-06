import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<'dashboard' | 'create-store'> {
  const cred = await signInWithPopup(auth, googleProvider);
  const snap = await getDoc(doc(db, 'users', cred.user.uid));

  if (!snap.exists()) {
    // New user — pre-fill name from Google profile for the create-store step
    if (cred.user.displayName) {
      sessionStorage.setItem('pendingName', cred.user.displayName);
    }
    return 'create-store';
  }
  return 'dashboard';
}
