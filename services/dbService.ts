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
  extraInfo?: { googleEmail?: string; deviceKey?: string }
) => {
  if (!userIdentifier) return;
  const syncRef = doc(db, 'user_memories', userIdentifier);
  await setDoc(syncRef, {
    entries,
    lastSyncedAt: Date.now(),
    deviceKey: extraInfo?.deviceKey || getLocalUserId(),
    googleEmail: extraInfo?.googleEmail || null
  }, { merge: true });
};

export const fetchMemoriesFromCloud = async (userIdentifier: string): Promise<JournalEntry[] | null> => {
  if (!userIdentifier) return null;
  const syncRef = doc(db, 'user_memories', userIdentifier);
  const snapshot = await getDoc(syncRef);
  if (snapshot.exists()) {
    const data = snapshot.data();
    if (Array.isArray(data.entries)) {
      return data.entries as JournalEntry[];
    }
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

