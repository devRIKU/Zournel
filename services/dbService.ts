import { db, defaultDb } from './firebase';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, getDocs, Firestore } from 'firebase/firestore';
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
      // Primary document write (userIdentifier - e.g. Google UID, Username, or Device Key)
      const syncRef = doc(currentDb, 'user_memories', userIdentifier);
      await setDoc(syncRef, updateData, { merge: true });

      // Dual-write index documents for username, email, and device key
      const promises: Promise<any>[] = [];

      if (username && username.toLowerCase() !== userIdentifier.toLowerCase()) {
        promises.push(setDoc(doc(currentDb, 'user_memories', username.toLowerCase()), updateData, { merge: true }));
        promises.push(setDoc(doc(currentDb, 'profiles', username, 'usermemories', 'data'), updateData, { merge: true }));
      }

      if (googleEmail && googleEmail.toLowerCase() !== userIdentifier.toLowerCase()) {
        promises.push(setDoc(doc(currentDb, 'user_memories', googleEmail.toLowerCase()), updateData, { merge: true }));
      }

      if (deviceKey && deviceKey !== userIdentifier) {
        promises.push(setDoc(doc(currentDb, 'user_memories', deviceKey), updateData, { merge: true }));
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

  // 1. Parallel direct document lookups
  const docRefPromises: Promise<{ snap: any; type: string; id: string }>[] = [];
  
  for (const id of candidates) {
    docRefPromises.push(getDoc(doc(targetDb, 'user_memories', id)).then(snap => ({ snap, type: 'user_memories', id })));
    docRefPromises.push(getDoc(doc(targetDb, 'profiles', id)).then(snap => ({ snap, type: 'profiles', id })));
    docRefPromises.push(getDoc(doc(targetDb, 'profiles', id, 'usermemories', 'data')).then(snap => ({ snap, type: 'subcol_data', id })));
  }

  const docResults = await Promise.allSettled(docRefPromises);
  for (const res of docResults) {
    if (res.status === 'fulfilled' && res.value.snap.exists()) {
      const data = res.value.snap.data();
      const entries = extractEntriesFromObject(data);
      if (entries && entries.length > 0) {
        return { entries, config: data.config || null, profile: data.profile || null };
      }
    }
  }

  // 2. Parallel subcollection lookups under profiles/{id}/[usermemories, user_memories, memories, entries]
  const subcolNames = ['usermemories', 'user_memories', 'memories', 'entries'];
  const subcolPromises: Promise<{ snap: any; id: string; subcol: string }>[] = [];

  for (const id of candidates) {
    for (const subcol of subcolNames) {
      subcolPromises.push(
        getDocs(collection(targetDb, 'profiles', id, subcol))
          .then(snap => ({ snap, id, subcol }))
          .catch(() => ({ snap: null, id, subcol }))
      );
    }
  }

  const subcolResults = await Promise.allSettled(subcolPromises);
  for (const res of subcolResults) {
    if (res.status === 'fulfilled' && res.value.snap && !res.value.snap.empty) {
      const colSnap = res.value.snap;
      
      // Check if any doc has an array of entries
      for (const d of colSnap.docs) {
        const data = d.data();
        const entries = extractEntriesFromObject(data);
        if (entries && entries.length > 0) {
          return { entries, config: data.config || null, profile: data.profile || null };
        }
      }

      // Otherwise, aggregate individual entry documents
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
  }

  // 3. Parallel query fallback across user_memories and profiles collections
  const fieldsToQuery = ['username', 'owner_id', 'ownerId', 'user_id', 'userId', 'profile.username', 'deviceKey', 'googleEmail'];
  const queryPromises: Promise<any>[] = [];
  const memRef = collection(targetDb, 'user_memories');
  const profRef = collection(targetDb, 'profiles');

  for (const field of fieldsToQuery) {
    for (const val of candidates) {
      queryPromises.push(getDocs(query(memRef, where(field, '==', val))).catch(() => null));
      queryPromises.push(getDocs(query(profRef, where(field, '==', val))).catch(() => null));
    }
  }

  const queryResults = await Promise.allSettled(queryPromises);
  for (const res of queryResults) {
    if (res.status === 'fulfilled' && res.value && !res.value.empty) {
      const qSnap = res.value;
      for (const profDoc of qSnap.docs) {
        const data = profDoc.data();
        const entries = extractEntriesFromObject(data);
        if (entries && entries.length > 0) {
          return { entries, config: data.config || null, profile: data.profile || null };
        }
      }
    }
  }

  return null;
};

export const fetchMemoriesFromCloud = async (userIdentifier: string): Promise<{ entries: JournalEntry[] | null, config: any | null, profile: any | null } | null> => {
  if (!userIdentifier || !userIdentifier.trim()) return null;
  const cleanId = userIdentifier.trim();

  // Try customDb first
  let result = await fetchFromDbInstance(db, cleanId);
  if (result && result.entries && result.entries.length > 0) {
    return result;
  }

  // Fallback to defaultDb if distinct
  if (defaultDb && defaultDb !== db) {
    const defaultResult = await fetchFromDbInstance(defaultDb, cleanId);
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


