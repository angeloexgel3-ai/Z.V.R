import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, AlertCircle, Sparkles, CheckCircle2, User, KeyRound, ExternalLink } from 'lucide-react';
import { ClanMember, CLAN_PASSCODE, MESSENGER_GC_LINK } from '../data/clanData';
import { sounds } from '../utils/soundEffects';

interface LoginCardProps {
  members: ClanMember[];
  onLoginSuccess: (member: ClanMember) => void;
  onOpenForgotModal: () => void;
  lang: 'tl' | 'en';
}

export const LoginCard: React.FC<LoginCardProps> = ({
  members,
  onLoginSuccess,
  onOpenForgotModal,
  lang,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [capsLockActive, setCapsLockActive] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const leadershipMembers = members.filter(m => m.category === 'leadership');
  const generalMembers = members.filter(m => m.category === 'member');

  // Check caps lock
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();

    if (!selectedTag) {
      setErrorMsg(lang === 'tl' ? 'Pumili muna ng iyong Tagname!' : 'Please select your Tagname first!');
      sounds.playError();
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Validate password
      if (password === CLAN_PASSCODE) {
        setErrorMsg(null);
        sounds.playSuccess();
        const found = members.find(m => m.tagname === selectedTag) || {
          id: 'custom-' + Date.now(),
          tagname: selectedTag,
          category: 'member',
          roleTitle: 'Member',
          displayName: selectedTag,
          status: 'active'
        };
        setIsLoading(false);
        onLoginSuccess(found);
      } else {
        setIsLoading(false);
        setErrorMsg('Mali ang password! Subukan ulit.');
        sounds.playError();
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }
    }, 400);
  };

  // Find currently selected member object
  const currentMember = members.find(m => m.tagname === selectedTag);

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Login Card */}
      <div
        className={`bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
        style={{
          boxShadow: '0 12px 36px -10px rgba(0, 0, 0, 0.7), 0 0 20px -5px rgba(56, 189, 248, 0.15)'
        }}
      >
        {/* Header Emblem & Brand Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400/20 to-sky-600/10 border border-sky-400/30 text-sky-400 mb-3 shadow-[0_0_20px_rgba(56,189,248,0.25)]">
            <Shield className="w-8 h-8 text-sky-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-widest text-sky-400 font-heading">
            Z.V.R
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
            {lang === 'tl' ? 'Official Clan Gateway & Verification' : 'Official Clan Gateway & Verification'}
          </p>
        </div>

        {/* Form */}
        <form id="loginForm" onSubmit={handleSubmit} className="space-y-4">
          {/* TAGNAME SELECTOR */}
          <div className="form-group text-left">
            <label
              htmlFor="tagname"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5"
            >
              Z.V.R TAGNAME / USER
            </label>

            <div className="relative">
              <select
                id="tagname"
                name="tagname"
                required
                value={selectedTag}
                onChange={(e) => {
                  sounds.playClick();
                  setSelectedTag(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-sky-400 text-white rounded-xl py-3 px-3.5 text-sm outline-none transition-all shadow-inner appearance-none cursor-pointer"
              >
                <option value="" disabled>
                  {lang === 'tl' ? 'Pumili ng iyong Tagname...' : 'Select your Tagname...'}
                </option>

                {/* Owners & Admins */}
                <optgroup label="👑 Owners & Admins" className="bg-slate-900 text-sky-300 font-bold">
                  {leadershipMembers.map((m) => (
                    <option key={m.id} value={m.tagname} className="bg-slate-950 text-white font-normal py-1">
                      {m.tagname}
                    </option>
                  ))}
                </optgroup>

                {/* Members */}
                <optgroup label="⚔️ Members" className="bg-slate-900 text-slate-300 font-bold">
                  {generalMembers.map((m) => (
                    <option key={m.id} value={m.tagname} className="bg-slate-950 text-white font-normal py-1">
                      {m.tagname}
                    </option>
                  ))}
                </optgroup>
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Selected Member preview badge */}
            {currentMember && (
              <div className="mt-2 p-2 bg-sky-950/40 border border-sky-800/40 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  <span className="font-semibold text-sky-300">{currentMember.roleTitle}:</span>
                  <span className="text-slate-200">{currentMember.displayName}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {currentMember.category === 'leadership' ? 'Officer' : 'Member'}
                </span>
              </div>
            )}
          </div>

          {/* PASSWORD INPUT */}
          <div className="form-group text-left">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-slate-300 uppercase tracking-wide"
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
                placeholder={lang === 'tl' ? 'Enter password' : 'Enter password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-sky-400 text-white rounded-xl py-3 pl-3.5 pr-11 text-sm outline-none transition-all shadow-inner placeholder:text-slate-500 font-mono"
              />

              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setShowPassword(!showPassword);
                }}
                className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold rounded-xl text-sm sm:text-base tracking-wide transition-all shadow-lg shadow-sky-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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

          {/* ERROR MESSAGE (Faithful to original ID and text) */}
          {errorMsg && (
            <div
              id="errorMsg"
              className="text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl p-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FORGOT PASSWORD LINK */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onOpenForgotModal();
              }}
              className="text-xs text-sky-400 hover:text-sky-300 hover:underline transition-colors focus:outline-none"
            >
              Forgot password?
            </button>
          </div>
        </form>

        {/* Quick Helper Note */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            {lang === 'tl'
              ? 'Eksklusibo para sa mga lehitimong miyembro ng Z.V.R Clan.'
              : 'Exclusive gateway for authenticated Z.V.R Clan members.'}
          </p>
        </div>
      </div>
    </div>
  );
};
