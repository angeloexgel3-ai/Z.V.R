import React, { useState, useEffect, useRef } from 'react';
import { Shield, Eye, EyeOff, AlertCircle, Sparkles, CheckCircle2, User, KeyRound, ExternalLink, Flag, UserX, X, Lock, Check, UserPlus, Clock, Crown, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ClanMember, CLAN_PASSCODE, CLAN_LOGO_URL, CLAN_MOTTO, CLAN_FOUNDED_DATE, CLAN_FB_PROFILE_LINK, RegisteredAccount, formatTagnameUppercase, getAttendanceDateKey } from '../data/clanData';
import { sounds } from '../utils/soundEffects';

export interface PendingRegistration {
  id: string;
  name: string;
  tagname: string;
  roleTitle: string;
  reason: string;
  requestedAt: string;
}

import { realtimeClient, OnlineMemberRecord } from '../utils/realtimeClient';
import {
  SantaHatSvg,
  ChristmasFloralCorner,
  SnowflakeSvg,
  ChristmasLightsGarland,
  LoginSnowfallOverlay,
} from './ChristmasLoginDecor';

interface LoginCardProps {
  members: ClanMember[];
  onLoginSuccess: (member: ClanMember) => void;
  onAddMember: (member: ClanMember) => void;
  onOpenForgotModal: () => void;
  lang: 'tl' | 'en';
  notice?: string | null;
  onlineUsers?: OnlineMemberRecord[];
  onGoToRemoveTagname?: () => void;
  onSubModalChange?: (isOpen: boolean) => void;
}

export const LoginCard: React.FC<LoginCardProps> = ({
  members,
  onLoginSuccess,
  onAddMember,
  onOpenForgotModal,
  lang,
  notice,
  onlineUsers = [],
  onGoToRemoveTagname,
  onSubModalChange,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [capsLockActive, setCapsLockActive] = useState<boolean>(false);

  // Registered Accounts (Users who signed up via Create Tagname)
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

  const selectedTagRef = useRef(selectedTag);
  useEffect(() => {
    selectedTagRef.current = selectedTag;
  }, [selectedTag]);

  // Keep registered accounts in sync with localStorage, BroadcastChannel & WebSocket
  useEffect(() => {
    realtimeClient.fetchInitialState();
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('zvr_registered_accounts');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setRegisteredAccounts(parsed);
        } else {
          setRegisteredAccounts([]);
        }
      } catch {}
    };
    window.addEventListener('storage', handleStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('zvr_registered_accounts_channel');
      channel.onmessage = (event) => {
        if (event.data?.accounts && Array.isArray(event.data.accounts)) {
          setRegisteredAccounts(event.data.accounts);
        }
      };
    } catch {}

    const unsubWs = realtimeClient.onAccountsUpdate((accounts, removedTagname) => {
      setRegisteredAccounts(accounts);
      if (removedTagname && selectedTagRef.current.trim().toLowerCase() === removedTagname.trim().toLowerCase()) {
        setSelectedTag('');
      }
    });

    const unsubInit = realtimeClient.onInit((state) => {
      if (state.registeredAccounts && Array.isArray(state.registeredAccounts)) {
        setRegisteredAccounts(state.registeredAccounts);
      }
      if (state.suspendedMembers && Array.isArray(state.suspendedMembers)) {
        setSuspendedList(state.suspendedMembers);
      }
    });

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (channel) channel.close();
      unsubWs();
      unsubInit();
    };
  }, []);

  // Suspension & Eviction System State
  const [suspendedList, setSuspendedList] = useState<Array<{ id: string; tagname: string; name: string; reason: string; date: string; action?: string }>>(() => {
    try {
      const saved = localStorage.getItem('zvr_suspended_members');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  useEffect(() => {
    const unsubSusp = realtimeClient.onSuspensionsUpdate((list) => {
      setSuspendedList(list);
    });
    return () => unsubSusp();
  }, []);

  // Pending Registrations for Approval System
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>(() => {
    try {
      const saved = localStorage.getItem('zvr_pending_registrations');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  // Create Tagname Registration Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [regVerificationCode, setRegVerificationCode] = useState('');
  const [showRegCode, setShowRegCode] = useState(false);
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('𝑴𝒃𝒓');
  const [regPersonalPassword, setRegPersonalPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regErrorMsg, setRegErrorMsg] = useState<string | null>(null);
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  // Owner/Co-Owner Approval Modal State
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalPasscode, setApprovalPasscode] = useState('');
  const [isApprovalUnlocked, setIsApprovalUnlocked] = useState(false);

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTargetTag, setReportTargetTag] = useState('');
  const [reportReason, setReportReason] = useState('Reason(e.g rude in GC)');
  const [reportAction, setReportAction] = useState<string>('SUSPENSION 1DAY');
  const [showSuspendedListModal, setShowSuspendedListModal] = useState(false);

  // Notify parent when any login sub-modal (Create Tagname, Report, Approval, Suspended) is open so footer stays hidden
  useEffect(() => {
    if (onSubModalChange) {
      onSubModalChange(isCreateModalOpen || isReportModalOpen || isApprovalModalOpen || showSuspendedListModal);
    }
  }, [isCreateModalOpen, isReportModalOpen, isApprovalModalOpen, showSuspendedListModal, onSubModalChange]);

  const suspendedTagnames = suspendedList.map((s) => s.tagname);

  // Check caps lock
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const normalizeTag = (val: string) => val.trim().replace(/\s+/g, ' ').toLowerCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();

    const enteredTag = selectedTag.trim();
    if (!enteredTag) {
      setErrorMsg(
        lang === 'tl'
          ? 'Ilagay ang iyong Tagname sa "ENTER THE TAGNAME" upang makapag-log in!'
          : 'Please enter your Tagname in "ENTER THE TAGNAME" to log in!'
      );
      sounds.playError();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    const normEntered = normalizeTag(enteredTag);

    // Check if tagname is suspended
    if (suspendedTagnames.some((s) => normalizeTag(s) === normEntered)) {
      setErrorMsg(
        lang === 'tl'
          ? 'Ang tagname na ito ay sinuspinde dahil sa paglabag sa mga alituntunin!'
          : 'This tagname is suspended due to rules violation!'
      );
      sounds.playError();
      return;
    }

    // Match entered tagname against registered accounts (or active members list)
    const targetAccount = registeredAccounts.find((a) => normalizeTag(a.tagname) === normEntered);
    const fallbackMember = !targetAccount
      ? members.find((m) => normalizeTag(m.tagname) === normEntered)
      : undefined;

    if (!targetAccount && !fallbackMember) {
      setErrorMsg(
        lang === 'tl'
          ? 'Hindi nakita ang Tagname na ito! Siguraduhing tama at eksakto ang Tagname na inilagay o mag-Create Tagname muna.'
          : 'Tagname not found! Please make sure you entered your exact registered Tagname or Create Tagname first.'
      );
      sounds.playError();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    const officialTag = targetAccount?.tagname || fallbackMember?.tagname || enteredTag;
    const normOfficial = normalizeTag(officialTag);

    // Check if tagname is already active online in the Room GC (Bawal ang double na tao sa iisang tagname)
    const isAlreadyOnline = onlineUsers.some((u) => normalizeTag(u.tagname) === normOfficial);
    if (isAlreadyOnline) {
      setErrorMsg(
        lang === 'tl'
          ? '⚠️ Bawal ang double login! Ang tagname na ito ay kasalukuyang aktibo sa Room GC.'
          : '⚠️ Duplicate session detected! This tagname is already active in the Room GC.'
      );
      sounds.playError();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    // Validate that the entered Tagname matches its own Password
    const isPasswordValid = targetAccount?.password
      ? targetAccount.password === password
      : Boolean((targetAccount || fallbackMember) && password === CLAN_PASSCODE);

    if (isPasswordValid) {
      setErrorMsg(null);
      sounds.playSuccess();

      const formattedTag = formatTagnameUppercase(officialTag);

      const memberRecord: ClanMember = {
        id: targetAccount?.id || fallbackMember?.id || 'user-' + Date.now(),
        tagname: formattedTag,
        category: targetAccount?.category || fallbackMember?.category || 'member',
        roleTitle: targetAccount?.roleTitle || fallbackMember?.roleTitle || 'Member',
        displayName: (targetAccount?.name || fallbackMember?.displayName || formattedTag).toUpperCase(),
        status: 'active',
      };

      onLoginSuccess(memberRecord);
    } else {
      setErrorMsg(
        lang === 'tl'
          ? 'Hindi tugma ang Tagname at Password! Siguraduhing match ang inilagay mong Tagname sa iyong Password.'
          : 'Tagname and Password do not match! Make sure your Tagname matches your Password.'
      );
      sounds.playError();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  // Find currently matching registered account object (shown only when exact tagname matches)
  const currentAccount = selectedTag.trim()
    ? registeredAccounts.find((a) => normalizeTag(a.tagname) === normalizeTag(selectedTag))
    : undefined;

  return (
    <div className="w-full max-w-[420px] mx-auto relative">
      {/* Subtle drifting Christmas snowfall on Login screen */}
      {!isCreateModalOpen && !isReportModalOpen && !isApprovalModalOpen && !showSuspendedListModal && (
        <LoginSnowfallOverlay />
      )}

      {/* Dark Neon Glassmorphism Mobile-First Christmas Login Card */}
      <div
        className={`dark-neon-glass-panel rounded-3xl p-6 sm:p-8 transition-all duration-300 relative overflow-hidden shadow-2xl border-purple-400/40 ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        {/* Top Festive Specular Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-56 h-14 bg-gradient-to-r from-rose-500/20 via-purple-500/25 to-emerald-500/20 rounded-full blur-xl pointer-events-none"></div>

        {/* Christmas Floral Corners (Poinsettias, Pine Needles & Blossoms) */}
        <ChristmasFloralCorner className="absolute top-0 left-0 w-24 h-24 sm:w-28 sm:h-28 pointer-events-none z-10 opacity-95" />
        <ChristmasFloralCorner flip className="absolute top-0 right-0 w-24 h-24 sm:w-28 sm:h-28 pointer-events-none z-10 opacity-95" />

        {/* Subtle Corner Snowflakes */}
        <SnowflakeSvg className="w-7 h-7 text-sky-200/40 absolute top-24 left-5 pointer-events-none animate-festive-sway" />
        <SnowflakeSvg className="w-6 h-6 text-purple-200/40 absolute top-24 right-5 pointer-events-none animate-festive-sway" />
        <SnowflakeSvg className="w-5 h-5 text-sky-100/30 absolute top-14 left-24 pointer-events-none" />
        <SnowflakeSvg className="w-5 h-5 text-sky-100/30 absolute top-14 right-24 pointer-events-none" />

        {/* Subtle Bottom Floral Sprigs */}
        <ChristmasFloralCorner className="absolute -bottom-6 -left-6 w-20 h-20 pointer-events-none opacity-45 rotate-90" />
        <ChristmasFloralCorner flip className="absolute -bottom-6 -right-6 w-20 h-20 pointer-events-none opacity-45 -rotate-90" />

        {/* Official Logo Emblem with Santa Hat & Brand Title */}
        <div className="text-center mb-6 pt-3 relative z-10">
          <div className="relative inline-block mx-auto mb-3 group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-rose-500 via-purple-500 to-emerald-500 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition-opacity"></div>

            {/* Santa Hat perched on the Z.V.R Logo */}
            <SantaHatSvg className="w-20 h-16 sm:w-24 sm:h-20 absolute -top-7 -right-5 sm:-top-8 sm:-right-6 rotate-[14deg] pointer-events-none z-20" />

            {/* Snowflake accent near logo */}
            <SnowflakeSvg className="w-4 h-4 text-sky-200/80 absolute -bottom-1.5 -left-3 pointer-events-none z-20 drop-shadow-[0_0_6px_rgba(186,230,253,0.8)]" />

            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-purple-300/50 shadow-[0_8px_32px_rgba(0,0,0,0.8)] bg-purple-950/90 mx-auto">
              {/* Subtle snow-frost top edge */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-b from-white/50 to-transparent pointer-events-none z-10"></div>
              <img
                src={CLAN_LOGO_URL}
                alt="Z.V.R Official Logo"
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 font-heading drop-shadow-sm">
            Z.V.R
          </h1>
          <p className="text-xs font-bold text-purple-300 mt-1 uppercase tracking-wider">
            {CLAN_MOTTO}
          </p>
          <p className="text-[10px] text-purple-200/60 font-mono mt-0.5">
            EST. {CLAN_FOUNDED_DATE} (09-15-2025)
          </p>
        </div>

        {/* Notice Banner when redirected from locked room */}
        {notice && (
          <div className="mb-4 p-3 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs flex items-center gap-2.5 animate-fade-in text-left">
            <AlertCircle className="w-4 h-4 text-pink-400 shrink-0" />
            <span className="leading-snug font-medium">{notice}</span>
          </div>
        )}

        {/* Form */}
        <form id="loginForm" onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* ENTER THE TAGNAME (User enters their own tagname; must match their password) */}
          <div className="form-group text-left">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="tagname"
                className="block text-xs font-black text-purple-200 uppercase tracking-wider font-heading"
              >
                ENTER THE TAGNAME
              </label>
            </div>

            <div className="relative">
              <input
                type="text"
                id="tagname"
                name="tagname"
                required
                autoComplete="off"
                value={selectedTag}
                onChange={(e) => {
                  setSelectedTag(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="ENTER THE TAGNAME..."
                className="dark-neon-input w-full text-white rounded-xl py-3 px-3.5 text-sm outline-none placeholder:text-slate-500 font-mono"
              />
            </div>

            {/* Account preview badge when entered tagname matches a registered account */}
            {currentAccount && (
              <div className="mt-2 p-2.5 bg-purple-950/40 border border-purple-500/30 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                  <span className="font-semibold text-purple-300">{currentAccount.roleTitle}:</span>
                  <span className="text-slate-100 uppercase font-bold">{currentAccount.name}</span>
                </div>
                <span className="text-[11px] text-purple-300/80 font-mono">
                  {currentAccount.registeredAt}
                </span>
              </div>
            )}
          </div>

          {/* PASSWORD INPUT */}
          <div className="form-group text-left">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-purple-200/90 uppercase tracking-wide"
              >
                PASSWORD
              </label>
              {capsLockActive && (
                <span className="text-[10px] text-amber-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  Caps Lock is ON
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder={lang === 'tl' ? 'Ilagay ang password' : 'Enter password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                onKeyDown={handleKeyDown}
                className="dark-neon-input w-full text-white rounded-xl py-3 pl-3.5 pr-11 text-sm outline-none placeholder:text-slate-500 font-mono"
              />

              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setShowPassword(!showPassword);
                }}
                className="absolute inset-y-0 right-0 flex items-center px-3.5 text-purple-300/70 hover:text-white transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ANIMATED CHRISTMAS LIGHTS GARLAND ABOVE LOG IN BUTTON */}
          <div className="pt-0.5 space-y-0.5">
            <ChristmasLightsGarland />

            {/* SUBMIT BUTTON WITH DARK NEON STYLING */}
            <button
              type="submit"
              disabled={isLoading}
              className="dark-neon-btn-primary w-full py-3 px-4 text-white font-bold rounded-xl text-sm sm:text-base tracking-wide transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-lg min-h-[48px]"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  {lang === 'tl' ? 'Sinusuri...' : 'Verifying...'}
                </span>
              ) : (
                <span>LOG IN</span>
              )}
            </button>
          </div>

          {/* ERROR MESSAGE (Faithful to original ID and text) */}
          {errorMsg && (
            <div
              id="errorMsg"
              className="text-pink-300 bg-pink-950/40 border border-pink-500/40 backdrop-blur-md rounded-xl p-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(236,72,153,0.2)]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-pink-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* BOTTOM ACTIONS STRIP */}
          {/* BOTTOM ACTIONS STRIP */}
          <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  if (onGoToRemoveTagname) {
                    onGoToRemoveTagname();
                  } else {
                    onOpenForgotModal();
                  }
                }}
                className="forgot-link text-purple-300 hover:text-purple-100 hover:underline transition-colors focus:outline-none cursor-pointer font-medium"
                title={lang === 'tl' ? 'Pumunta sa REMOVE TAGNAME kung nakalimutan ang password' : 'Go to REMOVE TAGNAME if you forgot your password'}
              >
                {lang === 'tl' ? 'Nakalimutan ang password? (Remove Tagname)' : 'Forgot password? (Remove Tagname)'}
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setIsCreateModalOpen(true);
                  setRegSuccessMsg(null);
                  setRegErrorMsg(null);
                  setRegVerificationCode('');
                  setRegPersonalPassword('');
                  setRegConfirmPassword('');
                }}
                className="text-emerald-300 hover:text-white font-bold flex items-center gap-1 transition-colors cursor-pointer bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1 rounded-lg border border-emerald-400/30 shadow-sm"
                title={lang === 'tl' ? 'Magrehistro at gumawa ng sariling password gamit ang verification passcode' : 'Register and create your own password with verification passcode'}
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Create Tagname</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setIsReportModalOpen(true);
                }}
                className="text-pink-400 hover:text-pink-300 font-bold flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                title={lang === 'tl' ? 'Isumbong at tanggalin ang bastos na tagname sa portal' : 'Report and suspend rude tagname from portal'}
              >
                <Flag className="w-3.5 h-3.5 text-pink-400" />
                <span>{lang === 'tl' ? 'Report (Bastos)' : 'Report (Rude)'}</span>
              </button>

              <div className="flex items-center gap-2">
                {onGoToRemoveTagname && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onGoToRemoveTagname();
                    }}
                    className="text-purple-300 hover:text-white font-bold flex items-center gap-1 transition-colors cursor-pointer text-[11px] bg-purple-900/30 px-2 py-0.5 rounded border border-purple-500/30"
                    title={lang === 'tl' ? 'Pumunta sa Remove Tagname tab' : 'Go to Remove Tagname tab'}
                  >
                    <UserX className="w-3.5 h-3.5 text-pink-400" />
                    <span>Remove Tagname</span>
                  </button>
                )}

                {suspendedList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setShowSuspendedListModal(true);
                    }}
                    className="text-purple-300 hover:text-white font-bold flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                  >
                    <UserX className="w-3.5 h-3.5 text-red-400" />
                    <span>Suspended ({suspendedList.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Quick Helper Note */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center relative z-10">
          <p className="text-[11px] text-purple-200/50">
            {lang === 'tl'
              ? 'Eksklusibo para sa mga lehitimong miyembro ng Z.V.R. Bawal ang double tagname.'
              : 'Exclusive gateway for authenticated Z.V.R members.'}
          </p>
        </div>
      </div>

      {/* CREATE TAGNAME REGISTRATION & PASSWORD SETUP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in text-left overflow-y-auto">
          <div className="w-full max-w-md liquid-glass-panel rounded-3xl p-6 relative overflow-hidden border border-emerald-400/40 shadow-2xl my-auto">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-12 bg-emerald-500/20 rounded-full blur-xl pointer-events-none"></div>

            <button
              onClick={() => {
                sounds.playClick();
                setIsCreateModalOpen(false);
              }}
              className="absolute top-4 right-4 p-2 text-purple-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-950/80 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-lg">
                <UserPlus className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-heading">
                  {lang === 'tl' ? 'Create Z.V.R Tagname & Password' : 'Create Z.V.R Tagname & Password'}
                </h3>
                <p className="text-[11px] text-emerald-300 font-mono">
                  {lang === 'tl'
                    ? 'Ipasok ang pribadong Passcode bago gumawa ng password'
                    : 'Enter the private Passcode before setting up your password'}
                </p>
              </div>
            </div>

            {regSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs leading-relaxed space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>{lang === 'tl' ? 'NAGAWA NA ANG TAGNAME & PASSWORD!' : 'TAGNAME & PASSWORD CREATED!'}</span>
                </div>
                <p>{regSuccessMsg}</p>
                <div className="p-3 rounded-xl bg-black/50 text-[11px] font-mono text-purple-200 border border-white/10 space-y-1">
                  <p>
                    ✅{' '}
                    {lang === 'tl'
                      ? 'Ilagay ang iyong tagname sa "ENTER THE TAGNAME" kasama ng iyong password para mag-login.'
                      : 'Enter your tagname in "ENTER THE TAGNAME" with your password to log in.'}
                  </p>
                  <p>
                    🔑{' '}
                    {lang === 'tl'
                      ? 'Gamitin ang iyong bagong Personal Password para mag-login sa Room GC.'
                      : 'Use your new Personal Password to log in to the Room GC.'}
                  </p>
                  <p className="text-pink-300 pt-1">
                    ⚠️{' '}
                    {lang === 'tl'
                      ? 'Kung sakaling makalimutan ang password: i-PM ang Owner o Co-Owner upang ma-remove ang tagname sa REMOVE TAGNAME tab.'
                      : 'If you ever forget your password: PM the Owner or Co-Owner to remove your tagname in the REMOVE TAGNAME tab.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setIsCreateModalOpen(false);
                    setRegSuccessMsg(null);
                  }}
                  className="liquid-glass-btn-primary w-full py-2.5 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  {lang === 'tl' ? 'MAG-LOGIN NA SA PORTAL' : 'LOG IN TO PORTAL NOW'}
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setRegErrorMsg(null);

                  // 1. Verify Private Verification Passcode
                  if (regVerificationCode.trim() !== CLAN_PASSCODE) {
                    sounds.playError();
                    setRegErrorMsg(
                      lang === 'tl'
                        ? 'Maling Verification Passcode! Mag-PM sa Facebook ng ating Co-Owner o Owner para sa opisyal na passcode.'
                        : 'Invalid Verification Passcode! PM our Co-Owner or Owner on Facebook to get the official passcode.'
                    );
                    return;
                  }

                  const cleanName = regName.trim().toUpperCase();
                  if (!cleanName) {
                    setRegErrorMsg(
                      lang === 'tl'
                        ? 'Ilagay ang iyong Pangalan / Display Name!'
                        : 'Please enter your Name / Display Name!'
                    );
                    return;
                  }

                  // 2. Generate Tagname with selected Position (ALL CAPITAL LETTERS name)
                  const generatedTag = `ツ𝐙‧𝐕‧𝐑 ᥫ᭡${regRole}•${cleanName}`;

                  // 3. Duplicate Tagname Check (Bawal ang double o magkapareho)
                  const tagExists = registeredAccounts.some(
                    (a) => a.tagname.toLowerCase() === generatedTag.toLowerCase()
                  );
                  if (tagExists) {
                    sounds.playError();
                    setRegErrorMsg(
                      lang === 'tl'
                        ? `Bawal ang magkaparehong tagname! Ang "${generatedTag}" ay rehistrado na. Pumili ng ibang pangalan o i-PM ang Owner/Co-Owner para ma-remove.`
                        : `Duplicate tagname not allowed! "${generatedTag}" is already registered.`
                    );
                    return;
                  }

                  // 4. Validate Personal Password
                  if (!regPersonalPassword || regPersonalPassword.length < 4) {
                    sounds.playError();
                    setRegErrorMsg(
                      lang === 'tl'
                        ? 'Kailangan may personal password na may hindi bababa sa 4 na characters!'
                        : 'Personal password must be at least 4 characters long!'
                    );
                    return;
                  }

                  if (regPersonalPassword !== regConfirmPassword) {
                    sounds.playError();
                    setRegErrorMsg(
                      lang === 'tl'
                        ? 'Hindi nagtugma ang Password at Confirm Password!'
                        : 'Password and Confirm Password do not match!'
                    );
                    return;
                  }

                  sounds.playSuccess();

                  const isLeadershipRole = ['𝑶𝒘𝒏𝒆𝒓', '𝑪𝒐-𝒐𝒘𝒏𝒆𝒓', '𝑭𝒅𝒓', '𝑯-𝒇𝒅𝒓', '𝑪𝒐-𝒇𝒅𝒓', '𝑯-𝒂𝒅𝒎𝒊𝒏', '𝑪-𝒂𝒅𝒎𝒊𝒏', '𝑺-𝒂𝒅𝒎𝒊𝒏', '𝑨𝒅𝒎𝒊𝒏'].includes(regRole);

                  const newAccount: RegisteredAccount = {
                    id: 'acc-' + Date.now(),
                    name: cleanName,
                    tagname: generatedTag,
                    password: regPersonalPassword,
                    roleTitle: regRole || '𝑴𝒃𝒓',
                    category: isLeadershipRole ? 'leadership' : 'member',
                    registeredAt: new Date().toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' })
                  };

                  const updatedAccounts = [...registeredAccounts, newAccount];
                  setRegisteredAccounts(updatedAccounts);
                  try {
                    localStorage.setItem('zvr_registered_accounts', JSON.stringify(updatedAccounts));
                    const channel = new BroadcastChannel('zvr_registered_accounts_channel');
                    channel.postMessage({ type: 'ACCOUNT_REGISTERED', accounts: updatedAccounts });
                    channel.close();
                  } catch {}

                  // Send to server WebSocket for real-time synchronization across devices
                  realtimeClient.registerAccount(newAccount);

                  // Add to app members list
                  onAddMember({
                    id: newAccount.id,
                    tagname: newAccount.tagname,
                    category: newAccount.category,
                    roleTitle: newAccount.roleTitle,
                    displayName: cleanName,
                    status: 'active'
                  });

                  // Pre-fill newly created tagname & password for immediate login
                  const formattedNewTag = formatTagnameUppercase(generatedTag);
                  setSelectedTag(formattedNewTag);
                  setPassword(regPersonalPassword);

                  setRegSuccessMsg(
                    lang === 'tl'
                      ? `Matagumpay na nagawa ang iyong Tagname (${generatedTag}) at sariling password!`
                      : `Successfully created your Tagname (${generatedTag}) and personal password!`
                  );
                }}
                className="space-y-3"
              >
                {regErrorMsg && (
                  <div className="p-2.5 rounded-xl bg-pink-950/60 border border-pink-500/50 text-pink-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-pink-400" />
                    <span>{regErrorMsg}</span>
                  </div>
                )}

                {/* 1. ZVR VERIFICATION CODE (MASKED / PRIVATE) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-purple-200/90 uppercase tracking-wide flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-pink-400" />
                      <span>{lang === 'tl' ? '1. Verification Passcode:' : '1. Verification Passcode:'}</span>
                    </label>
                    <a
                      href={CLAN_FB_PROFILE_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-pink-300 hover:text-white flex items-center gap-1 font-bold underline cursor-pointer bg-pink-950/40 px-2 py-0.5 rounded border border-pink-500/30"
                      title={lang === 'tl' ? 'Mag-PM sa Facebook ng Co-Owner o Owner para sa Passcode' : 'PM Co-Owner or Owner on Facebook for Passcode'}
                    >
                      <ExternalLink className="w-3 h-3 text-pink-400" />
                      <span>PM FB Co-Owner</span>
                    </a>
                  </div>

                  <div className="relative">
                    <input
                      type={showRegCode ? 'text' : 'password'}
                      required
                      value={regVerificationCode}
                      onChange={(e) => {
                        setRegVerificationCode(e.target.value);
                        setRegErrorMsg(null);
                      }}
                      placeholder={lang === 'tl' ? 'Ilagay ang Private Passcode...' : 'Enter Private Passcode...'}
                      className="liquid-glass-input w-full text-white rounded-xl py-2.5 pl-3.5 pr-11 text-xs sm:text-sm outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setShowRegCode(!showRegCode);
                      }}
                      className="absolute inset-y-0 right-0 flex items-center px-3.5 text-purple-300/70 hover:text-white transition-colors"
                      title={showRegCode ? (lang === 'tl' ? 'Itago ang passcode' : 'Hide passcode') : (lang === 'tl' ? 'Ipakita ang passcode' : 'Show passcode')}
                    >
                      {showRegCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-[10px] text-purple-300/80 mt-1 leading-relaxed">
                    🔒 <strong>{lang === 'tl' ? 'Pribado at Bawal Ilantad:' : 'Private & Confidential:'}</strong>{' '}
                    {lang === 'tl'
                      ? 'Ang verification passcode ay nakatago. Mag-PM sa Facebook ng Co-Owner o Owner para makuha ang opisyal na passcode.'
                      : 'The verification passcode is hidden. PM the Co-Owner or Owner on Facebook to receive the official passcode.'}
                  </p>
                </div>

                {/* 2. PANGALAN / DISPLAY NAME */}
                <div>
                  <label className="block text-xs font-semibold text-purple-200/90 uppercase tracking-wide mb-1">
                    {lang === 'tl' ? '2. Pangalan / Display Name:' : '2. Name / Display Name:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value.toUpperCase());
                      setRegErrorMsg(null);
                    }}
                    placeholder="e.g. HANZ"
                    className="liquid-glass-input w-full text-white rounded-xl py-2.5 px-3.5 text-xs sm:text-sm outline-none font-semibold uppercase"
                  />
                </div>

                {/* 3. PAPEL / POSITION SA Z.V.R */}
                <div>
                  <label className="block text-xs font-semibold text-purple-200/90 uppercase tracking-wide mb-1">
                    {lang === 'tl' ? '3. Papel / Posisyon:' : '3. Role / Position:'}
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="liquid-glass-input w-full text-white rounded-xl py-2.5 px-3.5 text-xs sm:text-sm outline-none cursor-pointer font-serif"
                  >
                    <option value="𝑶𝒘𝒏𝒆𝒓" className="bg-slate-950 text-white font-bold">𝑶𝒘𝒏𝒆𝒓</option>
                    <option value="𝑪𝒐-𝒐𝒘𝒏𝒆𝒓" className="bg-slate-950 text-white font-bold">𝑪𝒐-𝒐𝒘𝒏𝒆𝒓</option>
                    <option value="𝑭𝒅𝒓" className="bg-slate-950 text-white font-bold">𝑭𝒅𝒓</option>
                    <option value="𝑯-𝒇𝒅𝒓" className="bg-slate-950 text-white font-bold">𝑯-𝒇𝒅𝒓</option>
                    <option value="𝑪𝒐-𝒇𝒅𝒓" className="bg-slate-950 text-white font-bold">𝑪𝒐-𝒇𝒅𝒓</option>
                    <option value="𝑯-𝒂𝒅𝒎𝒊𝒏" className="bg-slate-950 text-white font-bold">𝑯-𝒂𝒅𝒎𝒊𝒏</option>
                    <option value="𝑪-𝒂𝒅𝒎𝒊𝒏" className="bg-slate-950 text-white font-bold">𝑪-𝒂𝒅𝒎𝒊𝒏</option>
                    <option value="𝑺-𝒂𝒅𝒎𝒊𝒏" className="bg-slate-950 text-white font-bold">𝑺-𝒂𝒅𝒎𝒊𝒏</option>
                    <option value="𝑨𝒅𝒎𝒊𝒏" className="bg-slate-950 text-white font-bold">𝑨𝒅𝒎𝒊𝒏</option>
                    <option value="𝑴𝒃𝒓" className="bg-slate-950 text-white font-bold">𝑴𝒃𝒓</option>
                  </select>
                </div>

                {/* TAGNAME PREVIEW (AUTOMATIC DESIGN) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-purple-200/90 uppercase tracking-wide">
                      Tagname Preview:
                    </label>
                    <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/60 border border-emerald-400/30 px-1.5 py-0.2 rounded">
                      Automatic Design
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/50 border border-emerald-400/40 text-xs sm:text-sm font-mono text-emerald-300 break-all shadow-inner">
                    {regName.trim()
                      ? `ツ𝐙‧𝐕‧𝐑 ᥫ᭡${regRole}•${regName.trim().toUpperCase()}`
                      : `ツ𝐙‧𝐕‧𝐑 ᥫ᭡${regRole}•...`}
                  </div>
                </div>

                {/* 4. PERSONAL PASSWORD */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-purple-200/90 uppercase tracking-wide mb-1">
                      {lang === 'tl' ? 'Sariling Password:' : 'Personal Password:'}
                    </label>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPersonalPassword}
                      onChange={(e) => {
                        setRegPersonalPassword(e.target.value);
                        setRegErrorMsg(null);
                      }}
                      placeholder={lang === 'tl' ? 'Bagong password' : 'New password'}
                      className="liquid-glass-input w-full text-white rounded-xl py-2 px-3 text-xs outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-purple-200/90 uppercase tracking-wide mb-1">
                      {lang === 'tl' ? 'Ulitin ang Password:' : 'Confirm Password:'}
                    </label>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => {
                        setRegConfirmPassword(e.target.value);
                        setRegErrorMsg(null);
                      }}
                      placeholder={lang === 'tl' ? 'Kumpirmahin' : 'Confirm password'}
                      className="liquid-glass-input w-full text-white rounded-xl py-2 px-3 text-xs outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-purple-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRegPassword}
                      onChange={(e) => setShowRegPassword(e.target.checked)}
                      className="rounded accent-purple-500 cursor-pointer"
                    />
                    <span>{lang === 'tl' ? 'Ipakita ang password' : 'Show password'}</span>
                  </label>
                  <span className="text-zinc-500 font-mono">
                    {lang === 'tl' ? 'Bawal ang duplicate' : 'No duplicates allowed'}
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!regName.trim() || !regVerificationCode.trim() || !regPersonalPassword.trim()}
                    className="liquid-glass-btn-primary w-full py-3 text-white font-bold rounded-xl text-xs sm:text-sm tracking-wide shadow-xl cursor-pointer disabled:opacity-50"
                  >
                    {lang === 'tl' ? 'I-VERIFY AT I-SAVE ANG BAGONG TAGNAME' : 'VERIFY & SAVE NEW TAGNAME'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* OWNER & CO-OWNER APPROVAL PORTAL MODAL */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in text-left">
          <div className="w-full max-w-lg liquid-glass-panel rounded-3xl p-6 relative overflow-hidden border border-amber-400/40 shadow-2xl">
            <button
              onClick={() => {
                sounds.playClick();
                setIsApprovalModalOpen(false);
                setIsApprovalUnlocked(false);
                setApprovalPasscode('');
              }}
              className="absolute top-4 right-4 p-2 text-purple-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-950/80 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-lg">
                <Crown className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-heading">
                  Owner & Co-Owner Approval Portal
                </h3>
                <p className="text-[11px] text-amber-300 font-mono">
                  {lang === 'tl'
                    ? `${pendingRegistrations.length} registration ang naghihintay ng approval`
                    : `${pendingRegistrations.length} registration(s) awaiting approval`}
                </p>
              </div>
            </div>

            {!isApprovalUnlocked ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (approvalPasscode === CLAN_PASSCODE) {
                    sounds.playSuccess();
                    setIsApprovalUnlocked(true);
                  } else {
                    sounds.playError();
                    alert(
                      lang === 'tl'
                        ? 'Mali ang Passcode ng Owner/Co-Owner!'
                        : 'Incorrect Owner/Co-Owner Passcode!'
                    );
                  }
                }}
                className="space-y-3.5 p-4 rounded-2xl bg-white/5 border border-white/10"
              >
                <p className="text-xs text-purple-200">
                  {lang === 'tl'
                    ? 'Ipasok ang opisyal na Passcode para buksan ang Approval Portal:'
                    : 'Enter the official Passcode to open the Approval Portal:'}
                </p>
                <input
                  type="password"
                  required
                  value={approvalPasscode}
                  onChange={(e) => setApprovalPasscode(e.target.value)}
                  placeholder={lang === 'tl' ? 'Ipasok ang Passcode...' : 'Enter Passcode...'}
                  className="liquid-glass-input w-full text-white rounded-xl py-2.5 px-3.5 text-xs font-mono outline-none"
                />
                <button
                  type="submit"
                  className="liquid-glass-btn-primary w-full py-2.5 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  {lang === 'tl' ? 'BUKSAN ANG APPROVAL PORTAL' : 'OPEN APPROVAL PORTAL'}
                </button>
              </form>
            ) : (
              <div>
                {pendingRegistrations.length === 0 ? (
                  <p className="text-xs text-purple-200/70 text-center py-6">
                    {lang === 'tl'
                      ? 'Walang nakatagong registration na naghihintay ng approval.'
                      : 'No pending registrations awaiting approval.'}
                  </p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {pendingRegistrations.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-purple-950/40 border border-amber-400/30 flex flex-col gap-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{item.name.toUpperCase()}</span>
                          <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30">
                            {item.roleTitle}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-emerald-300 bg-black/40 p-2 rounded-xl border border-white/10 break-all">
                          {formatTagnameUppercase(item.tagname)}
                        </p>
                        <p className="text-[11px] text-purple-200/80">
                          <strong>{lang === 'tl' ? 'Mensahe:' : 'Message:'}</strong> {item.reason}
                        </p>

                        <div className="pt-1 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playSuccess();
                              const newMember: ClanMember = {
                                id: 'mbr-' + Date.now(),
                                tagname: formatTagnameUppercase(item.tagname),
                                displayName: item.name.toUpperCase(),
                                roleTitle: item.roleTitle,
                                category: 'member',
                                status: 'active'
                              };

                              onAddMember(newMember);

                              const updatedPending = pendingRegistrations.filter((p) => p.id !== item.id);
                              setPendingRegistrations(updatedPending);
                              try {
                                localStorage.setItem('zvr_pending_registrations', JSON.stringify(updatedPending));
                              } catch {
                                // fallback
                              }

                              alert(
                                lang === 'tl'
                                  ? `APPROVED! Narehistro na si ${item.name.toUpperCase()} sa Z.V.R. Puwede na siyang mag-login sa portal!`
                                  : `APPROVED! ${item.name.toUpperCase()} has been registered in Z.V.R and can now log in!`
                              );
                            }}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md cursor-pointer transition-colors"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>{lang === 'tl' ? 'APPROVE & REHISTRO' : 'APPROVE & REGISTER'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              const updatedPending = pendingRegistrations.filter((p) => p.id !== item.id);
                              setPendingRegistrations(updatedPending);
                              try {
                                localStorage.setItem('zvr_pending_registrations', JSON.stringify(updatedPending));
                              } catch {
                                // fallback
                              }
                            }}
                            className="px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md cursor-pointer transition-colors"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                            <span>REJECT</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REPORT BASTOS MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in text-left">
          <div className="w-full max-w-md liquid-glass-panel rounded-3xl p-6 relative overflow-hidden border border-pink-500/40 shadow-2xl">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-12 bg-pink-500/20 rounded-full blur-xl pointer-events-none"></div>

            <button
              onClick={() => {
                sounds.playClick();
                setIsReportModalOpen(false);
              }}
              className="absolute top-4 right-4 p-2 text-purple-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-pink-950/80 border border-pink-500/40 flex items-center justify-center text-pink-400 shadow-lg">
                <Flag className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-heading">
                  {lang === 'tl' ? 'Isumbong ang Bastos na Miyembro' : 'Report Rude Member'}
                </h3>
                <p className="text-[11px] text-pink-300 font-mono">
                  {lang === 'tl' ? 'I-suspend at tanggalin sa Login Portal' : 'Suspend and remove from Login Portal'}
                </p>
              </div>
            </div>

            <p className="text-xs text-purple-200/90 leading-relaxed mb-4 p-3 rounded-2xl bg-pink-500/10 border border-pink-500/20">
              {lang === 'tl' ? (
                <>
                  Ang feature na ito ay para lamang sa mga bastos, nagmumura, o walang respeto sa GC. Ang mairereport na tagname ay{' '}
                  <strong className="text-white">awtomatikong matatanggal sa Login Portal</strong> bilang suspension o paunang eviction.
                </>
              ) : (
                <>
                  This feature is strictly for rude, disrespectful, or abusive members in the GC. Any reported tagname will be{' '}
                  <strong className="text-white">automatically removed from the Login Portal</strong> as suspension or eviction.
                </>
              )}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!reportTargetTag) return;

                sounds.playError();
                const targetAccount = registeredAccounts.find((a) => a.tagname === reportTargetTag);
                const targetDisplayName = (targetAccount?.name || reportTargetTag).toUpperCase();

                const newSuspendedRecord = {
                  id: 'susp-' + Date.now(),
                  tagname: reportTargetTag,
                  name: targetDisplayName,
                  reason: reportReason.trim() || 'Reason(e.g rude in GC)',
                  action: reportAction,
                  date: new Date().toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' })
                };

                const newSuspended = [...suspendedList, newSuspendedRecord];
                setSuspendedList(newSuspended);
                try {
                  localStorage.setItem('zvr_suspended_members', JSON.stringify(newSuspended));
                } catch {}

                // Automatically remove from registered accounts & portal
                const updatedAccounts = registeredAccounts.filter((a) => a.tagname !== reportTargetTag);
                setRegisteredAccounts(updatedAccounts);
                try {
                  localStorage.setItem('zvr_registered_accounts', JSON.stringify(updatedAccounts));
                  const channel = new BroadcastChannel('zvr_registered_accounts_channel');
                  channel.postMessage({ type: 'ACCOUNT_REMOVED', accounts: updatedAccounts, tagname: reportTargetTag });
                  channel.close();
                } catch {}

                // Remove from members
                try {
                  const savedMembers = localStorage.getItem('zvr_clan_members');
                  if (savedMembers) {
                    const parsedMembers: any[] = JSON.parse(savedMembers);
                    localStorage.setItem(
                      'zvr_clan_members',
                      JSON.stringify(parsedMembers.filter((m) => m.tagname !== reportTargetTag))
                    );
                  }
                } catch {}

                // Remove from today's attendance (using 3:00 AM reset date key)
                try {
                  const todayKey = getAttendanceDateKey();
                  const rawAtt = localStorage.getItem(`zvr_attendance_${todayKey}`);
                  if (rawAtt) {
                    const att = JSON.parse(rawAtt);
                    if (targetAccount) delete att[targetAccount.id];
                    delete att[reportTargetTag];
                    localStorage.setItem(`zvr_attendance_${todayKey}`, JSON.stringify(att));
                    const attCh = new BroadcastChannel('zvr_attendance_channel');
                    attCh.postMessage({ type: 'UPDATE_ATTENDANCE', dateKey: todayKey, map: att });
                    attCh.close();
                  }
                } catch {}

                // If currently logged in user is the reported user, log out immediately
                try {
                  const savedLogin = localStorage.getItem('zvr_active_login');
                  if (savedLogin) {
                    const parsedLogin = JSON.parse(savedLogin);
                    if (parsedLogin.tagname === reportTargetTag) {
                      localStorage.removeItem('zvr_active_login');
                      window.location.reload();
                    }
                  }
                } catch {}

                // Broadcast suspension to all other devices & server via WebSocket
                realtimeClient.suspendAccount(reportTargetTag, newSuspendedRecord);

                if (selectedTag.trim().toLowerCase() === reportTargetTag.trim().toLowerCase()) {
                  setSelectedTag('');
                }

                setIsReportModalOpen(false);
                setReportTargetTag('');
                setErrorMsg(
                  lang === 'tl'
                    ? `🛑 Na-suspend/ban si ${targetDisplayName} (${reportAction}) at awtomatikong tinanggal sa Portal, Attendance, at Tagname list.`
                    : `🛑 ${targetDisplayName} has been suspended/banned (${reportAction}) and removed from Portal, Attendance, and Tagname list.`
                );
              }}
              className="space-y-4"
            >
              {/* REPORT: [(Choose a Tagname)] */}
              <div>
                <label className="block text-xs font-black text-purple-200 uppercase tracking-wider mb-1.5 font-heading">
                  REPORT
                </label>
                <select
                  required
                  value={reportTargetTag}
                  onChange={(e) => setReportTargetTag(e.target.value)}
                  className="liquid-glass-input w-full text-white rounded-xl py-3 px-3.5 text-xs sm:text-sm outline-none appearance-none cursor-pointer font-mono uppercase"
                >
                  <option value="" disabled className="bg-slate-950 text-slate-400">
                    [(Choose a Tagname)]
                  </option>
                  {registeredAccounts
                    .filter((acc) => !suspendedTagnames.includes(acc.tagname))
                    .map((acc) => (
                      <option key={acc.id} value={acc.tagname} className="bg-slate-950 text-white font-mono">
                        {formatTagnameUppercase(acc.tagname)}
                      </option>
                    ))}
                </select>
                {registeredAccounts.length === 0 && (
                  <p className="text-[10px] text-pink-300 mt-1">
                    {lang === 'tl'
                      ? 'Walang rehistradong tagname na maaaring i-report sa kasalukuyan.'
                      : 'No registered tagnames available to report right now.'}
                  </p>
                )}
              </div>

              {/* REASON: [(Reason(e.g rude in GC))] */}
              <div>
                <label className="block text-xs font-black text-purple-200 uppercase tracking-wider mb-1.5 font-heading">
                  REASON
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="liquid-glass-input w-full text-white rounded-xl py-3 px-3.5 text-xs sm:text-sm outline-none cursor-pointer"
                >
                  <option value="Reason(e.g rude in GC)">[(Reason(e.g rude in GC))]</option>
                  <option value="Pambabastos / Kawalan ng Respeto sa GC">Pambabastos / Kawalan ng Respeto sa GC</option>
                  <option value="Nagmumura / Nagpo-post ng Hindi Angkop">Nagmumura / Nagpo-post ng Hindi Angkop</option>
                  <option value="Spam / Harassment / Pambubully">Spam / Harassment / Pambubully</option>
                  <option value="Hindi Pagsunod sa Alituntunin ng Z.V.R">Hindi Pagsunod sa Alituntunin ng Z.V.R</option>
                </select>
              </div>

              {/* ACTION: (SUSPENSION 1DAY, 3DAYS, 7DAYS, EVICT /BAN PERMANENT) */}
              <div>
                <label className="block text-xs font-black text-purple-200 uppercase tracking-wider mb-1.5 font-heading">
                  ACTION
                </label>
                <select
                  value={reportAction}
                  onChange={(e) => setReportAction(e.target.value)}
                  className="liquid-glass-input w-full text-white rounded-xl py-3 px-3.5 text-xs sm:text-sm outline-none cursor-pointer font-bold text-pink-300"
                >
                  <option value="SUSPENSION 1DAY" className="bg-slate-950 text-white">SUSPENSION 1DAY</option>
                  <option value="SUSPENSION 3DAYS" className="bg-slate-950 text-white">SUSPENSION 3DAYS</option>
                  <option value="SUSPENSION 7DAYS" className="bg-slate-950 text-white">SUSPENSION 7DAYS</option>
                  <option value="EVICT /BAN PERMANENT" className="bg-slate-950 text-red-400 font-bold">EVICT /BAN PERMANENT</option>
                </select>
              </div>

              {/* BUTTON TAB: SUSPEND / BAN */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!reportTargetTag}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white font-black rounded-xl text-xs sm:text-sm tracking-wider shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
                >
                  <UserX className="w-4 h-4" />
                  <span>SUSPEND / BAN</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUSPENDED / EVICTED MEMBERS LIST MODAL */}
      {showSuspendedListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in text-left">
          <div className="w-full max-w-lg liquid-glass-panel rounded-3xl p-6 relative overflow-hidden border border-purple-500/30 shadow-2xl">
            <button
              onClick={() => {
                sounds.playClick();
                setShowSuspendedListModal(false);
              }}
              className="absolute top-4 right-4 p-2 text-purple-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400 shadow-lg">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-heading">
                  {lang === 'tl' ? 'Mga Suspended / Evicted na Tagname' : 'Suspended / Evicted Tagnames'}
                </h3>
                <p className="text-[11px] text-purple-300 font-mono">
                  {lang === 'tl'
                    ? `${suspendedList.length} tagname ang kasalukuyang tinanggal sa portal`
                    : `${suspendedList.length} tagname(s) currently removed from the portal`}
                </p>
              </div>
            </div>

            {suspendedList.length === 0 ? (
              <p className="text-xs text-purple-200/70 text-center py-6">
                {lang === 'tl'
                  ? 'Walang suspended na tagname sa kasalukuyan.'
                  : 'No suspended tagnames at the moment.'}
              </p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {suspendedList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-red-950/30 border border-red-500/30 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{item.name}</span>
                        <span className="text-[10px] text-red-400 font-mono px-2 py-0.2 rounded bg-red-500/20 border border-red-500/30">
                          EVICTED / SUSPENDED
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-purple-200/80 mt-0.5">{item.tagname}</p>
                      <p className="text-[11px] text-pink-300 mt-1">
                        {lang === 'tl' ? 'Dahilan' : 'Reason'}: {item.reason}
                      </p>
                    </div>

                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          const passcodePrompt = prompt(
                            lang === 'tl'
                              ? 'Ipasok ang Admin Passcode para ibalik ang tagname na ito:'
                              : 'Enter Admin Passcode to restore this tagname:'
                          );
                          if (passcodePrompt === CLAN_PASSCODE) {
                            sounds.playSuccess();
                            const updated = suspendedList.filter((s) => s.id !== item.id);
                            setSuspendedList(updated);
                            try {
                              localStorage.setItem('zvr_suspended_members', JSON.stringify(updated));
                            } catch {
                              // fallback
                            }
                            realtimeClient.updateSuspensions(updated);
                            alert(
                              lang === 'tl'
                                ? `Naibalik na si ${item.name} sa Login Portal!`
                                : `${item.name} has been restored to the Login Portal!`
                            );
                          } else if (passcodePrompt !== null) {
                            sounds.playError();
                            alert(lang === 'tl' ? 'Mali ang Passcode ng Admin!' : 'Invalid Admin Passcode!');
                          }
                        }}
                        className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-colors shrink-0 cursor-pointer shadow-sm border border-emerald-400/30"
                        title={lang === 'tl' ? 'Ibalik ang tagname kapag nagtino na' : 'Restore tagname'}
                      >
                        {lang === 'tl' ? 'Ibalik / Lift' : 'Restore / Lift'}
                      </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
