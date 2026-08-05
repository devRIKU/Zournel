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
  const lowerId = cleanId.toLowerCase();

  // 1. Direct document lookup in user_memories
  for (const idToTry of [cleanId, lowerId]) {
    try {
      const snap = await getDoc(doc(targetDb, 'user_memories', idToTry));
      if (snap.exists()) {
        const data = snap.data();
        const entries = extractEntriesFromObject(data);
        if (entries) {
          return { entries, config: data.config || null, profile: data.profile || null };
        }
      }
    } catch (e) { /* ignore */ }
  }

  // 2. Direct document lookup in profiles/{id}
  for (const idToTry of [cleanId, lowerId]) {
    try {
      const snap = await getDoc(doc(targetDb, 'profiles', idToTry));
      if (snap.exists()) {
        const data = snap.data();
        const entries = extractEntriesFromObject(data);
        if (entries) {
          return { entries, config: data.config || null, profile: data.profile || null };
        }
      }
    } catch (e) { /* ignore */ }
  }

  // 3. Look in subcollections under profiles/{id}/[usermemories, user_memories, memories, entries]
  const subcolNames = ['usermemories', 'user_memories', 'memories', 'entries'];
  for (const idToTry of [cleanId, lowerId]) {
    for (const subcol of subcolNames) {
      try {
        const colSnap = await getDocs(collection(targetDb, 'profiles', idToTry, subcol));
        if (!colSnap.empty) {
          // Check if any doc has an 'entries' array field
          for (const d of colSnap.docs) {
            const data = d.data();
            const entries = extractEntriesFromObject(data);
            if (entries) {
              return { entries, config: data.config || null, profile: data.profile || null };
            }
          }

          // Otherwise, docs themselves might be individual entry documents
          const collectedEntries: JournalEntry[] = [];
          colSnap.docs.forEach(d => {
            const data = d.data();
            if (data && (data.content || data.text || data.title || data.id)) {
              collectedEntries.push({
                id: data.id || d.id,
                content: data.content || data.text || '',
                createdAt: data.createdAt || data.created_at || data.timestamp || Date.now(),
                title: data.title || '',
                mood: data.mood,
                image: data.image,
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

  // 4. Query fallback across user_memories collection
  try {
    const memRef = collection(targetDb, 'user_memories');
    const fieldsToQuery = ['username', 'owner_id', 'ownerId', 'user_id', 'userId', 'profile.username', 'deviceKey', 'googleEmail'];

    for (const field of fieldsToQuery) {
      for (const val of [cleanId, lowerId]) {
        const qSnap = await getDocs(query(memRef, where(field, '==', val)));
        if (!qSnap.empty) {
          const data = qSnap.docs[0].data();
          const entries = extractEntriesFromObject(data);
          if (entries) {
            return { entries, config: data.config || null, profile: data.profile || null };
          }
        }
      }
    }
  } catch (e) { /* ignore */ }

  // 5. Query fallback across profiles collection
  try {
    const profRef = collection(targetDb, 'profiles');
    const fieldsToQuery = ['username', 'owner_id', 'ownerId', 'user_id', 'userId'];

    for (const field of fieldsToQuery) {
      for (const val of [cleanId, lowerId]) {
        const qSnap = await getDocs(query(profRef, where(field, '==', val)));
        if (!qSnap.empty) {
          for (const profDoc of qSnap.docs) {
            const data = profDoc.data();
            const entries = extractEntriesFromObject(data);
            if (entries) {
              return { entries, config: data.config || null, profile: data.profile || null };
            }

            // Also check subcollections for this matched profile document ID
            for (const subcol of subcolNames) {
              const colSnap = await getDocs(collection(targetDb, 'profiles', profDoc.id, subcol));
              if (!colSnap.empty) {
                const collectedEntries: JournalEntry[] = [];
                colSnap.docs.forEach(d => {
                  const dData = d.data();
                  const eArr = extractEntriesFromObject(dData);
                  if (eArr) {
                    collectedEntries.push(...eArr);
                  } else if (dData && (dData.content || dData.text)) {
                    collectedEntries.push({
                      id: dData.id || d.id,
                      content: dData.content || dData.text || '',
                      createdAt: dData.createdAt || dData.created_at || Date.now(),
                      title: dData.title || '',
                      mood: dData.mood,
                      image: dData.image,
                      aiInsight: dData.aiInsight
                    });
                  }
                });

                if (collectedEntries.length > 0) {
                  return { entries: collectedEntries, config: null, profile: data.profile || null };
                }
              }
            }
          }
        }
      }
    }
  } catch (e) { /* ignore */ }

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


