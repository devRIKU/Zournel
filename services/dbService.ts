import { db, defaultDb } from './firebase';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, getDocs, Firestore } from 'firebase/firestore';
import { getLocalUserId } from './authService';
import { JournalEntry, UserProfile } from '../types';

// Helper to prevent any Firestore operation from hanging indefinitely
const withTimeout = <T>(promise: Promise<T>, ms = 4000, fallback: T): Promise<T> => {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }).catch((err) => {
      clearTimeout(timer);
      console.warn("Firestore query failed or rejected:", err);
      return fallback;
    }),
    timeoutPromise
  ]);
};

export const shareJournalEntry = async (entry: JournalEntry, username?: string) => {
  const ownerId = getLocalUserId();
  const entryRef = doc(db, 'shared_entries', entry.id);
  await withTimeout(setDoc(entryRef, {
    ...entry,
    ownerId,
    username: username || null
  }), 5000, null);
  return entry.id;
};

export const getSharedEntry = async (entryId: string) => {
  const entryRef = doc(db, 'shared_entries', entryId);
  const snapshot = await withTimeout(getDoc(entryRef), 4000, null);
  if (snapshot && snapshot.exists()) {
    return snapshot.data() as JournalEntry;
  }
  return null;
};

export const claimPublicProfile = async (username: string, profile: UserProfile) => {
  const ownerId = getLocalUserId();
  const profileRef = doc(db, 'profiles', username);
  
  const snapshot = await withTimeout(getDoc(profileRef), 4000, null);
  if (snapshot && snapshot.exists() && snapshot.data().ownerId !== ownerId) {
    throw new Error('Username is already taken by someone else.');
  }

  await withTimeout(setDoc(profileRef, {
    ...profile,
    ownerId
  }), 5000, null);
};

export const getPublicProfile = async (username: string) => {
  const profileRef = doc(db, 'profiles', username);
  const snapshot = await withTimeout(getDoc(profileRef), 4000, null);
  if (snapshot && snapshot.exists()) {
    return snapshot.data() as UserProfile & { ownerId: string };
  }
  return null;
};

export const getSharedEntriesForUsername = async (username: string) => {
  const entriesRef = collection(db, 'shared_entries');
  const q = query(entriesRef, where('username', '==', username));
  const querySnapshot = await withTimeout(getDocs(q), 4000, null);
  const entries: JournalEntry[] = [];
  if (querySnapshot) {
    querySnapshot.forEach((doc: any) => {
      entries.push(doc.data() as JournalEntry);
    });
  }
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
    username: username || null,
    owner_id: userIdentifier,
    ownerId: userIdentifier,
    userId: userIdentifier,
    user_id: userIdentifier
  };

  if (extraInfo?.config) updateData.config = extraInfo.config;
  if (extraInfo?.profile) updateData.profile = extraInfo.profile;

  const targetDbs = [db];
  if (defaultDb && defaultDb !== db) {
    targetDbs.push(defaultDb);
  }

  for (const currentDb of targetDbs) {
    try {
      // Primary document write with 4s timeout
      const syncRef = doc(currentDb, 'user_memories', userIdentifier);
      await withTimeout(setDoc(syncRef, updateData, { merge: true }), 4000, null);

      // Secondary index writes with 4s timeout
      const promises: Promise<any>[] = [];

      if (username && username.toLowerCase() !== userIdentifier.toLowerCase()) {
        promises.push(withTimeout(setDoc(doc(currentDb, 'user_memories', username.toLowerCase()), updateData, { merge: true }), 4000, null));
        promises.push(withTimeout(setDoc(doc(currentDb, 'profiles', username, 'usermemories', 'data'), updateData, { merge: true }), 4000, null));
      }

      if (googleEmail && googleEmail.toLowerCase() !== userIdentifier.toLowerCase()) {
        promises.push(withTimeout(setDoc(doc(currentDb, 'user_memories', googleEmail.toLowerCase()), updateData, { merge: true }), 4000, null));
      }

      if (deviceKey && deviceKey !== userIdentifier) {
        promises.push(withTimeout(setDoc(doc(currentDb, 'user_memories', deviceKey), updateData, { merge: true }), 4000, null));
      }

      await Promise.allSettled(promises);
    } catch (e) {
      console.warn("Cloud sync error on database instance:", e);
    }
  }
};

const extractEntriesFromObject = (data: any): JournalEntry[] | null => {
  if (!data) return null;
  if (Array.isArray(data.entries)) return data.entries;
  if (Array.isArray(data.memories)) return data.memories;
  if (Array.isArray(data.usermemories)) return data.usermemories;
  if (Array.isArray(data.journalEntries)) return data.journalEntries;
  if (Array.isArray(data)) return data;
  return null;
};

const fetchFromDbInstance = async (
  targetDb: Firestore, 
  cleanId: string
): Promise<{ entries: JournalEntry[] | null, config: any | null, profile: any | null } | null> => {
  if (!cleanId) return null;
  const lowerId = cleanId.toLowerCase();
  const candidates = Array.from(new Set([cleanId, lowerId]));

  // 1. Direct document lookups with timeouts
  for (const id of candidates) {
    try {
      const snap = await withTimeout(getDoc(doc(targetDb, 'user_memories', id)), 3000, null);
      if (snap && snap.exists()) {
        const data = snap.data();
        const entries = extractEntriesFromObject(data);
        if (entries && entries.length > 0) {
          return { entries, config: data.config || null, profile: data.profile || null };
        }
      }
    } catch (e) { /* ignore */ }

    try {
      const snap = await withTimeout(getDoc(doc(targetDb, 'profiles', id)), 3000, null);
      if (snap && snap.exists()) {
        const data = snap.data();
        const entries = extractEntriesFromObject(data);
        if (entries && entries.length > 0) {
          return { entries, config: data.config || null, profile: data.profile || null };
        }
      }
    } catch (e) { /* ignore */ }

    try {
      const snap = await withTimeout(getDoc(doc(targetDb, 'profiles', id, 'usermemories', 'data')), 3000, null);
      if (snap && snap.exists()) {
        const data = snap.data();
        const entries = extractEntriesFromObject(data);
        if (entries && entries.length > 0) {
          return { entries, config: data.config || null, profile: data.profile || null };
        }
      }
    } catch (e) { /* ignore */ }
  }

  // 2. Subcollection lookups with timeouts
  const subcolNames = ['usermemories', 'user_memories', 'memories', 'entries'];
  for (const id of candidates) {
    for (const subcol of subcolNames) {
      try {
        const colSnap = await withTimeout(getDocs(collection(targetDb, 'profiles', id, subcol)), 3000, null);
        if (colSnap && !colSnap.empty) {
          for (const d of colSnap.docs) {
            const data = d.data();
            const entries = extractEntriesFromObject(data);
            if (entries && entries.length > 0) {
              return { entries, config: data.config || null, profile: data.profile || null };
            }
          }

          const collectedEntries: JournalEntry[] = [];
          colSnap.docs.forEach((d: any) => {
            const data = d.data();
            if (data && (data.content || data.text || data.title || data.id)) {
              collectedEntries.push({
                id: data.id || d.id,
                content: data.content || data.text || '',
                createdAt: data.createdAt || data.created_at || data.timestamp || Date.now(),
                title: data.title || '',
                mood: data.mood,
                image: data.image || data.img || data.photo,
                aiInsight: data.aiInsight || data.ai_insight
              });
            }
          });

          if (collectedEntries.length > 0) {
            return { entries: collectedEntries, config: null, profile: null };
          }
        }
      } catch (e) { /* ignore */ }
    }
  }

  // 3. Query fallbacks with timeouts
  const fieldsToQuery = ['username', 'owner_id', 'ownerId', 'user_id', 'userId', 'profile.username', 'deviceKey', 'googleEmail'];
  const memRef = collection(targetDb, 'user_memories');
  const profRef = collection(targetDb, 'profiles');

  for (const field of fieldsToQuery) {
    for (const val of candidates) {
      try {
        const qSnap = await withTimeout(getDocs(query(memRef, where(field, '==', val))), 3000, null);
        if (qSnap && !qSnap.empty) {
          const data = qSnap.docs[0].data();
          const entries = extractEntriesFromObject(data);
          if (entries && entries.length > 0) {
            return { entries, config: data.config || null, profile: data.profile || null };
          }
        }
      } catch (e) { /* ignore */ }

      try {
        const qSnap = await withTimeout(getDocs(query(profRef, where(field, '==', val))), 3000, null);
        if (qSnap && !qSnap.empty) {
          const data = qSnap.docs[0].data();
          const entries = extractEntriesFromObject(data);
          if (entries && entries.length > 0) {
            return { entries, config: data.config || null, profile: data.profile || null };
          }
        }
      } catch (e) { /* ignore */ }
    }
  }

  return null;
};

export const fetchMemoriesFromCloud = async (userIdentifier: string): Promise<{ entries: JournalEntry[] | null, config: any | null, profile: any | null } | null> => {
  if (!userIdentifier || !userIdentifier.trim()) return null;
  const cleanId = userIdentifier.trim();

  // Try customDb first with 5s timeout
  const result = await withTimeout(fetchFromDbInstance(db, cleanId), 5000, null);
  if (result && result.entries && result.entries.length > 0) {
    return result;
  }

  // Fallback to defaultDb if distinct with 5s timeout
  if (defaultDb && defaultDb !== db) {
    const defaultResult = await withTimeout(fetchFromDbInstance(defaultDb, cleanId), 5000, null);
    if (defaultResult && defaultResult.entries && defaultResult.entries.length > 0) {
      return defaultResult;
    }
  }

  return result;
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


