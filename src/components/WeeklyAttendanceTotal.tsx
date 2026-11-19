import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Calendar,
  Crown,
  Users,
  Search,
  Image as ImageIcon,
  Share2,
  RefreshCw,
  Check,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import {
  ClanMember,
  CLAN_LOGO_URL,
  RegisteredAccount,
  accountToClanMember,
  isOfficialRole,
  getAttendanceDateKey,
  getWorkweekDays,
  formatTagnameUppercase
} from '../data/clanData';
import { sounds } from '../utils/soundEffects';
import { realtimeClient } from '../utils/realtimeClient';
import {
  generateWeeklyAttendancePicture,
  WeeklyAttendanceRowItem,
  WeeklyDayState
} from '../utils/attendanceImageGenerator';

interface WeeklyAttendanceTotalProps {
  members?: ClanMember[];
  loggedInMember: ClanMember | null;
  lang: 'tl' | 'en';
}

export const WeeklyAttendanceTotal: React.FC<WeeklyAttendanceTotalProps> = ({
  members = [],
  loggedInMember,
  lang,
}) => {
  const [todayDateKey, setTodayDateKey] = useState<string>(() => getAttendanceDateKey());
  const weekDays = useMemo(() => getWorkweekDays(), [todayDateKey]);
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length === 0) return '';
    return `${weekDays[0].formattedShort} – ${weekDays[weekDays.length - 1].formattedShort}`;
  }, [weekDays]);

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

  const [weeklyMap, setWeeklyMap] = useState<
    Record<string, Record<string, { isPresent: boolean; timeCheckedIn?: string }>>
  >(() => {
    const initial: Record<string, Record<string, { isPresent: boolean; timeCheckedIn?: string }>> = {};
    try {
      for (const d of getWorkweekDays()) {
        const saved = localStorage.getItem(`zvr_attendance_${d.dateKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            initial[d.dateKey] = parsed;
          }
        }
      }
    } catch {}
    return initial;
  });

  const [activeFormTab, setActiveFormTab] = useState<'both' | 'officials' | 'members'>('both');
  const [searchQuery, setSearchQuery] = useState('');
  const [reportImageUrl, setReportImageUrl] = useState<string | null>(null);
  const [reportActionNote, setReportActionNote] = useState<string | null>(null);
  const lastSignatureRef = useRef<string>('');
  const reportBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    realtimeClient.fetchInitialState();

    fetch('/api/attendance/weekly-total')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.todayDateKey) {
          setTodayDateKey(payload.todayDateKey);
        }
        if (payload?.weeklyAttendanceMap && typeof payload.weeklyAttendanceMap === 'object') {
          setWeeklyMap((prev) => ({ ...prev, ...payload.weeklyAttendanceMap }));
        }
      })
      .catch(() => {});

    const unsubInit = realtimeClient.onInit((state) => {
      if (state.todayDateKey) setTodayDateKey(state.todayDateKey);
      if (state.registeredAccounts && Array.isArray(state.registeredAccounts)) {
        setRegisteredAccounts(state.registeredAccounts);
      }
      if (state.weeklyAttendanceMap && typeof state.weeklyAttendanceMap === 'object') {
        setWeeklyMap((prev) => ({
          ...prev,
          ...state.weeklyAttendanceMap,
          ...(state.todayDateKey && state.attendanceMap
            ? { [state.todayDateKey]: state.attendanceMap }
            : {}),
        }));
      } else if (state.todayDateKey && state.attendanceMap) {
        setWeeklyMap((prev) => ({ ...prev, [state.todayDateKey]: state.attendanceMap }));
      }
    });

    const unsubAttendance = realtimeClient.onAttendance((data) => {
      if (data.dateKey && data.map) {
        setWeeklyMap((prev) => ({ ...prev, [data.dateKey]: data.map }));
      }
    });

    const unsubAccounts = realtimeClient.onAccountsUpdate((accounts) => {
      setRegisteredAccounts(accounts);
    });

    const timer = setInterval(() => {
      const currentKey = getAttendanceDateKey();
      setTodayDateKey((prev) => (prev !== currentKey ? currentKey : prev));
    }, 30000);

    return () => {
      unsubInit();
      unsubAttendance();
      unsubAccounts();
      clearInterval(timer);
    };
  }, []);

  const allRegisteredMembers: ClanMember[] = useMemo(() => {
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

  const buildRow = useCallback(
    (member: ClanMember): WeeklyAttendanceRowItem => {
      const upperTag = formatTagnameUppercase(member.tagname);
      let presentTotal = 0;
      let absentTotal = 0;

      const days = weekDays.map((d) => {
        const dayRecord = weeklyMap[d.dateKey] || {};
        const isPresent = Boolean(
          dayRecord[member.id]?.isPresent ||
            dayRecord[member.tagname]?.isPresent ||
            dayRecord[upperTag]?.isPresent
        );

        let state: WeeklyDayState;
        if (d.dateKey > todayDateKey) {
          state = 'upcoming';
        } else if (isPresent) {
          state = 'present';
          presentTotal += 1;
        } else {
          state = 'absent';
          absentTotal += 1;
        }

        return {
          dayName: d.dayName,
          shortName: d.shortName,
          dateKey: d.dateKey,
          state,
        };
      });

      return {
        member,
        days,
        presentTotal,
        absentTotal,
      };
    },
    [weekDays, weeklyMap, todayDateKey]
  );

  const officialRows = useMemo(
    () =>
      allRegisteredMembers
        .filter((m) => isOfficialRole(m.roleTitle) || m.category === 'leadership')
        .map(buildRow),
    [allRegisteredMembers, buildRow]
  );

  const memberRows = useMemo(
    () =>
      allRegisteredMembers
        .filter((m) => !isOfficialRole(m.roleTitle) && m.category !== 'leadership')
        .map(buildRow),
    [allRegisteredMembers, buildRow]
  );

  const allRows = useMemo(() => [...officialRows, ...memberRows], [officialRows, memberRows]);
  const overallPresentTicks = allRows.reduce((sum, r) => sum + r.presentTotal, 0);
  const overallAbsentTicks = allRows.reduce((sum, r) => sum + r.absentTotal, 0);

  const filterRows = (rows: WeeklyAttendanceRowItem[]) =>
    rows.filter((r) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        r.member.displayName.toLowerCase().includes(q) ||
        r.member.tagname.toLowerCase().includes(q) ||
        r.member.roleTitle.toLowerCase().includes(q)
      );
    });

  const filteredOfficials = filterRows(officialRows);
  const filteredMembers = filterRows(memberRows);

  const weeklySignature = useMemo(() => {
    const part = allRows
      .map(
        (r) =>
          `${r.member.id}:${r.days.map((d) => d.state[0]).join('')}:${r.presentTotal}:${r.absentTotal}`
      )
      .join('|');
    return `${todayDateKey}__${weekRangeLabel}__${lang}__${part}`;
  }, [allRows, todayDateKey, weekRangeLabel, lang]);

  const buildWeeklyPicture = useCallback(async (): Promise<string | null> => {
    if (allRows.length === 0) return null;
    try {
      const result = await generateWeeklyAttendancePicture({
        weekRangeLabel,
        weekDays,
        officials: officialRows,
        members: memberRows,
        lang,
      });
      lastSignatureRef.current = weeklySignature;
      reportBlobRef.current = result.blob;
      setReportImageUrl(result.dataUrl);
      return result.dataUrl;
    } catch {
      setReportActionNote(
        lang === 'tl'
          ? 'Hindi mabuo ang weekly attendance picture sa ngayon.'
          : 'Could not generate weekly attendance picture right now.'
      );
      return null;
    }
  }, [allRows.length, weekRangeLabel, weekDays, officialRows, memberRows, lang, weeklySignature]);

  useEffect(() => {
    if (allRows.length > 0 && lastSignatureRef.current !== weeklySignature) {
      void buildWeeklyPicture();
    }
  }, [allRows.length, weeklySignature, buildWeeklyPicture]);

  const handleSharePicture = async () => {
    sounds.playClick();
    let imageUrl = reportImageUrl;
    if (!imageUrl || !reportBlobRef.current) {
      imageUrl = await buildWeeklyPicture();
    }
    if (!imageUrl) return;

    const blob = reportBlobRef.current;
    if (blob) {
      const file = new File([blob], `ZVR-Weekly-Attendance-${todayDateKey}.png`, {
        type: 'image/png',
      });
      if (
        typeof navigator !== 'undefined' &&
        'share' in navigator &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            title: `Z.V.R Weekly Attendance Total (${weekRangeLabel})`,
            text: `Z.V.R Weekly Attendance Total (${weekRangeLabel})`,
            files: [file],
          });
          sounds.playSuccess();
          setReportActionNote(
            lang === 'tl'
              ? 'Na-share na ang Weekly Attendance Total picture!'
              : 'Weekly Attendance Total picture shared!'
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
    link.download = `ZVR-Weekly-Attendance-${todayDateKey}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    sounds.playSuccess();
    setReportActionNote(
      lang === 'tl'
        ? 'Na-save na ang Weekly Attendance Total picture para mai-share!'
        : 'Weekly Attendance Total picture saved and ready to share!'
    );
  };

  const renderSection = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    borderColor: string,
    rows: WeeklyAttendanceRowItem[],
    emptyLabel: string
  ) => (
    <div className={`liquid-glass-panel rounded-3xl p-5 sm:p-6 space-y-4 border ${borderColor} shadow-2xl relative overflow-hidden`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-white font-heading">{title}</h4>
            <p className="text-[11px] text-purple-200/70 font-mono">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono shrink-0 flex-wrap">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold">
            🟢 Present: {rows.reduce((s, r) => s + r.presentTotal, 0)}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 font-bold">
            🔴 Absent: {rows.reduce((s, r) => s + r.absentTotal, 0)}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-6 text-center text-xs text-purple-200/60 font-mono bg-black/20 rounded-2xl border border-white/10">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const isMe = loggedInMember?.id === row.member.id;
            return (
              <div
                key={row.member.id}
                className={`p-4 rounded-2xl border bg-black/30 border-white/15 space-y-3 ${
                  isMe ? 'ring-2 ring-purple-400/60' : ''
                }`}
              >
                {/* Member Header & Tagname + TOTAL */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-white text-xs sm:text-sm uppercase">
                        {row.member.displayName}
                      </span>
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-400/30">
                        {row.member.roleTitle}
                      </span>
                      {isMe && (
                        <span className="text-[9px] font-mono text-purple-200 bg-purple-500/25 px-1.5 py-0.5 rounded border border-purple-400/35">
                          {lang === 'tl' ? 'IKAW' : 'YOU'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-purple-300 font-bold mt-0.5 break-all">
                      [{formatTagnameUppercase(row.member.tagname)}]
                    </div>
                  </div>

                  {/* TOTAL = */}
                  <div className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-400/40 font-mono text-xs">
                    <span className="text-purple-200 font-black">TOTAL =</span>
                    <span className="text-emerald-300 font-black">🟢 {row.presentTotal}</span>
                    <span className="text-white/30">·</span>
                    <span className="text-red-300 font-black">🔴 {row.absentTotal}</span>
                  </div>
                </div>

                {/* MONDAY - SUNDAY Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {row.days.map((d) => (
                    <div
                      key={d.dateKey}
                      className={`rounded-xl px-1 py-2 border text-center flex flex-col items-center justify-center gap-1 ${
                        d.state === 'present'
                          ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                          : d.state === 'absent'
                          ? 'bg-red-500/15 border-red-400/35 text-red-200'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider">
                        <span className="hidden md:inline">{d.dayName}</span>
                        <span className="md:hidden">{d.shortName}</span>
                      </span>
                      {d.state === 'present' ? (
                        <span className="text-[10px] font-black font-mono flex items-center gap-0.5 text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span className="hidden md:inline">PRESENT</span>
                          <span className="md:hidden">P</span>
                        </span>
                      ) : d.state === 'absent' ? (
                        <span className="text-[10px] font-black font-mono flex items-center gap-0.5 text-red-300">
                          <XCircle className="w-3 h-3 shrink-0" />
                          <span className="hidden md:inline">ABSENT</span>
                          <span className="md:hidden">A</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono flex items-center gap-0.5 text-slate-400">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>—</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Panel */}
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
                  WEEKLY ATTENDANCE TOTAL
                </h2>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 rounded-full font-bold">
                  SHOW FOR EVERYONE
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-1 flex items-center justify-center md:justify-start gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-purple-300" />
                <span>MONDAY – SUNDAY · {weekRangeLabel}</span>
              </p>
            </div>
          </div>

          {/* Summary Stat Pills */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap justify-center">
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-center min-w-[92px]">
              <span className="text-base sm:text-lg font-black text-emerald-300 font-mono leading-none block">
                {overallPresentTicks}
              </span>
              <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block mt-0.5">
                🟢 PRESENT
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-red-500/15 border border-red-400/30 text-center min-w-[92px]">
              <span className="text-base sm:text-lg font-black text-red-300 font-mono leading-none block">
                {overallAbsentTicks}
              </span>
              <span className="text-[10px] font-bold text-red-200 uppercase tracking-wider block mt-0.5">
                🔴 ABSENT
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-purple-500/15 border border-purple-400/30 text-center min-w-[92px]">
              <span className="text-base sm:text-lg font-black text-purple-200 font-mono leading-none block">
                {allRows.length}
              </span>
              <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider block mt-0.5">
                👥 REGISTERED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shareable Weekly Attendance Form Picture (Same Form as Close Attendance Share · SHOW FOR EVERYONE) */}
      {allRows.length > 0 && (
        <div className="liquid-glass-panel rounded-3xl p-5 sm:p-6 space-y-4 border border-pink-400/40 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg border border-white/25 shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white font-heading">
                  {lang === 'tl'
                    ? 'Weekly Attendance Total Picture (Show for Everyone)'
                    : 'Weekly Attendance Total Picture (Show for Everyone)'}
                </h3>
                <p className="text-xs text-purple-200/80 mt-0.5 leading-relaxed">
                  {lang === 'tl'
                    ? 'Kumpletong lingguhang talaan (Monday–Sunday at Total Present/Absent) ng Form 1 (Officials) at Form 2 (Members).'
                    : 'Complete Monday–Sunday attendance form and Present/Absent totals for Form 1 (Officials) and Form 2 (Members).'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                void buildWeeklyPicture();
              }}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-purple-100 flex items-center gap-1.5 cursor-pointer min-h-[42px] shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === 'tl' ? 'I-refresh Picture' : 'Refresh Picture'}</span>
            </button>
          </div>

          <div className="space-y-4 pt-2 border-t border-white/10">
            {reportImageUrl ? (
              <div className="rounded-2xl overflow-hidden border border-purple-400/35 bg-black/50 p-2">
                <img
                  src={reportImageUrl}
                  alt="Z.V.R Weekly Attendance Total Picture"
                  className="w-full max-h-[440px] object-contain mx-auto rounded-xl"
                />
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-black/40 border border-white/10 text-center text-xs text-purple-200/75">
                {lang === 'tl'
                  ? 'Binubuo ang weekly attendance picture...'
                  : 'Generating weekly attendance picture...'}
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

      {/* Search & Form Switcher */}
      <div className="liquid-glass-panel rounded-3xl p-4 sm:p-5 border border-white/20 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
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
            {lang === 'tl' ? `Lahat (${allRows.length})` : `All Forms (${allRows.length})`}
          </button>
          <button
            type="button"
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
            <span>{lang === 'tl' ? `Officials (${officialRows.length})` : `Officials (${officialRows.length})`}</span>
          </button>
          <button
            type="button"
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
            <span>{lang === 'tl' ? `Members (${memberRows.length})` : `Members (${memberRows.length})`}</span>
          </button>
        </div>

        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-300/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === 'tl'
                ? 'Hanapin ang Tagname o Pangalan sa Weekly Total...'
                : 'Search Tagname or Name in Weekly Total...'
            }
            className="liquid-glass-input w-full rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-purple-300/40 outline-none font-medium"
          />
        </div>
      </div>

      {/* Form 1: Officials */}
      {(activeFormTab === 'both' || activeFormTab === 'officials') &&
        renderSection(
          'FORM 1: OFFICIALS WEEKLY ATTENDANCE TOTAL',
          'MONDAY · TUESDAY · WEDNESDAY · THURSDAY · FRIDAY · SATURDAY · SUNDAY · TOTAL =',
          <Crown className="w-4 h-4 text-amber-400" />,
          'border-amber-500/30',
          filteredOfficials,
          lang === 'tl' ? 'Walang Official sa record.' : 'No Officials found.'
        )}

      {/* Form 2: Members */}
      {(activeFormTab === 'both' || activeFormTab === 'members') &&
        renderSection(
          'FORM 2: MEMBERS WEEKLY ATTENDANCE TOTAL',
          'MONDAY · TUESDAY · WEDNESDAY · THURSDAY · FRIDAY · SATURDAY · SUNDAY · TOTAL =',
          <Users className="w-4 h-4 text-indigo-400" />,
          'border-indigo-500/30',
          filteredMembers,
          lang === 'tl' ? 'Walang Member sa record.' : 'No Members found.'
        )}
    </div>
  );
};
