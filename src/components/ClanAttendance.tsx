import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  UserCheck,
  Search,
  Filter,
  RotateCcw,
  Crown,
  Sparkles,
  Users,
  Check,
  AlertCircle,
  UserPlus,
  ArrowRight,
  Lock,
  Image as ImageIcon,
  Share2,
  RefreshCw
} from 'lucide-react';
import {
  ClanMember,
  CLAN_LOGO_URL,
  RegisteredAccount,
  accountToClanMember,
  isOfficialRole,
  getAttendanceDateKey,
  formatTagnameUppercase
} from '../data/clanData';
import { sounds } from '../utils/soundEffects';
import { realtimeClient, OnlineMemberRecord } from '../utils/realtimeClient';
import { generateAttendancePicture } from '../utils/attendanceImageGenerator';

interface ClanAttendanceProps {
  members?: ClanMember[];
  loggedInMember: ClanMember | null;
  onGoToLogin: () => void;
  lang: 'tl' | 'en';
  onlineUsers?: OnlineMemberRecord[];
}

export interface AttendanceRecord {
  memberId: string;
  tagname: string;
  displayName: string;
  isPresent: boolean;
  timeCheckedIn?: string;
  dateKey: string; // YYYY-MM-DD (resets at 3:00 AM PH time)
}

// Opisyal na Oras ng Attendance: 4:00 AM hanggang 6:00 PM (Daily reset at 3:00 AM)
export const isAttendanceWindowOpen = (): boolean => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = 4 * 60;   // 04:00 AM (240 mins)
  const closeMinutes = 18 * 60; // 06:00 PM (1080 mins)
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

export const ClanAttendance: React.FC<ClanAttendanceProps> = ({
  members = [],
  loggedInMember,
  onGoToLogin,
  lang,
  onlineUsers = []
}) => {
  // Get today's attendance cycle date key (YYYY-MM-DD, resets daily at 3:00 AM PH time)
  const [todayDateKey, setTodayDateKey] = useState<string>(() => getAttendanceDateKey());
  const formattedTodayDate = new Date().toLocaleDateString(lang === 'tl' ? 'tl-PH' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Schedule status: 4:00 AM - 6:00 PM + automatic 3:00 AM daily reset watcher
  const [isOpenNow, setIsOpenNow] = useState<boolean>(() => isAttendanceWindowOpen());

  useEffect(() => {
    realtimeClient.fetchInitialState();
    const timer = setInterval(() => {
      setIsOpenNow(isAttendanceWindowOpen());
      const currentKey = getAttendanceDateKey();
      setTodayDateKey((prevKey) => {
        if (prevKey !== currentKey) {
          setAttendanceMap({});
          return currentKey;
        }
        return prevKey;
      });
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Registered Accounts (Strict source of truth: persisted even offline)
  const [registeredAccounts, setRegisteredAccounts] = useState<RegisteredAccount[]>(() => {
    try {
      const saved = localStorage.getItem('zvr_registered_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Attendance Records State
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { isPresent: boolean; timeCheckedIn?: string }>>(() => {
    try {
      const saved = localStorage.getItem(`zvr_attendance_${todayDateKey}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {};
  });

  const [filterType, setFilterType] = useState<'all' | 'present' | 'absent'>('all');
  const [activeFormTab, setActiveFormTab] = useState<'both' | 'officials' | 'members'>('both');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentNotice, setRecentNotice] = useState<string | null>(null);
  const [tapWarning, setTapWarning] = useState<string | null>(null);
  const [reportImageUrl, setReportImageUrl] = useState<string | null>(null);
  const [reportActionNote, setReportActionNote] = useState<string | null>(null);
  const lastReportSignatureRef = React.useRef<string>('');
  const reportBlobRef = React.useRef<Blob | null>(null);

  // Sync registered accounts from storage, BroadcastChannel, and WebSocket
  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('zvr_registered_accounts');
        if (saved) setRegisteredAccounts(JSON.parse(saved));
        else setRegisteredAccounts([]);
      } catch {}
    };
    window.addEventListener('storage', handleStorage);

    let accChannel: BroadcastChannel | null = null;
    try {
      accChannel = new BroadcastChannel('zvr_registered_accounts_channel');
      accChannel.onmessage = (event) => {
        if (event.data?.accounts && Array.isArray(event.data.accounts)) {
          setRegisteredAccounts(event.data.accounts);
        }
      };
    } catch {}

    const unsubAccounts = realtimeClient.onAccountsUpdate((accounts) => {
      setRegisteredAccounts(accounts);
    });

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (accChannel) accChannel.close();
      unsubAccounts();
    };
  }, []);

  // Real-time sync for attendance updates across all devices
  useEffect(() => {
    const unsubAttendance = realtimeClient.onAttendance((data) => {
      if (data.dateKey === todayDateKey && data.map) {
        setAttendanceMap(data.map);
        try {
          localStorage.setItem(`zvr_attendance_${todayDateKey}`, JSON.stringify(data.map));
        } catch {}
        if (data.displayName) {
          sounds.playSuccess();
          const actionText = data.isPresent ? '🟢 PRESENT' : '🔴 ABSENT';
          const time = data.map[data.updatedMemberId || '']?.timeCheckedIn || (lang === 'tl' ? 'Ngayon' : 'Just now');
          setRecentNotice(
            lang === 'tl'
              ? `Kakatalang ${actionText} ni ${data.displayName.toUpperCase()} (${time})`
              : `${data.displayName.toUpperCase()} marked ${actionText} (${time})`
          );
          setTimeout(() => setRecentNotice(null), 6000);
        }
      }
    });

    const unsubInit = realtimeClient.onInit((state) => {
      const effectiveKey = state.todayDateKey || todayDateKey;
      if (state.todayDateKey && state.todayDateKey !== todayDateKey) {
        setTodayDateKey(state.todayDateKey);
      }
      if (state.attendanceMap) {
        setAttendanceMap((prev) => {
          const merged =
            effectiveKey === todayDateKey
              ? { ...prev, ...state.attendanceMap }
              : { ...state.attendanceMap };
          if (effectiveKey === todayDateKey) {
            for (const [k, v] of Object.entries(prev)) {
              if (v?.isPresent && !merged[k]?.isPresent) {
                merged[k] = v;
              }
            }
          }
          try {
            localStorage.setItem(`zvr_attendance_${effectiveKey}`, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      if (state.registeredAccounts && Array.isArray(state.registeredAccounts)) {
        setRegisteredAccounts(state.registeredAccounts);
      }
    });

    let attChannel: BroadcastChannel | null = null;
    try {
      attChannel = new BroadcastChannel('zvr_attendance_channel');
      attChannel.onmessage = (event) => {
        if (event.data?.type === 'UPDATE_ATTENDANCE' && event.data.dateKey === todayDateKey && event.data.map) {
          setAttendanceMap(event.data.map);
        }
      };
    } catch {}

    return () => {
      unsubAttendance();
      unsubInit();
      if (attChannel) attChannel.close();
    };
  }, [todayDateKey, lang]);

  // Save Attendance to Storage & Broadcast
  const saveAttendance = (newMap: Record<string, { isPresent: boolean; timeCheckedIn?: string }>) => {
    setAttendanceMap(newMap);
    try {
      localStorage.setItem(`zvr_attendance_${todayDateKey}`, JSON.stringify(newMap));
      const channel = new BroadcastChannel('zvr_attendance_channel');
      channel.postMessage({ type: 'UPDATE_ATTENDANCE', dateKey: todayDateKey, map: newMap });
      channel.close();
    } catch {}
  };

  // Convert registered accounts + fallback members into deduplicated ClanMember models (persisted even offline)
  const allRegisteredMembers: ClanMember[] = React.useMemo(() => {
    const map = new Map<string, ClanMember>();
    registeredAccounts.forEach((acc) => {
      map.set(acc.tagname.toLowerCase(), accountToClanMember(acc));
    });
    members.forEach((m) => {
      const key = m.tagname.toLowerCase();
      if (!map.has(key)) {
        map.set(key, m);
      }
    });
    return Array.from(map.values());
  }, [registeredAccounts, members]);

  // Helper: check if member is present (checks by id, exact tagname, and uppercase tagname)
  const checkIsPresent = (m: ClanMember): boolean => {
    return !!(
      attendanceMap[m.id]?.isPresent ||
      attendanceMap[m.tagname]?.isPresent ||
      attendanceMap[formatTagnameUppercase(m.tagname)]?.isPresent
    );
  };

  const getCheckInTime = (m: ClanMember): string | undefined => {
    return (
      attendanceMap[m.id]?.timeCheckedIn ||
      attendanceMap[m.tagname]?.timeCheckedIn ||
      attendanceMap[formatTagnameUppercase(m.tagname)]?.timeCheckedIn
    );
  };

  const isMemberOnline = (m: ClanMember): boolean => {
    return onlineUsers.some(
      (u) => u.tagname.trim().toLowerCase() === m.tagname.trim().toLowerCase()
    );
  };

  // Attendance check-in requires an authenticated logged-in member (viewing records is open to everyone)
  const activeTapMember: ClanMember | null = loggedInMember;

  const isMyAttendancePresent = activeTapMember ? checkIsPresent(activeTapMember) : false;

  // Apply Present/Absent update for a member
  const applyMemberAttendanceStatus = (member: ClanMember, newStatus: boolean) => {
    const checkInTime = newStatus
      ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : undefined;

    if (newStatus) {
      sounds.playSuccess();
    }

    const upperTag = formatTagnameUppercase(member.tagname);
    const updated = {
      ...attendanceMap,
      [member.id]: {
        isPresent: newStatus,
        timeCheckedIn: checkInTime
      },
      [member.tagname]: {
        isPresent: newStatus,
        timeCheckedIn: checkInTime
      },
      [upperTag]: {
        isPresent: newStatus,
        timeCheckedIn: checkInTime
      }
    };

    saveAttendance(updated);

    // Broadcast across all devices via WebSocket + REST
    realtimeClient.checkAttendance(
      todayDateKey,
      member.id,
      newStatus,
      checkInTime,
      member.displayName,
      member.tagname
    );
  };

  // Single-Tap Attendance Handler (Locked when not logged in; strict close after 6:00 PM — no late check-in or passcode)
  const handleTapAttendance = () => {
    sounds.playClick();
    setTapWarning(null);

    if (!loggedInMember) {
      sounds.playError();
      onGoToLogin();
      return;
    }

    if (!isOpenNow) {
      sounds.playError();
      setTapWarning(
        lang === 'tl'
          ? '🔴 Sarado na ang Attendance Room (4:00 AM – 6:00 PM). Hindi na pwedeng humabol sa attendance at bawal ang passcode. Magbubukas uli sa 4:00 AM.'
          : '🔴 Attendance Room is CLOSED (4:00 AM – 6:00 PM). Late check-ins and passcode overrides are not allowed. Reopens at 4:00 AM.'
      );
      return;
    }

    const currentStatus = checkIsPresent(loggedInMember);
    const newStatus = !currentStatus;
    applyMemberAttendanceStatus(loggedInMember, newStatus);
  };

  // Tangin mga Officials lang ang maaaring makakita sa Attendance Picture pag sarado na
  const isLoggedInOfficial = Boolean(
    loggedInMember &&
      (isOfficialRole(loggedInMember.roleTitle) || loggedInMember.category === 'leadership')
  );

  // Hiwalay ang record attendance sa OFFICIAL at MEMBERS!
  const officialMembers = React.useMemo(
    () =>
      allRegisteredMembers.filter(
        (m) => isOfficialRole(m.roleTitle) || m.category === 'leadership'
      ),
    [allRegisteredMembers]
  );
  const generalMembers = React.useMemo(
    () =>
      allRegisteredMembers.filter(
        (m) => !isOfficialRole(m.roleTitle) && m.category !== 'leadership'
      ),
    [allRegisteredMembers]
  );

  // Overall Stats (anyone who hasn't tapped attendance is automatically ABSENT)
  const totalPresentCount = allRegisteredMembers.filter(checkIsPresent).length;
  const totalAbsentCount = allRegisteredMembers.length - totalPresentCount;

  // Official Stats
  const officialsPresentCount = officialMembers.filter(checkIsPresent).length;
  const officialsAbsentCount = officialMembers.length - officialsPresentCount;

  // Member Stats
  const membersPresentCount = generalMembers.filter(checkIsPresent).length;
  const membersAbsentCount = generalMembers.length - membersPresentCount;

  // Search filter helper
  const filterMemberList = (list: ClanMember[]) => {
    return list.filter((m) => {
      const isPresent = checkIsPresent(m);
      const matchesFilter =
        filterType === 'all' ||
        (filterType === 'present' && isPresent) ||
        (filterType === 'absent' && !isPresent);

      const matchesSearch =
        m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tagname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.roleTitle.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  };

  const filteredOfficials = filterMemberList(officialMembers);
  const filteredGeneralMembers = filterMemberList(generalMembers);

  const handleStatPillClick = (nextFilter: 'all' | 'present' | 'absent') => {
    sounds.playClick();
    setFilterType(nextFilter);
    setTapWarning(null);
  };

  const reportSignature = React.useMemo(() => {
    const officialPart = officialMembers
      .map((m) => `${m.id}:${checkIsPresent(m) ? 1 : 0}:${getCheckInTime(m) || ''}`)
      .join('|');
    const memberPart = generalMembers
      .map((m) => `${m.id}:${checkIsPresent(m) ? 1 : 0}:${getCheckInTime(m) || ''}`)
      .join('|');
    return `${todayDateKey}__${isOpenNow ? 'open' : 'closed'}__${lang}__${officialPart}__${memberPart}`;
  }, [todayDateKey, isOpenNow, lang, officialMembers, generalMembers, attendanceMap]);

  const buildAttendancePicture = React.useCallback(async (): Promise<string | null> => {
    if (allRegisteredMembers.length === 0) return null;
    try {
      const result = await generateAttendancePicture({
        dateKey: todayDateKey,
        formattedDate: formattedTodayDate,
        isOpenNow,
        officials: officialMembers.map((m) => ({
          member: m,
          isPresent: checkIsPresent(m),
          timeCheckedIn: getCheckInTime(m),
        })),
        members: generalMembers.map((m) => ({
          member: m,
          isPresent: checkIsPresent(m),
          timeCheckedIn: getCheckInTime(m),
        })),
        lang,
      });
      lastReportSignatureRef.current = reportSignature;
      reportBlobRef.current = result.blob;
      setReportImageUrl(result.dataUrl);
      return result.dataUrl;
    } catch {
      setReportActionNote(
        lang === 'tl'
          ? 'Hindi mabuo ang attendance picture sa ngayon.'
          : 'Could not generate attendance picture right now.'
      );
      return null;
    }
  }, [
    allRegisteredMembers.length,
    reportSignature,
    todayDateKey,
    formattedTodayDate,
    isOpenNow,
    officialMembers,
    generalMembers,
    attendanceMap,
    lang,
  ]);

  // Automatically generate Attendance Record picture ONLY for Officials when attendance is CLOSED
  useEffect(() => {
    if (isOpenNow || !isLoggedInOfficial) {
      lastReportSignatureRef.current = '';
      reportBlobRef.current = null;
      setReportImageUrl(null);
      setReportActionNote(null);
      return;
    }
    if (allRegisteredMembers.length > 0 && lastReportSignatureRef.current !== reportSignature) {
      void buildAttendancePicture();
    }
  }, [isOpenNow, isLoggedInOfficial, allRegisteredMembers.length, reportSignature, buildAttendancePicture]);

  const handleSharePicture = async () => {
    sounds.playClick();
    let imageUrl = reportImageUrl;
    if (!imageUrl || !reportBlobRef.current) {
      imageUrl = await buildAttendancePicture();
    }
    if (!imageUrl) return;

    const blob = reportBlobRef.current;
    if (blob) {
      const file = new File([blob], `ZVR-Attendance-${todayDateKey}.png`, { type: 'image/png' });
      if (
        typeof navigator !== 'undefined' &&
        'share' in navigator &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            title: `Z.V.R Attendance Records (${todayDateKey})`,
            text: `Z.V.R Attendance Records (${formattedTodayDate})`,
            files: [file],
          });
          sounds.playSuccess();
          setReportActionNote(
            lang === 'tl'
              ? 'Na-share na ang Attendance Picture!'
              : 'Attendance picture shared!'
          );
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            return;
          }
        }
      }
    }

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ZVR-Attendance-${todayDateKey}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    sounds.playSuccess();
    setReportActionNote(
      lang === 'tl'
        ? 'Na-save na ang Attendance Picture para mai-share!'
        : 'Attendance picture saved and ready to share!'
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Page Title & Header */}
      <div className="liquid-glass-panel rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-2xl border border-white/20">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-12 bg-white/20 rounded-full blur-xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10 text-center md:text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-white/30 shadow-[0_0_20px_rgba(168,85,247,0.35)] bg-purple-950/80 shrink-0">
              <img
                src={CLAN_LOGO_URL}
                alt="Z.V.R Official Crest"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 font-heading">
                  Z.V.R Attendance Room
                </h2>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 rounded-full font-bold">
                  SHOW FOR ALL
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-1 flex items-center justify-center md:justify-start gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-purple-300" />
                <span>{formattedTodayDate}</span>
              </p>
            </div>
          </div>

          {/* Statistics Pills: Overall & Category Split (Interactive Permission Tap Filters) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap justify-center">
            {/* PRESENT TAP BUTTON */}
            <button
              type="button"
              onClick={() => handleStatPillClick('present')}
              className={`px-3.5 py-2 rounded-2xl transition-all cursor-pointer text-center min-w-[88px] active:scale-95 ${
                filterType === 'present'
                  ? 'bg-emerald-500/35 border-2 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.5)] scale-105'
                  : 'bg-emerald-500/15 border border-emerald-400/30 hover:bg-emerald-500/25'
              }`}
              title={lang === 'tl' ? 'I-tap para makita lahat ng PRESENT' : 'Tap to view all PRESENT'}
            >
              <span className="text-base sm:text-lg font-black text-emerald-300 font-mono leading-none block">
                {totalPresentCount}
              </span>
              <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block mt-0.5">
                🟢 PRESENT
              </span>
            </button>

            {/* ABSENT TAP BUTTON */}
            <button
              type="button"
              onClick={() => handleStatPillClick('absent')}
              className={`px-3.5 py-2 rounded-2xl transition-all cursor-pointer text-center min-w-[88px] active:scale-95 ${
                filterType === 'absent'
                  ? 'bg-red-500/35 border-2 border-red-400 shadow-[0_0_18px_rgba(239,68,68,0.5)] scale-105'
                  : 'bg-red-500/15 border border-red-400/30 hover:bg-red-500/25'
              }`}
              title={lang === 'tl' ? 'I-tap para makita lahat ng ABSENT' : 'Tap to view all ABSENT'}
            >
              <span className="text-base sm:text-lg font-black text-red-300 font-mono leading-none block">
                {totalAbsentCount}
              </span>
              <span className="text-[10px] font-bold text-red-200 uppercase tracking-wider block mt-0.5">
                🔴 ABSENT
              </span>
            </button>

            {/* REGISTERED TAP BUTTON (Room Verified - visible even offline) */}
            <button
              type="button"
              onClick={() => handleStatPillClick('all')}
              className={`px-3.5 py-2 rounded-2xl transition-all cursor-pointer text-center min-w-[88px] active:scale-95 ${
                filterType === 'all'
                  ? 'bg-purple-500/35 border-2 border-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.5)] scale-105'
                  : 'bg-purple-500/15 border border-purple-400/30 hover:bg-purple-500/25'
              }`}
              title={lang === 'tl' ? 'I-tap para makita lahat ng REGISTERED (kasama offline)' : 'Tap to view all REGISTERED (including offline)'}
            >
              <span className="text-base sm:text-lg font-black text-purple-200 font-mono leading-none block">
                {allRegisteredMembers.length}
              </span>
              <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider block mt-0.5">
                👥 REGISTERED
              </span>
            </button>
          </div>
        </div>

        {/* Attendance Window & 3:00 AM Reset Notice */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-mono flex-wrap justify-center sm:justify-start">
            <Clock className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-purple-200/90 font-semibold">
              {lang === 'tl' ? 'Oras ng Attendance:' : 'Attendance Hours:'} <strong className="text-white">4:00 AM – 6:00 PM</strong>
            </span>
            <span className="text-amber-300/90 font-semibold bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded-full text-[10px]">
              🔄 {lang === 'tl' ? 'Reset: 3:00 AM' : 'Daily Reset: 3:00 AM'}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isOpenNow
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  : 'bg-red-500/20 text-red-300 border border-red-400/40'
              }`}
            >
              {isOpenNow
                ? lang === 'tl' ? 'BUKAS NGAYON 🟢' : 'OPEN NOW 🟢'
                : lang === 'tl' ? 'SARADO NA 🔴' : 'CLOSED 🔴'}
            </span>
          </div>

          {recentNotice && (
            <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-xl animate-fade-in flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>{recentNotice}</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: SINGLE TAP ATTENDANCE CIRCLE (Locked until Logged In) */}
      <div className="liquid-glass-panel rounded-3xl p-6 relative overflow-hidden shadow-2xl border border-white/20 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-24 bg-gradient-to-b from-purple-500/20 to-transparent blur-2xl pointer-events-none"></div>

        {loggedInMember ? (
          <div className="space-y-4 relative z-10 py-2 flex flex-col items-center">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-purple-300/80 font-bold">
                {lang === 'tl' ? 'I-TAP ANG ATTENDANCE PARA MAG-PRESENT' : 'TAP ATTENDANCE TO CHECK IN'}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white font-heading mt-0.5 uppercase">
                {loggedInMember.displayName} ({loggedInMember.roleTitle})
              </h3>
              <p className="text-xs text-purple-200/70 font-mono mt-0.5">
                {formatTagnameUppercase(loggedInMember.tagname)}
              </p>
            </div>

            {/* Glowing Big Attendance Button */}
            <div className="py-2">
              <button
                type="button"
                onClick={handleTapAttendance}
                className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center p-3 transition-all duration-300 transform active:scale-95 cursor-pointer relative overflow-hidden shadow-2xl ${
                  isMyAttendancePresent
                    ? 'bg-gradient-to-tr from-emerald-600 via-green-500 to-teal-400 border-4 border-emerald-300 shadow-[0_0_50px_rgba(16,185,129,0.7)]'
                    : 'bg-gradient-to-tr from-red-700 via-rose-600 to-pink-600 border-4 border-red-300/70 shadow-[0_0_40px_rgba(239,68,68,0.5)]'
                }`}
                title={lang === 'tl' ? 'I-tap ang attendance para mag-Present at makita ang records' : 'Tap attendance to check in and reveal records'}
              >
                <div className="absolute inset-2 rounded-full border border-white/40 pointer-events-none"></div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-24 h-6 bg-white/30 rounded-full blur-md pointer-events-none"></div>

                {isMyAttendancePresent ? (
                  <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 stroke-[2.5] text-white drop-shadow-md mb-1 animate-bounce" />
                ) : (
                  <UserCheck className="w-12 h-12 sm:w-16 sm:h-16 stroke-[2.5] text-white drop-shadow-md mb-1" />
                )}

                <span className="text-sm sm:text-base font-black tracking-widest uppercase font-heading text-white drop-shadow-md">
                  {isMyAttendancePresent ? 'PRESENT (🟢)' : !isOpenNow ? 'CLOSED (🔴)' : 'ATTENDANCE'}
                </span>
                <span className="text-[10px] font-mono text-white/90 font-bold mt-0.5">
                  {!isOpenNow
                    ? lang === 'tl' ? 'SARADO NA 🔴' : 'CLOSED 🔴'
                    : isMyAttendancePresent
                    ? lang === 'tl' ? 'TAP TO CHANGE' : 'TAP TO CHANGE'
                    : lang === 'tl' ? 'I-TAP PARA MAG-PRESENT' : 'TAP TO BE PRESENT'}
                </span>
              </button>
            </div>

            {tapWarning && (
              <div className="max-w-md mx-auto p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{tapWarning}</span>
              </div>
            )}

            {/* Attendance Confirmation Status Badge */}
            {isMyAttendancePresent ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-xs font-bold text-emerald-300 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>
                  {lang === 'tl'
                    ? `Naka-Present ka na ngayong araw (${getCheckInTime(loggedInMember) || 'Ngayon'})`
                    : `Checked in as Present today (${getCheckInTime(loggedInMember) || 'Just now'})`}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 border border-red-400/40 text-xs font-bold text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>
                  {lang === 'tl'
                    ? 'Naka-ABSENT ka pa. Pag hindi nag-tap, matic ABSENT!'
                    : 'Currently ABSENT. If you do not tap, you are automatically ABSENT!'}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* LOCKED STATE WHEN NOT LOGGED IN */
          <div className="space-y-4 relative z-10 py-4 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-800 via-pink-700 to-red-700 flex items-center justify-center text-white border-2 border-pink-300/40 shadow-[0_0_28px_rgba(236,72,153,0.45)] mb-1">
              <Lock className="w-9 h-9 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white font-heading">
              {lang === 'tl' ? '🔒 Mag-log in upang Makapag-Attendance' : '🔒 Log in to Check In Attendance'}
            </h3>
            <p className="text-xs sm:text-sm text-purple-200/85 max-w-md leading-relaxed">
              {lang === 'tl'
                ? 'Makikita ng lahat ang listahan ng mga naka-attendance sa ibaba, ngunit kailangan mong mag-log in gamit ang iyong Tagname at Password upang makapag-tap ng Present.'
                : 'Everyone can view the attendance records below, but you need to log in with your Tagname and Password first to mark yourself Present.'}
            </p>
            {tapWarning && (
              <div className="max-w-md mx-auto p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{tapWarning}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onGoToLogin();
              }}
              className="liquid-glass-btn-primary px-6 py-3 text-white font-black rounded-xl text-xs sm:text-sm tracking-wide shadow-xl hover:scale-105 transition-transform cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
            >
              <Lock className="w-4 h-4 text-pink-200" />
              <span>{lang === 'tl' ? 'MAG-LOGIN PARA MAKAPAG-ATTENDANCE' : 'LOG IN TO CHECK IN'}</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 1B: ATTENDANCE RECORDS PICTURE (OFFICIALS ONLY · VISIBLE ONLY WHEN CLOSED) */}
      {isLoggedInOfficial && !isOpenNow && allRegisteredMembers.length > 0 && (
        <div className="liquid-glass-panel rounded-3xl p-5 sm:p-6 space-y-4 border border-pink-400/50 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg border border-white/25 shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white font-heading">
                  {lang === 'tl'
                    ? 'Attendance Records Picture (Officials Only)'
                    : 'Attendance Records Picture (Officials Only)'}
                </h3>
                <p className="text-xs text-purple-200/80 mt-0.5 leading-relaxed">
                  {lang === 'tl'
                    ? 'Sarado na ang attendance. Narito ang kumpletong picture ng Form 1 (Officials) at Form 2 (Members) para mai-share.'
                    : 'Attendance is now closed. Here is the complete picture of Form 1 (Officials) and Form 2 (Members) ready to share.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  void buildAttendancePicture();
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-purple-100 flex items-center gap-1.5 cursor-pointer min-h-[42px]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'tl' ? 'I-refresh Picture' : 'Refresh Picture'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-white/10">
            {reportImageUrl ? (
              <div className="rounded-2xl overflow-hidden border border-purple-400/35 bg-black/50 p-2">
                <img
                  src={reportImageUrl}
                  alt="Z.V.R Attendance Records Picture"
                  className="w-full max-h-[420px] object-contain mx-auto rounded-xl"
                />
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-black/40 border border-white/10 text-center text-xs text-purple-200/75">
                {lang === 'tl' ? 'Binubuo ang attendance picture...' : 'Generating attendance picture...'}
              </div>
            )}

            <button
              type="button"
              onClick={handleSharePicture}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-300/40 text-xs sm:text-sm font-black text-white flex items-center justify-center gap-2 cursor-pointer min-h-[44px] shadow-lg"
            >
              <Share2 className="w-4 h-4" />
              <span>{lang === 'tl' ? 'E - share' : 'Share'}</span>
            </button>

            {reportActionNote && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-xs text-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>{reportActionNote}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: LIVE ATTENDANCE RECORDS (SHOW FOR EVERYONE) */}
      {allRegisteredMembers.length === 0 ? (
        <div className="liquid-glass-panel rounded-3xl p-8 text-center space-y-4 border border-purple-500/30 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300 mx-auto shadow-lg">
            <UserCheck className="w-8 h-8 text-pink-400" />
          </div>
          <h3 className="text-xl font-black text-white font-heading">
            {lang === 'tl' ? 'Walang Nakatalang Tagname sa Attendance' : 'No Tagnames Listed in Attendance Yet'}
          </h3>
          <p className="text-xs text-purple-200/80 max-w-md mx-auto leading-relaxed">
            {lang === 'tl' ? (
              <>
                Paalala: Kailangan munang mag-fill-up sa <strong>"Create Tagname"</strong> sa Log In portal. Pagkatapos mag-create, awtomatikong papasok at mananatili ang tagname dito sa Attendance Room (kahit offline) at araw-araw itong magre-reset tuwing 3:00 AM.
              </>
            ) : (
              <>
                Reminder: Members must fill out <strong>"Create Tagname"</strong> on the Login portal first. Once created, their tagname automatically stays inside this Attendance Room (even offline) and resets daily at 3:00 AM.
              </>
            )}
          </p>
          <button
            onClick={() => {
              sounds.playClick();
              onGoToLogin();
            }}
            className="liquid-glass-btn-primary px-6 py-3 text-white font-black rounded-xl text-xs sm:text-sm tracking-wide shadow-xl hover:scale-105 transition-transform cursor-pointer inline-flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-pink-200" />
            <span>{lang === 'tl' ? 'PUMUNTA SA CREATE TAGNAME' : 'GO TO CREATE TAGNAME'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* MEMBER ATTENDANCE RECORDS (HIWALAY ANG FORM SA OFFICIAL AT MEMBERS - SHOW FOR ALL) */
        <div className="space-y-6 animate-fade-in">
          {/* Controls Bar: Search & Sub-Tabs */}
          <div className="liquid-glass-panel rounded-3xl p-4 sm:p-5 border border-white/20 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Form Switcher Sub-Tabs */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => {
                    sounds.playClick();
                    setActiveFormTab('both');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeFormTab === 'both'
                      ? 'bg-purple-600 text-white border border-purple-400/40 shadow-md'
                      : 'bg-white/5 text-purple-200/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {lang === 'tl' ? `Lahat ng Form (${allRegisteredMembers.length})` : `All Forms (${allRegisteredMembers.length})`}
                </button>
                <button
                  onClick={() => {
                    sounds.playClick();
                    setActiveFormTab('officials');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeFormTab === 'officials'
                      ? 'bg-amber-600 text-white border border-amber-400/40 shadow-md'
                      : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'tl' ? `Form ng Officials (${officialMembers.length})` : `Officials Form (${officialMembers.length})`}</span>
                </button>
                <button
                  onClick={() => {
                    sounds.playClick();
                    setActiveFormTab('members');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeFormTab === 'members'
                      ? 'bg-indigo-600 text-white border border-indigo-400/40 shadow-md'
                      : 'bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{lang === 'tl' ? `Form ng Members (${generalMembers.length})` : `Members Form (${generalMembers.length})`}</span>
                </button>
              </div>

              {/* Status Filter (All/Registered, Present, Absent) */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => {
                    sounds.playClick();
                    setFilterType('all');
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-black/30 text-purple-200/60 hover:text-white'
                  }`}
                >
                  {lang === 'tl' ? 'Lahat (Registered)' : 'All (Registered)'}
                </button>
                <button
                  onClick={() => {
                    sounds.playClick();
                    setFilterType('present');
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer text-emerald-300 ${
                    filterType === 'present'
                      ? 'bg-emerald-600 text-white border border-emerald-400'
                      : 'bg-emerald-950/40 hover:bg-emerald-950/70'
                  }`}
                >
                  Present ({totalPresentCount})
                </button>
                <button
                  onClick={() => {
                    sounds.playClick();
                    setFilterType('absent');
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer text-red-300 ${
                    filterType === 'absent'
                      ? 'bg-red-600 text-white border border-red-400'
                      : 'bg-red-950/40 hover:bg-red-950/70'
                  }`}
                >
                  Absent ({totalAbsentCount})
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-300/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'tl' ? 'Hanapin ang Tagname o Pangalan sa Attendance...' : 'Search Tagname or Name in Attendance...'}
                className="liquid-glass-input w-full rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-purple-300/40 outline-none font-medium"
              />
            </div>
          </div>

          {/* FORM 1: OFFICIALS ATTENDANCE RECORD */}
          {(activeFormTab === 'both' || activeFormTab === 'officials') && (
            <div className="liquid-glass-panel rounded-3xl p-5 sm:p-6 space-y-4 border border-amber-500/30 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-amber-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
                    <Crown className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white font-heading flex items-center gap-2">
                      <span>FORM 1: OFFICIALS ATTENDANCE RECORD</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {officialMembers.length} {lang === 'tl' ? 'Opisyal' : 'Officials'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-amber-200/70 font-mono">
                      𝑶𝒘𝒏𝒆𝒓, 𝑪𝒐-𝒐𝒘𝒏𝒆𝒓, 𝑭𝒅𝒓, 𝑯-𝒇𝒅𝒓, 𝑪𝒐-𝒇𝒅𝒓, 𝑯-𝒂𝒅𝒎𝒊𝒏, 𝑪-𝒂𝒅𝒎𝒊𝒏, 𝑺-𝒂𝒅𝒎𝒊𝒏, 𝑨𝒅𝒎𝒊𝒏
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold">
                    🟢 Present: {officialsPresentCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 font-bold">
                    🔴 Absent: {officialsAbsentCount}
                  </span>
                </div>
              </div>

              {filteredOfficials.length === 0 ? (
                <div className="p-6 text-center text-xs text-amber-200/60 font-mono bg-amber-950/10 rounded-2xl border border-amber-500/20">
                  {officialMembers.length === 0
                    ? lang === 'tl'
                      ? 'Wala pang nakarehistrong Official. Mag-fill-up sa "Create Tagname" gamit ang Official position.'
                      : 'No registered Officials yet. Fill out "Create Tagname" with an Official position.'
                    : lang === 'tl'
                    ? 'Walang tumutugma sa filter o search query sa Officials.'
                    : 'No Officials match your filter or search query.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredOfficials.map((official) => {
                    const isPresent = checkIsPresent(official);
                    const timeCheckedIn = getCheckInTime(official);
                    const isMe = activeTapMember?.id === official.id;
                    const isOnline = isMemberOnline(official);

                    return (
                      <div
                        key={official.id}
                        className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 ${
                          isPresent
                            ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : 'bg-red-950/20 border-red-500/20'
                        } ${isMe ? 'ring-2 ring-amber-400/60' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md border ${
                              isPresent
                                ? 'bg-emerald-600 border-emerald-400 text-white'
                                : 'bg-red-700 border-red-400 text-white'
                            }`}
                          >
                            <span className="text-sm font-black">{isPresent ? '🟢' : '🔴'}</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold text-white text-xs sm:text-sm truncate uppercase">
                                {official.displayName}
                              </span>
                              {isMe && (
                                <span className="text-[9px] font-mono text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded border border-purple-400/30 shrink-0">
                                  {lang === 'tl' ? 'IKAW' : 'YOU'}
                                </span>
                              )}
                              <span className="text-[9px] font-mono text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-400/30 shrink-0 flex items-center gap-0.5">
                                <Crown className="w-2.5 h-2.5 text-amber-400" />
                                <span>{official.roleTitle}</span>
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-purple-200/70 truncate mt-0.5">
                              {formatTagnameUppercase(official.tagname)}
                            </div>
                            <div className="text-[9px] font-mono mt-0.5">
                              {isOnline ? (
                                <span className="text-emerald-300">🟢 Online</span>
                              ) : (
                                <span className="text-zinc-400">⚫ Offline</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {isPresent ? (
                            <div className="flex flex-col items-end">
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300 font-mono flex items-center gap-1 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>PRESENT</span>
                              </span>
                              {timeCheckedIn && (
                                <span className="text-[9px] font-mono text-purple-300/60 mt-0.5 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{timeCheckedIn}</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-[10px] font-bold text-red-300 font-mono flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              <span>ABSENT</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* FORM 2: MEMBERS ATTENDANCE RECORD */}
          {(activeFormTab === 'both' || activeFormTab === 'members') && (
            <div className="liquid-glass-panel rounded-3xl p-5 sm:p-6 space-y-4 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-indigo-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-md">
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white font-heading flex items-center gap-2">
                      <span>FORM 2: MEMBERS ATTENDANCE RECORD</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {generalMembers.length} {lang === 'tl' ? 'Miyembro' : 'Members'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-indigo-200/70 font-mono">
                      {lang === 'tl' ? 'Opisyal na Tagname ng mga Miyembro (𝑴𝒃𝒓)' : 'Official Member Tagnames (𝑴𝒃𝒓)'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold">
                    🟢 Present: {membersPresentCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 font-bold">
                    🔴 Absent: {membersAbsentCount}
                  </span>
                </div>
              </div>

              {filteredGeneralMembers.length === 0 ? (
                <div className="p-6 text-center text-xs text-indigo-200/60 font-mono bg-indigo-950/10 rounded-2xl border border-indigo-500/20">
                  {generalMembers.length === 0
                    ? lang === 'tl'
                      ? 'Wala pang nakarehistrong Miyembro. Mag-fill-up sa "Create Tagname" gamit ang Mbr position.'
                      : 'No registered Members yet. Fill out "Create Tagname" with the Mbr position.'
                    : lang === 'tl'
                    ? 'Walang tumutugma sa filter o search query sa Members.'
                    : 'No Members match your filter or search query.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredGeneralMembers.map((member) => {
                    const isPresent = checkIsPresent(member);
                    const timeCheckedIn = getCheckInTime(member);
                    const isMe = activeTapMember?.id === member.id;
                    const isOnline = isMemberOnline(member);

                    return (
                      <div
                        key={member.id}
                        className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 ${
                          isPresent
                            ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : 'bg-red-950/20 border-red-500/20'
                        } ${isMe ? 'ring-2 ring-purple-400/60' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md border ${
                              isPresent
                                ? 'bg-emerald-600 border-emerald-400 text-white'
                                : 'bg-red-700 border-red-400 text-white'
                            }`}
                          >
                            <span className="text-sm font-black">{isPresent ? '🟢' : '🔴'}</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold text-white text-xs sm:text-sm truncate uppercase">
                                {member.displayName}
                              </span>
                              {isMe && (
                                <span className="text-[9px] font-mono text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded border border-purple-400/30 shrink-0">
                                  {lang === 'tl' ? 'IKAW' : 'YOU'}
                                </span>
                              )}
                              <span className="text-[9px] font-mono text-indigo-300 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-400/30 shrink-0">
                                {member.roleTitle}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-purple-200/70 truncate mt-0.5">
                              {formatTagnameUppercase(member.tagname)}
                            </div>
                            <div className="text-[9px] font-mono mt-0.5">
                              {isOnline ? (
                                <span className="text-emerald-300">🟢 Online</span>
                              ) : (
                                <span className="text-zinc-400">⚫ Offline</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {isPresent ? (
                            <div className="flex flex-col items-end">
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300 font-mono flex items-center gap-1 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>PRESENT</span>
                              </span>
                              {timeCheckedIn && (
                                <span className="text-[9px] font-mono text-purple-300/60 mt-0.5 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{timeCheckedIn}</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-[10px] font-bold text-red-300 font-mono flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              <span>ABSENT</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
