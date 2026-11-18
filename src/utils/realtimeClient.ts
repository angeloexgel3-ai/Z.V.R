/**
 * Real-time WebSocket Client for ZVR Official Clan
 * Synchronizes online presence, active room GC members, live chat, and attendance roll call.
 */

import { ClanMember, RegisteredAccount } from '../data/clanData';

export interface OnlineMemberRecord {
  socketId: string;
  memberId: string;
  tagname: string;
  displayName: string;
  roleTitle: string;
  category: 'leadership' | 'member';
  onlineSince: string;
  joinedTimestamp?: number;
  lastActive: number;
  currentTab: string;
  status?: 'active' | 'idle';
}

export interface ChatMessage {
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

export interface ReactionUpdateEvent {
  messageId: string;
  reactions: Record<string, string[]>;
}

export interface TikTokLivePin {
  id: string;
  streamerName: string;
  streamerTagname: string;
  title: string;
  liveUrl: string;
  startedAt: string;
}

export interface TypingEvent {
  tagname: string;
  displayName?: string;
  isTyping: boolean;
  activity: 'typing' | 'sending';
  timestamp: number;
}

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

type PresenceCallback = (users: OnlineMemberRecord[], joined?: OnlineMemberRecord, left?: OnlineMemberRecord) => void;
type ChatCallback = (msg: ChatMessage) => void;
type AttendanceCallback = (data: { dateKey: string; map: Record<string, { isPresent: boolean; timeCheckedIn?: string }>; updatedMemberId?: string; isPresent?: boolean; displayName?: string; tagname?: string }) => void;
type PinCallback = (pin: TikTokLivePin | null) => void;
type InitCallback = (state: { onlineUsers: OnlineMemberRecord[]; messages: ChatMessage[]; attendanceMap: Record<string, { isPresent: boolean; timeCheckedIn?: string }>; todayDateKey: string; currentLivePin: TikTokLivePin | null; pendingRegistrations?: any[]; suspendedMembers?: any[]; registeredAccounts?: RegisteredAccount[]; removedTagnames?: string[]; voiceParticipants?: VoiceParticipant[] }) => void;
type TypingCallback = (data: TypingEvent) => void;
type VoiceUpdateCallback = (participants: VoiceParticipant[], joined?: VoiceParticipant, left?: VoiceParticipant) => void;
type VoiceAudioCallback = (data: { senderTagname: string; senderName: string; audioChunk: string; timestamp: number }) => void;
type VoiceSpeakingCallback = (data: { tagname: string; isSpeaking: boolean }) => void;
export interface IncomingCallEvent {
  callId: string;
  callType: 'video' | 'voice';
  caller: {
    tagname: string;
    displayName: string;
    roleTitle: string;
  };
  startedAt: number;
}
type IncomingCallCallback = (call: IncomingCallEvent) => void;
type CallEndedCallback = (data: { callId?: string; callerTagname?: string }) => void;
type ReactionCallback = (data: ReactionUpdateEvent) => void;
type MessageDeleteCallback = (messageId: string) => void;
type MessageUnsentCallback = (data: { messageId: string; unsentBy?: string }) => void;
type MessagesClearedCallback = () => void;
type AccountsUpdateCallback = (accounts: RegisteredAccount[], removedTagname?: string) => void;
type SuspensionsUpdateCallback = (suspendedList: any[]) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private currentMember: ClanMember | null = null;
  private currentTab: string = 'login';
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private pollTimer: any = null;
  private isConnected: boolean = false;

  private presenceListeners = new Set<PresenceCallback>();
  private chatListeners = new Set<ChatCallback>();
  private attendanceListeners = new Set<AttendanceCallback>();
  private pinListeners = new Set<PinCallback>();
  private initListeners = new Set<InitCallback>();
  private typingListeners = new Set<TypingCallback>();
  private voiceUpdateListeners = new Set<VoiceUpdateCallback>();
  private voiceAudioListeners = new Set<VoiceAudioCallback>();
  private voiceSpeakingListeners = new Set<VoiceSpeakingCallback>();
  private incomingCallListeners = new Set<IncomingCallCallback>();
  private callEndedListeners = new Set<CallEndedCallback>();
  private reactionListeners = new Set<ReactionCallback>();
  private messageDeleteListeners = new Set<MessageDeleteCallback>();
  private messageUnsentListeners = new Set<MessageUnsentCallback>();
  private messagesClearedListeners = new Set<MessagesClearedCallback>();
  private accountsListeners = new Set<AccountsUpdateCallback>();
  private suspensionsListeners = new Set<SuspensionsUpdateCallback>();

  private latestState: {
    onlineUsers: OnlineMemberRecord[];
    messages: ChatMessage[];
    attendanceMap: Record<string, { isPresent: boolean; timeCheckedIn?: string }>;
    todayDateKey: string;
    currentLivePin: TikTokLivePin | null;
    pendingRegistrations?: any[];
    suspendedMembers?: any[];
    registeredAccounts?: RegisteredAccount[];
    removedTagnames?: string[];
    voiceParticipants?: VoiceParticipant[];
  } | null = null;

  constructor() {
    this.fetchInitialState();
    this.connect();
    // Start periodic background polling as resilient fallback
    this.startPollingFallback();
  }

  private persistAccountsLocally(accounts: RegisteredAccount[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('zvr_registered_accounts', JSON.stringify(accounts));
    } catch {}
  }

  private getLocalAccounts(): RegisteredAccount[] {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('zvr_registered_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }

  private mergeAndPersistAccounts(
    serverAccounts: RegisteredAccount[],
    removedTagnames: string[] = [],
    suspendedMembers: any[] = [],
    explicitRemovedTagname?: string
  ): RegisteredAccount[] {
    const removedSet = new Set<string>(removedTagnames.map((t) => t.toLowerCase()));
    if (explicitRemovedTagname) {
      removedSet.add(explicitRemovedTagname.toLowerCase());
    }
    const suspendedSet = new Set<string>(
      suspendedMembers.map((s) => (s.tagname || s.targetTagname || '').toLowerCase()).filter(Boolean)
    );

    const map = new Map<string, RegisteredAccount>();
    const serverKeys = new Set<string>();

    for (const acc of serverAccounts) {
      if (!acc || !acc.tagname) continue;
      const lower = acc.tagname.toLowerCase();
      if (removedSet.has(lower) || suspendedSet.has(lower)) continue;
      map.set(lower, acc);
      serverKeys.add(lower);
    }

    const missingOnServer: RegisteredAccount[] = [];
    for (const localAcc of this.getLocalAccounts()) {
      if (!localAcc || !localAcc.tagname) continue;
      const lower = localAcc.tagname.toLowerCase();
      if (removedSet.has(lower) || suspendedSet.has(lower)) continue;
      if (!map.has(lower)) {
        map.set(lower, localAcc);
        missingOnServer.push(localAcc);
      }
    }

    const merged = Array.from(map.values());
    this.persistAccountsLocally(merged);

    if (missingOnServer.length > 0) {
      this.syncAccounts(missingOnServer);
    }

    return merged;
  }

  private mergeAndPersistAttendance(
    dateKey: string,
    serverMap: Record<string, { isPresent: boolean; timeCheckedIn?: string }> = {}
  ): Record<string, { isPresent: boolean; timeCheckedIn?: string }> {
    if (typeof window === 'undefined' || !dateKey) return serverMap;
    let localMap: Record<string, { isPresent: boolean; timeCheckedIn?: string }> = {};
    try {
      const saved = localStorage.getItem(`zvr_attendance_${dateKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') localMap = parsed;
      }
    } catch {}

    const merged: Record<string, { isPresent: boolean; timeCheckedIn?: string }> = { ...serverMap };
    const missingOnServer: Record<string, { isPresent: boolean; timeCheckedIn?: string }> = {};
    let hasMissing = false;

    for (const [key, val] of Object.entries(localMap)) {
      if (val && val.isPresent && !merged[key]?.isPresent) {
        merged[key] = val;
        missingOnServer[key] = val;
        hasMissing = true;
      }
    }

    try {
      localStorage.setItem(`zvr_attendance_${dateKey}`, JSON.stringify(merged));
    } catch {}

    if (hasMissing) {
      this.syncAttendance(dateKey, missingOnServer);
    }

    return merged;
  }

  public async fetchInitialState() {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        const mergedAccounts = Array.isArray(data.registeredAccounts)
          ? this.mergeAndPersistAccounts(
              data.registeredAccounts,
              data.removedTagnames || [],
              data.suspendedMembers || []
            )
          : this.getLocalAccounts();
        const mergedAttendance = data.todayDateKey
          ? this.mergeAndPersistAttendance(data.todayDateKey, data.attendanceMap || {})
          : data.attendanceMap || {};

        const normalizedData = {
          ...data,
          registeredAccounts: mergedAccounts,
          attendanceMap: mergedAttendance,
        };
        this.latestState = normalizedData;

        this.initListeners.forEach((fn) => fn(normalizedData));
        this.accountsListeners.forEach((fn) => fn(mergedAccounts));
        if (Array.isArray(data.suspendedMembers)) {
          this.suspensionsListeners.forEach((fn) => fn(data.suspendedMembers));
        }
        if (data.onlineUsers) {
          this.presenceListeners.forEach((fn) => fn(data.onlineUsers));
        }
      }
    } catch {
      // ignore if offline
    }
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        // Re-identify if user was logged in
        if (this.currentMember) {
          this.send({
            type: 'LOGIN',
            member: this.currentMember,
            currentTab: this.currentTab,
          });
        }

        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncoming(data);
        } catch (err) {
          console.warn('Failed to parse WS message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket encountered error:', err);
        this.ws?.close();
      };
    } catch (e) {
      console.warn('WebSocket connection init failed, will retry:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3500);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'HEARTBEAT',
          currentTab: this.currentTab,
        });
      }
    }, 18000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startPollingFallback() {
    // Every 6 seconds, fetch /api/state as redundant backup if WS dropped
    this.pollTimer = setInterval(async () => {
      if (!this.isConnected) {
        try {
          const res = await fetch('/api/state');
          if (res.ok) {
            const data = await res.json();
            const mergedAccounts = Array.isArray(data.registeredAccounts)
              ? this.mergeAndPersistAccounts(
                  data.registeredAccounts,
                  data.removedTagnames || [],
                  data.suspendedMembers || []
                )
              : this.getLocalAccounts();
            const mergedAttendance = data.todayDateKey
              ? this.mergeAndPersistAttendance(data.todayDateKey, data.attendanceMap || {})
              : data.attendanceMap || {};
            const normalizedData = {
              ...data,
              registeredAccounts: mergedAccounts,
              attendanceMap: mergedAttendance,
            };
            this.latestState = normalizedData;
            this.initListeners.forEach((fn) => fn(normalizedData));
            if (data.onlineUsers) {
              this.presenceListeners.forEach((fn) => fn(data.onlineUsers));
            }
          }
        } catch {
          // ignore offline
        }
      }
    }, 6000);
  }

  private handleIncoming(data: any) {
    if (data.type === 'INIT_STATE') {
      const mergedAccounts = Array.isArray(data.registeredAccounts)
        ? this.mergeAndPersistAccounts(
            data.registeredAccounts,
            data.removedTagnames || [],
            data.suspendedMembers || []
          )
        : this.getLocalAccounts();
      const mergedAttendance = data.todayDateKey
        ? this.mergeAndPersistAttendance(data.todayDateKey, data.attendanceMap || {})
        : data.attendanceMap || {};

      const normalizedData = {
        ...data,
        registeredAccounts: mergedAccounts,
        attendanceMap: mergedAttendance,
      };
      this.latestState = normalizedData;
      this.initListeners.forEach((fn) => fn(normalizedData));
      this.accountsListeners.forEach((fn) => fn(mergedAccounts));
      if (data.onlineUsers) {
        this.presenceListeners.forEach((fn) => fn(data.onlineUsers));
      }
      if (data.voiceParticipants) {
        this.voiceUpdateListeners.forEach((fn) => fn(data.voiceParticipants));
      }
    } else if (data.type === 'PRESENCE_UPDATE') {
      if (this.latestState) {
        this.latestState.onlineUsers = data.onlineUsers || [];
      }
      this.presenceListeners.forEach((fn) => fn(data.onlineUsers, data.userJoined, data.userLeft));
    } else if (data.type === 'NEW_CHAT_MESSAGE') {
      this.chatListeners.forEach((fn) => fn(data.message));
    } else if (data.type === 'ATTENDANCE_UPDATE') {
      if (this.latestState && data.map) {
        this.latestState.attendanceMap = data.map;
        if (data.dateKey) this.latestState.todayDateKey = data.dateKey;
      }
      this.attendanceListeners.forEach((fn) => fn(data));
    } else if (data.type === 'PIN_UPDATE') {
      this.pinListeners.forEach((fn) => fn(data.pin));
    } else if (data.type === 'TYPING_STATUS') {
      this.typingListeners.forEach((fn) => fn(data));
    } else if (data.type === 'VOICE_CHANNEL_UPDATE') {
      this.voiceUpdateListeners.forEach((fn) => fn(data.participants || [], data.joinedUser, data.leftUser));
    } else if (data.type === 'VOICE_AUDIO_STREAM') {
      this.voiceAudioListeners.forEach((fn) => fn(data));
    } else if (data.type === 'VOICE_SPEAKING_UPDATE') {
      this.voiceSpeakingListeners.forEach((fn) => fn(data));
    } else if (data.type === 'INCOMING_CALL_RING') {
      this.incomingCallListeners.forEach((fn) => fn(data));
    } else if (data.type === 'CALL_RING_ENDED') {
      this.callEndedListeners.forEach((fn) => fn(data));
    } else if (data.type === 'REACTION_UPDATE') {
      this.reactionListeners.forEach((fn) => fn(data));
    } else if (data.type === 'MESSAGE_DELETED') {
      this.messageDeleteListeners.forEach((fn) => fn(data.messageId));
    } else if (data.type === 'MESSAGE_UNSENT') {
      this.messageUnsentListeners.forEach((fn) => fn(data));
    } else if (data.type === 'ALL_MESSAGES_CLEARED') {
      this.messagesClearedListeners.forEach((fn) => fn());
    } else if (data.type === 'ACCOUNTS_UPDATE') {
      if (Array.isArray(data.registeredAccounts)) {
        if (this.latestState && data.removedTagname) {
          const lowerRemoved = data.removedTagname.toLowerCase();
          const prevRemoved = this.latestState.removedTagnames || [];
          if (!prevRemoved.includes(lowerRemoved)) {
            this.latestState.removedTagnames = [...prevRemoved, lowerRemoved];
          }
        }
        const merged = this.mergeAndPersistAccounts(
          data.registeredAccounts,
          this.latestState?.removedTagnames || [],
          this.latestState?.suspendedMembers || [],
          data.removedTagname
        );
        if (this.latestState) {
          this.latestState.registeredAccounts = merged;
        }
        this.accountsListeners.forEach((fn) => fn(merged, data.removedTagname));
      }
    } else if (data.type === 'SUSPENSIONS_UPDATE') {
      if (Array.isArray(data.suspendedMembers)) {
        if (this.latestState) {
          this.latestState.suspendedMembers = data.suspendedMembers;
        }
        this.suspensionsListeners.forEach((fn) => fn(data.suspendedMembers));
      }
    }
  }

  private send(obj: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  // Public APIs
  public login(member: ClanMember, currentTab: string = 'room') {
    this.currentMember = member;
    this.currentTab = currentTab;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'LOGIN',
        member,
        currentTab,
      });
    } else {
      this.connect();
    }
  }

  public logout() {
    this.currentMember = null;
    this.send({ type: 'LOGOUT' });
  }

  public setTab(tab: string) {
    this.currentTab = tab;
    this.send({ type: 'HEARTBEAT', currentTab: tab });
  }

  public sendMessage(message: ChatMessage) {
    this.send({
      type: 'CHAT_MESSAGE',
      message,
    });

    // Fallback REST POST for guaranteed persistence
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    }).catch(() => {});
  }

  public checkAttendance(dateKey: string, memberId: string, isPresent: boolean, timeCheckedIn?: string, displayName?: string, tagname?: string) {
    const payload = {
      type: 'ATTENDANCE_CHECK',
      dateKey,
      memberId,
      isPresent,
      timeCheckedIn,
      displayName,
      tagname,
    };
    this.send(payload);

    fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateKey, memberId, isPresent, timeCheckedIn, displayName, tagname }),
    }).catch(() => {});
  }

  public pinLive(pin: TikTokLivePin) {
    this.send({ type: 'PIN_LIVE', pin });
  }

  public unpinLive() {
    this.send({ type: 'UNPIN_LIVE' });
  }

  public updateRegistrations(pendingRegistrations: any[]) {
    this.send({ type: 'UPDATE_REGISTRATIONS', pendingRegistrations });
  }

  public updateSuspensions(suspendedMembers: any[]) {
    this.send({ type: 'UPDATE_SUSPENSIONS', suspendedMembers });
  }

  public sendTypingStatus(isTyping: boolean, activity: 'typing' | 'sending' = 'typing') {
    if (!this.currentMember) return;
    this.send({
      type: 'TYPING_STATUS',
      tagname: this.currentMember.tagname,
      displayName: this.currentMember.displayName,
      isTyping,
      activity,
    });
  }

  // Voice Channel Public Methods
  public joinVoice(member: ClanMember, isMuted: boolean = false, isDeafened: boolean = false) {
    this.send({
      type: 'VOICE_JOIN',
      member,
      isMuted,
      isDeafened,
    });
  }

  public leaveVoice() {
    this.send({ type: 'VOICE_LEAVE' });
  }

  public sendVoiceAudioChunk(audioChunk: string) {
    this.send({
      type: 'VOICE_AUDIO_CHUNK',
      audioChunk,
    });
  }

  public sendVoiceSpeaking(isSpeaking: boolean) {
    this.send({
      type: 'VOICE_SPEAKING',
      isSpeaking,
    });
  }

  public updateVoiceState(isMuted?: boolean, isDeafened?: boolean) {
    this.send({
      type: 'VOICE_STATE_CHANGE',
      isMuted,
      isDeafened,
    });
  }

  public startCallRing(member: ClanMember, callType: 'video' | 'voice' = 'video', callId?: string) {
    this.send({
      type: 'START_CALL_RING',
      callId: callId || `call_${Date.now()}`,
      callType,
      caller: {
        tagname: member.tagname,
        displayName: member.displayName,
        roleTitle: member.roleTitle,
      },
    });
  }

  public endCallRing(callId?: string, callerTagname?: string) {
    this.send({
      type: 'END_CALL_RING',
      callId,
      callerTagname: callerTagname || this.currentMember?.tagname,
    });
  }

  // Listener subscriptions
  public onVoiceUpdate(callback: VoiceUpdateCallback): () => void {
    this.voiceUpdateListeners.add(callback);
    return () => this.voiceUpdateListeners.delete(callback);
  }

  public onVoiceAudio(callback: VoiceAudioCallback): () => void {
    this.voiceAudioListeners.add(callback);
    return () => this.voiceAudioListeners.delete(callback);
  }

  public onVoiceSpeaking(callback: VoiceSpeakingCallback): () => void {
    this.voiceSpeakingListeners.add(callback);
    return () => this.voiceSpeakingListeners.delete(callback);
  }

  public onIncomingCall(callback: IncomingCallCallback): () => void {
    this.incomingCallListeners.add(callback);
    return () => this.incomingCallListeners.delete(callback);
  }

  public onCallEnded(callback: CallEndedCallback): () => void {
    this.callEndedListeners.add(callback);
    return () => this.callEndedListeners.delete(callback);
  }

  public onTyping(callback: TypingCallback): () => void {
    this.typingListeners.add(callback);
    return () => this.typingListeners.delete(callback);
  }

  public onPresence(callback: PresenceCallback): () => void {
    this.presenceListeners.add(callback);
    if (this.latestState?.onlineUsers) {
      callback(this.latestState.onlineUsers);
    }
    return () => this.presenceListeners.delete(callback);
  }

  public onChat(callback: ChatCallback): () => void {
    this.chatListeners.add(callback);
    return () => this.chatListeners.delete(callback);
  }

  public onAttendance(callback: AttendanceCallback): () => void {
    this.attendanceListeners.add(callback);
    return () => this.attendanceListeners.delete(callback);
  }

  public onPin(callback: PinCallback): () => void {
    this.pinListeners.add(callback);
    return () => this.pinListeners.delete(callback);
  }

  public onReaction(callback: ReactionCallback): () => void {
    this.reactionListeners.add(callback);
    return () => this.reactionListeners.delete(callback);
  }

  public onMessageDeleted(callback: MessageDeleteCallback): () => void {
    this.messageDeleteListeners.add(callback);
    return () => this.messageDeleteListeners.delete(callback);
  }

  public onMessageUnsent(callback: MessageUnsentCallback): () => void {
    this.messageUnsentListeners.add(callback);
    return () => this.messageUnsentListeners.delete(callback);
  }

  public toggleReaction(messageId: string, emoji: string, tagname: string) {
    this.send({
      type: 'TOGGLE_REACTION',
      messageId,
      emoji,
      tagname,
    });
  }

  public deleteMessage(messageId: string) {
    this.send({
      type: 'DELETE_MESSAGE',
      messageId,
    });
  }

  public unsendMessage(messageId: string, unsentBy: string) {
    this.send({
      type: 'UNSEND_MESSAGE',
      messageId,
      unsentBy,
    });
    fetch('/api/chat/unsend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, unsentBy }),
    }).catch(() => {});
  }

  public clearAllMessages() {
    this.send({
      type: 'CLEAR_ALL_MESSAGES',
    });
  }

  public registerAccount(account: RegisteredAccount) {
    if (this.latestState?.removedTagnames && account?.tagname) {
      const lower = account.tagname.toLowerCase();
      this.latestState.removedTagnames = this.latestState.removedTagnames.filter((t) => t !== lower);
    }
    this.send({
      type: 'REGISTER_ACCOUNT',
      account,
    });
    fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    }).catch(() => {});
  }

  public syncAccounts(accounts: RegisteredAccount[]) {
    if (!accounts || accounts.length === 0) return;
    this.send({
      type: 'SYNC_ACCOUNTS',
      accounts,
    });
    fetch('/api/accounts/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts }),
    }).catch(() => {});
  }

  public syncAttendance(dateKey: string, entries: Record<string, { isPresent: boolean; timeCheckedIn?: string }>) {
    if (!dateKey || !entries || Object.keys(entries).length === 0) return;
    this.send({
      type: 'ATTENDANCE_SYNC',
      dateKey,
      entries,
    });
    fetch('/api/attendance/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateKey, entries }),
    }).catch(() => {});
  }

  public removeAccount(
    accountId: string,
    tagname: string,
    requester?: { tagname?: string; roleTitle?: string; category?: 'leadership' | 'member' }
  ) {
    if (this.latestState) {
      if (Array.isArray(this.latestState.registeredAccounts)) {
        this.latestState.registeredAccounts = this.latestState.registeredAccounts.filter(
          (a) => a.id !== accountId && a.tagname?.trim().toLowerCase() !== tagname?.trim().toLowerCase()
        );
      }
      if (tagname) {
        const lower = tagname.trim().toLowerCase();
        const existingRemoved = Array.isArray(this.latestState.removedTagnames)
          ? this.latestState.removedTagnames
          : [];
        if (!existingRemoved.includes(lower)) {
          this.latestState.removedTagnames = [...existingRemoved, lower];
        }
      }
    }
    this.send({
      type: 'REMOVE_ACCOUNT',
      accountId,
      tagname,
      requester,
    });
    fetch('/api/accounts/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, tagname, requester }),
    }).catch(() => {});
  }

  public suspendAccount(tagname: string, suspension: any) {
    this.send({
      type: 'SUSPEND_ACCOUNT',
      tagname,
      suspension,
    });
  }

  public onAccountsUpdate(callback: AccountsUpdateCallback): () => void {
    this.accountsListeners.add(callback);
    if (Array.isArray(this.latestState?.registeredAccounts)) {
      callback(this.latestState!.registeredAccounts!);
    }
    return () => this.accountsListeners.delete(callback);
  }

  public onSuspensionsUpdate(callback: SuspensionsUpdateCallback): () => void {
    this.suspensionsListeners.add(callback);
    return () => this.suspensionsListeners.delete(callback);
  }

  public onMessagesCleared(callback: MessagesClearedCallback): () => void {
    this.messagesClearedListeners.add(callback);
    return () => this.messagesClearedListeners.delete(callback);
  }

  public onInit(callback: InitCallback): () => void {
    this.initListeners.add(callback);
    if (this.latestState) {
      callback(this.latestState);
    }
    return () => this.initListeners.delete(callback);
  }
}

export const realtimeClient = new RealtimeClient();
