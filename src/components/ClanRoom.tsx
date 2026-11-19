import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic,
  Square,
  Radio,
  ExternalLink,
  Crown,
  Shield,
  Sparkles,
  Play,
  Pause,
  X,
  Volume2,
  Lock,
  UserCheck,
  Music2,
  Trash2,
  Pin,
  Download,
  AlertCircle,
  MessageCircle,
  Users,
  Clock,
  Timer,
  ChevronRight,
  LogOut,
  Zap,
  ArrowLeft,
  Phone,
  Info,
  Camera,
  Smile,
  ThumbsUp,
  LayoutGrid,
  Copy,
  Check,
  RotateCcw,
  CornerUpLeft,
  Flag
} from 'lucide-react';
import { ClanMember, CLAN_LOGO_URL, CLAN_MOTTO, getAttendanceDateKey, formatTagnameUppercase, isOfficialMember } from '../data/clanData';
import { sounds } from '../utils/soundEffects';
import { ClanVideoCallModal } from './ClanVideoCallModal';
import { realtimeClient, OnlineMemberRecord } from '../utils/realtimeClient';
import { clearAppCacheAndOptimize, pruneMessagesOlderThan1Day } from '../utils/cacheManager';
import { isAttendanceWindowOpen } from './ClanAttendance';

export interface ChatMessage {
  id: string;
  senderTagname: string;
  senderName: string;
  senderRole: string;
  senderCategory: 'leadership' | 'member';
  timestamp: string;
  createdTimestamp?: number;
  text?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'tiktok_live';
  mediaUrl?: string;
  mediaDuration?: number; // seconds for voice notes
  liveTitle?: string;
  liveUrl?: string;
  reactions?: Record<string, string[]>; // emoji -> array of member tagnames
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

export const REACTION_EMOJIS = ['❤️', '😂', '😯', '😥', '😡', '🥹'];

export interface TikTokLivePin {
  id: string;
  streamerName: string;
  streamerTagname: string;
  title: string;
  liveUrl: string;
  startedAt: string;
}

export interface IncomingMessageNotice {
  id: string;
  senderName: string;
  senderRole: string;
  senderTagname: string;
  preview: string;
  timestamp: string;
}

interface ClanRoomProps {
  loggedInMember: ClanMember | null;
  onGoToLogin: () => void;
  onLogout?: () => void;
  lang: 'tl' | 'en';
  onlineUsers?: OnlineMemberRecord[];
  onIncomingMessage?: (notice: IncomingMessageNotice) => void;
  scrollToLatestSignal?: number;
  openCallSignal?: number;
  onOpenReport?: () => void;
}

export const ClanRoom: React.FC<ClanRoomProps> = ({
  loggedInMember,
  onGoToLogin,
  onLogout,
  lang,
  onlineUsers = [],
  onIncomingMessage,
  scrollToLatestSignal = 0,
  openCallSignal = 0,
  onOpenReport
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('zvr_clan_messages_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return pruneMessagesOlderThan1Day(parsed);
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [activePin, setActivePin] = useState<TikTokLivePin | null>(() => {
    try {
      const saved = localStorage.getItem('zvr_clan_live_pin');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.liveUrl?.includes('tiktok.me')) {
          localStorage.removeItem('zvr_clan_live_pin');
          return null;
        }
        return parsed;
      }
    } catch {
      // fallback
    }
    return null;
  });

  const [inputText, setInputText] = useState('');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const activeCallIdRef = useRef<string | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const startRoomCall = (callType: 'video' | 'voice') => {
    sounds.playClick();
    sounds.stopCallRingtone();
    if (loggedInMember) {
      const callId = `call_${Date.now()}`;
      activeCallIdRef.current = callId;
      realtimeClient.startCallRing(loggedInMember, callType, callId);
      try {
        const ch = new BroadcastChannel('zvr_call_ring_channel');
        ch.postMessage({
          type: 'INCOMING_CALL_RING',
          callId,
          callType,
          caller: {
            tagname: loggedInMember.tagname,
            displayName: loggedInMember.displayName,
            roleTitle: loggedInMember.roleTitle,
          },
          startedAt: Date.now(),
        });
        ch.close();
      } catch {}
    }
    setIsVideoModalOpen(true);
  };

  useEffect(() => {
    if (openCallSignal > 0 && loggedInMember) {
      sounds.stopCallRingtone();
      setIsVideoModalOpen(true);
    }
  }, [openCallSignal, loggedInMember]);

  // TikTok Pin form states
  const [pinTitle, setPinTitle] = useState('');
  const [pinUrl, setPinUrl] = useState('');

  // Voice recording states & refs (Accessible for all verified members)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingCancelledRef = useRef<boolean>(false);

  // File upload refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaInputRef = useRef<HTMLTextAreaElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const isUserScrolledUpRef = useRef(false);
  const lastTypingSentRef = useRef<number>(0);

  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGridMenu, setShowGridMenu] = useState(false);
  const [activeReactionMenuMsgId, setActiveReactionMenuMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [attendanceNotice, setAttendanceNotice] = useState<string | null>(null);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [longPressActiveMsgId, setLongPressActiveMsgId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const longPressTimerRef = useRef<any>(null);
  const longPressTriggeredRef = useRef<boolean>(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Live timer tick to continuously recalculate online duration and idle timers
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [roomMessageNotice, setRoomMessageNotice] = useState<IncomingMessageNotice | null>(null);
  const roomNoticeTimerRef = useRef<any>(null);
  const onIncomingMessageRef = useRef(onIncomingMessage);
  useEffect(() => {
    onIncomingMessageRef.current = onIncomingMessage;
  }, [onIncomingMessage]);
  const loggedInMemberRef = useRef(loggedInMember);
  useEffect(() => {
    loggedInMemberRef.current = loggedInMember;
  }, [loggedInMember]);
  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  const notifiedMessageIdsRef = useRef<Set<string>>(
    new Set(messages.map((m) => m.id))
  );

  const triggerIncomingNotification = (newMsg: ChatMessage) => {
    if (!newMsg || !newMsg.id || newMsg.isUnsent) return;
    if (notifiedMessageIdsRef.current.has(newMsg.id)) return;
    notifiedMessageIdsRef.current.add(newMsg.id);

    const currentMember = loggedInMemberRef.current;
    if (!currentMember) return;

    const isOwn =
      newMsg.senderTagname?.trim().toLowerCase() === currentMember.tagname?.trim().toLowerCase();
    if (isOwn) return;

    // Play uploaded Room GC notification sound
    sounds.playRoomNotification();

    const activeLang = langRef.current;
    let preview = (newMsg.text || '').trim();
    if (!preview) {
      if (newMsg.mediaType === 'image') {
        preview = activeLang === 'tl' ? '📷 Nagpadala ng larawan' : '📷 Sent a photo';
      } else if (newMsg.mediaType === 'video') {
        preview = activeLang === 'tl' ? '🎥 Nagpadala ng video' : '🎥 Sent a video';
      } else if (newMsg.mediaType === 'audio') {
        preview = activeLang === 'tl' ? '🎤 Nagpadala ng voice message' : '🎤 Sent a voice message';
      } else if (newMsg.mediaType === 'tiktok_live') {
        preview = activeLang === 'tl' ? '🔴 Nag-share ng TikTok Live' : '🔴 Shared a TikTok Live';
      } else {
        preview = activeLang === 'tl' ? 'Nagpadala ng bagong mensahe' : 'Sent a new message';
      }
    }

    const notice: IncomingMessageNotice = {
      id: newMsg.id,
      senderName: newMsg.senderName || newMsg.senderTagname,
      senderRole: newMsg.senderRole || 'Member',
      senderTagname: newMsg.senderTagname,
      preview,
      timestamp: newMsg.timestamp || '',
    };

    setRoomMessageNotice(notice);
    if (roomNoticeTimerRef.current) clearTimeout(roomNoticeTimerRef.current);
    roomNoticeTimerRef.current = setTimeout(() => {
      setRoomMessageNotice(null);
    }, 4000);

    onIncomingMessageRef.current?.(notice);
  };


  // Automatically prune messages older than 1 day (24 hours) without resetting active messages
  useEffect(() => {
    setMessages((prev) => {
      const pruned = pruneMessagesOlderThan1Day(prev);
      try {
        localStorage.setItem('zvr_clan_messages_v1', JSON.stringify(pruned.slice(-150)));
      } catch {}
      return pruned;
    });

    const pruneTimer = setInterval(() => {
      setMessages((prev) => {
        const pruned = pruneMessagesOlderThan1Day(prev);
        try {
          localStorage.setItem('zvr_clan_messages_v1', JSON.stringify(pruned.slice(-150)));
        } catch {}
        return pruned;
      });
    }, 1000 * 60 * 5); // check every 5 minutes
    return () => clearInterval(pruneTimer);
  }, []);

  // Members currently typing or sending data (audio/image/video/tiktok link)
  const [activeTransmitters, setActiveTransmitters] = useState<
    Record<string, { activity: 'typing' | 'sending'; displayName?: string; expiresAt: number }>
  >({});
  const typingTimerRef = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);
      setActiveTransmitters((prev) => {
        let hasExpired = false;
        const fresh: typeof prev = {};
        for (const [tag, item] of Object.entries(prev)) {
          if (item.expiresAt > now) {
            fresh[tag] = item;
          } else {
            hasExpired = true;
          }
        }
        return hasExpired ? fresh : prev;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Helper: Format how long a member has been online
  const formatMemberDuration = (joinedTimestamp?: number, onlineSince?: string) => {
    if (joinedTimestamp && joinedTimestamp > 0) {
      const elapsedSec = Math.max(0, Math.floor((currentTime - joinedTimestamp) / 1000));
      if (elapsedSec < 60) return `${elapsedSec}s`;
      const elapsedMin = Math.floor(elapsedSec / 60);
      if (elapsedMin < 60) return `${elapsedMin}m`;
      const hours = Math.floor(elapsedMin / 60);
      const mins = elapsedMin % 60;
      return `${hours}h ${mins}m`;
    }
    return onlineSince || 'online';
  };

  // Helper: Get member active vs idle status and idle timer
  const getMemberIdleStatus = (lastActive?: number, status?: string) => {
    const idleMs = currentTime - (lastActive || currentTime);
    if (status === 'idle' || idleMs > 45000) {
      const idleSec = Math.max(1, Math.floor(idleMs / 1000));
      const idleMin = Math.floor(idleSec / 60);
      return {
        isIdle: true,
        text: idleMin > 0 ? `Idle ${idleMin}m` : `Idle ${idleSec}s`,
      };
    }
    return {
      isIdle: false,
      text: 'Active',
    };
  };

  // Real-time synchronization across all devices and tabs via WebSocket & BroadcastChannel
  useEffect(() => {
    // 1. Subscribe to typing and data transmitting events (Quiet & Lag-free)
    const unsubTyping = realtimeClient.onTyping((ev) => {
      // Don't duplicate for self
      if (loggedInMember && ev.tagname === loggedInMember.tagname) return;

      if (ev.isTyping) {
        setActiveTransmitters((prev) => {
          // Prevent unnecessary state updates if user is already actively typing
          if (prev[ev.tagname]?.activity === (ev.activity || 'typing') && prev[ev.tagname]?.expiresAt > Date.now() + 1500) {
            return prev;
          }
          return {
            ...prev,
            [ev.tagname]: {
              activity: ev.activity || 'typing',
              displayName: ev.displayName || ev.tagname,
              expiresAt: Date.now() + 3500,
            },
          };
        });
      } else {
        setActiveTransmitters((prev) => {
          if (!prev[ev.tagname]) return prev;
          const next = { ...prev };
          delete next[ev.tagname];
          return next;
        });
      }
    });

    // 2. Subscribe to WebSocket chat messages from any phone/device (Silent & Smooth)
    const unsubChat = realtimeClient.onChat((newMsg) => {
      if (newMsg.senderTagname) {
        setActiveTransmitters((prev) => {
          if (!prev[newMsg.senderTagname]) return prev;
          const next = { ...prev };
          delete next[newMsg.senderTagname];
          return next;
        });
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        const updated = pruneMessagesOlderThan1Day([...prev, newMsg]);
        try {
          localStorage.setItem('zvr_clan_messages_v1', JSON.stringify(updated.slice(-150)));
        } catch {}
        return updated;
      });
      triggerIncomingNotification(newMsg);
    });

    // 2. Subscribe to live pin updates
    const unsubPin = realtimeClient.onPin((pin) => {
      setActivePin(pin);
    });

    // 3. Subscribe to emoji reaction updates
    const unsubReaction = realtimeClient.onReaction((data) => {
      setMessages((prev) => {
        const updated = prev.map((m) => {
          if (m.id !== data.messageId) return m;
          return { ...m, reactions: data.reactions };
        });
        try {
          localStorage.setItem('zvr_clan_messages_v1', JSON.stringify(updated.slice(-150)));
        } catch {}
        return updated;
      });
    });

    // 4. Subscribe to message deletion
    const unsubDelete = realtimeClient.onMessageDeleted((deletedId) => {
      setMessages((prev) => {
        const updated = prev.filter((m) => m.id !== deletedId);
        try {
          localStorage.setItem('zvr_clan_messages_v1', JSON.stringify(updated.slice(-150)));
        } catch {}
        return updated;
      });
    });

    // 4.1 Subscribe to message unsend (Unsend for everyone)
    const unsubUnsent = realtimeClient.onMessageUnsent((data) => {
      setMessages((prev) => {
        const updated = prev.map((m) => {
          if (m.id !== data.messageId) return m;
          return {
            ...m,
            isUnsent: true,
            unsentBy: data.unsentBy,
            text: '',
            mediaUrl: undefined,
            reactions: undefined,
            replyTo: undefined,
          };
        });
        try {
          localStorage.setItem('zvr_clan_messages_v1', JSON.stringify(updated.slice(-150)));
        } catch {}
        return updated;
      });
    });

    // 4.2 Subscribe to clear all messages
    const unsubCleared = realtimeClient.onMessagesCleared(() => {
      setMessages([]);
      try {
        localStorage.removeItem('zvr_clan_messages_v1');
      } catch {}
    });

    // 5. Subscribe to initial server snapshot (mark historical messages seen without chiming)
    const unsubInit = realtimeClient.onInit((state) => {
      if (Array.isArray(state.messages) && state.messages.length > 0) {
        state.messages.forEach((m) => {
          if (m?.id) notifiedMessageIdsRef.current.add(m.id);
        });
        setMessages((prev) => {
          const map = new Map<string, ChatMessage>();
          prev.forEach((m) => map.set(m.id, m));
          state.messages.forEach((m) => map.set(m.id, m));
          const sorted = pruneMessagesOlderThan1Day(
            Array.from(map.values()).sort((a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0))
          );
          try {
            localStorage.setItem('zvr_clan_messages_v1', JSON.stringify(sorted.slice(-150)));
          } catch {}
          return sorted;
        });
      }
      if (state.currentLivePin !== undefined) {
        setActivePin(state.currentLivePin);
      }
    });

    // 6. Local BroadcastChannel for instant cross-tab sync
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('zvr_clan_gc_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'NEW_MESSAGE') {
          setMessages((prev) => {
            if (prev.some((m) => m.id === event.data.message.id)) return prev;
            return [...prev, event.data.message];
          });
          triggerIncomingNotification(event.data.message);
        } else if (event.data?.type === 'UPDATE_PIN') {
          setActivePin(event.data.pin);
        } else if (event.data?.type === 'REACTION_UPDATE') {
          setMessages((prev) =>
            prev.map((m) => (m.id === event.data.messageId ? { ...m, reactions: event.data.reactions } : m))
          );
        } else if (event.data?.type === 'MESSAGE_DELETED') {
          setMessages((prev) => prev.filter((m) => m.id !== event.data.messageId));
        } else if (event.data?.type === 'MESSAGE_UNSENT') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === event.data.messageId
                ? {
                    ...m,
                    isUnsent: true,
                    unsentBy: event.data.unsentBy,
                    text: '',
                    mediaUrl: undefined,
                    reactions: undefined,
                    replyTo: undefined,
                  }
                : m
            )
          );
        } else if (event.data?.type === 'ALL_MESSAGES_CLEARED') {
          setMessages([]);
          try {
            localStorage.removeItem('zvr_clan_messages_v1');
          } catch {}
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }

    return () => {
      unsubTyping();
      unsubChat();
      unsubPin();
      unsubReaction();
      unsubDelete();
      unsubUnsent();
      unsubCleared();
      unsubInit();
      if (channel) channel.close();
    };
  }, []);

  // Cleanup active voice recording stream/timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        recordingCancelledRef.current = true;
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Save messages to local storage and broadcast to server and other devices
  const saveMessages = (newMessages: ChatMessage[], broadcastMsg?: ChatMessage) => {
    const pruned = pruneMessagesOlderThan1Day(newMessages);
    setMessages(pruned);
    try {
      localStorage.setItem('zvr_clan_messages_v1', JSON.stringify(pruned.slice(-150)));
      const channel = new BroadcastChannel('zvr_clan_gc_channel');
      channel.postMessage({ type: 'NEW_MESSAGE', message: pruned[pruned.length - 1] });
      channel.close();
    } catch {
      // fallback
    }

    if (broadcastMsg) {
      realtimeClient.sendMessage(broadcastMsg);
    }
  };

  // Safe functional append for async media/voice messages so concurrent messages are never overwritten
  const appendAndBroadcastMessage = (newMsg: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev;
      const pruned = pruneMessagesOlderThan1Day([...prev, newMsg]);
      try {
        localStorage.setItem('zvr_clan_messages_v1', JSON.stringify(pruned.slice(-150)));
        const channel = new BroadcastChannel('zvr_clan_gc_channel');
        channel.postMessage({ type: 'NEW_MESSAGE', message: newMsg });
        channel.close();
      } catch {
        // fallback
      }
      return pruned;
    });

    realtimeClient.sendMessage(newMsg);
  };

  // Handle Scroll to detect whether user has swiped up
  const handleScroll = () => {
    const el = messageContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const scrolledUp = distanceToBottom > 150;
    isUserScrolledUpRef.current = scrolledUp;
    if (scrolledUp !== isUserScrolledUp) {
      setIsUserScrolledUp(scrolledUp);
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    isUserScrolledUpRef.current = false;
    setIsUserScrolledUp(false);
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Scroll to bottom on new message only if the user is already at the bottom or sent the message themselves
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    const isMe = lastMsg && loggedInMember && lastMsg.senderTagname === loggedInMember.tagname;
    if (!isUserScrolledUpRef.current || isMe) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages.length, loggedInMember]);

  // Jump directly to latest messages when activated via Chat Head
  useEffect(() => {
    if (scrollToLatestSignal > 0) {
      isUserScrolledUpRef.current = false;
      setIsUserScrolledUp(false);
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [scrollToLatestSignal]);

  // Handle text input changes & broadcast typing state (Lag-free concurrent typing for everyone)
  const handleInputChange = (val: string) => {
    setInputText(val);
    if (!loggedInMember) return;

    if (val.trim()) {
      const now = Date.now();
      // Throttle typing broadcast: at most once every 3.5 seconds to eliminate lag while everyone types together
      if (now - lastTypingSentRef.current > 3500) {
        lastTypingSentRef.current = now;
        realtimeClient.sendTypingStatus(true, 'typing');
      }

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        lastTypingSentRef.current = 0;
        realtimeClient.sendTypingStatus(false, 'typing');
      }, 3000);
    } else {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      lastTypingSentRef.current = 0;
      realtimeClient.sendTypingStatus(false, 'typing');
    }
  };

  // Handle Send Text Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loggedInMember || !inputText.trim()) return;

    const trimmed = inputText.trim();

    // Link Validation: Strictly allow TikTok links only in the room GC
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const urlsFound = trimmed.match(urlRegex);

    if (urlsFound && urlsFound.length > 0) {
      const hasNonTikTokLink = urlsFound.some((url) => {
        const lower = url.toLowerCase();
        return !lower.includes('tiktok.com') && !lower.includes('vm.tiktok.com') && !lower.includes('vt.tiktok.com');
      });

      if (hasNonTikTokLink) {
        sounds.playError();
        alert(
          lang === 'tl'
            ? '🚫 BAWAL ANG NON-TIKTOK LINK!\n\nTanging opisyal na TikTok videos at TikTok Live share links lamang ang pinapayagang i-lapag sa Z.V.R Room GC.'
            : '🚫 NON-TIKTOK LINKS NOT ALLOWED!\n\nOnly official TikTok video and TikTok Live share links are allowed in the Z.V.R Room GC.'
        );
        return;
      }
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    lastTypingSentRef.current = 0;
    realtimeClient.sendTypingStatus(false, 'typing');

    const now = Date.now();
    const newMsg: ChatMessage = {
      id: 'msg-' + now,
      senderTagname: formatTagnameUppercase(loggedInMember.tagname),
      senderName: loggedInMember.displayName.toUpperCase(),
      senderRole: loggedInMember.roleTitle,
      senderCategory: loggedInMember.category,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdTimestamp: now,
      text: trimmed,
      replyTo: replyingTo
        ? {
            messageId: replyingTo.id,
            senderName: replyingTo.senderName,
            senderTagname: replyingTo.senderTagname,
            text: replyingTo.text,
            mediaType: replyingTo.mediaType,
          }
        : undefined,
    };

    saveMessages([...messages, newMsg], newMsg);
    setInputText('');
    setReplyingTo(null);
    if (textareaInputRef.current) {
      textareaInputRef.current.style.height = 'auto';
    }
    setIsInputExpanded(false);
    scrollToBottom('auto');
  };

  // Quick Messenger-style Thumbs Up sender
  const handleSendThumbsUp = () => {
    if (!loggedInMember) return;
    sounds.playClick();
    const now = Date.now();
    const newMsg: ChatMessage = {
      id: 'msg-' + now,
      senderTagname: formatTagnameUppercase(loggedInMember.tagname),
      senderName: loggedInMember.displayName.toUpperCase(),
      senderRole: loggedInMember.roleTitle,
      senderCategory: loggedInMember.category,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdTimestamp: now,
      text: '👍',
      replyTo: replyingTo
        ? {
            messageId: replyingTo.id,
            senderName: replyingTo.senderName,
            senderTagname: replyingTo.senderTagname,
            text: replyingTo.text,
            mediaType: replyingTo.mediaType,
          }
        : undefined,
    };
    saveMessages([...messages, newMsg], newMsg);
    setReplyingTo(null);
  };

  // Quick Emoji Click
  const handleEmojiClick = (emoji: string) => {
    sounds.playClick();
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !loggedInMember) return;

    // Broadcast sending media
    realtimeClient.sendTypingStatus(true, 'sending');
    setActiveTransmitters((prev) => ({
      ...prev,
      [loggedInMember.tagname]: {
        activity: 'sending',
        displayName: loggedInMember.displayName,
        expiresAt: Date.now() + 2500,
      },
    }));

    sounds.playSuccess();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const now = Date.now();
      const newMsg: ChatMessage = {
        id: 'msg-img-' + now,
        senderTagname: formatTagnameUppercase(loggedInMember.tagname),
        senderName: loggedInMember.displayName.toUpperCase(),
        senderRole: loggedInMember.roleTitle,
        senderCategory: loggedInMember.category,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdTimestamp: now,
        text: inputText.trim() || undefined,
        mediaType: 'image',
        mediaUrl: dataUrl,
        replyTo: replyingTo
          ? {
              messageId: replyingTo.id,
              senderName: replyingTo.senderName,
              senderTagname: replyingTo.senderTagname,
              text: replyingTo.text,
              mediaType: replyingTo.mediaType,
            }
          : undefined,
      };
      appendAndBroadcastMessage(newMsg);
      setInputText('');
      setReplyingTo(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Video Upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !loggedInMember) return;

    // Broadcast sending video
    realtimeClient.sendTypingStatus(true, 'sending');
    setActiveTransmitters((prev) => ({
      ...prev,
      [loggedInMember.tagname]: {
        activity: 'sending',
        displayName: loggedInMember.displayName,
        expiresAt: Date.now() + 3000,
      },
    }));

    sounds.playSuccess();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const now = Date.now();
      const newMsg: ChatMessage = {
        id: 'msg-video-' + now,
        senderTagname: formatTagnameUppercase(loggedInMember.tagname),
        senderName: loggedInMember.displayName.toUpperCase(),
        senderRole: loggedInMember.roleTitle,
        senderCategory: loggedInMember.category,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdTimestamp: now,
        text: inputText.trim() || undefined,
        mediaType: 'video',
        mediaUrl: dataUrl,
        replyTo: replyingTo
          ? {
              messageId: replyingTo.id,
              senderName: replyingTo.senderName,
              senderTagname: replyingTo.senderTagname,
              text: replyingTo.text,
              mediaType: replyingTo.mediaType,
            }
          : undefined,
      };
      appendAndBroadcastMessage(newMsg);
      setInputText('');
      setReplyingTo(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Voice Recording: Start (Open access for all verified members across all devices)
  const handleStartVoiceRecording = async () => {
    if (!loggedInMember) return;
    if (isRecording) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      sounds.playError();
      alert(
        lang === 'tl'
          ? 'Hindi suportado ng browser na ito ang voice recording. Gumamit ng modernong browser (Chrome/Safari) at tiyaking pinapayagan ang mikropono.'
          : 'Voice recording is not supported in this browser. Please use a modern browser (Chrome/Safari) with microphone access enabled.'
      );
      return;
    }

    try {
      sounds.playClick();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        // Fallback for older devices/browsers that reject advanced audio constraints
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      recordingStreamRef.current = stream;
      recordingCancelledRef.current = false;
      audioChunksRef.current = [];

      // Choose best supported MIME type for Android, iOS Safari, and Desktop
      const candidateMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      let selectedMimeType = '';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        selectedMimeType = candidateMimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      }

      const mediaRecorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;

        if (recordingCancelledRef.current || audioChunksRef.current.length === 0) {
          audioChunksRef.current = [];
          return;
        }

        const actualType = mediaRecorder.mimeType || selectedMimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualType });
        audioChunksRef.current = [];

        if (audioBlob.size === 0) return;

        const durationSec = Math.max(
          1,
          Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
        );

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          if (!base64Audio) return;
          const now = Date.now();
          const newMsg: ChatMessage = {
            id: 'msg-voice-' + now,
            senderTagname: formatTagnameUppercase(loggedInMember.tagname),
            senderName: loggedInMember.displayName.toUpperCase(),
            senderRole: loggedInMember.roleTitle,
            senderCategory: loggedInMember.category,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdTimestamp: now,
            mediaType: 'audio',
            mediaUrl: base64Audio,
            mediaDuration: durationSec,
            replyTo: replyingTo
              ? {
                  messageId: replyingTo.id,
                  senderName: replyingTo.senderName,
                  senderTagname: replyingTo.senderTagname,
                  text: replyingTo.text,
                  mediaType: replyingTo.mediaType,
                }
              : undefined,
          };
          appendAndBroadcastMessage(newMsg);
          setReplyingTo(null);
          sounds.playSuccess();
        };
        reader.readAsDataURL(audioBlob);
      };

      recordingStartTimeRef.current = Date.now();
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err);
      setIsRecording(false);
      sounds.playError();
      alert(
        lang === 'tl'
          ? 'Kailangan ng pahintulot sa mikropono para makapag-voice recording. I-allow ang Microphone sa settings ng browser at subukan muli.'
          : 'Microphone permission is required to record a voice note. Please allow Microphone access in your browser settings and try again.'
      );
    }
  };

  // Voice Recording: Stop and Send
  const handleStopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      recordingCancelledRef.current = false;
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }
  };

  // Voice Recording: Cancel
  const handleCancelVoiceRecording = () => {
    if (isRecording) {
      recordingCancelledRef.current = true;
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      setRecordingSeconds(0);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((t) => t.stop());
        recordingStreamRef.current = null;
      }
      audioChunksRef.current = [];
      sounds.playClick();
    }
  };

  // Handle Pinning TikTok Live
  const handleSaveTikTokPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInMember || !pinUrl.trim()) return;

    const trimmedUrl = pinUrl.trim();
    const lowerUrl = trimmedUrl.toLowerCase();

    if (!lowerUrl.includes('tiktok.com') && !lowerUrl.includes('vm.tiktok.com') && !lowerUrl.includes('vt.tiktok.com')) {
      sounds.playError();
      alert(
        lang === 'tl'
          ? '🚫 TIKTOK LIVE LINK LAMANG!\n\nIpasok ang opisyal na TikTok Live link (halimbawa: https://www.tiktok.com/@username/live o vm.tiktok.com).'
          : '🚫 TIKTOK LIVE LINKS ONLY!\n\nPlease enter an official TikTok Live link.'
      );
      return;
    }

    sounds.playSuccess();
    const newPin: TikTokLivePin = {
      id: 'pin-' + Date.now(),
      streamerName: loggedInMember.displayName,
      streamerTagname: loggedInMember.tagname,
      title: pinTitle.trim() || 'Z.V.R Member Live Stream',
      liveUrl: trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`,
      startedAt: 'Live Now'
    };

    setActivePin(newPin);
    realtimeClient.pinLive(newPin);
    try {
      localStorage.setItem('zvr_clan_live_pin', JSON.stringify(newPin));
      const channel = new BroadcastChannel('zvr_clan_gc_channel');
      channel.postMessage({ type: 'UPDATE_PIN', pin: newPin });
      channel.close();
    } catch {
      // fallback
    }

    // Also announce in the chat (Live Title only)
    const now = Date.now();
    const cleanLiveTitle = pinTitle.trim() || 'Live';
    const announceMsg: ChatMessage = {
      id: 'msg-live-announce-' + now,
      senderTagname: formatTagnameUppercase(loggedInMember.tagname),
      senderName: loggedInMember.displayName.toUpperCase(),
      senderRole: loggedInMember.roleTitle,
      senderCategory: loggedInMember.category,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdTimestamp: now,
      text: cleanLiveTitle,
      mediaType: 'tiktok_live',
      liveTitle: cleanLiveTitle,
      liveUrl: newPin.liveUrl
    };
    saveMessages([...messages, announceMsg], announceMsg);

    setIsPinModalOpen(false);
    setPinTitle('');
    setPinUrl('');
  };

  const handleUnpinLive = () => {
    sounds.playClick();
    setActivePin(null);
    realtimeClient.unpinLive();
    try {
      localStorage.removeItem('zvr_clan_live_pin');
      const channel = new BroadcastChannel('zvr_clan_gc_channel');
      channel.postMessage({ type: 'UPDATE_PIN', pin: null });
      channel.close();
    } catch {
      // fallback
    }
  };

  // Toggle Emoji Reaction on a message
  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (!loggedInMember) {
      sounds.playError();
      alert(
        lang === 'tl'
          ? 'Mag-login muna gamit ang iyong Z.V.R Tagname para makapag-react!'
          : 'Please log in with your Z.V.R Tagname first to react!'
      );
      return;
    }
    sounds.playPop();
    const myTag = loggedInMember.tagname;

    setMessages((prev) => {
      const updated = prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions: Record<string, string[]> = { ...(m.reactions || {}) };
        const currentList: string[] = reactions[emoji] || [];
        if (currentList.includes(myTag)) {
          reactions[emoji] = currentList.filter((t) => t !== myTag);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          reactions[emoji] = [...currentList, myTag];
        }
        return { ...m, reactions };
      });

      try {
        localStorage.setItem('zvr_clan_messages_v1', JSON.stringify(updated.slice(-150)));
      } catch {}

      try {
        const channel = new BroadcastChannel('zvr_clan_gc_channel');
        const targetMsg = updated.find((m) => m.id === messageId);
        channel.postMessage({
          type: 'REACTION_UPDATE',
          messageId,
          reactions: targetMsg?.reactions || {},
        });
        channel.close();
      } catch {}

      realtimeClient.toggleReaction(messageId, emoji, myTag);
      return updated;
    });

    setActiveReactionMenuMsgId(null);
  };

  // Delete message (Own message or Admin moderation)
  const handleDeleteMessage = (messageId: string, senderTagname: string) => {
    if (!loggedInMember) return;
    const isMine =
      (senderTagname || '').trim().toLowerCase() ===
      (loggedInMember.tagname || '').trim().toLowerCase();
    const isAdmin = loggedInMember.category === 'leadership';

    if (!isMine && !isAdmin) {
      sounds.playError();
      alert(
        lang === 'tl'
          ? 'Maaari mo lamang burahin ang sarili mong mensahe!'
          : 'You can only delete your own messages!'
      );
      return;
    }

    const confirmText = isMine
      ? lang === 'tl'
        ? 'Burahin ang iyong mensahe sa Room GC?'
        : 'Delete your message from the Room GC?'
      : lang === 'tl'
      ? 'Burahin ang mensaheng ito bilang Admin?'
      : 'Delete this message as Admin?';

    if (confirm(confirmText)) {
      sounds.playClick();
      setMessages((prev) => {
        const updated = prev.filter((m) => m.id !== messageId);
        try {
          localStorage.setItem('zvr_clan_messages_v1', JSON.stringify(updated.slice(-150)));
        } catch {}

        try {
          const channel = new BroadcastChannel('zvr_clan_gc_channel');
          channel.postMessage({ type: 'MESSAGE_DELETED', messageId });
          channel.close();
        } catch {}

        realtimeClient.deleteMessage(messageId);
        return updated;
      });
    }
  };

  const handleBubbleTouchStart = (msgId: string, clientX?: number, clientY?: number) => {
    longPressTriggeredRef.current = false;
    touchStartPosRef.current =
      typeof clientX === 'number' && typeof clientY === 'number'
        ? { x: clientX, y: clientY }
        : null;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      touchStartPosRef.current = null;
      sounds.playClick();
      setActiveReactionMenuMsgId(null);
      setLongPressActiveMsgId(msgId);
    }, 350);
  };

  const handleBubbleTouchMove = (clientX: number, clientY: number) => {
    if (!touchStartPosRef.current || !longPressTimerRef.current) return;
    const dx = Math.abs(clientX - touchStartPosRef.current.x);
    const dy = Math.abs(clientY - touchStartPosRef.current.y);
    if (dx > 12 || dy > 12) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      touchStartPosRef.current = null;
    }
  };

  const handleBubbleTouchEnd = () => {
    touchStartPosRef.current = null;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (longPressTriggeredRef.current) {
      setTimeout(() => {
        longPressTriggeredRef.current = false;
      }, 120);
    }
  };

  const handleStartReply = (msg: ChatMessage) => {
    sounds.playClick();
    setReplyingTo(msg);
    setLongPressActiveMsgId(null);
    setActiveReactionMenuMsgId(null);
    setTimeout(() => {
      textareaInputRef.current?.focus();
    }, 50);
  };

  // Unsend for everyone (Available to message sender & all room members on their messages, plus leadership)
  const handleUnsendMessage = (messageId: string, senderTagname: string) => {
    if (!loggedInMember) return;
    const isMine =
      (senderTagname || '').trim().toLowerCase() ===
      (loggedInMember.tagname || '').trim().toLowerCase();
    const isAdmin = loggedInMember.category === 'leadership';

    if (!isMine && !isAdmin) {
      sounds.playError();
      alert(
        lang === 'tl'
          ? 'Maaari mo lamang i-unsend ang sarili mong mensahe!'
          : 'You can only unsend your own messages!'
      );
      return;
    }

    sounds.playClick();
    const whoUnsent = loggedInMember.displayName || loggedInMember.tagname;
    if (replyingTo?.id === messageId) {
      setReplyingTo(null);
    }

    setMessages((prev) => {
      const updated = prev.map((m) => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          isUnsent: true,
          unsentBy: whoUnsent,
          text: '',
          mediaUrl: undefined,
          reactions: undefined,
          replyTo: undefined,
        };
      });

      try {
        localStorage.setItem('zvr_clan_messages_v1', JSON.stringify(updated.slice(-150)));
      } catch {}

      try {
        const channel = new BroadcastChannel('zvr_clan_gc_channel');
        channel.postMessage({
          type: 'MESSAGE_UNSENT',
          messageId,
          unsentBy: whoUnsent,
        });
        channel.close();
      } catch {}

      realtimeClient.unsendMessage(messageId, whoUnsent);
      return updated;
    });
  };

  // Clear all messages in room GC (Admin moderation & user refresh)
  const handleClearAllMessages = () => {
    if (!loggedInMember) return;
    if (
      confirm(
        lang === 'tl'
          ? 'Sigurado ka bang nais mong linisin (i-clear) ang lahat ng mensahe sa Room GC?'
          : 'Are you sure you want to clear all messages in the Room GC?'
      )
    ) {
      sounds.playClick();
      setMessages([]);
      try {
        localStorage.removeItem('zvr_clan_messages_v1');
        const channel = new BroadcastChannel('zvr_clan_gc_channel');
        channel.postMessage({ type: 'ALL_MESSAGES_CLEARED' });
        channel.close();
      } catch {}
      realtimeClient.clearAllMessages();
    }
  };

  // Copy message text
  const handleCopyMessage = (messageId: string, text?: string) => {
    if (!text) return;
    sounds.playClick();
    navigator.clipboard.writeText(text);
    setCopiedMsgId(messageId);
    setTimeout(() => setCopiedMsgId(null), 1800);
  };

  // Quick Attendance directly inside the Room GC (4:00 AM - 6:00 PM)
  const handleQuickAttendance = () => {
    if (!loggedInMember) return;
    const isOpen = isAttendanceWindowOpen();
    if (!isOpen) {
      sounds.playError();
      setAttendanceNotice(
        lang === 'tl'
          ? '🔴 Sarado na ang Attendance (4:00 AM – 6:00 PM). Hindi na pwedeng humabol at bawal ang passcode.'
          : '🔴 Attendance is CLOSED (4:00 AM – 6:00 PM). Late check-ins and passcode overrides are not allowed.'
      );
      setTimeout(() => setAttendanceNotice(null), 6000);
      return;
    }

    sounds.playSuccess();
    const todayKey = getAttendanceDateKey();
    const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const raw = localStorage.getItem(`zvr_attendance_${todayKey}`);
      const map = raw ? JSON.parse(raw) : {};
      map[loggedInMember.id] = { isPresent: true, timeCheckedIn: checkInTime };
      localStorage.setItem(`zvr_attendance_${todayKey}`, JSON.stringify(map));
    } catch {}

    realtimeClient.checkAttendance(
      todayKey,
      loggedInMember.id,
      true,
      checkInTime,
      loggedInMember.displayName,
      loggedInMember.tagname
    );

    setAttendanceNotice(
      lang === 'tl'
        ? `✅ Naitala ang Attendance ni ${loggedInMember.displayName} (${checkInTime}) bilang PRESENT!`
        : `✅ Recorded ${loggedInMember.displayName}'s Attendance (${checkInTime}) as PRESENT!`
    );
    setTimeout(() => setAttendanceNotice(null), 6000);
  };

  // GATEKEEPER VIEW: When user is not logged in with official tagname
  if (!loggedInMember) {
    return (
      <div className="w-full max-w-lg mx-auto py-8">
        <div className="liquid-glass-panel rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-52 h-12 bg-white/20 rounded-full blur-xl pointer-events-none"></div>

          {/* Locked Crest Emblem */}
          <div className="relative inline-block mx-auto mb-4 relative z-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-white/30 shadow-[0_0_24px_rgba(168,85,247,0.35)] bg-purple-950/80 mx-auto">
              <img
                src={CLAN_LOGO_URL}
                alt="Z.V.R Official Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-purple-600 border-2 border-slate-900 flex items-center justify-center text-white shadow-md">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 font-heading relative z-10">
            {lang === 'tl' ? 'Eksklusibong Room & GC' : 'Exclusive Room & GC'}
          </h2>
          <p className="text-xs font-semibold text-purple-300 mt-1 uppercase tracking-wider relative z-10">
            {CLAN_MOTTO}
          </p>

          <div className="my-5 p-4 liquid-glass-card-subtle rounded-2xl text-xs text-purple-200/90 leading-relaxed text-left space-y-2 relative z-10">
            <p className="font-bold text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-purple-300 shrink-0" />
              <span>{lang === 'tl' ? 'Tanging may Tagname Lamang:' : 'Tagname Verification Required:'}</span>
            </p>
            <p className="text-purple-200/80">
              {lang === 'tl'
                ? 'Ang kuwartong ito ay ang opisyal na tambayan, chat, photo/video sharing, at video call hub ng Z.V.R. Bawal ang hindi nakarehistrong miyembro.'
                : 'This private room is the official group chat, media drop, and video call hub for authenticated Z.V.R members.'}
            </p>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onGoToLogin();
            }}
            className="liquid-glass-btn-primary w-full py-3.5 px-4 text-white font-black rounded-xl text-sm sm:text-base tracking-wide transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] relative z-10"
          >
            <UserCheck className="w-4 h-4 text-pink-200" />
            <span>{lang === 'tl' ? 'MAG-LOGIN GAMIT ANG TAGNAME' : 'LOG IN WITH TAGNAME'}</span>
          </button>
        </div>
      </div>
    );
  }

  // AUTHENTICATED VIEW: Liquid Glass UI Mobile Layout matching Clan Logo aesthetic
  return (
    <div className="w-full max-w-[430px] sm:max-w-[450px] mx-auto flex flex-col h-[86vh] sm:h-[84vh] liquid-glass-panel rounded-[36px] overflow-hidden border border-white/20 shadow-[0_25px_65px_rgba(0,0,0,0.95),0_0_35px_rgba(168,85,247,0.2)] relative text-white">
      {/* Top Mobile Header (Liquid Glass Frosted Sheen with Z.V.R Logo Colors) */}
      <div className="bg-black/60 backdrop-blur-xl px-3.5 py-3 border-b border-purple-500/20 flex items-center justify-between gap-2 shrink-0 z-30">
        {/* Left: Back Arrow (Logout / Portal) + Circular Avatar + Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => {
              sounds.playClick();
              if (onLogout) {
                onLogout();
              } else {
                onGoToLogin();
              }
            }}
            className="p-1 text-purple-300 hover:text-pink-300 transition-colors cursor-pointer shrink-0"
            title={lang === 'tl' ? 'Mag-log out at bumalik sa Portal' : 'Log out & Back'}
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.4]" />
          </button>

          {/* Contact Circle Avatar with Online Dot */}
          <div
            className="relative shrink-0 cursor-pointer"
            onClick={() => {
              sounds.playClick();
              setIsInfoModalOpen(true);
            }}
            title={lang === 'tl' ? 'Tingnan ang Info ng Room' : 'View Room Info'}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-purple-700 to-pink-600 border border-purple-300/40 overflow-hidden flex items-center justify-center shadow-md">
              <img
                src={CLAN_LOGO_URL}
                alt="Z.V.R Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Green STATUS INDICATOR with number */}
            <span
              className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-500 border-2 border-black text-[9px] font-black text-black font-mono shadow-[0_0_10px_rgba(16,185,129,0.9)] flex items-center gap-0.5"
              title="STATUS INDICATOR"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              <span>{Math.max(1, onlineUsers.length)}</span>
            </span>
          </div>

          {/* Room Title & Online Status */}
          <div
            className="min-w-0 cursor-pointer"
            onClick={() => {
              sounds.playClick();
              setIsInfoModalOpen(true);
            }}
          >
            <h2 className="text-sm font-bold text-white truncate leading-tight">
              Z.V.R Room GC
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-black text-emerald-300 font-mono tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>STATUS INDICATOR: {Math.max(1, onlineUsers.length)}</span>
              </span>
              <span className="text-[10px] text-purple-200/80 font-mono truncate">
                Active now ({Math.max(1, onlineUsers.length)})
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Icons: Attendance, Video, Phone, Info */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Attendance Access (4:00 AM - 6:00 PM) */}
          <button
            onClick={handleQuickAttendance}
            className="px-2 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-[10px] text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
            title={lang === 'tl' ? 'I-tala ang Attendance (4:00 AM - 6:00 PM)' : 'Log Attendance (4:00 AM - 6:00 PM)'}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Present</span>
          </button>

          {/* Video Call */}
          <button
            onClick={() => startRoomCall('video')}
            className="p-1.5 text-purple-300 hover:text-pink-300 transition-colors cursor-pointer"
            title={lang === 'tl' ? 'Sumali sa Video Call' : 'Video Call'}
          >
            <VideoIcon className="w-5 h-5 fill-purple-400/20 stroke-[2.2]" />
          </button>

          {/* Audio Call */}
          <button
            onClick={() => startRoomCall('voice')}
            className="p-1.5 text-purple-300 hover:text-pink-300 transition-colors cursor-pointer"
            title={lang === 'tl' ? 'Voice / Audio Call' : 'Voice Call'}
          >
            <Phone className="w-5 h-5 fill-purple-400/20 stroke-[2]" />
          </button>

          {/* Info Icon (circled i) */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsInfoModalOpen(true);
            }}
            className="p-1.5 text-purple-300 hover:text-pink-300 transition-colors cursor-pointer"
            title={lang === 'tl' ? 'Room Info at Miyembro' : 'Room Info & Members'}
          >
            <Info className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* In-Room Incoming Message Notification Banner */}
      {roomMessageNotice && (
        <div
          onClick={() => {
            sounds.playClick();
            setRoomMessageNotice(null);
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-purple-600/25 border-b border-purple-400/40 px-3.5 py-1.5 text-xs text-purple-100 flex items-center justify-between gap-2 animate-fade-in z-30 cursor-pointer hover:bg-purple-600/35 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping shrink-0"></span>
            <Volume2 className="w-3.5 h-3.5 text-pink-300 shrink-0" />
            <span className="font-bold text-pink-200 truncate">
              {roomMessageNotice.senderName}
            </span>
            <span className="text-[10px] font-mono text-purple-300/90 shrink-0">
              ({roomMessageNotice.senderRole})
            </span>
            <span className="text-zinc-200 truncate">
              : {roomMessageNotice.preview}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRoomMessageNotice(null);
            }}
            className="p-0.5 text-purple-200 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attendance Real-time Notice */}
      {attendanceNotice && (
        <div className="bg-emerald-500/20 border-b border-emerald-400/40 px-3.5 py-1.5 text-xs text-emerald-200 font-bold flex items-center justify-between animate-fade-in z-30">
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{attendanceNotice}</span>
          </div>
          <button onClick={() => setAttendanceNotice(null)} className="p-0.5 text-emerald-300 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pinned TikTok Live Notification Banner */}
      {activePin && (
        <div className="bg-[#18191e] px-3.5 py-1.5 border-b border-zinc-800 flex items-center justify-between text-xs shrink-0 z-20">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping shrink-0"></span>
            <span className="text-pink-400 font-bold shrink-0">LIVE: {activePin.streamerName}</span>
            <span className="text-zinc-300 truncate">{activePin.title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={activePin.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-0.5 bg-pink-600 hover:bg-pink-500 text-white rounded-full text-[11px] font-bold"
            >
              {lang === 'tl' ? 'Manood' : 'Watch'}
            </a>
            <button
              onClick={handleUnpinLive}
              className="text-zinc-400 hover:text-white p-0.5 cursor-pointer"
              title={lang === 'tl' ? 'Alisin ang pin' : 'Unpin'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Message Stream Container (Smooth Touch Swipe Up & Down for Everyone) */}
      <div
        ref={messageContainerRef}
        onScroll={handleScroll}
        className="flex-1 p-3 overflow-y-auto space-y-3 bg-black/40 backdrop-blur-md relative z-10 flex flex-col overscroll-y-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex-1 flex flex-col items-center justify-center text-center p-6 text-purple-200/70 my-auto min-h-[260px]">
            <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mb-3 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <MessageCircle className="w-7 h-7 text-purple-300" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              Z.V.R Room & GC
            </h3>
            <p className="text-xs text-purple-200/70 max-w-xs mb-3 leading-relaxed">
              {lang === 'tl'
                ? 'Walang naunang mensahe. Mag-lapag ng mensahe o mag-iwan ng thumbs-up 👍 sa ibaba!'
                : 'No messages yet. Send a message or thumbs-up 👍 below!'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe =
              (msg.senderTagname || '').trim().toLowerCase() ===
              (loggedInMember.tagname || '').trim().toLowerCase();
            const isThumbsUpOnly = msg.text === '👍' && !msg.mediaType;
            const isReactionMenuOpen = activeReactionMenuMsgId === msg.id;
            const canDelete = isMe || loggedInMember.category === 'leadership';

            // Unsent message display (e.g. "[Name] deleted a message")
            if (msg.isUnsent) {
              const whoDeleted = msg.unsentBy || msg.senderName || 'Member';
              return (
                <div
                  key={msg.id}
                  id={`chat-msg-${msg.id}`}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1 animate-fade-in`}
                >
                  <div
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs italic ${
                      isMe
                        ? 'bg-purple-900/30 border border-purple-500/30 text-purple-300'
                        : 'bg-white/[0.06] border border-white/10 text-zinc-400'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    <span>{whoDeleted} deleted a message</span>
                  </div>
                </div>
              );
            }

            // Referenced message lookup for Reply preview inside bubble
            const originalRepliedMsg = msg.replyTo
              ? messages.find((m) => m.id === msg.replyTo?.messageId)
              : undefined;

            // Messenger-style Glowing Thumbs-Up Sticker (Logo Theme)
            if (isThumbsUpOnly) {
              return (
                <div
                  key={msg.id}
                  id={`chat-msg-${msg.id}`}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in group relative`}
                >
                  {msg.replyTo && (
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById(`chat-msg-${msg.replyTo!.messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className={`mb-1 px-2.5 py-1 rounded-xl bg-white/[0.06] border border-white/10 text-[11px] text-purple-200/80 max-w-[240px] truncate flex items-center gap-1.5 cursor-pointer hover:bg-white/10 ${isMe ? 'mr-1' : 'ml-9'}`}
                    >
                      <CornerUpLeft className="w-3 h-3 text-purple-300 shrink-0" />
                      <span className="truncate">
                        {originalRepliedMsg?.isUnsent
                          ? lang === 'tl' ? 'Nabura ang mensahe' : 'Message deleted'
                          : `${msg.replyTo.senderName}: ${msg.replyTo.text || (msg.replyTo.mediaType === 'image' ? '📷 Photo' : msg.replyTo.mediaType === 'video' ? '🎥 Video' : '🎤 Voice')}`}
                      </span>
                    </button>
                  )}
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start items-end gap-2'}`}>
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-700 to-pink-600 border border-purple-300/40 flex items-center justify-center text-white text-[11px] font-bold shrink-0 mb-1 shadow-sm">
                        {msg.senderName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      {!isMe && (
                        <span className="text-[10px] text-purple-300/80 font-mono mb-0.5 ml-1">
                          {msg.senderName}
                        </span>
                      )}
                      <div
                        onTouchStart={(e) => {
                          const t = e.touches[0];
                          handleBubbleTouchStart(msg.id, t?.clientX, t?.clientY);
                        }}
                        onTouchMove={(e) => {
                          const t = e.touches[0];
                          if (t) handleBubbleTouchMove(t.clientX, t.clientY);
                        }}
                        onTouchEnd={handleBubbleTouchEnd}
                        onTouchCancel={handleBubbleTouchEnd}
                        onMouseDown={(e) => { if (e.button === 0) handleBubbleTouchStart(msg.id, e.clientX, e.clientY); }}
                        onMouseUp={handleBubbleTouchEnd}
                        onMouseLeave={handleBubbleTouchEnd}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          sounds.playClick();
                          setActiveReactionMenuMsgId(null);
                          setLongPressActiveMsgId(msg.id);
                        }}
                        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                        className="p-1 flex items-center gap-1.5 select-none"
                      >
                        <ThumbsUp className="w-9 h-9 sm:w-11 sm:h-11 fill-fuchsia-500 text-fuchsia-400 drop-shadow-[0_0_12px_rgba(217,70,239,0.5)] transition-transform active:scale-125 cursor-pointer" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                id={`chat-msg-${msg.id}`}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in group relative`}
              >
                {/* Sender Header Wearing Official Tagname */}
                {!isMe && (
                  <div className="flex items-center gap-1.5 text-[11px] mb-1 px-1 text-zinc-400">
                    <span className="font-semibold text-purple-200 font-mono select-all tracking-wide">
                      {formatTagnameUppercase(msg.senderTagname || msg.senderName)}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-900/40 border border-purple-500/30 text-purple-300">
                      {msg.senderRole}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                  </div>
                )}
                {isMe && (
                  <div className="flex items-center justify-end gap-1.5 text-[10px] mb-1 px-1 text-purple-300/80 font-mono">
                    <span className="select-all">{formatTagnameUppercase(loggedInMember.tagname)}</span>
                    <span className="text-[9px] text-zinc-500">{msg.timestamp}</span>
                  </div>
                )}

                {/* Floating Reaction Selector Popover (Message Reaction Picker) */}
                {isReactionMenuOpen && (
                  <div
                    className={`absolute -top-11 z-40 bg-slate-900/95 backdrop-blur-md border border-purple-400/50 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-[0_0_25px_rgba(168,85,247,0.5)] animate-fade-in ${
                      isMe ? 'right-2' : 'left-8'
                    }`}
                  >
                    <span className="text-[9px] font-black tracking-wider uppercase text-purple-300 font-mono hidden sm:inline pl-1">
                      React:
                    </span>
                    {REACTION_EMOJIS.map((emoji) => {
                      const hasReacted = msg.reactions?.[emoji]?.includes(loggedInMember.tagname);
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReaction(msg.id, emoji);
                          }}
                          className={`text-xl p-1 hover:scale-135 active:scale-90 transition-all cursor-pointer duration-150 ${
                            hasReacted ? 'scale-125 drop-shadow-[0_0_10px_rgba(236,72,153,0.9)]' : ''
                          }`}
                          title={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Bubble Container */}
                <div className={`flex items-end gap-1.5 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-700 to-pink-600 border border-purple-300/40 flex items-center justify-center text-white text-[11px] font-bold shrink-0 mb-1 shadow-sm">
                      {msg.senderName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="relative flex flex-col">
                    {/* Messenger-style Quoted Reply Header inside Bubble Stack */}
                    {msg.replyTo && (
                      <button
                        type="button"
                        onClick={() => {
                          document.getElementById(`chat-msg-${msg.replyTo!.messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className={`mb-1 px-3 py-1.5 rounded-2xl bg-white/[0.07] border border-white/10 text-left max-w-[260px] cursor-pointer hover:bg-white/[0.12] transition-colors ${
                          isMe ? 'self-end rounded-br-sm' : 'self-start rounded-bl-sm'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-[10px] font-bold text-purple-300 mb-0.5">
                          <CornerUpLeft className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {lang === 'tl'
                              ? `Sumagot kay ${msg.replyTo.senderName}`
                              : `Replied to ${msg.replyTo.senderName}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300/85 line-clamp-2 italic break-words">
                          {originalRepliedMsg?.isUnsent
                            ? lang === 'tl' ? 'Nabura ang mensahe' : 'Message deleted'
                            : msg.replyTo.text ||
                              (msg.replyTo.mediaType === 'image'
                                ? '📷 Photo'
                                : msg.replyTo.mediaType === 'video'
                                ? '🎥 Video'
                                : msg.replyTo.mediaType === 'audio'
                                ? '🎤 Voice memo'
                                : 'Message')}
                        </p>
                      </button>
                    )}

                    <div
                      onClick={() => {
                        if (longPressTriggeredRef.current) {
                          longPressTriggeredRef.current = false;
                          return;
                        }
                        sounds.playPop();
                        setActiveReactionMenuMsgId(isReactionMenuOpen ? null : msg.id);
                      }}
                      onTouchStart={(e) => {
                        const t = e.touches[0];
                        handleBubbleTouchStart(msg.id, t?.clientX, t?.clientY);
                      }}
                      onTouchMove={(e) => {
                        const t = e.touches[0];
                        if (t) handleBubbleTouchMove(t.clientX, t.clientY);
                      }}
                      onTouchEnd={handleBubbleTouchEnd}
                      onTouchCancel={handleBubbleTouchEnd}
                      onMouseDown={(e) => {
                        if (e.button === 0) handleBubbleTouchStart(msg.id, e.clientX, e.clientY);
                      }}
                      onMouseUp={handleBubbleTouchEnd}
                      onMouseLeave={handleBubbleTouchEnd}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        sounds.playClick();
                        setActiveReactionMenuMsgId(null);
                        setLongPressActiveMsgId(msg.id);
                      }}
                      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                      className={`rounded-[22px] px-3.5 py-2 sm:px-4 sm:py-2.5 text-sm transition-all shadow-md break-words cursor-pointer select-none ${
                        isMe
                          ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white rounded-br-[4px] border border-white/20 shadow-[0_4px_16px_rgba(168,85,247,0.3)] hover:brightness-110 active:scale-[0.98]'
                          : 'bg-white/[0.08] backdrop-blur-md border border-white/15 text-white rounded-tl-[4px] hover:bg-white/[0.12] active:scale-[0.98]'
                      }`}
                      title={
                        lang === 'tl'
                          ? 'I-tap para mag-react · I-long press para sa Unsend for everyone at Reply'
                          : 'Tap to react · Long press for Unsend for everyone & Reply'
                      }
                    >
                      {/* Text Message */}
                      {(msg.text || msg.liveTitle) && (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.mediaType === 'tiktok_live'
                            ? msg.liveTitle ||
                              (msg.text || '').replace(
                                /^🔴\s*(?:NAG-LIVE AKO SA TIKTOK! Samahan niyo ako mga ka-Z\.V\.R:|I'M LIVE ON TIKTOK! Join me Z\.V\.R fam:)\s*/i,
                                ''
                              )
                            : msg.text}
                        </p>
                      )}

                      {/* Photo Content */}
                      {msg.mediaType === 'image' && msg.mediaUrl && (
                        <div className="mt-1.5 rounded-xl overflow-hidden border border-white/10 relative group cursor-pointer max-w-xs">
                          <img
                            src={msg.mediaUrl}
                            alt="Photo"
                            className="w-full max-h-64 object-cover rounded-xl pointer-events-auto"
                            onClick={(e) => {
                              if (longPressTriggeredRef.current) {
                                e.stopPropagation();
                                return;
                              }
                              e.stopPropagation();
                              setLightboxImage(msg.mediaUrl!);
                            }}
                          />
                        </div>
                      )}

                      {/* Video Content */}
                      {msg.mediaType === 'video' && msg.mediaUrl && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1.5 rounded-xl overflow-hidden border border-white/10 max-w-xs"
                        >
                          <video src={msg.mediaUrl} controls playsInline className="w-full max-h-64 rounded-xl" />
                        </div>
                      )}

                      {/* Voice Memo Content */}
                      {msg.mediaType === 'audio' && msg.mediaUrl && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 flex items-center gap-2 p-1.5 rounded-xl bg-black/40 border border-white/10"
                        >
                          <Volume2 className="w-4 h-4 text-pink-300 shrink-0" />
                          <audio src={msg.mediaUrl} controls preload="metadata" className="h-8 max-w-[190px]" />
                          <span className="text-[10px] font-mono text-purple-200 shrink-0">
                            {msg.mediaDuration ? `${msg.mediaDuration}s` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Member Message Actions: Reply, Quick React, Copy, Unsend, Delete */}
                    <div
                      className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                        isMe ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {/* Reply Button */}
                      <button
                        type="button"
                        onClick={() => handleStartReply(msg)}
                        className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-purple-300 hover:text-white transition-colors cursor-pointer"
                        title="Reply"
                      >
                        <CornerUpLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* React Button: ❤️😂😯😥😡🥹 */}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveReactionMenuMsgId(isReactionMenuOpen ? null : msg.id)
                        }
                        className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-purple-300 hover:text-white transition-colors cursor-pointer text-xs"
                        title={lang === 'tl' ? 'Mag-react ng emoji (❤️😂😯😥😡🥹)' : 'React with emoji (❤️😂😯😥😡🥹)'}
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>

                      {/* Copy Text Button */}
                      {msg.text && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.text)}
                          className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-purple-300 hover:text-white transition-colors cursor-pointer"
                          title={lang === 'tl' ? 'Kopyahin ang mensahe' : 'Copy message'}
                        >
                          {copiedMsgId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {/* Unsend for Everyone Button */}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleUnsendMessage(msg.id, msg.senderTagname)}
                          className="p-1 rounded-full bg-white/10 hover:bg-pink-500/20 text-zinc-400 hover:text-pink-300 transition-colors cursor-pointer"
                          title="Unsend for everyone"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete Message Button */}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id, msg.senderTagname)}
                          className="p-1 rounded-full bg-white/10 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                          title={
                            isMe
                              ? lang === 'tl'
                                ? 'Burahin ang mensahe ko'
                                : 'Delete my message'
                              : lang === 'tl'
                              ? 'Burahin bilang Admin'
                              : 'Delete as Admin'
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Emoji Reactions Count Pills Below Bubble */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div
                    className={`flex flex-wrap items-center gap-1 mt-1 ${
                      isMe ? 'justify-end mr-1' : 'justify-start ml-9'
                    }`}
                  >
                    {Object.entries(msg.reactions).map(([emoji, userList]) => {
                      if (!userList || userList.length === 0) return null;
                      const hasMyReaction = userList.includes(loggedInMember.tagname);
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                            hasMyReaction
                              ? 'bg-purple-600/40 border-purple-400 text-pink-200 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                              : 'bg-white/10 border-white/15 text-zinc-300 hover:bg-white/20'
                          }`}
                          title={`${lang === 'tl' ? 'Nag-react' : 'Reacted'}: ${userList.join(', ')}`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] font-mono">{userList.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />

        {/* Floating Scroll-to-Bottom Button when swiped up */}
        {isUserScrolledUp && (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="sticky bottom-2 self-center z-30 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-xs font-bold shadow-[0_4px_20px_rgba(168,85,247,0.6)] border border-purple-300/40 flex items-center gap-1.5 animate-bounce cursor-pointer transition-transform active:scale-95"
            title={lang === 'tl' ? 'Pumunta sa pinakabagong mensahe' : 'Jump to latest message'}
          >
            <span>{lang === 'tl' ? '⬇ Bagong Mensahe (I-tap)' : '⬇ New Messages (Tap)'}</span>
          </button>
        )}
      </div>

      {/* Typing Indicator */}
      {Object.entries(activeTransmitters).some(
        ([tag, t]) => tag !== loggedInMember.tagname && t.activity === 'typing'
      ) && (
        <div className="px-4 py-1.5 bg-black/75 backdrop-blur-md flex items-center gap-2.5 text-xs text-purple-200 z-10 shrink-0 border-t border-purple-500/20 animate-fade-in">
          <div className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30">
            <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"></span>
          </div>
          <span className="text-[11px] font-medium text-purple-200 tracking-wide truncate">
            ⚡ <strong className="text-white">Typing indicator:</strong>{' '}
            <span className="text-pink-300 font-semibold">
              {Object.entries(activeTransmitters)
                .filter(([tag, t]) => tag !== loggedInMember.tagname && t.activity === 'typing')
                .map(([, t]) => t.displayName || (lang === 'tl' ? 'Miyembro' : 'Member'))
                .join(', ')}
            </span>{' '}
            {lang === 'tl' ? 'nagta-type...' : 'is typing...'}
          </span>
        </div>
      )}

      {/* Quick Emoji Shelf (Toggled by Smile Icon) */}
      {showEmojiPicker && (
        <div className="bg-[#18191e] border-t border-zinc-800 p-2 flex items-center gap-2 overflow-x-auto shrink-0 z-30 animate-fade-in">
          {['👍', '❤️', '🔥', '👑', '⚔️', '💜', '💯', '😂', '👏', '🛡️', '🙌', '✨', '⚡', '💪'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiClick(emoji)}
              className="text-xl p-1 hover:scale-125 transition-transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Quick Grid Menu Popover (Toggled by Grid Icon) */}
      {showGridMenu && (
        <div className="absolute bottom-16 left-3 bg-slate-900/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-2 shadow-2xl z-40 w-60 space-y-1 animate-fade-in text-xs">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setShowGridMenu(false);
              handleQuickAttendance();
            }}
            className="w-full text-left p-2 rounded-xl hover:bg-white/10 flex items-center gap-2 text-emerald-300 font-bold cursor-pointer"
          >
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'tl' ? 'I-tala ang Attendance (4AM-6PM)' : 'Log Attendance (4AM-6PM)'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setShowGridMenu(false);
              setIsPinModalOpen(true);
            }}
            className="w-full text-left p-2 rounded-xl hover:bg-white/10 flex items-center gap-2 text-pink-300 font-bold cursor-pointer"
          >
            <Radio className="w-4 h-4 text-pink-400" />
            <span>{lang === 'tl' ? 'I-pin ang TikTok Live' : 'Pin TikTok Live'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setShowGridMenu(false);
              videoInputRef.current?.click();
            }}
            className="w-full text-left p-2 rounded-xl hover:bg-white/10 flex items-center gap-2 text-purple-300 font-bold cursor-pointer"
          >
            <VideoIcon className="w-4 h-4 text-purple-400" />
            <span>{lang === 'tl' ? 'Mag-share ng Video clip' : 'Share Video Clip'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playSuccess();
              setShowGridMenu(false);
              const result = clearAppCacheAndOptimize();
              alert(
                lang === 'tl'
                  ? `🧹 CACHE CLEARED!\n\nNalinis ang cache (${result.freedMB} MB). Walang lag at smooth ang chat!`
                  : `🧹 CACHE CLEARED!\n\nPurged (${result.freedMB} MB) cache. Smooth chat!`
              );
            }}
            className="w-full text-left p-2 rounded-xl hover:bg-white/10 flex items-center gap-2 text-amber-300 font-bold cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>{lang === 'tl' ? 'Linisin ang Cache (Fix Lag)' : 'Clear Cache (Fix Lag)'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowGridMenu(false);
              if (isRecording) {
                handleStopVoiceRecording();
              } else {
                handleStartVoiceRecording();
              }
            }}
            className="w-full text-left p-2 rounded-xl hover:bg-white/10 flex items-center gap-2 text-rose-300 font-bold cursor-pointer"
          >
            <Mic className="w-4 h-4 text-rose-400" />
            <span>
              {isRecording
                ? lang === 'tl'
                  ? 'I-send ang Voice Recording'
                  : 'Send Voice Recording'
                : lang === 'tl'
                ? 'Mag-record ng Boses (Voice Memo)'
                : 'Record Voice Message'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setShowGridMenu(false);
              setIsInfoModalOpen(true);
            }}
            className="w-full text-left p-2 rounded-xl hover:bg-white/10 flex items-center gap-2 text-purple-300 font-bold cursor-pointer"
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span>
              {lang === 'tl'
                ? `Aktibong Miyembro (${onlineUsers.length || 1})`
                : `Active Members (${onlineUsers.length || 1})`}
            </span>
          </button>
        </div>
      )}

      {/* Voice Recording Drawer (When microphone is recording) */}
      {isRecording && (
        <div className="p-3 bg-[#18191e] border-t border-zinc-800 flex items-center justify-between gap-3 animate-fade-in relative z-20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-xs font-bold text-red-400">
              {lang === 'tl' ? 'Nirerecord ang boses...' : 'Recording audio...'}
            </span>
            <span className="text-xs font-mono text-white bg-black/50 px-2 py-0.5 rounded">
              {recordingSeconds}s
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelVoiceRecording}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-zinc-300 rounded-lg text-xs font-medium cursor-pointer"
            >
              {lang === 'tl' ? 'Kanselahin' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleStopVoiceRecording}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Square className="w-3 h-3" />
              <span>{lang === 'tl' ? 'I-send' : 'Send'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleVideoUpload}
        accept="video/*"
        className="hidden"
      />

      {/* Bottom Input Console Bar (Liquid Glass UI matching Z.V.R Logo) */}
      <div className="bg-black/60 backdrop-blur-xl p-2.5 sm:p-3 border-t border-purple-500/20 shrink-0 relative z-20 space-y-2">
        {/* Messenger-style Reply Preview Banner */}
        {replyingTo && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-purple-950/70 border border-purple-400/30 text-xs animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <CornerUpLeft className="w-4 h-4 text-purple-300 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-purple-200 text-[11px] truncate">
                  {lang === 'tl'
                    ? `Sumasagot kay ${replyingTo.senderName}`
                    : `Replying to ${replyingTo.senderName}`}
                </p>
                <p className="text-[11px] text-zinc-300/80 truncate">
                  {replyingTo.text ||
                    (replyingTo.mediaType === 'image'
                      ? '📷 Photo'
                      : replyingTo.mediaType === 'video'
                      ? '🎥 Video'
                      : replyingTo.mediaType === 'audio'
                      ? '🎤 Voice memo'
                      : 'Message')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setReplyingTo(null);
              }}
              className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
              title={lang === 'tl' ? 'Kanselahin ang reply' : 'Cancel reply'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
          {/* Action Icons on Left (Collapsible / Expanding Input Bar with always-accessible Mic) */}
          {isInputExpanded ? (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setIsInputExpanded(false);
                }}
                className="p-1.5 text-purple-300 hover:text-pink-300 transition-colors cursor-pointer shrink-0 rounded-full bg-white/10 hover:bg-white/20 active:scale-90"
                title={lang === 'tl' ? 'Ipakita ang media buttons' : 'Show media buttons'}
              >
                <ChevronRight className="w-5 h-5 rotate-180 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={isRecording ? handleStopVoiceRecording : handleStartVoiceRecording}
                className={`p-1.5 transition-colors cursor-pointer shrink-0 rounded-full ${
                  isRecording
                    ? 'text-red-500 bg-red-500/20 animate-pulse'
                    : 'text-purple-300 hover:text-pink-300 hover:bg-white/10'
                }`}
                title={lang === 'tl' ? 'Voice Recording' : 'Voice Recording'}
              >
                <Mic className="w-5 h-5 stroke-[2.2]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 transition-all duration-300">
              {/* 1. Grid Icon */}
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setShowGridMenu(!showGridMenu);
                }}
                className="p-1.5 text-purple-300 hover:text-pink-300 transition-colors cursor-pointer"
                title="Menu / Shortcuts"
              >
                <LayoutGrid className="w-5 h-5 fill-purple-400/20 stroke-[2.2]" />
              </button>

              {/* 2. Camera Icon */}
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  cameraInputRef.current?.click();
                }}
                className="p-1.5 text-purple-300 hover:text-pink-300 transition-colors cursor-pointer"
                title="Camera"
              >
                <Camera className="w-5 h-5 fill-purple-400/20 stroke-[2.2]" />
              </button>

              {/* 3. Photo / Gallery Icon */}
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  imageInputRef.current?.click();
                }}
                className="p-1.5 text-purple-300 hover:text-pink-300 transition-colors cursor-pointer"
                title="Photos / Gallery"
              >
                <ImageIcon className="w-5 h-5 stroke-[2.2]" />
              </button>

              {/* 4. Mic Icon */}
              <button
                type="button"
                onClick={isRecording ? handleStopVoiceRecording : handleStartVoiceRecording}
                className={`p-1.5 transition-colors cursor-pointer ${
                  isRecording ? 'text-red-500 animate-pulse' : 'text-purple-300 hover:text-pink-300'
                }`}
                title="Voice Memo"
              >
                <Mic className="w-5 h-5 stroke-[2.2]" />
              </button>
            </div>
          )}

          {/* Dynamic Expanding Pill Input with Multiline ↩️ Newline Permission */}
          <div className="flex-1 bg-white/[0.08] backdrop-blur-md rounded-2xl px-3.5 py-1.5 flex items-center border border-white/15 focus-within:border-purple-400/60 focus-within:bg-white/[0.12] transition-all duration-300 min-h-[42px]">
            <textarea
              ref={textareaInputRef}
              rows={1}
              value={inputText}
              onFocus={() => setIsInputExpanded(true)}
              onChange={(e) => {
                handleInputChange(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                // If Ctrl+Enter or Cmd+Enter is pressed, trigger send
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="message"
              className="w-full bg-transparent text-white placeholder:text-purple-200/40 text-sm outline-none px-1 resize-none max-h-28 overflow-y-auto leading-relaxed py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            />
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShowEmojiPicker(!showEmojiPicker);
              }}
              className="text-purple-300 hover:text-pink-300 p-0.5 ml-1 transition-colors shrink-0 cursor-pointer self-end mb-1"
              title="Emojis"
            >
              <Smile className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* Right Action: Thumbs Up if empty, or Send if has text */}
          <div className="shrink-0">
            {inputText.trim() ? (
              <button
                type="submit"
                className="p-1.5 text-fuchsia-400 hover:text-pink-300 transition-transform active:scale-90 cursor-pointer"
                title="Send"
              >
                <Send className="w-6 h-6 fill-fuchsia-500 stroke-[1]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendThumbsUp}
                className="p-1.5 text-fuchsia-400 hover:text-pink-300 transition-transform active:scale-90 cursor-pointer"
                title="Send Thumbs Up"
              >
                <ThumbsUp className="w-6 h-6 fill-fuchsia-500 stroke-[1]" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Clan Room Info & Management Drawer Modal (Triggered by (i) icon) */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-left">
          <div
            className="w-full max-w-sm bg-slate-900/95 backdrop-blur-2xl border border-purple-500/30 rounded-3xl p-5 relative overflow-hidden shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsInfoModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-purple-300 hover:text-white rounded-full bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with Crest */}
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-700 to-pink-600 overflow-hidden border-2 border-purple-300/40 mx-auto mb-2 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                <img src={CLAN_LOGO_URL} alt="Z.V.R Logo" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-base font-bold text-white">Z.V.R Room & GC</h3>
              <p className="text-xs text-purple-200/70 font-mono">{CLAN_MOTTO}</p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => {
                  sounds.playClick();
                  setIsInfoModalOpen(false);
                  handleQuickAttendance();
                }}
                className="p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex flex-col items-center gap-1 cursor-pointer hover:bg-emerald-600/30"
              >
                <Clock className="w-5 h-5 text-emerald-400" />
                <span>Attendance (4AM-6PM)</span>
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  setIsInfoModalOpen(false);
                  setIsVideoModalOpen(true);
                }}
                className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 text-xs font-bold flex flex-col items-center gap-1 cursor-pointer hover:bg-purple-600/30"
              >
                <VideoIcon className="w-5 h-5 text-purple-400" />
                <span>Video Call</span>
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  setIsInfoModalOpen(false);
                  setIsPinModalOpen(true);
                }}
                className="p-2.5 rounded-xl bg-pink-600/20 border border-pink-500/40 text-pink-300 text-xs font-bold flex flex-col items-center gap-1 cursor-pointer hover:bg-pink-600/30"
              >
                <Radio className="w-5 h-5 text-pink-400" />
                <span>{lang === 'tl' ? 'I-pin ang Live' : 'Pin Live'}</span>
              </button>
              <button
                onClick={() => {
                  sounds.playSuccess();
                  const result = clearAppCacheAndOptimize();
                  alert(
                    lang === 'tl'
                      ? `🧹 CACHE CLEARED!\n\nNalinis ang cache (${result.freedMB} MB). Walang lag at smooth ang chat!`
                      : `🧹 CACHE CLEARED!\n\nPurged (${result.freedMB} MB) cache. Smooth chat!`
                  );
                }}
                className="p-2.5 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex flex-col items-center gap-1 cursor-pointer hover:bg-amber-600/30"
              >
                <Zap className="w-5 h-5 text-amber-400" />
                <span>{lang === 'tl' ? 'Linisin ang Cache' : 'Clear Cache'}</span>
              </button>
            </div>

            {/* Officials-Only Report Room Button */}
            {isOfficialMember(loggedInMember) && onOpenReport && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setIsInfoModalOpen(false);
                  onOpenReport();
                }}
                className="w-full mb-2 p-2.5 rounded-xl bg-pink-600/20 border border-pink-500/40 text-pink-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-pink-600/30 transition-all"
              >
                <Flag className="w-4 h-4 text-pink-400" />
                <span>Report Room (Officials Only)</span>
              </button>
            )}

            {/* Clear All Messages in Room Button */}
            <button
              onClick={() => {
                setIsInfoModalOpen(false);
                handleClearAllMessages();
              }}
              className="w-full mb-2 p-2 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-rose-600/30 transition-all"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>
                {lang === 'tl'
                  ? 'Linisin ang Lahat ng Mensahe (Clear Room)'
                  : 'Clear All Messages (Clear Room)'}
              </span>
            </button>

            {/* Logout Button */}
            <button
              onClick={() => {
                sounds.playClick();
                setIsInfoModalOpen(false);
                if (onLogout) onLogout();
                else onGoToLogin();
              }}
              className="w-full mb-3 p-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-red-600/30"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>{lang === 'tl' ? 'Mag-Log Out sa Room GC' : 'Log Out of Room GC'}</span>
            </button>

            {/* Active Members Roster */}
            <div className="border-t border-purple-500/20 pt-3">
              <div className="flex items-center justify-between text-xs text-purple-200/70 mb-2">
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  {lang === 'tl'
                    ? `Aktibong Miyembro (${onlineUsers.length || 1})`
                    : `Active Members (${onlineUsers.length || 1})`}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {lang === 'tl' ? '🟢 Kasalukuyang Online' : '🟢 Currently Online'}
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {(onlineUsers.length > 0 ? onlineUsers : [
                  {
                    socketId: 'local',
                    memberId: loggedInMember.id,
                    tagname: loggedInMember.tagname,
                    displayName: loggedInMember.displayName,
                    roleTitle: loggedInMember.roleTitle,
                    category: loggedInMember.category,
                    onlineSince: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    joinedTimestamp: Date.now(),
                    lastActive: Date.now(),
                    currentTab: 'room',
                    status: 'active' as const
                  }
                ]).map((u) => (
                  <div
                    key={u.socketId || u.tagname}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-700 to-pink-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {u.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-white truncate">{u.displayName.toUpperCase()}</span>
                    </div>
                    <span className="text-[10px] font-mono text-purple-300/80 shrink-0">{u.roleTitle}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsInfoModalOpen(false)}
              className="w-full mt-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              {lang === 'tl' ? 'Isara' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Video Call Conference Modal */}
      <ClanVideoCallModal
        isOpen={isVideoModalOpen}
        onClose={() => {
          setIsVideoModalOpen(false);
          if (activeCallIdRef.current) {
            const endedId = activeCallIdRef.current;
            activeCallIdRef.current = null;
            realtimeClient.endCallRing(endedId, loggedInMember?.tagname);
            try {
              const ch = new BroadcastChannel('zvr_call_ring_channel');
              ch.postMessage({
                type: 'CALL_RING_ENDED',
                callId: endedId,
                callerTagname: loggedInMember?.tagname,
              });
              ch.close();
            } catch {}
          }
        }}
        currentMember={loggedInMember}
        lang={lang}
      />

      {/* Modal: Pin TikTok Live Link */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-md liquid-glass-panel rounded-3xl p-6 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-pink-400 animate-pulse" />
                <span>{lang === 'tl' ? 'I-pin ang Iyong TikTok Live' : 'Pin Your TikTok Live'}</span>
              </h3>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="p-1.5 text-purple-300 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTikTokPin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-purple-200/90 mb-1">
                  {lang === 'tl' ? 'Pamagat / Anunsyo ng Live' : 'Live Title / Topic'}
                </label>
                <input
                  type="text"
                  required
                  value={pinTitle}
                  onChange={(e) => setPinTitle(e.target.value)}
                  placeholder={
                    lang === 'tl'
                      ? "Hal. 'Z.V.R 5-man Ranked Scrims! Tambay na!'"
                      : "e.g. 'Z.V.R 5-man Ranked Scrims! Come hang out!'"
                  }
                  className="liquid-glass-input w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-200/90 mb-1">
                  {lang === 'tl' ? 'TikTok Live Link o Username' : 'TikTok Live Link or Handle'}
                </label>
                <input
                  type="text"
                  required
                  value={pinUrl}
                  onChange={(e) => setPinUrl(e.target.value)}
                  placeholder="e.g. https://www.tiktok.com/@username/live"
                  className="liquid-glass-input w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="liquid-glass-btn-primary flex-1 py-2.5 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md cursor-pointer"
                >
                  {lang === 'tl' ? 'I-broadcast sa Room GC' : 'Broadcast to Room GC'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-purple-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  {lang === 'tl' ? 'Kanselahin' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox for clicked image */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-2 text-white bg-white/10 hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged photo"
              className="max-h-[80vh] w-auto object-contain rounded-2xl border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <a
              href={lightboxImage}
              download="zvr_room_photo.png"
              className="mt-3 px-4 py-2 bg-white/15 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'tl' ? 'I-download ang Larawan' : 'Download Photo'}</span>
            </a>
          </div>
        </div>
      )}

      {/* Active Participants Detailed Roster Modal */}
      {showParticipantsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in text-left">
          <div className="w-full max-w-lg liquid-glass-panel rounded-3xl p-6 relative overflow-hidden border border-emerald-400/40 shadow-2xl">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-12 bg-emerald-500/20 rounded-full blur-xl pointer-events-none"></div>

            <button
              onClick={() => {
                sounds.playClick();
                setShowParticipantsModal(false);
              }}
              className="absolute top-4 right-4 p-2 text-purple-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-950/80 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-lg">
                <Users className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-heading">
                  {lang === 'tl' ? 'Mga Aktibong Miyembro sa Room GC' : 'Active Members in Room GC'}
                </h3>
                <p className="text-[11px] text-emerald-300 font-mono">
                  {lang === 'tl'
                    ? `${onlineUsers.length || 1} miyembro ang kasalukuyang online ngayon`
                    : `${onlineUsers.length || 1} member(s) currently online`}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {(onlineUsers.length > 0 ? onlineUsers : [
                {
                  socketId: 'local',
                  memberId: loggedInMember.id,
                  tagname: loggedInMember.tagname,
                  displayName: loggedInMember.displayName,
                  roleTitle: loggedInMember.roleTitle,
                  category: loggedInMember.category,
                  onlineSince: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  joinedTimestamp: Date.now(),
                  lastActive: Date.now(),
                  currentTab: 'room',
                  status: 'active' as const
                }
              ]).map((u) => {
                const isMe = u.tagname === loggedInMember.tagname;
                const idleStatus = getMemberIdleStatus(u.lastActive, u.status);
                const durationText = formatMemberDuration(u.joinedTimestamp, u.onlineSince);
                const transmitter = activeTransmitters[u.tagname];
                const isTransmitting = !idleStatus.isIdle && transmitter && transmitter.expiresAt > currentTime ? transmitter : null;

                return (
                  <div
                    key={u.socketId || u.tagname}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isTransmitting
                        ? 'bg-emerald-950/60 border-emerald-400/50 ring-1 ring-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                        : isMe
                        ? 'bg-purple-950/50 border-purple-400/50 ring-1 ring-purple-400/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        {/* Status Icon with subtle ping and glow on avatar */}
                        <div className="absolute -bottom-0.5 -right-0.5">
                          {idleStatus.isIdle ? (
                            <span className="flex h-3 w-3 rounded-full bg-amber-400 border-2 border-slate-900 shadow-[0_0_6px_rgba(251,191,36,0.9)]"></span>
                          ) : isTransmitting ? (
                            /* Subtle ping animation & glow effect around the green online status indicator */
                            <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                              <span className="animate-subtle-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90"></span>
                              <span className="animate-subtle-ping-echo absolute inline-flex h-5 w-5 rounded-full bg-emerald-400/40 opacity-60"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300 border-2 border-slate-950 animate-transmitter-glow"></span>
                            </span>
                          ) : (
                            <span className="relative flex h-3 w-3">
                              <span className="inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs sm:text-sm truncate">
                            {u.displayName.toUpperCase()}
                          </span>
                          {isMe && (
                            <span className="text-[9px] font-mono text-purple-200 bg-purple-500/30 px-1.5 py-0.2 rounded font-bold border border-purple-400/30">
                              {lang === 'tl' ? 'IKAW' : 'YOU'}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-400/30">
                            {u.roleTitle}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-purple-200/70 truncate mt-0.5">
                          {formatTagnameUppercase(u.tagname)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1 text-right">
                      {/* Active vs Idle Status with Idle Timer & Transmitting badge */}
                      {idleStatus.isIdle ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                          <Timer className="w-3 h-3 text-amber-400" />
                          <span>{idleStatus.text}</span>
                        </span>
                      ) : isTransmitting ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono text-emerald-300 bg-emerald-500/25 px-2.5 py-0.5 rounded-full border border-emerald-400/40 shadow-[0_0_10px_rgba(52,211,153,0.3)] animate-pulse">
                          {isTransmitting.activity === 'sending' ? (
                            <>
                              <Radio className="w-3 h-3 text-cyan-300 animate-spin" />
                              <span>{lang === 'tl' ? 'Nagpapadala ng Data...' : 'Sending Data...'}</span>
                            </>
                          ) : (
                            <>
                              <span className="flex gap-0.5 items-center">
                                <span className="w-1 h-1 rounded-full bg-emerald-300 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1 h-1 rounded-full bg-emerald-300 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1 h-1 rounded-full bg-emerald-300 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                              </span>
                              <span>{lang === 'tl' ? 'Nagta-type...' : 'Typing...'}</span>
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>{lang === 'tl' ? 'Aktibo' : 'Active'}</span>
                        </span>
                      )}

                      {/* Online Duration Timer */}
                      <span className="text-[10px] font-mono text-purple-200/80 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
                        <Clock className="w-3 h-3 text-purple-300" />
                        <span>{durationText}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setShowParticipantsModal(false);
                }}
                className="liquid-glass-btn-primary w-full py-2.5 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                {lang === 'tl' ? 'ISARA ANG LISTAHAN' : 'CLOSE LIST'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Root-Level Long-Press Action Modal ("Unsend for everyone" & "Reply") */}
      {(() => {
        const longPressTargetMsg = longPressActiveMsgId
          ? messages.find((m) => m.id === longPressActiveMsgId && !m.isUnsent) || null
          : null;
        if (!longPressTargetMsg) return null;

        const isTargetMine =
          (longPressTargetMsg.senderTagname || '').trim().toLowerCase() ===
          (loggedInMember.tagname || '').trim().toLowerCase();
        const canUnsendTarget = isTargetMine || loggedInMember.category === 'leadership';

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
            onClick={() => setLongPressActiveMsgId(null)}
          >
            <div
              className="w-full max-w-xs bg-slate-900/95 border border-purple-500/40 rounded-3xl p-5 shadow-2xl space-y-3 animate-scale-up text-left text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="min-w-0 pr-2">
                  <h4 className="text-sm font-bold text-white">
                    {lang === 'tl' ? 'Aksyon sa Mensahe' : 'Message Actions'}
                  </h4>
                  <p className="text-[10px] text-purple-200/70 font-mono truncate">
                    {formatTagnameUppercase(longPressTargetMsg.senderTagname || longPressTargetMsg.senderName)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLongPressActiveMsgId(null)}
                  className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messenger-style Quick Emoji Reactions Strip */}
              <div className="flex items-center justify-between px-2 py-1.5 rounded-2xl bg-white/5 border border-white/10">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setLongPressActiveMsgId(null);
                      handleToggleReaction(longPressTargetMsg.id, emoji);
                    }}
                    className="text-lg p-1 hover:scale-125 active:scale-90 transition-transform cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Option 1: Unsend for everyone */}
              {canUnsendTarget && (
                <button
                  type="button"
                  onClick={() => {
                    setLongPressActiveMsgId(null);
                    handleUnsendMessage(longPressTargetMsg.id, longPressTargetMsg.senderTagname);
                  }}
                  className="w-full py-3 px-3.5 rounded-2xl bg-gradient-to-r from-pink-600/30 to-purple-600/30 hover:from-pink-600/40 hover:to-purple-600/40 text-pink-200 border border-pink-400/40 font-bold text-xs flex items-center justify-between cursor-pointer transition-transform active:scale-95 shadow-md min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5">
                    <RotateCcw className="w-4 h-4 text-pink-400" />
                    <span>Unsend for everyone</span>
                  </div>
                </button>
              )}

              {/* Option 2: Reply */}
              <button
                type="button"
                onClick={() => handleStartReply(longPressTargetMsg)}
                className="w-full py-3 px-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-purple-100 border border-purple-400/30 font-bold text-xs flex items-center justify-between cursor-pointer transition-transform active:scale-95 shadow-md min-h-[44px]"
              >
                <div className="flex items-center gap-2.5">
                  <CornerUpLeft className="w-4 h-4 text-purple-300" />
                  <span>Reply</span>
                </div>
              </button>

              {/* Copy text shortcut */}
              {longPressTargetMsg.text && (
                <button
                  type="button"
                  onClick={() => {
                    handleCopyMessage(longPressTargetMsg.id, longPressTargetMsg.text);
                    setLongPressActiveMsgId(null);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 font-semibold text-xs flex items-center gap-2.5 cursor-pointer transition-transform active:scale-95"
                >
                  <Copy className="w-4 h-4 text-purple-300" />
                  <span>{lang === 'tl' ? 'Kopyahin ang mensahe' : 'Copy text'}</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
