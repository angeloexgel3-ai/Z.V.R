import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore/lite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

type OperationTypeValue = (typeof OperationType)[keyof typeof OperationType];

function loadFirebaseConfig() {
  const configPath = path.resolve(ROOT_DIR, 'firebase-applet-config.json');
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw);
}

const firebaseConfig = loadFirebaseConfig();
const firebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig, 'zvr-server');
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

function logFirestoreError(error: unknown, operationType: OperationTypeValue, docPath: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path: docPath,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
  };
  console.error('Server Firestore Error:', JSON.stringify(errInfo));
}

export function toSafeDocId(prefix: string, raw: string): string {
  const hash = crypto.createHash('sha256').update(String(raw)).digest('hex').slice(0, 40);
  return `${prefix}_${hash}`;
}

function toAccountDoc(acc: any) {
  const docObj: Record<string, any> = {
    id: String(acc.id || `acc-${Date.now()}`).slice(0, 128),
    name: String(acc.name || acc.tagname || 'Member').slice(0, 120),
    tagname: String(acc.tagname || '').slice(0, 200),
    roleTitle: String(acc.roleTitle || '𝑴𝒃𝒓').slice(0, 64),
    category: acc.category === 'leadership' ? 'leadership' : 'member',
    registeredAt: String(acc.registeredAt || '').slice(0, 64),
  };
  if (typeof acc.password === 'string') {
    docObj.password = acc.password.slice(0, 128);
  }
  return docObj;
}

function toPendingRegDoc(reg: any) {
  const docObj: Record<string, any> = {
    id: String(reg.id || `reg-${Date.now()}`).slice(0, 128),
    name: String(reg.name || 'Member').slice(0, 120),
    tagname: String(reg.tagname || '').slice(0, 200),
    roleTitle: String(reg.roleTitle || '𝑴𝒃𝒓').slice(0, 64),
    requestedAt: String(reg.requestedAt || '').slice(0, 64),
  };
  if (typeof reg.reason === 'string') {
    docObj.reason = reg.reason.slice(0, 500);
  }
  return docObj;
}

function toSuspensionDoc(susp: any) {
  const docObj: Record<string, any> = {
    id: String(susp.id || `susp-${Date.now()}`).slice(0, 128),
    tagname: String(susp.tagname || susp.targetTagname || '').slice(0, 200),
    reason: String(susp.reason || '').slice(0, 500),
    date: String(susp.date || '').slice(0, 64),
  };
  if (typeof susp.targetTagname === 'string') {
    docObj.targetTagname = susp.targetTagname.slice(0, 200);
  }
  if (typeof susp.name === 'string') {
    docObj.name = susp.name.slice(0, 120);
  }
  if (typeof susp.action === 'string') {
    docObj.action = susp.action.slice(0, 64);
  }
  return docObj;
}

function toChatMessageDoc(msg: any) {
  const docObj: Record<string, any> = {
    id: String(msg.id || `msg-${Date.now()}`).slice(0, 128),
    senderTagname: String(msg.senderTagname || '').slice(0, 200),
    senderName: String(msg.senderName || 'Member').slice(0, 120),
    senderRole: String(msg.senderRole || 'Member').slice(0, 64),
    senderCategory: msg.senderCategory === 'leadership' ? 'leadership' : 'member',
    timestamp: String(msg.timestamp || '').slice(0, 64),
    createdTimestamp:
      typeof msg.createdTimestamp === 'number' && msg.createdTimestamp >= 0
        ? msg.createdTimestamp
        : Date.now(),
  };

  if (typeof msg.text === 'string') {
    docObj.text = msg.text.slice(0, 4000);
  }
  if (
    msg.mediaType === 'image' ||
    msg.mediaType === 'video' ||
    msg.mediaType === 'audio' ||
    msg.mediaType === 'tiktok_live'
  ) {
    if (typeof msg.mediaUrl === 'string' && msg.mediaUrl.length <= 850000) {
      docObj.mediaType = msg.mediaType;
      docObj.mediaUrl = msg.mediaUrl;
    } else if (msg.mediaType === 'tiktok_live') {
      docObj.mediaType = msg.mediaType;
    }
  }
  if (typeof msg.mediaDuration === 'number' && msg.mediaDuration >= 0) {
    docObj.mediaDuration = msg.mediaDuration;
  }
  if (typeof msg.liveTitle === 'string') {
    docObj.liveTitle = msg.liveTitle.slice(0, 300);
  }
  if (typeof msg.liveUrl === 'string') {
    docObj.liveUrl = msg.liveUrl.slice(0, 1000);
  }
  if (msg.reactions && typeof msg.reactions === 'object' && !Array.isArray(msg.reactions)) {
    const cleanReactions: Record<string, string[]> = {};
    const keys = Object.keys(msg.reactions).slice(0, 20);
    for (const k of keys) {
      if (Array.isArray(msg.reactions[k])) {
        cleanReactions[String(k).slice(0, 32)] = msg.reactions[k].map((u: any) => String(u).slice(0, 200));
      }
    }
    docObj.reactions = cleanReactions;
  }
  if (typeof msg.isUnsent === 'boolean') {
    docObj.isUnsent = msg.isUnsent;
  }
  if (typeof msg.unsentBy === 'string') {
    docObj.unsentBy = msg.unsentBy.slice(0, 120);
  }
  if (msg.replyTo && typeof msg.replyTo === 'object') {
    const replyObj: Record<string, any> = {
      messageId: String(msg.replyTo.messageId || '').slice(0, 128),
      senderName: String(msg.replyTo.senderName || 'Member').slice(0, 120),
      senderTagname: String(msg.replyTo.senderTagname || '').slice(0, 200),
    };
    if (typeof msg.replyTo.text === 'string') {
      replyObj.text = msg.replyTo.text.slice(0, 4000);
    }
    if (
      msg.replyTo.mediaType === 'image' ||
      msg.replyTo.mediaType === 'video' ||
      msg.replyTo.mediaType === 'audio' ||
      msg.replyTo.mediaType === 'tiktok_live'
    ) {
      replyObj.mediaType = msg.replyTo.mediaType;
    }
    if (replyObj.messageId && replyObj.senderTagname) {
      docObj.replyTo = replyObj;
    }
  }
  return docObj;
}

export interface PersistedServerState {
  chatMessages: any[];
  attendanceStore: Record<string, Record<string, { isPresent: boolean; timeCheckedIn?: string }>>;
  currentLivePin: any | null;
  pendingRegistrations: any[];
  suspendedMembers: any[];
  registeredAccounts: any[];
  removedTagnames: string[];
}

export async function testServerFirestoreConnection(): Promise<boolean> {
  try {
    await getDoc(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    logFirestoreError(error, OperationType.GET, 'test/connection');
    return false;
  }
}

export async function persistAccountToFirestore(account: any): Promise<void> {
  if (!account || !account.tagname) return;
  const tagLower = String(account.tagname).trim().toLowerCase();
  const accDocId = toSafeDocId('acc', tagLower);
  const remDocId = toSafeDocId('rem', tagLower);
  try {
    await setDoc(doc(db, 'zvr_accounts', accDocId), toAccountDoc(account));
    await deleteDoc(doc(db, 'zvr_removed_tagnames', remDocId)).catch(() => {});
  } catch (error) {
    logFirestoreError(error, OperationType.WRITE, `zvr_accounts/${accDocId}`);
  }
}

export async function removeAccountFromFirestore(accountId?: string, tagname?: string): Promise<void> {
  const tagLower = tagname ? String(tagname).trim().toLowerCase() : '';
  try {
    if (tagLower) {
      const accDocId = toSafeDocId('acc', tagLower);
      const remDocId = toSafeDocId('rem', tagLower);
      await deleteDoc(doc(db, 'zvr_accounts', accDocId)).catch(() => {});
      await setDoc(doc(db, 'zvr_removed_tagnames', remDocId), {
        tagnameLower: tagLower,
        removedAt: Date.now(),
      });
    }
    // Also remove any doc whose stored id matches accountId (in case of legacy/different tagname casing)
    if (accountId) {
      const snap = await getDocs(collection(db, 'zvr_accounts'));
      for (const d of snap.docs) {
        const data = d.data();
        if (
          data?.id === accountId ||
          (tagLower && String(data?.tagname || '').trim().toLowerCase() === tagLower)
        ) {
          await deleteDoc(d.ref).catch(() => {});
        }
      }
    }
  } catch (error) {
    logFirestoreError(error, OperationType.DELETE, 'zvr_accounts');
  }
}

export async function persistAttendanceEntriesToFirestore(
  dateKey: string,
  entries: Record<string, { isPresent: boolean; timeCheckedIn?: string }>
): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !entries) return;
  try {
    await setDoc(doc(db, 'zvr_attendance', dateKey), {
      dateKey,
      updatedAt: Date.now(),
    });
    const batch = writeBatch(db);
    let count = 0;
    for (const [entryKey, val] of Object.entries(entries)) {
      if (!entryKey || !val) continue;
      const entryDocId = toSafeDocId('att', entryKey);
      const entryPayload: Record<string, any> = {
        entryKey: String(entryKey).slice(0, 200),
        isPresent: !!val.isPresent,
      };
      if (typeof val.timeCheckedIn === 'string' && val.timeCheckedIn.trim()) {
        entryPayload.timeCheckedIn = val.timeCheckedIn.slice(0, 32);
      }
      batch.set(doc(db, 'zvr_attendance', dateKey, 'entries', entryDocId), entryPayload);
      count++;
      if (count >= 450) break;
    }
    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    logFirestoreError(error, OperationType.WRITE, `zvr_attendance/${dateKey}`);
  }
}

export async function persistChatMessageToFirestore(msg: any): Promise<void> {
  if (!msg || !msg.id || !msg.senderTagname) return;
  const msgDocId = toSafeDocId('msg', String(msg.id));
  try {
    await setDoc(doc(db, 'zvr_chat_messages', msgDocId), toChatMessageDoc(msg));
  } catch (error) {
    logFirestoreError(error, OperationType.WRITE, `zvr_chat_messages/${msgDocId}`);
  }
}

export async function deleteChatMessageFromFirestore(messageId: string): Promise<void> {
  if (!messageId) return;
  const msgDocId = toSafeDocId('msg', String(messageId));
  try {
    await deleteDoc(doc(db, 'zvr_chat_messages', msgDocId));
  } catch (error) {
    logFirestoreError(error, OperationType.DELETE, `zvr_chat_messages/${msgDocId}`);
  }
}

export async function clearAllChatMessagesInFirestore(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'zvr_chat_messages'));
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      for (const d of docs.slice(i, i + 400)) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }
  } catch (error) {
    logFirestoreError(error, OperationType.DELETE, 'zvr_chat_messages');
  }
}

export async function syncPendingRegistrationsToFirestore(list: any[]): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'zvr_pending_registrations'));
    const nextIds = new Set(list.map((item) => toSafeDocId('reg', item.id || item.tagname)));
    const batch = writeBatch(db);
    for (const existingDoc of snap.docs) {
      if (!nextIds.has(existingDoc.id)) {
        batch.delete(existingDoc.ref);
      }
    }
    for (const item of list) {
      const docId = toSafeDocId('reg', item.id || item.tagname);
      batch.set(doc(db, 'zvr_pending_registrations', docId), toPendingRegDoc(item));
    }
    await batch.commit();
  } catch (error) {
    logFirestoreError(error, OperationType.WRITE, 'zvr_pending_registrations');
  }
}

export async function syncSuspensionsToFirestore(list: any[]): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'zvr_suspensions'));
    const nextIds = new Set(list.map((item) => toSafeDocId('susp', item.id || item.tagname)));
    const batch = writeBatch(db);
    for (const existingDoc of snap.docs) {
      if (!nextIds.has(existingDoc.id)) {
        batch.delete(existingDoc.ref);
      }
    }
    for (const item of list) {
      const docId = toSafeDocId('susp', item.id || item.tagname);
      batch.set(doc(db, 'zvr_suspensions', docId), toSuspensionDoc(item));
    }
    await batch.commit();
  } catch (error) {
    logFirestoreError(error, OperationType.WRITE, 'zvr_suspensions');
  }
}

export async function persistLivePinToFirestore(pin: any | null): Promise<void> {
  try {
    if (!pin) {
      await setDoc(doc(db, 'zvr_portal_meta', 'live_pin'), {
        id: 'live_pin',
        active: false,
      });
    } else {
      await setDoc(doc(db, 'zvr_portal_meta', 'live_pin'), {
        id: String(pin.id || 'live_pin').slice(0, 128),
        streamerName: String(pin.streamerName || '').slice(0, 120),
        streamerTagname: String(pin.streamerTagname || '').slice(0, 200),
        title: String(pin.title || '').slice(0, 300),
        liveUrl: String(pin.liveUrl || '').slice(0, 1000),
        startedAt: String(pin.startedAt || '').slice(0, 64),
        active: true,
      });
    }
  } catch (error) {
    logFirestoreError(error, OperationType.WRITE, 'zvr_portal_meta/live_pin');
  }
}

export async function loadAndMigrateStateFromFirestore(
  localFallback: PersistedServerState
): Promise<PersistedServerState> {
  try {
    await testServerFirestoreConnection();

    const [
      accSnap,
      remSnap,
      regSnap,
      suspSnap,
      attDaysSnap,
      chatSnap,
      pinDocSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'zvr_accounts')),
      getDocs(collection(db, 'zvr_removed_tagnames')),
      getDocs(collection(db, 'zvr_pending_registrations')),
      getDocs(collection(db, 'zvr_suspensions')),
      getDocs(collection(db, 'zvr_attendance')),
      getDocs(collection(db, 'zvr_chat_messages')),
      getDoc(doc(db, 'zvr_portal_meta', 'live_pin')),
    ]);

    const removedSet = new Set<string>();
    for (const d of remSnap.docs) {
      const val = d.data()?.tagnameLower;
      if (typeof val === 'string' && val.trim()) {
        removedSet.add(val.trim().toLowerCase());
      }
    }
    for (const t of localFallback.removedTagnames || []) {
      const lower = String(t).trim().toLowerCase();
      if (lower && !removedSet.has(lower)) {
        removedSet.add(lower);
        await setDoc(doc(db, 'zvr_removed_tagnames', toSafeDocId('rem', lower)), {
          tagnameLower: lower,
          removedAt: Date.now(),
        }).catch(() => {});
      }
    }

    // Accounts: merge Firestore + any un-removed localFallback accounts
    const accountMap = new Map<string, any>();
    for (const d of accSnap.docs) {
      const data = d.data();
      if (data && data.tagname) {
        const lower = String(data.tagname).trim().toLowerCase();
        if (!removedSet.has(lower)) {
          accountMap.set(lower, data);
        }
      }
    }
    for (const acc of localFallback.registeredAccounts || []) {
      if (acc && acc.tagname) {
        const lower = String(acc.tagname).trim().toLowerCase();
        if (!removedSet.has(lower) && !accountMap.has(lower)) {
          accountMap.set(lower, acc);
          await persistAccountToFirestore(acc);
        }
      }
    }

    // Pending Registrations
    const pendingList: any[] = regSnap.docs.map((d) => d.data());
    if (pendingList.length === 0 && (localFallback.pendingRegistrations || []).length > 0) {
      pendingList.push(...localFallback.pendingRegistrations);
      await syncPendingRegistrationsToFirestore(pendingList);
    }

    // Suspensions
    const suspensionsList: any[] = suspSnap.docs.map((d) => d.data());
    if (suspensionsList.length === 0 && (localFallback.suspendedMembers || []).length > 0) {
      suspensionsList.push(...localFallback.suspendedMembers);
      await syncSuspensionsToFirestore(suspensionsList);
    }

    // Attendance Store (per dateKey + entries subcollection)
    const attendanceStore: Record<string, Record<string, { isPresent: boolean; timeCheckedIn?: string }>> = {};
    for (const dayDoc of attDaysSnap.docs) {
      const dateKey = dayDoc.id;
      const entriesSnap = await getDocs(collection(db, 'zvr_attendance', dateKey, 'entries'));
      const map: Record<string, { isPresent: boolean; timeCheckedIn?: string }> = {};
      for (const eDoc of entriesSnap.docs) {
        const eData = eDoc.data();
        if (eData && typeof eData.entryKey === 'string') {
          map[eData.entryKey] = {
            isPresent: !!eData.isPresent,
            ...(typeof eData.timeCheckedIn === 'string' ? { timeCheckedIn: eData.timeCheckedIn } : {}),
          };
        }
      }
      attendanceStore[dateKey] = map;
    }
    // Merge local fallback attendance if missing in Firestore
    for (const [dateKey, dayMap] of Object.entries(localFallback.attendanceStore || {})) {
      if (!attendanceStore[dateKey]) attendanceStore[dateKey] = {};
      const missingForDay: Record<string, { isPresent: boolean; timeCheckedIn?: string }> = {};
      for (const [k, val] of Object.entries(dayMap || {})) {
        if (val?.isPresent && !attendanceStore[dateKey][k]?.isPresent) {
          attendanceStore[dateKey][k] = val;
          missingForDay[k] = val;
        }
      }
      if (Object.keys(missingForDay).length > 0) {
        await persistAttendanceEntriesToFirestore(dateKey, missingForDay);
      }
    }

    // Chat Messages
    const chatMap = new Map<string, any>();
    for (const d of chatSnap.docs) {
      const data = d.data();
      if (data && data.id) {
        chatMap.set(data.id, data);
      }
    }
    for (const msg of localFallback.chatMessages || []) {
      if (msg && msg.id && !chatMap.has(msg.id)) {
        chatMap.set(msg.id, msg);
        await persistChatMessageToFirestore(msg);
      }
    }
    const chatMessages = Array.from(chatMap.values())
      .sort((a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0))
      .slice(-150);

    // Live Pin
    let currentLivePin = null;
    if (pinDocSnap.exists()) {
      const pinData = pinDocSnap.data();
      if (pinData?.active) {
        currentLivePin = {
          id: pinData.id,
          streamerName: pinData.streamerName,
          streamerTagname: pinData.streamerTagname,
          title: pinData.title,
          liveUrl: pinData.liveUrl,
          startedAt: pinData.startedAt,
        };
      }
    } else if (localFallback.currentLivePin) {
      currentLivePin = localFallback.currentLivePin;
      await persistLivePinToFirestore(currentLivePin);
    }

    console.log(
      `✅ [Firestore Connected]: Loaded ${accountMap.size} accounts, ${chatMessages.length} chat messages, ${Object.keys(attendanceStore).length} attendance days.`
    );

    return {
      chatMessages,
      attendanceStore,
      currentLivePin,
      pendingRegistrations: pendingList,
      suspendedMembers: suspensionsList,
      registeredAccounts: Array.from(accountMap.values()),
      removedTagnames: Array.from(removedSet),
    };
  } catch (error) {
    logFirestoreError(error, OperationType.GET, 'loadAndMigrateStateFromFirestore');
    return localFallback;
  }
}
