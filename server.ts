import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  loadAndMigrateStateFromFirestore,
  persistAccountToFirestore,
  removeAccountFromFirestore,
  persistAttendanceEntriesToFirestore,
  persistChatMessageToFirestore,
  deleteChatMessageFromFirestore,
  clearAllChatMessagesInFirestore,
  syncPendingRegistrationsToFirestore,
  syncSuspensionsToFirestore,
  persistLivePinToFirestore,
} from './src/server/firestoreStore.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Increase body limit for photos and voice recordings
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// In-Memory Real-time State
interface OnlineMemberRecord {
  socketId: string;
  memberId: string;
  tagname: string;
  displayName: string;
  roleTitle: string;
  category: 'leadership' | 'member';
  onlineSince: string;
  joinedTimestamp: number;
  lastActive: number;
  currentTab: string;
  status?: 'active' | 'idle';
}

interface ServerChatMessage {
  id: string;
  senderTagname: string;
  senderName: string;
  senderRole: string;
  senderCategory: 'leadership' | 'member';
  timestamp: string;
  text?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'tiktok_live';
  mediaUrl?: string;
  mediaDuration?: number;
  liveTitle?: string;
  liveUrl?: string;
  reactions?: Record<string, string[]>;
  createdTimestamp?: number;
  isUnsent?: boolean;
  unsentBy?: string;
  replyTo?: {
    messageId: string;
    senderName: string;
    senderTagname: string;
    text?: string;
    mediaType?: 'image' | 'video' | 'audio' | 'tiktok_live';
  };
}

interface TikTokLivePin {
  id: string;
  streamerName: string;
  streamerTagname: string;
  title: string;
  liveUrl: string;
  startedAt: string;
}

// Computes attendance cycle date key (YYYY-MM-DD) in Philippines Time (UTC+8) resetting at 3:00 AM
function getAttendanceDateKey(now: Date = new Date()): string {
  const shiftedMs = now.getTime() + (8 - 3) * 60 * 60 * 1000;
  const shifted = new Date(shiftedMs);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function pruneOldMessages(msgs: ServerChatMessage[]): ServerChatMessage[] {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return msgs.filter((m) => (m.createdTimestamp || Date.now()) > sevenDaysAgo).slice(-150);
}

// State storage file path
const DATA_FILE = path.resolve(__dirname, 'server_state.json');

// Initial in-memory state
let chatMessages: ServerChatMessage[] = [];
let attendanceStore: Record<string, Record<string, { isPresent: boolean; timeCheckedIn?: string }>> = {};
let currentLivePin: TikTokLivePin | null = null;
let pendingRegistrations: any[] = [];
let suspendedMembers: any[] = [];
let registeredAccounts: any[] = [];
let removedTagnames: string[] = [];

// Load persisted state if exists
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.chatMessages)) {
      chatMessages = pruneOldMessages(parsed.chatMessages);
    }
    if (parsed.attendanceStore) attendanceStore = parsed.attendanceStore;
    if (parsed.currentLivePin) currentLivePin = parsed.currentLivePin;
    if (Array.isArray(parsed.pendingRegistrations)) pendingRegistrations = parsed.pendingRegistrations;
    if (Array.isArray(parsed.suspendedMembers)) suspendedMembers = parsed.suspendedMembers;
    if (Array.isArray(parsed.registeredAccounts)) registeredAccounts = parsed.registeredAccounts;
    if (Array.isArray(parsed.removedTagnames)) removedTagnames = parsed.removedTagnames;
    saveServerState();
  }
} catch (err) {
  console.warn('Could not load persistent state, starting clean:', err);
}

// Function to persist state periodically
function saveServerState() {
  try {
    chatMessages = pruneOldMessages(chatMessages);
    const payload = {
      chatMessages: chatMessages.slice(-150), // Keep up to 150 recent messages within 24 hours
      attendanceStore,
      currentLivePin,
      pendingRegistrations,
      suspendedMembers,
      registeredAccounts,
      removedTagnames,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('Error saving server state:', err);
  }
}

// Map of active WebSocket connections
const activeSockets = new Map<string, { ws: WebSocket; member?: OnlineMemberRecord }>();

export interface VoiceParticipant {
  socketId: string;
  memberId: string;
  tagname: string;
  displayName: string;
  roleTitle: string;
  category: 'leadership' | 'member';
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  joinedAt: number;
}

// Active members currently joined in the Clan Room Voice Channel
const voiceChannelMembers = new Map<string, VoiceParticipant>();

function getVoiceParticipants(): VoiceParticipant[] {
  const map = new Map<string, VoiceParticipant>();
  for (const [, p] of voiceChannelMembers.entries()) {
    map.set(p.tagname, p);
  }
  return Array.from(map.values());
}

// Helper to get unique list of online members
function getUniqueOnlineUsers(): OnlineMemberRecord[] {
  const memberMap = new Map<string, OnlineMemberRecord>();
  for (const [, item] of activeSockets.entries()) {
    if (item.member) {
      memberMap.set(item.member.tagname, item.member);
    }
  }
  return Array.from(memberMap.values());
}

// Broadcast to all connected WebSocket clients
function broadcast(messageObj: any, excludeSocketId?: string) {
  const data = JSON.stringify(messageObj);
  for (const [id, item] of activeSockets.entries()) {
    if (excludeSocketId && id === excludeSocketId) continue;
    if (item.ws.readyState === WebSocket.OPEN) {
      try {
        item.ws.send(data);
      } catch (err) {
        console.warn('Failed to send to client', id, err);
      }
    }
  }
}

// Initialize WebSocket Server on /ws without interfering with other upgrade paths (like Vite WS)
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (request, socket, head) => {
  try {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  } catch {
    socket.destroy();
  }
});

let socketCounter = 1;

wss.on('connection', (ws) => {
  const socketId = `sock_${Date.now()}_${socketCounter++}`;
  activeSockets.set(socketId, { ws });

  // Send initial connected ping
  ws.send(JSON.stringify({ type: 'CONNECTED', socketId }));

  // Immediately send initial state so even unauthenticated / offline-viewing users get verified accounts & attendance
  const initialDateKey = getAttendanceDateKey();
  chatMessages = pruneOldMessages(chatMessages);
  ws.send(
    JSON.stringify({
      type: 'INIT_STATE',
      onlineUsers: getUniqueOnlineUsers(),
      messages: chatMessages,
      attendanceMap: attendanceStore[initialDateKey] || {},
      todayDateKey: initialDateKey,
      currentLivePin,
      pendingRegistrations,
      suspendedMembers,
      registeredAccounts,
      removedTagnames,
      voiceParticipants: getVoiceParticipants(),
    })
  );

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === 'LOGIN') {
        const m = data.member;
        if (m && m.tagname) {
          const now = Date.now();
          const record: OnlineMemberRecord = {
            socketId,
            memberId: m.id || m.tagname,
            tagname: m.tagname,
            displayName: m.displayName || m.name || m.tagname,
            roleTitle: m.roleTitle || 'Member',
            category: m.category || 'member',
            onlineSince: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            joinedTimestamp: now,
            lastActive: now,
            status: 'active',
            currentTab: data.currentTab || 'room',
          };

          const socketItem = activeSockets.get(socketId);
          if (socketItem) {
            socketItem.member = record;
          }

          // Broadcast updated online presence
          const onlineList = getUniqueOnlineUsers();
          broadcast({
            type: 'PRESENCE_UPDATE',
            onlineUsers: onlineList,
            userJoined: record,
          });

          // Send current room snapshot to the logging-in client
          const todayKey = getAttendanceDateKey();
          chatMessages = pruneOldMessages(chatMessages);
          ws.send(
            JSON.stringify({
              type: 'INIT_STATE',
              onlineUsers: onlineList,
              messages: chatMessages,
              attendanceMap: attendanceStore[todayKey] || {},
              todayDateKey: todayKey,
              currentLivePin,
              pendingRegistrations,
              suspendedMembers,
              registeredAccounts,
              removedTagnames,
              voiceParticipants: getVoiceParticipants(),
            })
          );
        }
      } else if (data.type === 'HEARTBEAT') {
        const item = activeSockets.get(socketId);
        if (item?.member) {
          item.member.lastActive = Date.now();
          if (data.currentTab) item.member.currentTab = data.currentTab;
        }
      } else if (data.type === 'TYPING_STATUS') {
        const item = activeSockets.get(socketId);
        const tagname = data.tagname || item?.member?.tagname;
        if (tagname) {
          if (item?.member) {
            item.member.lastActive = Date.now();
          }
          broadcast({
            type: 'TYPING_STATUS',
            tagname,
            displayName: data.displayName || item?.member?.displayName || tagname,
            isTyping: !!data.isTyping,
            activity: data.activity || 'typing',
            timestamp: Date.now(),
          });
        }
      } else if (data.type === 'CHAT_MESSAGE') {
        const msg: ServerChatMessage = data.message;
        if (msg && msg.senderTagname && msg.id) {
          if (!chatMessages.some((m) => m.id === msg.id)) {
            msg.createdTimestamp = msg.createdTimestamp || Date.now();
            chatMessages.push(msg);

            // Automatically clear messages older than 1 day (24 hours)
            chatMessages = pruneOldMessages(chatMessages);

            if (chatMessages.length > 150) {
              chatMessages = chatMessages.slice(-150);
            }
            saveServerState();
            void persistChatMessageToFirestore(msg);

            // Broadcast to everyone
            broadcast({
              type: 'NEW_CHAT_MESSAGE',
              message: msg,
            });
          }
        }
      } else if (data.type === 'TOGGLE_REACTION') {
        const { messageId, emoji, tagname } = data;
        const msg = chatMessages.find((m) => m.id === messageId);
        if (msg && emoji && tagname) {
          if (!msg.reactions) msg.reactions = {};
          const currentList = msg.reactions[emoji] || [];
          if (currentList.includes(tagname)) {
            msg.reactions[emoji] = currentList.filter((t) => t !== tagname);
            if (msg.reactions[emoji].length === 0) {
              delete msg.reactions[emoji];
            }
          } else {
            msg.reactions[emoji] = [...currentList, tagname];
          }
          saveServerState();
          void persistChatMessageToFirestore(msg);
          broadcast({
            type: 'REACTION_UPDATE',
            messageId,
            reactions: msg.reactions,
          });
        }
      } else if (data.type === 'DELETE_MESSAGE') {
        const { messageId } = data;
        if (messageId) {
          chatMessages = chatMessages.filter((m) => m.id !== messageId);
          saveServerState();
          void deleteChatMessageFromFirestore(messageId);
          broadcast({
            type: 'MESSAGE_DELETED',
            messageId,
          });
        }
      } else if (data.type === 'UNSEND_MESSAGE') {
        const { messageId, unsentBy } = data;
        if (messageId) {
          const msg = chatMessages.find((m) => m.id === messageId);
          const resolvedUnsentBy = unsentBy || msg?.senderName || 'Member';
          if (msg) {
            msg.isUnsent = true;
            msg.unsentBy = resolvedUnsentBy;
            msg.text = undefined;
            msg.mediaType = undefined;
            msg.mediaUrl = undefined;
            msg.reactions = undefined;
            msg.replyTo = undefined;
            saveServerState();
            void persistChatMessageToFirestore(msg);
          }
          broadcast({
            type: 'MESSAGE_UNSENT',
            messageId,
            unsentBy: resolvedUnsentBy,
          });
        }
      } else if (data.type === 'CLEAR_ALL_MESSAGES') {
        chatMessages = [];
        saveServerState();
        void clearAllChatMessagesInFirestore();
        broadcast({
          type: 'ALL_MESSAGES_CLEARED',
        });
      } else if (data.type === 'ATTENDANCE_CHECK') {
        const { dateKey, memberId, isPresent, timeCheckedIn, displayName, tagname } = data;
        if (dateKey && (memberId || tagname)) {
          if (!attendanceStore[dateKey]) {
            attendanceStore[dateKey] = {};
          }
          const entry = {
            isPresent: !!isPresent,
            timeCheckedIn: isPresent ? (timeCheckedIn || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : undefined,
          };
          const syncedEntries: Record<string, { isPresent: boolean; timeCheckedIn?: string }> = {};
          if (memberId) {
            attendanceStore[dateKey][memberId] = entry;
            syncedEntries[memberId] = entry;
          }
          if (tagname) {
            attendanceStore[dateKey][tagname] = entry;
            syncedEntries[tagname] = entry;
          }
          saveServerState();
          void persistAttendanceEntriesToFirestore(dateKey, syncedEntries);

          // Broadcast updated attendance to all clients
          broadcast({
            type: 'ATTENDANCE_UPDATE',
            dateKey,
            map: attendanceStore[dateKey],
            updatedMemberId: memberId || tagname,
            isPresent: !!isPresent,
            displayName,
            tagname,
          });
        }
      } else if (data.type === 'PIN_LIVE') {
        currentLivePin = data.pin;
        saveServerState();
        void persistLivePinToFirestore(currentLivePin);
        broadcast({
          type: 'PIN_UPDATE',
          pin: currentLivePin,
        });
      } else if (data.type === 'UNPIN_LIVE') {
        currentLivePin = null;
        saveServerState();
        void persistLivePinToFirestore(null);
        broadcast({
          type: 'PIN_UPDATE',
          pin: null,
        });
      } else if (data.type === 'UPDATE_REGISTRATIONS') {
        if (Array.isArray(data.pendingRegistrations)) {
          pendingRegistrations = data.pendingRegistrations;
          saveServerState();
          void syncPendingRegistrationsToFirestore(pendingRegistrations);
          broadcast({
            type: 'REGISTRATIONS_UPDATE',
            pendingRegistrations,
          });
        }
      } else if (data.type === 'UPDATE_SUSPENSIONS') {
        if (Array.isArray(data.suspendedMembers)) {
          suspendedMembers = data.suspendedMembers;
          saveServerState();
          void syncSuspensionsToFirestore(suspendedMembers);
          broadcast({
            type: 'SUSPENSIONS_UPDATE',
            suspendedMembers,
          });
        }
      } else if (data.type === 'REGISTER_ACCOUNT') {
        const { account } = data;
        if (account && account.tagname) {
          const lower = account.tagname.toLowerCase();
          removedTagnames = removedTagnames.filter((t) => t !== lower);
          registeredAccounts = registeredAccounts.filter(
            (a) => a.tagname.toLowerCase() !== lower
          );
          registeredAccounts.push(account);
          saveServerState();
          void persistAccountToFirestore(account);
          broadcast({
            type: 'ACCOUNTS_UPDATE',
            registeredAccounts,
          });
        }
      } else if (data.type === 'SYNC_ACCOUNTS') {
        const incoming = Array.isArray(data.accounts) ? data.accounts : [];
        let changed = false;
        const suspendedSet = new Set(suspendedMembers.map((s) => (s.tagname || s.targetTagname || '').toLowerCase()));
        const removedSet = new Set(removedTagnames);
        const newlyAdded: any[] = [];
        for (const acc of incoming) {
          if (!acc || !acc.tagname) continue;
          const lower = acc.tagname.toLowerCase();
          if (removedSet.has(lower) || suspendedSet.has(lower)) continue;
          if (!registeredAccounts.some((existing) => existing.tagname.toLowerCase() === lower)) {
            registeredAccounts.push(acc);
            newlyAdded.push(acc);
            changed = true;
          }
        }
        if (changed) {
          saveServerState();
          for (const acc of newlyAdded) {
            void persistAccountToFirestore(acc);
          }
          broadcast({
            type: 'ACCOUNTS_UPDATE',
            registeredAccounts,
          });
        }
      } else if (data.type === 'ATTENDANCE_SYNC') {
        const { dateKey, entries } = data;
        if (dateKey && entries && typeof entries === 'object') {
          if (!attendanceStore[dateKey]) {
            attendanceStore[dateKey] = {};
          }
          let changed = false;
          const syncedEntries: Record<string, { isPresent: boolean; timeCheckedIn?: string }> = {};
          for (const [key, val] of Object.entries(entries)) {
            const entryVal = val as { isPresent?: boolean; timeCheckedIn?: string } | null;
            if (entryVal && entryVal.isPresent && !attendanceStore[dateKey][key]?.isPresent) {
              const entry = {
                isPresent: true,
                timeCheckedIn: entryVal.timeCheckedIn,
              };
              attendanceStore[dateKey][key] = entry;
              syncedEntries[key] = entry;
              changed = true;
            }
          }
          if (changed) {
            saveServerState();
            void persistAttendanceEntriesToFirestore(dateKey, syncedEntries);
            broadcast({
              type: 'ATTENDANCE_UPDATE',
              dateKey,
              map: attendanceStore[dateKey],
            });
          }
        }
      } else if (data.type === 'REMOVE_ACCOUNT' || data.type === 'SUSPEND_ACCOUNT') {
        const { accountId, tagname, suspension, requester } = data;
        if (data.type === 'REMOVE_ACCOUNT') {
          const sockMember = activeSockets.get(socketId)?.member;
          const reqTag = (sockMember?.tagname || requester?.tagname || '').trim().toLowerCase();
          const matchedAcc = reqTag
            ? registeredAccounts.find((a) => a.tagname?.trim().toLowerCase() === reqTag)
            : undefined;
          const effectiveCategory = matchedAcc?.category || sockMember?.category || requester?.category;
          const effectiveRole = matchedAcc?.roleTitle || sockMember?.roleTitle || requester?.roleTitle || '';
          const adminRoles = ['𝑶𝒘𝒏𝒆𝒓', '𝑪𝒐-𝒐𝒘𝒏𝒆𝒓', '𝑭𝒅𝒓', '𝑯-𝒇𝒅𝒓', '𝑪𝒐-𝒇𝒅𝒓', '𝑯-𝒂𝒅𝒎𝒊𝒏', '𝑪-𝒂𝒅𝒎𝒊𝒏', '𝑺-𝒂𝒅𝒎𝒊𝒏', '𝑨𝒅𝒎𝒊𝒏', 'Owner', 'Co-Owner', 'Founder', 'Admin', 'Sub-Admin'];
          const isRequesterAdmin =
            effectiveCategory === 'leadership' ||
            adminRoles.some((r) => effectiveRole.includes(r));
          if (!isRequesterAdmin) {
            return;
          }
        }
        if (tagname || accountId) {
          if (tagname) {
            const lower = tagname.trim().toLowerCase();
            if (!removedTagnames.includes(lower)) {
              removedTagnames.push(lower);
            }
          }
          registeredAccounts = registeredAccounts.filter(
            (a) => a.id !== accountId && a.tagname?.trim().toLowerCase() !== tagname?.trim().toLowerCase()
          );
          if (suspension) {
            suspendedMembers = [
              ...suspendedMembers.filter((s) => s.tagname !== tagname),
              suspension,
            ];
          }
          saveServerState();
          void removeAccountFromFirestore(accountId, tagname);
          if (suspension) {
            void syncSuspensionsToFirestore(suspendedMembers);
          }
          broadcast({
            type: 'ACCOUNTS_UPDATE',
            registeredAccounts,
            removedTagname: tagname,
          });
          if (suspension) {
            broadcast({
              type: 'SUSPENSIONS_UPDATE',
              suspendedMembers,
            });
          }
        }
      } else if (data.type === 'VOICE_JOIN') {
        const item = activeSockets.get(socketId);
        const m = data.member || item?.member;
        if (m && m.tagname) {
          const participant: VoiceParticipant = {
            socketId,
            memberId: m.memberId || m.id || m.tagname,
            tagname: m.tagname,
            displayName: m.displayName || m.name || m.tagname,
            roleTitle: m.roleTitle || 'Member',
            category: m.category || 'member',
            isMuted: !!data.isMuted,
            isDeafened: !!data.isDeafened,
            isSpeaking: false,
            joinedAt: Date.now(),
          };
          voiceChannelMembers.set(socketId, participant);
          broadcast({
            type: 'VOICE_CHANNEL_UPDATE',
            participants: getVoiceParticipants(),
            joinedUser: participant,
          });
        }
      } else if (data.type === 'VOICE_LEAVE') {
        const left = voiceChannelMembers.get(socketId);
        if (left) {
          voiceChannelMembers.delete(socketId);
          broadcast({
            type: 'VOICE_CHANNEL_UPDATE',
            participants: getVoiceParticipants(),
            leftUser: left,
          });
        }
      } else if (data.type === 'VOICE_AUDIO_CHUNK') {
        const senderVoice = voiceChannelMembers.get(socketId);
        if (senderVoice && !senderVoice.isMuted && data.audioChunk) {
          const payload = JSON.stringify({
            type: 'VOICE_AUDIO_STREAM',
            senderTagname: senderVoice.tagname,
            senderName: senderVoice.displayName,
            audioChunk: data.audioChunk,
            timestamp: Date.now(),
          });
          for (const [targetSocketId, voiceUser] of voiceChannelMembers.entries()) {
            if (targetSocketId === socketId) continue;
            if (voiceUser.isDeafened) continue;
            const target = activeSockets.get(targetSocketId);
            if (target && target.ws.readyState === WebSocket.OPEN) {
              try {
                target.ws.send(payload);
              } catch {}
            }
          }
        }
      } else if (data.type === 'VOICE_SPEAKING') {
        const senderVoice = voiceChannelMembers.get(socketId);
        if (senderVoice) {
          senderVoice.isSpeaking = !!data.isSpeaking;
          broadcast({
            type: 'VOICE_SPEAKING_UPDATE',
            tagname: senderVoice.tagname,
            isSpeaking: !!data.isSpeaking,
          });
        }
      } else if (data.type === 'VOICE_STATE_CHANGE') {
        const senderVoice = voiceChannelMembers.get(socketId);
        if (senderVoice) {
          if (data.isMuted !== undefined) senderVoice.isMuted = !!data.isMuted;
          if (data.isDeafened !== undefined) senderVoice.isDeafened = !!data.isDeafened;
          broadcast({
            type: 'VOICE_CHANNEL_UPDATE',
            participants: getVoiceParticipants(),
          });
        }
      } else if (data.type === 'START_CALL_RING') {
        const sockItem = activeSockets.get(socketId);
        const caller = data.caller || sockItem?.member;
        if (caller && caller.tagname) {
          broadcast(
            {
              type: 'INCOMING_CALL_RING',
              callId: data.callId || `call_${Date.now()}`,
              callType: data.callType === 'voice' ? 'voice' : 'video',
              caller: {
                tagname: caller.tagname,
                displayName: caller.displayName || caller.name || caller.tagname,
                roleTitle: caller.roleTitle || 'Member',
              },
              startedAt: Date.now(),
            },
            socketId
          );
        }
      } else if (data.type === 'END_CALL_RING') {
        broadcast(
          {
            type: 'CALL_RING_ENDED',
            callId: data.callId,
            callerTagname: data.callerTagname,
          },
          socketId
        );
      } else if (data.type === 'LOGOUT') {
        const item = activeSockets.get(socketId);
        const leavingMember = item?.member;
        if (item) {
          item.member = undefined;
        }
        if (voiceChannelMembers.has(socketId)) {
          const left = voiceChannelMembers.get(socketId);
          voiceChannelMembers.delete(socketId);
          broadcast({
            type: 'VOICE_CHANNEL_UPDATE',
            participants: getVoiceParticipants(),
            leftUser: left,
          });
        }
        broadcast({
          type: 'PRESENCE_UPDATE',
          onlineUsers: getUniqueOnlineUsers(),
          userLeft: leavingMember,
        });
      }
    } catch (e) {
      console.error('Error handling WebSocket message:', e);
    }
  });

  ws.on('close', () => {
    const item = activeSockets.get(socketId);
    const departingMember = item?.member;
    activeSockets.delete(socketId);

    if (voiceChannelMembers.has(socketId)) {
      const left = voiceChannelMembers.get(socketId);
      voiceChannelMembers.delete(socketId);
      broadcast({
        type: 'VOICE_CHANNEL_UPDATE',
        participants: getVoiceParticipants(),
        leftUser: left,
      });
    }

    if (departingMember) {
      broadcast({
        type: 'PRESENCE_UPDATE',
        onlineUsers: getUniqueOnlineUsers(),
        userLeft: departingMember,
      });
    }
  });

  ws.on('error', (err) => {
    console.warn(`WebSocket error on ${socketId}:`, err);
  });
});

// Regular cleanup interval to evict dead sockets and update active/idle status
setInterval(() => {
  const now = Date.now();
  let changed = false;

  for (const [id, item] of activeSockets.entries()) {
    if (item.ws.readyState !== WebSocket.OPEN) {
      activeSockets.delete(id);
      changed = true;
    } else if (item.member && now - item.member.lastActive > 90000) {
      // 90 seconds without heartbeat
      activeSockets.delete(id);
      try {
        item.ws.close();
      } catch {}
      changed = true;
    } else if (item.member) {
      const oldStatus = item.member.status;
      const newStatus = now - item.member.lastActive > 50000 ? 'idle' : 'active';
      if (oldStatus !== newStatus) {
        item.member.status = newStatus;
        changed = true;
      }
    }
  }

  if (changed) {
    broadcast({
      type: 'PRESENCE_UPDATE',
      onlineUsers: getUniqueOnlineUsers(),
    });
  }
}, 15000);

// Periodically prune messages older than 1 day (24 hours)
setInterval(() => {
  const beforeCount = chatMessages.length;
  chatMessages = pruneOldMessages(chatMessages);
  if (chatMessages.length !== beforeCount) {
    saveServerState();
  }
}, 60000);

// REST API Endpoints for fallback and polling
app.get('/api/state', (req, res) => {
  const todayKey = getAttendanceDateKey();
  chatMessages = pruneOldMessages(chatMessages);
  res.json({
    onlineUsers: getUniqueOnlineUsers(),
    messages: chatMessages,
    attendanceMap: attendanceStore[todayKey] || {},
    todayDateKey: todayKey,
    currentLivePin,
    pendingRegistrations,
    suspendedMembers,
    registeredAccounts,
    removedTagnames,
    voiceParticipants: getVoiceParticipants(),
  });
});

app.post('/api/accounts', (req, res) => {
  const account = req.body;
  if (!account || !account.tagname) {
    return res.status(400).json({ error: 'Invalid account' });
  }
  const lower = account.tagname.toLowerCase();
  removedTagnames = removedTagnames.filter((t) => t !== lower);
  registeredAccounts = registeredAccounts.filter(
    (a) => a.tagname.toLowerCase() !== lower
  );
  registeredAccounts.push(account);
  saveServerState();
  void persistAccountToFirestore(account);
  broadcast({
    type: 'ACCOUNTS_UPDATE',
    registeredAccounts,
  });
  res.json({ success: true, registeredAccounts });
});

app.post('/api/accounts/sync', (req, res) => {
  const incoming = Array.isArray(req.body?.accounts) ? req.body.accounts : [];
  let changed = false;
  const suspendedSet = new Set(suspendedMembers.map((s) => (s.tagname || s.targetTagname || '').toLowerCase()));
  const removedSet = new Set(removedTagnames);
  const newlyAdded: any[] = [];
  for (const acc of incoming) {
    if (!acc || !acc.tagname) continue;
    const lower = acc.tagname.toLowerCase();
    if (removedSet.has(lower) || suspendedSet.has(lower)) continue;
    if (!registeredAccounts.some((existing) => existing.tagname.toLowerCase() === lower)) {
      registeredAccounts.push(acc);
      newlyAdded.push(acc);
      changed = true;
    }
  }
  if (changed) {
    saveServerState();
    for (const acc of newlyAdded) {
      void persistAccountToFirestore(acc);
    }
    broadcast({
      type: 'ACCOUNTS_UPDATE',
      registeredAccounts,
    });
  }
  res.json({ success: true, registeredAccounts });
});

app.post('/api/accounts/remove', (req, res) => {
  const { accountId, tagname, requester } = req.body || {};
  if (!tagname && !accountId) {
    return res.status(400).json({ error: 'Missing accountId or tagname' });
  }
  const reqTag = (requester?.tagname || '').trim().toLowerCase();
  const matchedAcc = reqTag
    ? registeredAccounts.find((a) => a.tagname?.trim().toLowerCase() === reqTag)
    : undefined;
  const effectiveCategory = matchedAcc?.category || requester?.category;
  const effectiveRole = matchedAcc?.roleTitle || requester?.roleTitle || '';
  const adminRoles = ['𝑶𝒘𝒏𝒆𝒓', '𝑪𝒐-𝒐𝒘𝒏𝒆𝒓', '𝑭𝒅𝒓', '𝑯-𝒇𝒅𝒓', '𝑪𝒐-𝒇𝒅𝒓', '𝑯-𝒂𝒅𝒎𝒊𝒏', '𝑪-𝒂𝒅𝒎𝒊𝒏', '𝑺-𝒂𝒅𝒎𝒊𝒏', '𝑨𝒅𝒎𝒊𝒏', 'Owner', 'Co-Owner', 'Founder', 'Admin', 'Sub-Admin'];
  const isRequesterAdmin =
    effectiveCategory === 'leadership' ||
    adminRoles.some((r) => effectiveRole.includes(r));

  if (!isRequesterAdmin) {
    return res.status(403).json({ error: 'Admin permission required' });
  }

  if (tagname) {
    const lower = String(tagname).trim().toLowerCase();
    if (!removedTagnames.includes(lower)) {
      removedTagnames.push(lower);
    }
  }
  registeredAccounts = registeredAccounts.filter(
    (a) => a.id !== accountId && a.tagname?.trim().toLowerCase() !== String(tagname || '').trim().toLowerCase()
  );
  saveServerState();
  void removeAccountFromFirestore(accountId, tagname);
  broadcast({
    type: 'ACCOUNTS_UPDATE',
    registeredAccounts,
    removedTagname: tagname,
  });
  res.json({ success: true, registeredAccounts, removedTagname: tagname });
});

app.post('/api/attendance/sync', (req, res) => {
  const { dateKey, entries } = req.body || {};
  if (!dateKey || !entries || typeof entries !== 'object') {
    return res.status(400).json({ error: 'Invalid parameters' });
  }
  if (!attendanceStore[dateKey]) {
    attendanceStore[dateKey] = {};
  }
  let changed = false;
  const syncedEntries: Record<string, { isPresent: boolean; timeCheckedIn?: string }> = {};
  for (const [key, val] of Object.entries(entries)) {
    const entryVal = val as { isPresent?: boolean; timeCheckedIn?: string } | null;
    if (entryVal && entryVal.isPresent && !attendanceStore[dateKey][key]?.isPresent) {
      const entry = {
        isPresent: true,
        timeCheckedIn: entryVal.timeCheckedIn,
      };
      attendanceStore[dateKey][key] = entry;
      syncedEntries[key] = entry;
      changed = true;
    }
  }
  if (changed) {
    saveServerState();
    void persistAttendanceEntriesToFirestore(dateKey, syncedEntries);
    broadcast({
      type: 'ATTENDANCE_UPDATE',
      dateKey,
      map: attendanceStore[dateKey],
    });
  }
  res.json({ success: true, map: attendanceStore[dateKey] });
});

app.post('/api/chat', (req, res) => {
  const msg = req.body;
  if (!msg || !msg.senderTagname || !msg.id) {
    return res.status(400).json({ error: 'Invalid message' });
  }
  if (!chatMessages.some((m) => m.id === msg.id)) {
    msg.createdTimestamp = msg.createdTimestamp || Date.now();
    chatMessages.push(msg);
    chatMessages = pruneOldMessages(chatMessages);
    if (chatMessages.length > 150) chatMessages = chatMessages.slice(-150);
    saveServerState();
    void persistChatMessageToFirestore(msg);

    broadcast({
      type: 'NEW_CHAT_MESSAGE',
      message: msg,
    });
  }

  res.json({ success: true, message: msg });
});

app.post('/api/chat/unsend', (req, res) => {
  const { messageId, unsentBy } = req.body || {};
  if (!messageId) {
    return res.status(400).json({ error: 'Missing messageId' });
  }
  const msg = chatMessages.find((m) => m.id === messageId);
  const resolvedUnsentBy = unsentBy || msg?.senderName || 'Member';
  if (msg) {
    msg.isUnsent = true;
    msg.unsentBy = resolvedUnsentBy;
    msg.text = undefined;
    msg.mediaType = undefined;
    msg.mediaUrl = undefined;
    msg.reactions = undefined;
    msg.replyTo = undefined;
    saveServerState();
    void persistChatMessageToFirestore(msg);
  }
  broadcast({
    type: 'MESSAGE_UNSENT',
    messageId,
    unsentBy: resolvedUnsentBy,
  });
  res.json({ success: true, messageId, unsentBy: resolvedUnsentBy });
});

app.post('/api/attendance', (req, res) => {
  const { dateKey, memberId, isPresent, timeCheckedIn, displayName, tagname } = req.body;
  if (!dateKey || (!memberId && !tagname)) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  if (!attendanceStore[dateKey]) {
    attendanceStore[dateKey] = {};
  }
  const entry = {
    isPresent: !!isPresent,
    timeCheckedIn: isPresent ? (timeCheckedIn || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : undefined,
  };
  const syncedEntries: Record<string, { isPresent: boolean; timeCheckedIn?: string }> = {};
  if (memberId) {
    attendanceStore[dateKey][memberId] = entry;
    syncedEntries[memberId] = entry;
  }
  if (tagname) {
    attendanceStore[dateKey][tagname] = entry;
    syncedEntries[tagname] = entry;
  }
  saveServerState();
  void persistAttendanceEntriesToFirestore(dateKey, syncedEntries);

  broadcast({
    type: 'ATTENDANCE_UPDATE',
    dateKey,
    map: attendanceStore[dateKey],
    updatedMemberId: memberId || tagname,
    isPresent: !!isPresent,
    displayName,
    tagname,
  });

  res.json({ success: true, map: attendanceStore[dateKey] });
});

// Mount Vite or serve static dist
async function setupServer() {
  const hydrated = await loadAndMigrateStateFromFirestore({
    chatMessages,
    attendanceStore,
    currentLivePin,
    pendingRegistrations,
    suspendedMembers,
    registeredAccounts,
    removedTagnames,
  });
  chatMessages = pruneOldMessages(hydrated.chatMessages || []);
  attendanceStore = hydrated.attendanceStore || {};
  currentLivePin = hydrated.currentLivePin || null;
  pendingRegistrations = hydrated.pendingRegistrations || [];
  suspendedMembers = hydrated.suspendedMembers || [];
  registeredAccounts = hydrated.registeredAccounts || [];
  removedTagnames = hydrated.removedTagnames || [];
  saveServerState();

  const isProd = process.env.NODE_ENV === 'production';
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: false,
        ws: {
          server,
          path: '/__vite_ws',
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Z.V.R Official Server & WebSockets running at http://0.0.0.0:${port}`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
