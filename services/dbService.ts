import { db } from './firebase';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { getLocalUserId } from './authService';
import { JournalEntry, UserProfile } from '../types';

export const shareJournalEntry = async (entry: JournalEntry, username?: string) => {
  const ownerId = getLocalUserId();
  const entryRef = doc(db, 'shared_entries', entry.id);
  await setDoc(entryRef, {
    ...entry,
    ownerId,
    username: username || null
  });
  return entry.id;
};

export const getSharedEntry = async (entryId: string) => {
  const entryRef = doc(db, 'shared_entries', entryId);
  const snapshot = await getDoc(entryRef);
  if (snapshot.exists()) {
    return snapshot.data() as JournalEntry;
  }
  return null;
};

export const claimPublicProfile = async (username: string, profile: UserProfile) => {
  const ownerId = getLocalUserId();
  const profileRef = doc(db, 'profiles', username);
  
  const snapshot = await getDoc(profileRef);
  if (snapshot.exists() && snapshot.data().ownerId !== ownerId) {
    throw new Error('Username is already taken by someone else.');
  }

  await setDoc(profileRef, {
    ...profile,
    ownerId
  });
};

export const getPublicProfile = async (username: string) => {
  const profileRef = doc(db, 'profiles', username);
  const snapshot = await getDoc(profileRef);
  if (snapshot.exists()) {
    return snapshot.data() as UserProfile & { ownerId: string };
  }
  return null;
};

export const getSharedEntriesForUsername = async (username: string) => {
  const entriesRef = collection(db, 'shared_entries');
  const q = query(entriesRef, where('username', '==', username));
  const querySnapshot = await getDocs(q);
  const entries: JournalEntry[] = [];
  querySnapshot.forEach((doc) => {
    entries.push(doc.data() as JournalEntry);
  });
  return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const syncMemoriesToCloud = async (
  userIdentifier: string, 
  entries: JournalEntry[], 
  extraInfo?: { googleEmail?: string; deviceKey?: string; config?: any; profile?: any }
) => {
  if (!userIdentifier) return;
  const username = extraInfo?.profile?.username?.trim();
  const googleEmail = extraInfo?.googleEmail?.trim();
  const deviceKey = extraInfo?.deviceKey?.trim() || getLocalUserId();

  const updateData: any = {
    entries,
    lastSyncedAt: Date.now(),
    deviceKey: deviceKey || null,
    googleEmail: googleEmail || null,
    username: username || null
  };

  if (extraInfo?.config) updateData.config = extraInfo.config;
  if (extraInfo?.profile) updateData.profile = extraInfo.profile;

  // Primary document write (userIdentifier - e.g. Google UID or Device Key)
  const syncRef = doc(db, 'user_memories', userIdentifier);
  await setDoc(syncRef, updateData, { merge: true });

  // Dual-write index documents for username, email, and device key for direct fast lookup
  const promises: Promise<any>[] = [];

  if (username && username.toLowerCase() !== userIdentifier.toLowerCase()) {
    promises.push(setDoc(doc(db, 'user_memories', username.toLowerCase()), updateData, { merge: true }));
  }

  if (googleEmail && googleEmail.toLowerCase() !== userIdentifier.toLowerCase()) {
    promises.push(setDoc(doc(db, 'user_memories', googleEmail.toLowerCase()), updateData, { merge: true }));
  }

  if (deviceKey && deviceKey !== userIdentifier) {
    promises.push(setDoc(doc(db, 'user_memories', deviceKey), updateData, { merge: true }));
  }

  await Promise.allSettled(promises);
};

export const fetchMemoriesFromCloud = async (userIdentifier: string): Promise<{ entries: JournalEntry[] | null, config: any | null, profile: any | null } | null> => {
  if (!userIdentifier || !userIdentifier.trim()) return null;
  const cleanId = userIdentifier.trim();

  // 1. Direct document lookup by exact userIdentifier
  let syncRef = doc(db, 'user_memories', cleanId);
  let snapshot = await getDoc(syncRef);
  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      entries: Array.isArray(data.entries) ? data.entries as JournalEntry[] : null,
      config: data.config || null,
      profile: data.profile || null
    };
  }

  // 2. Direct document lookup lowercase (for usernames / emails)
  const lowerId = cleanId.toLowerCase();
  if (lowerId !== cleanId) {
    syncRef = doc(db, 'user_memories', lowerId);
    snapshot = await getDoc(syncRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        entries: Array.isArray(data.entries) ? data.entries as JournalEntry[] : null,
        config: data.config || null,
        profile: data.profile || null
      };
    }
  }

  // 3. Fallback queries across username, profile.username, deviceKey, and googleEmail fields
  try {
    const memRef = collection(db, 'user_memories');

    // Query username
    let qSnap = await getDocs(query(memRef, where('username', '==', cleanId)));
    if (qSnap.empty) {
      qSnap = await getDocs(query(memRef, where('username', '==', lowerId)));
    }
    if (qSnap.empty) {
      qSnap = await getDocs(query(memRef, where('profile.username', '==', cleanId)));
    }
    if (qSnap.empty) {
      // Query deviceKey
      qSnap = await getDocs(query(memRef, where('deviceKey', '==', cleanId)));
    }
    if (qSnap.empty) {
      // Query googleEmail
      qSnap = await getDocs(query(memRef, where('googleEmail', '==', cleanId)));
    }
    if (qSnap.empty && lowerId !== cleanId) {
      qSnap = await getDocs(query(memRef, where('googleEmail', '==', lowerId)));
    }

    if (!qSnap.empty) {
      const data = qSnap.docs[0].data();
      return {
        entries: Array.isArray(data.entries) ? data.entries as JournalEntry[] : null,
        config: data.config || null,
        profile: data.profile || null
      };
    }
  } catch (err) {
    console.warn("Firestore query fallback error:", err);
  }

  return null;
};

export const exportMemoriesAsJSON = (entries: JournalEntry[]) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entries, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `zournel-memories-backup-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

