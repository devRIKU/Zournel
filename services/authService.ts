import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export interface GoogleAccountUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export const getLocalUserId = () => {
  let id = localStorage.getItem('mf_local_user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('mf_local_user_id', id);
  }
  return id;
};

export const setLocalUserId = (id: string) => {
  localStorage.setItem('mf_local_user_id', id.trim());
};

export const getSavedGoogleUser = (): GoogleAccountUser | null => {
  const saved = localStorage.getItem('mf_google_user');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse cached Google user', e);
    }
  }
  return null;
};

export const saveGoogleUserToStorage = (user: GoogleAccountUser | null) => {
  if (user) {
    localStorage.setItem('mf_google_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('mf_google_user');
  }
};

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

