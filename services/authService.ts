import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

import { GoogleAccountUser, getSavedGoogleUser, saveGoogleUserToStorage } from './localIdentity';
export * from './localIdentity';

export const signInWithGoogleAccount = async (): Promise<GoogleAccountUser> => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const googleUser: GoogleAccountUser = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email || 'Google User',
      photoURL: user.photoURL || undefined,
    };
    saveGoogleUserToStorage(googleUser);
    return googleUser;
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    throw error;
  }
};

export const signOutGoogleAccount = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signOut notice:', err);
  }
  saveGoogleUserToStorage(null);
};

export const listenToAuthChanges = (callback: (user: GoogleAccountUser | null) => void) => {
  return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const googleUser: GoogleAccountUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email || 'Google User',
        photoURL: firebaseUser.photoURL || undefined,
      };
      saveGoogleUserToStorage(googleUser);
      callback(googleUser);
    } else {
      callback(getSavedGoogleUser());
    }
  });
};

