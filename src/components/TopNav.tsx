import React from 'react';
import { Shield, MessageCircle, Volume2, VolumeX, Globe, Music2, UserCheck, Zap, Sparkles, Settings } from 'lucide-react';
import { ClanMember, CLAN_FB_PROFILE_LINK, CLAN_LOGO_URL } from '../data/clanData';
import { sounds } from '../utils/soundEffects';
import { PWAInstallButton } from './PWAInstallButton';
import { clearAppCacheAndOptimize } from '../utils/cacheManager';

interface TopNavProps {
  currentTab: 'login' | 'room' | 'roster' | 'generator' | 'rules' | 'card' | 'remove_tagname';
  setCurrentTab: (tab: 'login' | 'room' | 'roster' | 'generator' | 'rules' | 'card' | 'remove_tagname') => void;
  loggedInMember: ClanMember | null;
  onLogout: () => void;
  lang: 'tl' | 'en';
  setLang: (lang: 'tl' | 'en') => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  onRequireLogin?: () => void;
  onlineCount?: number;
  roomUnreadCount?: number;
  onOpenSettings?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  setCurrentTab,
  loggedInMember,
  onLogout,
  lang,
  setLang,
  isMuted,
  setIsMuted,
  onRequireLogin,
  onlineCount = 1,
  roomUnreadCount = 0,
  onOpenSettings
}) => {
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.setMuted(next);
    if (!next) sounds.playClick();
  };

  const handleTabClick = (tabId: 'login' | 'room' | 'roster' | 'generator' | 'rules' | 'card' | 'remove_tagname') => {
    sounds.playClick();
    if (!loggedInMember && tabId === 'room') {
      if (onRequireLogin) {
        onRequireLogin();
      }
      setCurrentTab('login');
      return;
    }
    setCurrentTab(tabId);
  };

  const navLinks = [
    { id: 'room' as const, labelTl: loggedInMember ? 'ROOM GC 🟢' : 'ROOM GC 🔒', labelEn: loggedInMember ? 'ROOM GC 🟢' : 'ROOM GC 🔒' },
    { id: 'login' as const, labelTl: loggedInMember ? 'PORTAL' : 'LOG IN', labelEn: loggedInMember ? 'PORTAL' : 'LOG IN' },
    { id: 'generator' as const, labelTl: 'ATTENDANCE 🟢🔴', labelEn: 'ATTENDANCE 🟢🔴' },
    { id: 'roster' as const, labelTl: 'ROSTER', labelEn: 'ROSTER' },
    { id: 'rules' as const, labelTl: 'RULES', labelEn: 'RULES' },
    { id: 'remove_tagname' as const, labelTl: 'REMOVE TAGNAME', labelEn: 'REMOVE TAGNAME' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 liquid-glass-card-subtle backdrop-blur-2xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => {
            sounds.playClick();
            setCurrentTab('login');
          }}
          className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-xl shrink-0 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 bg-purple-950/60 flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.35)] shrink-0">
            <img
              src={CLAN_LOGO_URL}
              alt="Z.V.R Official Logo"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200 group-hover:from-white group-hover:to-purple-200 font-heading whitespace-nowrap shrink-0 transition-colors">
              Z.V.R
            </span>
            <span className="text-[9px] tracking-widest text-purple-300/80 uppercase font-semibold hidden sm:inline">
              Zeal · Victory · Respect
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden sm:flex items-center gap-1 md:gap-2 text-sm font-medium">
          {navLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleTabClick(link.id)}
                className={`px-3 py-1.5 rounded-xl text-xs md:text-sm transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'text-white bg-white/15 border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] font-semibold'
                    : 'text-purple-200/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{lang === 'tl' ? link.labelTl : link.labelEn}</span>
                {link.id === 'room' && loggedInMember && roomUnreadCount > 0 && currentTab !== 'room' && (
                  <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[10px] font-black font-mono leading-tight animate-pulse">
                    {roomUnreadCount > 99 ? '99+' : roomUnreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions (Realtime Online Count, App Install, Clear Cache, Sound, Lang, Profile) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Online Presence Indicator */}
          <div
            onClick={() => {
              if (loggedInMember) {
                sounds.playClick();
                setCurrentTab('room');
              } else {
                handleTabClick('room');
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold cursor-pointer hover:bg-emerald-500/25 transition-colors shadow-sm"
            title={lang === 'tl' ? `${onlineCount} miyembro ang online ngayon` : `${onlineCount} members online now`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-[11px]">{onlineCount}</span>
            <span className="hidden sm:inline text-[11px]">Online</span>
          </div>

          {/* PWA App Icon Install Trigger */}
          <PWAInstallButton lang={lang} />

          {/* Clear Cache & Smooth Fix Button */}
          <button
            onClick={() => {
              sounds.playSuccess();
              const result = clearAppCacheAndOptimize();
              alert(
                lang === 'tl'
                  ? `🧹 LILINIS ANG CACHE AT PIPIGILAN ANG LAG!\n\nNaisagawa ang paglilinis ng temporary cache (${result.freedMB} MB). Malinis at smooth na uli ang Z.V.R Portal!`
                  : `🧹 CACHE CLEARED & LAG FIXED!\n\nTemporary storage cleaned (${result.freedMB} MB). Smooth performance restored!`
              );
            }}
            className="p-2 text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition-colors cursor-pointer border border-amber-400/30 flex items-center gap-1 text-xs font-bold"
            title={lang === 'tl' ? 'Linisin ang cache at alisin ang lag' : 'Clear Cache & Fix Lag'}
          >
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="hidden lg:inline">{lang === 'tl' ? 'Linisin ang Cache' : 'Fix Lag'}</span>
          </button>

          {/* Mute button */}
          <button
            onClick={toggleMute}
            aria-label={isMuted ? (lang === 'tl' ? 'I-unmute ang tunog' : 'Unmute sounds') : (lang === 'tl' ? 'I-mute ang tunog' : 'Mute sounds')}
            className="p-2 text-purple-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer border border-white/10"
            title={isMuted ? (lang === 'tl' ? 'I-unmute ang tunog' : 'Unmute sounds') : (lang === 'tl' ? 'I-mute ang tunog' : 'Mute sounds')}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-purple-300" />}
          </button>

          {/* Site Settings button */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onOpenSettings();
              }}
              aria-label={lang === 'tl' ? 'Buksan ang Settings' : 'Open Settings'}
              title={lang === 'tl' ? 'Mga Setting ng Site' : 'Site Settings'}
              className="p-2 text-purple-200 hover:text-white bg-white/5 hover:bg-purple-500/25 rounded-xl transition-colors cursor-pointer border border-purple-400/30 flex items-center gap-1.5 text-xs font-semibold shrink-0"
            >
              <Settings className="w-4 h-4 text-purple-300" />
              <span className="hidden xl:inline">{lang === 'tl' ? 'Settings' : 'Settings'}</span>
            </button>
          )}

          {/* Language selector: ENGLISH / FILIPINO */}
          <div
            className="flex items-center bg-white/5 border border-white/15 rounded-xl p-0.5 shrink-0"
            title={lang === 'tl' ? 'Pumili ng Wika: English o Filipino' : 'Select Language: English or Filipino'}
          >
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setLang('en');
              }}
              className={`px-2 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                lang === 'en'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-200/70 hover:text-white'
              }`}
            >
              ENGLISH
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setLang('tl');
              }}
              className={`px-2 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                lang === 'tl'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-200/70 hover:text-white'
              }`}
            >
              FILIPINO
            </button>
          </div>

          {/* Official Facebook Profile Link */}
          <a
            href={CLAN_FB_PROFILE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sounds.playClick()}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-purple-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl transition-colors whitespace-nowrap shrink-0"
            title="Official Z.V.R Facebook Profile"
          >
            <span>FB Profile</span>
          </a>

          {/* Primary Action Button */}
          {loggedInMember ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  sounds.playClick();
                  setCurrentTab('room');
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-md flex items-center gap-1.5 ${
                  currentTab === 'room'
                    ? 'bg-purple-600 text-white border border-purple-400/50'
                    : 'liquid-glass-btn-primary text-white'
                }`}
              >
                <span>Room GC</span>
                {roomUnreadCount > 0 && currentTab !== 'room' && (
                  <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[10px] font-black font-mono leading-tight animate-pulse">
                    {roomUnreadCount > 99 ? '99+' : roomUnreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  onLogout();
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-purple-200 hover:text-white bg-white/5 border border-white/15 hover:bg-white/10 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {lang === 'tl' ? 'Log Out' : 'Log Out'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                sounds.playClick();
                setCurrentTab('login');
              }}
              className="liquid-glass-btn-primary px-3.5 py-1.5 text-xs font-bold text-white rounded-xl shadow-md transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-200" />
              <span>{lang === 'tl' ? 'Mag-login' : 'Log In'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Strip */}
      <div className="flex sm:hidden items-center justify-around border-t border-white/10 bg-black/30 py-2 px-2 overflow-x-auto">
        {navLinks.map((link) => {
          const isActive = currentTab === link.id;
          return (
            <button
              key={link.id}
              onClick={() => handleTabClick(link.id)}
              className={`px-2.5 py-1 text-xs rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 ${
                isActive
                  ? 'text-white bg-white/15 border border-white/20 font-bold'
                  : 'text-purple-300/70 hover:text-white'
              }`}
            >
              <span>{lang === 'tl' ? link.labelTl : link.labelEn}</span>
              {link.id === 'room' && loggedInMember && roomUnreadCount > 0 && currentTab !== 'room' && (
                <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[9px] font-black font-mono leading-tight animate-pulse">
                  {roomUnreadCount > 99 ? '99+' : roomUnreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
