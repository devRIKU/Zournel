// Device identity helpers — pure localStorage, no Firebase, safe on the boot path.
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
