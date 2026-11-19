/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopNav } from './components/TopNav';
import { LoginCard } from './components/LoginCard';
import { VerifiedScreen } from './components/VerifiedScreen';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { MemberRoster } from './components/MemberRoster';
import { ClanAttendance } from './components/ClanAttendance';
import { ClanRules } from './components/ClanRules';
import { MemberIdCard } from './components/MemberIdCard';
import { ClanRoom, IncomingMessageNotice } from './components/ClanRoom';
import { RemoveTagname } from './components/RemoveTagname';
import { IntroSplash } from './components/IntroSplash';
import { SettingsModal } from './components/SettingsModal';
import { ReportMemberModal } from './components/ReportMemberModal';
import { TabSkeletonScreen, SkeletonTabType } from './components/TabSkeletonScreen';
import { WeeklyAttendanceTotal } from './components/WeeklyAttendanceTotal';
import { INITIAL_MEMBERS, ClanMember, CLAN_FB_PROFILE_LINK, RegisteredAccount, accountToClanMember, formatTagnameUppercase, CLAN_LOGO_URL } from './data/clanData';
import { Shield, Sparkles, MessageCircle, Heart, UserCheck, Bell, X, PhoneCall, PhoneOff, Video } from 'lucide-react';
import { sounds } from './utils/soundEffects';
import { runDailyAutoCleanup } from './utils/cacheManager';
import { realtimeClient, OnlineMemberRecord, IncomingCallEvent } from './utils/realtimeClient';
import { loadPortalSettings, savePortalSettings, PortalSettings } from './utils/portalSettings';

const SKELETON_TABS = new Set<SkeletonTabType>([
  'login',
  'room',
  'generator',
  'roster',
  'rules',
  'remove_tagname',
  'weekly_attendance',
]);

export default function App() {
  const [loggedInMember, setLoggedInMember] = useState<ClanMember | null>(() => {
    try {
      const savedLogin = localStorage.getItem('zvr_active_login');
      if (savedLogin) {
        const parsed = JSON.parse(savedLogin);
        if (parsed && parsed.tagname) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [currentTab, setCurrentTab] = useState<
    'login' | 'room' | 'roster' | 'generator' | 'rules' | 'card' | 'remove_tagname' | 'weekly_attendance'
  >(() => {
    try {
      const savedLogin = localStorage.getItem('zvr_active_login');
      if (savedLogin) {
        const parsed = JSON.parse(savedLogin);
        if (parsed && parsed.tagname) {
          return 'room';
        }
      }
    } catch {}
    return 'login';
  });

  const [onlineUsers, setOnlineUsers] = useState<OnlineMemberRecord[]>([]);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [roomUnreadCount, setRoomUnreadCount] = useState<number>(0);
  const [roomNotificationToast, setRoomNotificationToast] = useState<IncomingMessageNotice | null>(null);
  const [incomingCallAlert, setIncomingCallAlert] = useState<IncomingCallEvent | null>(null);
  const incomingCallTimerRef = useRef<any>(null);
  const roomToastTimerRef = useRef<any>(null);
  const tabSkeletonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTabSkeletonVisible, setIsTabSkeletonVisible] = useState<boolean>(() =>
    currentTab === 'room'
  );
  const currentTabRef = useRef(currentTab);
  useEffect(() => {
    currentTabRef.current = currentTab;
    if (currentTab === 'room') {
      setRoomUnreadCount(0);
      setRoomNotificationToast(null);
    }
  }, [currentTab]);

  const startTabSkeleton = useCallback((tab: typeof currentTab) => {
    if (tabSkeletonTimerRef.current) {
      clearTimeout(tabSkeletonTimerRef.current);
      tabSkeletonTimerRef.current = null;
    }
    if (SKELETON_TABS.has(tab as SkeletonTabType)) {
      setIsTabSkeletonVisible(true);
      tabSkeletonTimerRef.current = setTimeout(() => {
        setIsTabSkeletonVisible(false);
        tabSkeletonTimerRef.current = null;
        if (tab === 'room') {
          setScrollToRoomLatestTick((t) => t + 1);
        }
      }, 1000);
    } else {
      setIsTabSkeletonVisible(false);
    }
  }, []);

  useEffect(() => {
    if (currentTab === 'room') {
      startTabSkeleton('room');
    }
    return () => {
      if (tabSkeletonTimerRef.current) {
        clearTimeout(tabSkeletonTimerRef.current);
        tabSkeletonTimerRef.current = null;
      }
    };
  }, []);

  const loggedInMemberRef = useRef<ClanMember | null>(loggedInMember);
  useEffect(() => {
    loggedInMemberRef.current = loggedInMember;
  }, [loggedInMember]);

  const [members, setMembers] = useState<ClanMember[]>(() => {
    try {
      const savedAccounts = localStorage.getItem('zvr_registered_accounts');
      if (savedAccounts) {
        const parsed: RegisteredAccount[] = JSON.parse(savedAccounts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(accountToClanMember);
        }
      }
    } catch {}
    return [];
  });

  const handleLogout = useCallback(() => {
    sounds.stopCallRingtone();
    realtimeClient.logout();
    try {
      localStorage.removeItem('zvr_active_login');
    } catch {}
    setLoggedInMember(null);
    setLoginNotice(null);
    setRoomUnreadCount(0);
    setRoomNotificationToast(null);
    setIncomingCallAlert(null);
    setCurrentTab('login');
  }, []);

  // Automatically run daily background cache cleanup & initialize WebSocket presence & accounts once on mount
  useEffect(() => {
    runDailyAutoCleanup();

    // Broadcast presence if already logged in on initial load & remember this device's 1 personal tagname
    if (loggedInMemberRef.current) {
      try {
        localStorage.setItem('zvr_my_device_tagname', formatTagnameUppercase(loggedInMemberRef.current.tagname));
      } catch {}
      realtimeClient.login(loggedInMemberRef.current, 'room');
    }

    // Listen to real-time online presence from server
    const unsubPresence = realtimeClient.onPresence((users) => {
      setOnlineUsers(users);
    });

    // Listen to initial state sync (accounts even when offline/unauthenticated)
    const unsubInit = realtimeClient.onInit((state) => {
      if (Array.isArray(state.registeredAccounts)) {
        const mapped = state.registeredAccounts.map(accountToClanMember);
        setMembers(mapped);
        try {
          localStorage.setItem('zvr_registered_accounts', JSON.stringify(state.registeredAccounts));
          localStorage.setItem('zvr_clan_members', JSON.stringify(mapped));
        } catch {}
      }
    });

    // Listen to real-time registered account updates
    const unsubAccounts = realtimeClient.onAccountsUpdate((accs, removedTagname) => {
      const mapped = accs.map(accountToClanMember);
      setMembers(mapped);
      try {
        localStorage.setItem('zvr_registered_accounts', JSON.stringify(accs));
        localStorage.setItem('zvr_clan_members', JSON.stringify(mapped));
      } catch {}

      // Clear device personal tagname if it was explicitly removed
      if (removedTagname) {
        try {
          const savedDeviceTag = localStorage.getItem('zvr_my_device_tagname');
          if (savedDeviceTag && savedDeviceTag.trim().toLowerCase() === removedTagname.trim().toLowerCase()) {
            localStorage.removeItem('zvr_my_device_tagname');
          }
        } catch {}
      }

      // Only kick out the logged-in member if their tagname was EXPLICITLY removed
      const current = loggedInMemberRef.current;
      if (
        current &&
        removedTagname &&
        removedTagname.toLowerCase() === current.tagname.toLowerCase()
      ) {
        handleLogout();
        setLoginNotice(
          langRef.current === 'tl'
            ? '⚠️ Ang iyong Z.V.R Tagname ay na-remove o na-suspend sa portal.'
            : '⚠️ Your Z.V.R Tagname has been removed or suspended from the portal.'
        );
      }
    });

    // Listen to real-time suspensions
    const unsubSuspensions = realtimeClient.onSuspensionsUpdate((suspensions) => {
      try {
        const savedDeviceTag = localStorage.getItem('zvr_my_device_tagname');
        if (savedDeviceTag) {
          const isDeviceTagSuspended = suspensions.some(
            (s) =>
              (s.targetTagname || '').toLowerCase() === savedDeviceTag.toLowerCase() ||
              (s.tagname || '').toLowerCase() === savedDeviceTag.toLowerCase()
          );
          if (isDeviceTagSuspended) {
            localStorage.removeItem('zvr_my_device_tagname');
          }
        }
      } catch {}

      const current = loggedInMemberRef.current;
      if (current) {
        const isSuspended = suspensions.some(
          (s) =>
            (s.targetTagname || '').toLowerCase() === current.tagname.toLowerCase() ||
            (s.tagname || '').toLowerCase() === current.tagname.toLowerCase()
        );
        if (isSuspended) {
          handleLogout();
          setLoginNotice(
            langRef.current === 'tl'
              ? '🚫 Ang iyong account ay nasuspinde o na-ban sa Z.V.R portal.'
              : '🚫 Your account has been suspended or banned from the Z.V.R portal.'
          );
        }
      }
    });

    return () => {
      unsubPresence();
      unsubInit();
      unsubAccounts();
      unsubSuspensions();
    };
  }, [handleLogout]);

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isLoginSubModalOpen, setIsLoginSubModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [portalSettings, setPortalSettings] = useState<PortalSettings>(() => loadPortalSettings());
  const portalSettingsRef = useRef<PortalSettings>(portalSettings);
  useEffect(() => {
    portalSettingsRef.current = portalSettings;
    savePortalSettings(portalSettings);
  }, [portalSettings]);
  const [scrollToRoomLatestTick, setScrollToRoomLatestTick] = useState<number>(0);
  const [openCallSignal, setOpenCallSignal] = useState<number>(0);

  // Listen for real-time Room GC Incoming Call Rings & Call Endings while logged in
  useEffect(() => {
    const handleIncomingCall = (call: IncomingCallEvent) => {
      const activeMember = loggedInMemberRef.current;
      if (!activeMember) return;
      if (
        call.caller?.tagname?.trim().toLowerCase() ===
        activeMember.tagname?.trim().toLowerCase()
      ) {
        return;
      }
      if (!portalSettingsRef.current.callNotificationEnabled) return;

      setIncomingCallAlert(call);
      sounds.startCallRingtone(25000);

      if (
        portalSettingsRef.current.browserAlertsEnabled &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.hidden
      ) {
        try {
          const notif = new Notification(`Z.V.R Room GC · Incoming ${call.callType === 'voice' ? 'Voice' : 'Video'} Call`, {
            body: `${call.caller.displayName} (${call.caller.roleTitle})`,
            icon: CLAN_LOGO_URL,
          });
          notif.onclick = () => {
            window.focus();
            sounds.stopCallRingtone();
            setIncomingCallAlert(null);
            startTabSkeleton('room');
            setCurrentTab('room');
            setOpenCallSignal((s) => s + 1);
            notif.close();
          };
        } catch {}
      }

      if (incomingCallTimerRef.current) clearTimeout(incomingCallTimerRef.current);
      incomingCallTimerRef.current = setTimeout(() => {
        setIncomingCallAlert(null);
        sounds.stopCallRingtone();
      }, 25000);
    };

    const handleCallEnded = (data: { callId?: string; callerTagname?: string }) => {
      setIncomingCallAlert((prev) => {
        if (!prev) return null;
        if (data.callId && prev.callId !== data.callId) return prev;
        sounds.stopCallRingtone();
        return null;
      });
    };

    const unsubCall = realtimeClient.onIncomingCall(handleIncomingCall);
    const unsubEnd = realtimeClient.onCallEnded(handleCallEnded);

    let callCh: BroadcastChannel | null = null;
    try {
      callCh = new BroadcastChannel('zvr_call_ring_channel');
      callCh.onmessage = (e) => {
        if (e.data?.type === 'INCOMING_CALL_RING') {
          handleIncomingCall(e.data);
        } else if (e.data?.type === 'CALL_RING_ENDED') {
          handleCallEnded(e.data);
        }
      };
    } catch {}

    return () => {
      unsubCall();
      unsubEnd();
      if (callCh) callCh.close();
      if (incomingCallTimerRef.current) clearTimeout(incomingCallTimerRef.current);
    };
  }, []);

  const [showIntro, setShowIntro] = useState<boolean>(() => !loggedInMember);
  const [lang, setLang] = useState<'tl' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('zvr_portal_lang');
      if (saved === 'tl' || saved === 'en') return saved;
    } catch {}
    return 'en';
  });
  const langRef = useRef<'tl' | 'en'>(lang);
  useEffect(() => {
    langRef.current = lang;
    try {
      localStorage.setItem('zvr_portal_lang', lang);
      document.documentElement.lang = lang;
    } catch {}
  }, [lang]);
  const [isMuted, setIsMuted] = useState(false);

  // Persist members if added
  const handleAddMember = (newMember: ClanMember) => {
    const updated = [newMember, ...members];
    setMembers(updated);
    try {
      localStorage.setItem('zvr_clan_members', JSON.stringify(updated));
    } catch {
      // fallback
    }
  };

  const handleLoginSuccess = (member: ClanMember) => {
    setLoggedInMember(member);
    setLoginNotice(null);
    try {
      localStorage.setItem('zvr_active_login', JSON.stringify(member));
      localStorage.setItem('zvr_my_device_tagname', formatTagnameUppercase(member.tagname));
    } catch {}
    // Broadcast live presence to all other devices & enter shared room GC
    realtimeClient.login(member, 'room');
    startTabSkeleton('room');
    setCurrentTab('room');
  };

  const handleRequireLogin = () => {
    setLoginNotice(
      lang === 'tl'
        ? '⚠️ KAILANGAN MUNANG MAG-LOG IN SA PORTAL! Piliin ang iyong opisyal na Tagname at password upang ma-unlock ang Room GC, Attendance, Roster, Rules, Remove Tagname, at Weekly Attendance Total.'
        : '⚠️ LOGIN REQUIRED! Please log in with your official Tagname and password first to unlock Room GC, Attendance, Roster, Rules, Remove Tagname, and Weekly Attendance Total.'
    );
  };

  const handleTabChange = (tab: typeof currentTab) => {
    if (!loggedInMember && tab !== 'login') {
      handleRequireLogin();
      setIsTabSkeletonVisible(false);
      setCurrentTab('login');
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    startTabSkeleton(tab);
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (loggedInMember) {
      realtimeClient.setTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-[#05040a] text-slate-100 flex flex-col relative overflow-x-clip selection:bg-purple-500 selection:text-white">
      {/* Z.V.R Video Intro played before the Login screen */}
      {!loggedInMember && showIntro && (
        <IntroSplash lang={lang} onComplete={() => setShowIntro(false)} />
      )}

      {/* Dark Neon Static Ambient Background (Zero Blinking / Non-Distracting) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Subtle static top neon purple ambient glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-purple-600/12 rounded-full blur-[140px]"></div>

        {/* Subtle static bottom-left neon cyan ambient glow */}
        <div className="absolute -bottom-32 -left-20 w-[550px] h-[450px] bg-cyan-600/08 rounded-full blur-[150px]"></div>

        {/* Subtle static bottom-right neon magenta ambient glow */}
        <div className="absolute -bottom-32 -right-20 w-[550px] h-[450px] bg-fuchsia-600/08 rounded-full blur-[150px]"></div>

        {/* Minimal fine dark gradient vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,rgba(147,51,234,0.08),transparent_70%)]"></div>
      </div>

      {/* Top Bar */}
      <TopNav
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        loggedInMember={loggedInMember}
        onLogout={handleLogout}
        lang={lang}
        setLang={setLang}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onRequireLogin={handleRequireLogin}
        onlineCount={onlineUsers.length || 1}
        roomUnreadCount={roomUnreadCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Site-Wide Floating Room GC Message Notification (Visible while logged in & online) */}
      {loggedInMember &&
        portalSettings.autoPopupMessages &&
        roomNotificationToast &&
        currentTab !== 'room' && (
          <div
            onClick={() => {
              sounds.playClick();
              setRoomNotificationToast(null);
              setRoomUnreadCount(0);
              handleTabChange('room');
              setScrollToRoomLatestTick((t) => t + 1);
            }}
            className="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 z-50 dark-neon-glass-panel rounded-2xl p-3.5 border border-pink-400/50 shadow-[0_12px_36px_rgba(168,85,247,0.45)] cursor-pointer hover:border-pink-300 transition-all animate-fade-in"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Bell className="w-4 h-4 animate-bounce" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-pink-300 font-mono">
                      ROOM GC
                    </span>
                    <span className="text-xs font-black text-white truncate">
                      {roomNotificationToast.senderName}
                    </span>
                    <span className="text-[10px] font-mono text-purple-300">
                      ({roomNotificationToast.senderRole})
                    </span>
                  </div>
                  <p className="text-xs text-purple-100/90 truncate mt-0.5">
                    {portalSettings.showMessagePreview
                      ? roomNotificationToast.preview
                      : lang === 'tl'
                      ? 'Nagpadala ng bagong mensahe sa Room GC'
                      : 'Sent a new message in Room GC'}
                  </p>
                  <span className="text-[10px] text-purple-300/70 font-mono mt-0.5 block">
                    {lang === 'tl' ? 'I-tap upang buksan ang Room GC' : 'Tap to open Room GC'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRoomNotificationToast(null);
                }}
                className="p-1 text-purple-300 hover:text-white rounded-lg cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      {/* Site-Wide Incoming Call Ringtone Banner (Visible while logged in & online) */}
      {loggedInMember && incomingCallAlert && (
        <div className="fixed top-20 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[430px] z-50 dark-neon-glass-panel rounded-3xl p-4 border border-emerald-400/60 shadow-[0_16px_45px_rgba(16,185,129,0.45)] animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shrink-0 animate-bounce">
                {incomingCallAlert.callType === 'voice' ? (
                  <PhoneCall className="w-6 h-6" />
                ) : (
                  <Video className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 font-mono block">
                  {lang === 'tl' ? 'NOTIFICATION CALL · ROOM GC' : 'NOTIFICATION CALL · ROOM GC'}
                </span>
                <p className="text-sm font-black text-white truncate">
                  {incomingCallAlert.caller.displayName}
                </p>
                <span className="text-[11px] text-purple-200/80 block truncate">
                  {incomingCallAlert.callType === 'voice'
                    ? lang === 'tl'
                      ? 'Tumatawag sa Voice Call...'
                      : 'Calling in Voice Call...'
                    : lang === 'tl'
                    ? 'Tumatawag sa Video Call...'
                    : 'Calling in Video Call...'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  sounds.stopCallRingtone();
                  sounds.playClick();
                  setIncomingCallAlert(null);
                  handleTabChange('room');
                  setOpenCallSignal((s) => s + 1);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-lg min-h-[42px]"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{lang === 'tl' ? 'Sumali' : 'Answer'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.stopCallRingtone();
                  sounds.playClick();
                  setIncomingCallAlert(null);
                }}
                aria-label={lang === 'tl' ? 'Tanggihan ang tawag' : 'Decline call'}
                className="p-2.5 rounded-xl bg-red-600/80 hover:bg-red-500 text-white cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`relative z-10 flex-1 flex flex-col justify-center items-center max-w-6xl mx-auto w-full ${
        currentTab === 'room' ? 'px-2 py-2 sm:py-6' : 'px-4 py-8 sm:py-12'
      }`}>
        {/* Persistent Clan Room (Stays connected & active while exploring Portal, Roster, Rules, etc.) */}
        {loggedInMember && (
          <div className={currentTab === 'room' && !isTabSkeletonVisible ? 'w-full flex-1 flex flex-col justify-center items-center' : 'hidden'}>
            <ClanRoom
              loggedInMember={loggedInMember}
              onGoToLogin={() => {
                handleRequireLogin();
                handleTabChange('login');
              }}
              onLogout={handleLogout}
              lang={lang}
              onlineUsers={onlineUsers}
              scrollToLatestSignal={scrollToRoomLatestTick}
              openCallSignal={openCallSignal}
              onOpenReport={() => setIsReportModalOpen(true)}
              onIncomingMessage={(notice) => {
                const activeSettings = portalSettingsRef.current;

                if (
                  activeSettings.browserAlertsEnabled &&
                  typeof window !== 'undefined' &&
                  'Notification' in window &&
                  Notification.permission === 'granted' &&
                  document.hidden
                ) {
                  try {
                    const bodyText = activeSettings.showMessagePreview
                      ? notice.preview
                      : langRef.current === 'tl'
                      ? 'May bagong mensahe sa Room GC'
                      : 'New message in Room GC';
                    const notif = new Notification(`Z.V.R Room GC · ${notice.senderName}`, {
                      body: bodyText,
                      icon: CLAN_LOGO_URL,
                    });
                    notif.onclick = () => {
                      window.focus();
                      setRoomNotificationToast(null);
                      setRoomUnreadCount(0);
                      handleTabChange('room');
                      setScrollToRoomLatestTick((t) => t + 1);
                      notif.close();
                    };
                  } catch {
                    // safe fail
                  }
                }

                if (currentTabRef.current !== 'room') {
                  setRoomUnreadCount((c) => c + 1);
                  if (activeSettings.autoPopupMessages) {
                    setRoomNotificationToast(notice);
                    if (roomToastTimerRef.current) clearTimeout(roomToastTimerRef.current);
                    roomToastTimerRef.current = setTimeout(() => {
                      setRoomNotificationToast(null);
                    }, 5500);
                  }
                }
              }}
            />
          </div>
        )}

        {isTabSkeletonVisible && SKELETON_TABS.has(currentTab as SkeletonTabType) && (
          <TabSkeletonScreen tab={currentTab as SkeletonTabType} />
        )}

        {currentTab === 'login' && !isTabSkeletonVisible && (
          <div className="w-full flex justify-center items-center py-4">
            {loggedInMember ? (
              <VerifiedScreen
                member={loggedInMember}
                onExploreClan={() => handleTabChange('roster')}
                onEnterRoom={() => handleTabChange('room')}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenReport={() => setIsReportModalOpen(true)}
                lang={lang}
              />
            ) : (
              <LoginCard
                members={members}
                onLoginSuccess={handleLoginSuccess}
                onAddMember={handleAddMember}
                onOpenForgotModal={() => setIsForgotModalOpen(true)}
                lang={lang}
                notice={loginNotice}
                onlineUsers={onlineUsers}
                onGoToRemoveTagname={() => handleTabChange('remove_tagname')}
                onSubModalChange={setIsLoginSubModalOpen}
              />
            )}
          </div>
        )}

        {currentTab === 'roster' && !isTabSkeletonVisible && loggedInMember && (
          <MemberRoster
            members={members}
            onAddMember={handleAddMember}
            lang={lang}
            onlineUsers={onlineUsers}
          />
        )}

        {currentTab === 'generator' && !isTabSkeletonVisible && loggedInMember && (
          <ClanAttendance
            members={members}
            loggedInMember={loggedInMember}
            onGoToLogin={() => {
              handleRequireLogin();
              handleTabChange('login');
            }}
            lang={lang}
            onlineUsers={onlineUsers}
          />
        )}

        {currentTab === 'rules' && !isTabSkeletonVisible && loggedInMember && (
          <ClanRules lang={lang} />
        )}

        {currentTab === 'remove_tagname' && !isTabSkeletonVisible && loggedInMember && (
          <RemoveTagname
            loggedInMember={loggedInMember}
            lang={lang}
            onGoToLogin={() => handleTabChange('login')}
            onGoToCreateTagname={() => handleTabChange('login')}
            onOpenReport={() => setIsReportModalOpen(true)}
            onlineUsers={onlineUsers}
          />
        )}

        {currentTab === 'weekly_attendance' && !isTabSkeletonVisible && loggedInMember && (
          <WeeklyAttendanceTotal
            members={members}
            loggedInMember={loggedInMember}
            lang={lang}
          />
        )}

        {currentTab === 'card' && (
          <MemberIdCard
            member={loggedInMember || members[0]}
            lang={lang}
          />
        )}
      </main>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        lang={lang}
      />

      {/* Site Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={portalSettings}
        onUpdateSettings={setPortalSettings}
        isMuted={isMuted}
        onToggleMute={setIsMuted}
        lang={lang}
        onChangeLang={setLang}
        loggedInMember={loggedInMember}
      />

      {/* Officials-Only Report Room Modal */}
      <ReportMemberModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        loggedInMember={loggedInMember}
        lang={lang}
      />

      {/* Footer - Only visible on main Login form (hidden in Create Tagname, Report, Room GC, etc.) */}
      {currentTab === 'login' && !loggedInMember && !isLoginSubModalOpen && !isTabSkeletonVisible && (
        <footer className="relative z-10 border-t border-white/10 liquid-glass-card-subtle py-6 px-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-bold text-purple-300 font-heading">Z.V.R</span>
              <span>·</span>
              <span className="text-purple-400/80 font-medium">Zeal · Victory · Respect</span>
              <span>·</span>
              <span>EST. 9-15-25</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  sounds.playClick();
                  setIsForgotModalOpen(true);
                }}
                className="hover:text-purple-300 transition-colors"
              >
                {lang === 'tl' ? 'Tulong sa Password' : 'Password Help'}
              </button>
              <a
                href={CLAN_FB_PROFILE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-purple-300 transition-colors flex items-center gap-1"
              >
                <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>FB Profile</span>
              </a>
              <button
                onClick={() => {
                  sounds.playClick();
                  if (!loggedInMember) {
                    handleRequireLogin();
                    handleTabChange('login');
                  } else {
                    handleTabChange('room');
                  }
                }}
                className="text-purple-300 hover:text-white transition-colors flex items-center gap-1 font-semibold cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-purple-400" />
                <span>Room GC</span>
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
